/**
 * SSRF 防护工具（独立模块，不依赖 db，客户端/测试环境可安全导入）
 *
 * 防护范围：云元数据端点 + 回环地址。
 * 私网地址（10.x / 172.16-31.x / 192.168.x 等）刻意放行：
 * NavDeck 是 NAS 导航站，qB / Jellyfin 等内网服务是合法抓取目标。
 *
 * 已知接受风险：域名解析到内网 IP（DNS rebinding）无法靠字符串黑名单
 * 拦截，需要 resolve-then-validate-then-connect；单用户自托管场景
 * （唯一调用方是管理员本人）接受此风险，不做 DNS 解析校验。
 */

/** SSRF 防护：判断 URL 是否指向云元数据 / 回环等禁止服务端访问的地址 */
export function isBlockedPrivateHost(url: URL): boolean {
  if (!['http:', 'https:'].includes(url.protocol)) return true;
  // WHATWG URL 对 IPv6 字面量保留方括号、域名保留尾部根点，先归一化
  let h = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h.endsWith('.')) h = h.slice(0, -1);
  // IPv4-mapped IPv6 先还原为 IPv4 再统一判，
  // 否则 ::ffff:169.254.169.254 会绕过元数据黑名单。
  // WHATWG 把 [::ffff:127.0.0.1] 规范化为十六进制 [::ffff:7f00:1]，需解码
  const mapped = h.match(/^::ffff:(.+)$/);
  if (mapped) {
    const inner = mapped[1];
    const hex = inner.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      h = `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
    } else if (inner.includes(':')) {
      // 无法识别的 mapped 形式，保守拦截
      return true;
    } else {
      h = inner;
    }
  }
  // 云元数据端点（含 trailing dot 变体）
  if (h === '169.254.169.254' || h === 'metadata.google.internal') return true;
  // 回环
  if (h === 'localhost' || h === '::1' || h === '::') return true;
  if (/^127\./.test(h) || h === '0.0.0.0') return true;
  return false;
}

const MAX_SAFE_REDIRECTS = 5;

/** 跨源重定向时不转发的敏感请求头 */
const SENSITIVE_HEADERS = ['authorization', 'cookie'];

/**
 * 安全 fetch：手动跟随重定向并在每一跳校验目标地址，
 * 防止通过 30x 跳转绕过 SSRF 黑名单（redirect: 'follow' 不会重检）。
 * 跨源跳转剔除敏感请求头，避免未来调用方传入的凭据泄露到跳转目标。
 * 阻止时抛错，调用方按需降级处理。
 */
export async function safeFetch(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  let current =
    typeof url === 'string' ? new URL(url) : new URL(url.toString());
  let requestInit = init;
  for (let i = 0; i <= MAX_SAFE_REDIRECTS; i++) {
    if (isBlockedPrivateHost(current)) {
      throw new Error(`SSRF 防护：阻止访问 ${current.hostname}`);
    }
    const res = await fetch(current, { ...requestInit, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) return res;
      await res.body?.cancel();
      const next = new URL(location, current);
      // 跨源跳转剔除敏感头（当前调用方只发 UA/Accept，属前瞻加固）
      if (next.origin !== current.origin && requestInit?.headers) {
        const headers = new Headers(requestInit.headers);
        for (const name of SENSITIVE_HEADERS) headers.delete(name);
        requestInit = { ...requestInit, headers };
      }
      current = next;
      continue;
    }
    return res;
  }
  throw new Error('SSRF 防护：重定向次数超限');
}
