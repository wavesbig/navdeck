const TERM_PATTERN = /[a-z0-9]+|[\p{Script=Han}]+/gu;

const IGNORED_TERMS = new Set([
  'app',
  'apps',
  'com',
  'cn',
  'dashboard',
  'external',
  'http',
  'https',
  'internal',
  'lan',
  'local',
  'login',
  'nav',
  'navigation',
  'net',
  'org',
  'panel',
  'portal',
  'service',
  'services',
  'site',
  'web',
  'www',
]);

const RELATED_TERMS: Record<string, string[]> = {
  auth: ['authelia', 'authentik', 'keycloak', 'pocketid'],
  backup: ['borg', 'borgmatic', 'duplicati', 'kopia', 'restic'],
  blog: ['ghost', 'wordpress'],
  book: ['audiobookshelf', 'kavita', 'komga'],
  db: ['postgres', 'mysql', 'mariadb', 'redis'],
  doc: ['paperlessngx', 'paperlessng'],
  download: ['qbittorrent', 'transmission', 'sabnzbd'],
  ha: ['homeassistant', 'homebridge'],
  home: ['homeassistant', 'homebridge', 'openhab'],
  mail: ['dockermailserver', 'mailcow', 'stalwart'],
  movie: ['jellyfin', 'emby', 'plex', 'overseerr'],
  music: ['navidrome', 'koel', 'funkwhale'],
  note: ['memos', 'joplin', 'siyuan'],
  password: ['bitwarden', 'vaultwarden', 'keepass'],
  photo: ['immich', 'photoprism', 'pigallery2'],
  search: ['searxng', 'meilisearch', 'typesense'],
  torrent: ['qbittorrent', 'transmission', 'deluge'],
  影: ['jellyfin', 'emby', 'plex', 'overseerr'],
  音: ['jellyfin', 'navidrome', 'koel', 'funkwhale'],
  媒: ['jellyfin', 'emby', 'plex', 'audiobookshelf'],
  密: ['bitwarden', 'vaultwarden', 'keepass'],
  笔: ['memos', 'joplin', 'siyuan'],
};

function normalizeTerm(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\p{Script=Han}]+/gu, '');
}

function tokenize(value: string): string[] {
  return value.toLowerCase().match(TERM_PATTERN) ?? [];
}

function addTerm(
  terms: Map<string, number>,
  value: string,
  weight: number,
): void {
  for (const rawTerm of tokenize(value)) {
    if (IGNORED_TERMS.has(rawTerm) || /^\d+$/.test(rawTerm)) continue;

    const normalized = normalizeTerm(rawTerm);
    if (normalized.length === 0) continue;

    terms.set(normalized, Math.max(terms.get(normalized) ?? 0, weight));

    for (const related of RELATED_TERMS[normalized] ?? []) {
      terms.set(related, Math.max(terms.get(related) ?? 0, weight * 0.8));
    }
  }
}

function collectTerms(
  cardName: string | undefined,
  sourceUrl: string | undefined,
): Map<string, number> {
  const terms = new Map<string, number>();

  if (cardName?.trim()) addTerm(terms, cardName, 1.2);

  if (sourceUrl?.trim()) {
    const rawUrl = sourceUrl.trim();
    let url: URL | null = null;
    try {
      url = new URL(rawUrl.includes('://') ? rawUrl : `http://${rawUrl}`);
    } catch {
      url = null;
    }

    if (url) {
      addTerm(terms, url.hostname, 1.35);
      addTerm(terms, decodeURIComponent(url.pathname), 0.85);
      addTerm(terms, url.search, 0.7);
    } else {
      addTerm(terms, rawUrl, 1.1);
    }
  }

  return terms;
}

export function getIconRecommendations<
  T extends { name: string; label: string },
>(
  icons: T[],
  cardName: string | undefined,
  sourceUrl: string | undefined,
  limit = 10,
): T[] {
  if (icons.length === 0) return [];

  const terms = collectTerms(cardName, sourceUrl);
  if (terms.size === 0) return [];

  const scored = icons.flatMap((icon) => {
    const keys = [normalizeTerm(icon.name), normalizeTerm(icon.label)].filter(
      Boolean,
    );
    let score = 0;

    for (const [term, weight] of terms) {
      let termScore = 0;
      for (const key of keys) {
        if (key === term) {
          termScore = Math.max(termScore, 42 + Math.min(term.length, 18));
        } else if (key.startsWith(term)) {
          termScore = Math.max(termScore, 18 + Math.min(term.length, 18));
        } else if (term.startsWith(key) && key.length >= 3) {
          termScore = Math.max(termScore, 12 + Math.min(key.length, 18));
        }
      }
      score += termScore * weight;
    }

    return score >= 18 ? [{ icon, score }] : [];
  });

  return scored
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.icon.label.localeCompare(b.icon.label, 'zh-Hans-CN'),
    )
    .slice(0, limit)
    .map(({ icon }) => icon);
}
