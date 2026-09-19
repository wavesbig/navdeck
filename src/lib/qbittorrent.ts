import type {
  QbLifetimeStats,
  QbittorrentConfig,
  QbittorrentStats,
  QbittorrentSummary,
} from '@/types';

/** 未配置时的默认值（UserPreference key="qbittorrent"） */
export const DEFAULT_QBITTORRENT_CONFIG: QbittorrentConfig = {
  url: '',
  username: '',
  password: '',
};

/** qBittorrent /api/v2/torrents/info 原始字段（仅声明用到的） */
export interface QbTorrentRaw {
  /** bytes/s */
  dlspeed: number;
  /** bytes/s */
  upspeed: number;
  /** 累计上传（bytes，全生命周期） */
  uploaded: number;
  /** 累计下载（bytes，全生命周期） */
  downloaded: number;
  state: string;
}

/** 下载中状态（含排队 / 校验 / 元数据获取） */
const DOWNLOADING_STATES = new Set([
  'downloading',
  'stalledDL',
  'metaDL',
  'forcedMetaDL',
  'forcedDL',
  'queuedDL',
  'checkingDL',
  'allocating',
]);

/** 做种状态 */
const SEEDING_STATES = new Set([
  'uploading',
  'stalledUP',
  'forcedUP',
  'queuedUP',
  'checkingUP',
]);

/** 暂停 / 停止状态（qB 5.x 将 paused 更名为 stopped，两代兼容） */
const PAUSED_STATES = new Set([
  'pausedDL',
  'pausedUP',
  'stoppedDL',
  'stoppedUP',
]);

const FETCH_TIMEOUT_MS = 10_000;

/**
 * 聚合种子列表为 widget 数据（纯函数，便于单测）
 *
 * - 总速度累加全部种子（未知状态的速度也计入）
 * - 任务按状态归类，未知状态不计入三类计数
 * - 累计上传 / 下载聚合全部种子的全生命周期量
 */
export function aggregateTorrents(raw: QbTorrentRaw[]): {
  summary: QbittorrentSummary;
  lifetime: QbLifetimeStats;
} {
  let lifetimeUploaded = 0;
  let lifetimeDownloaded = 0;
  const summary: QbittorrentSummary = {
    downloadSpeed: 0,
    uploadSpeed: 0,
    downloading: 0,
    seeding: 0,
    paused: 0,
  };
  for (const t of raw) {
    summary.downloadSpeed += t.dlspeed;
    summary.uploadSpeed += t.upspeed;
    lifetimeUploaded += t.uploaded;
    lifetimeDownloaded += t.downloaded;
    if (DOWNLOADING_STATES.has(t.state)) summary.downloading += 1;
    else if (SEEDING_STATES.has(t.state)) summary.seeding += 1;
    else if (PAUSED_STATES.has(t.state)) summary.paused += 1;
  }
  return {
    summary,
    lifetime: {
      uploaded: lifetimeUploaded,
      downloaded: lifetimeDownloaded,
      total: raw.length,
    },
  };
}

// 会话缓存：widget 10 秒轮询，每次重登的会话开销不可接受。
// 缓存键含凭据，配置变更自动失效；请求返回 403 时重登一次自愈。
let cachedSession: { key: string; cookie: string } | null = null;

function configKey(config: QbittorrentConfig): string {
  return `${config.url}|${config.username}|${config.password}`;
}

function baseUrl(config: QbittorrentConfig): string {
  return config.url.trim().replace(/\/+$/, '');
}

