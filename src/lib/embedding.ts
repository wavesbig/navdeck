export type EmbedCheckStatus = 'allowed' | 'blocked' | 'unknown';

/**
 * 解析响应头中的 iframe 嵌入限制。
 *
 * CSP frame-ancestors 优先于 X-Frame-Options；无法确认的返回 unknown，
 * 交由浏览器实际加载，避免把可嵌入站点误判成不可用。
 */
export function resolveEmbeddingStatus(input: {
  targetUrl: string;
  appOrigin: string;
  xFrameOptions?: string | null;
  contentSecurityPolicy?: string | null;
}): EmbedCheckStatus {
  const appOrigin = normalizeOrigin(input.appOrigin);
  const target = safeUrl(input.targetUrl);
  if (!target || !appOrigin) return 'unknown';

  const cspStatus = resolveFrameAncestors(
    input.contentSecurityPolicy,
    appOrigin,
    target,
  );
  if (cspStatus) return cspStatus;

  const xfoOptions = (input.xFrameOptions ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (xfoOptions.includes('deny')) return 'blocked';
  if (xfoOptions.includes('sameorigin')) {
    return appOrigin === target.origin ? 'allowed' : 'blocked';
  }
  if (xfoOptions.length > 0) return 'unknown';

  return 'allowed';
}

function resolveFrameAncestors(
  csp: string | null | undefined,
  appOrigin: string,
  target: URL,
): EmbedCheckStatus | null {
  const directives = (csp ?? '')
    .split(',')
    .flatMap((policy) => policy.split(';'))
    .map((directive) => directive.trim())
    .filter(
      (directive) =>
        directive.toLowerCase().split(/\s+/u)[0] === 'frame-ancestors',
    )
    .map((directive) => directive.slice('frame-ancestors'.length).trim())
    .filter(Boolean)
    .map((sources) => sources.split(/\s+/u));

  if (directives.length === 0) return null;

  let hasAmbiguousSource = false;
  for (const sources of directives) {
    const matched = sources.some((source) => {
      const result = matchFrameAncestorSource(source, appOrigin, target);
      if (result === 'ambiguous') hasAmbiguousSource = true;
      return result === true;
    });
    if (!matched) {
      return hasAmbiguousSource ? 'unknown' : 'blocked';
    }
  }

  return 'allowed';
}

function matchFrameAncestorSource(
  rawSource: string,
  appOrigin: string,
  target: URL,
): boolean | 'ambiguous' {
  const source = rawSource.toLowerCase();
  if (source === '*') return true;
  if (source === "'none'") return false;
  if (source === "'self'") return appOrigin === target.origin;
  const app = safeUrl(appOrigin);
  if (!app) return 'ambiguous';
  if (source === 'https:' || source === 'http:') {
    return `${app.protocol.replace(':', '')}:` === source;
  }
  if (source.startsWith("'")) return 'ambiguous';

  const hasScheme = /^[a-z][a-z\d+.-]*:\/\//u.test(source);
  const hasWildcardPort = /:\*(?=\/|$)/u.test(source);
  const candidate = hasScheme ? source : `${target.protocol}//${source}`;
  const sourceUrl = safeUrl(candidate.replace(/:\*(?=\/|$)/u, ''));
  if (!sourceUrl) return 'ambiguous';
  if (sourceUrl.origin === app.origin) return true;

  if (sourceUrl.protocol !== app.protocol) return false;
  if (hasWildcardPort) return matchHostname(sourceUrl.hostname, app.hostname);
  if (sourceUrl.port && sourceUrl.port !== app.port) return false;
  if (!sourceUrl.port && app.port) return false;
  return matchHostname(sourceUrl.hostname, app.hostname);
}

function matchHostname(pattern: string, hostname: string): boolean {
  if (!pattern.startsWith('*.')) return pattern === hostname;
  const suffix = pattern.slice(2);
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

function normalizeOrigin(origin: string): string {
  try {
    return new URL(origin).origin;
  } catch {
    return '';
  }
}

function safeUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