/** 带超时的 fetch（超时 / 网络错误统一为可读消息） */
async function qbFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: 'no-store',
    });
  } catch {
    throw new Error('qBittorrent 连接失败或超时');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 从 set-cookie 提取会话 Cookie 的 name=value 对
 *
 * 新版 qB 登录成功返回 204 + 会话 Cookie，且 Cookie 名可自定义
 * （如 QBT_SID_8888，多实例反代场景避免同名冲突），不能假设叫 SID。
 */
export function extractSessionCookie(setCookie: string): string | null {
  const pair = setCookie.split(';')[0]?.trim() ?? '';
  return /^[^=\s]+=.+$/.test(pair) ? pair : null;
}

/** 登录 qB WebUI 换取会话 Cookie（name=value） */
async function login(config: QbittorrentConfig): Promise<string> {
  const body = new URLSearchParams({
    username: config.username,
    password: config.password,
  }).toString();
  const res = await qbFetch(`${baseUrl(config)}/api/v2/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = (await res.text()).trim();
  const setCookie = res.headers.get('set-cookie');
  const cookie = setCookie ? extractSessionCookie(setCookie) : null;
  // 成功时才下发会话 Cookie：旧版 200 "Ok." + SID，新版 204 + 自定义名
  if (cookie) {
    return cookie;
  }
  // 分类失败原因：反代 / Host 头验证问题常被误判成密码错误
  if (text === 'Fails.') {
    throw new Error('qBittorrent 用户名或密码错误');
  }
  if (res.status === 403) {
    throw new Error(
      'qBittorrent 拒绝访问（HTTP 403）：常见原因是 qB「启用 Host 头验证」未包含当前域名，或反代/防火墙拦截了 /api/ 请求',
    );
  }
  if (res.status === 401) {
    throw new Error(
      'qBittorrent 登录被拒（HTTP 401）：用户名或密码错误，或该 IP 因连续登录失败被 qB 临时封禁（默认 1 小时，重启 qB 可立即解除）',
    );
  }
  throw new Error(
    `qBittorrent 返回非预期响应（HTTP ${res.status}）：请确认地址为 WebUI 根地址，且反代未拦截 /api/ 请求`,
  );
}

// 登录失败退避：qB 默认连续 5 次登录失败会封禁来源 IP 1 小时，
// 而 widget 10 秒轮询每次失败都会重试登录，很快会把 IP 关进封禁
// 名单（反代场景下浏览器登录同样被殃及）。因此失败后逐步退避，
// 连续 3 次失败后暂停自动重试，改为引导用户在「设置」弹窗手动验证。
const LOGIN_COOLDOWNS_MS = [60_000, 300_000, 900_000];
let loginFailures = 0;
let loginCooldownUntil = 0;
let loginAutoRetryDisabled = false;
let lastLoginError = '';

function resetLoginState(): void {
  loginFailures = 0;
  loginCooldownUntil = 0;
  loginAutoRetryDisabled = false;
  lastLoginError = '';
}

/** 记录一次登录失败并生成带退避信息的错误 */
function recordLoginFailure(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);
  lastLoginError = message;
  const cooldown =
    LOGIN_COOLDOWNS_MS[Math.min(loginFailures, LOGIN_COOLDOWNS_MS.length - 1)];
  loginFailures += 1;
  loginCooldownUntil = Date.now() + cooldown;
  if (loginFailures >= 3) {
    loginAutoRetryDisabled = true;
    return new Error(
      `${message}；已连续失败 ${loginFailures} 次，为避免触发 qB IP 封禁已暂停自动重试，请在右键「设置」中修改配置并保存以重新验证`,
    );
  }
  return new Error(`${message}（${Math.round(cooldown / 1000)} 秒后自动重试）`);
}

/** 拉取并聚合 qBittorrent 下载状态 */
export async function fetchQbittorrentStats(
  config: QbittorrentConfig,
  force = false,
): Promise<QbittorrentStats> {
  const key = configKey(config);
  let cookie = cachedSession?.key === key ? cachedSession.cookie : null;
  if (!cookie) {
    if (loginAutoRetryDisabled) {
      throw new Error(
        `qBittorrent 登录已连续失败 ${loginFailures} 次，已暂停自动重试以避免触发 qB IP 封禁（上次原因：${lastLoginError}）。请在右键「设置」中修改配置并保存以重新验证`,
      );
    }
    if (!force && Date.now() < loginCooldownUntil) {
      const waitSec = Math.ceil((loginCooldownUntil - Date.now()) / 1000);
      throw new Error(
        `qBittorrent 登录退避中，${waitSec} 秒后自动重试（上次原因：${lastLoginError}）`,
      );
    }
    try {
      cookie = await login(config);
      resetLoginState();
      cachedSession = { key, cookie };
    } catch (e) {
      throw recordLoginFailure(e);
    }
  }

  const url = `${baseUrl(config)}/api/v2/torrents/info`;
  let res = await qbFetch(url, { headers: { Cookie: cookie } });
  if (res.status === 401 || res.status === 403) {
    // 会话过期（qB 重启 / 服务端超时）：重登一次再试
    if (loginAutoRetryDisabled) {
      throw new Error(
        `qBittorrent 登录已连续失败 ${loginFailures} 次，已暂停自动重试以避免触发 qB IP 封禁（上次原因：${lastLoginError}）。请在右键「设置」中修改配置并保存以重新验证`,
      );
    }
    if (!force && Date.now() < loginCooldownUntil) {
      const waitSec = Math.ceil((loginCooldownUntil - Date.now()) / 1000);
      throw new Error(
        `qBittorrent 登录退避中，${waitSec} 秒后自动重试（上次原因：${lastLoginError}）`,
      );
    }
    try {
      cookie = await login(config);
      resetLoginState();
      cachedSession = { key, cookie };
    } catch (e) {
      throw recordLoginFailure(e);
    }
    res = await qbFetch(url, { headers: { Cookie: cookie } });
  }
  if (!res.ok) {
    throw new Error(`qBittorrent API 响应错误（HTTP ${res.status}）`);
  }
  const raw = (await res.json()) as QbTorrentRaw[];
  const { summary, lifetime } = aggregateTorrents(
    Array.isArray(raw) ? raw : [],
  );
  return { available: true, error: null, summary, lifetime };
}
