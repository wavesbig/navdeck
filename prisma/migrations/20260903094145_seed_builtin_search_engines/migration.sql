-- 内置 5 引擎落库（id = 原内置 key，已有 searchEngine 偏好无缝延续）
INSERT INTO "search_engines" ("id", "name", "urlTemplate", "iconPath", "order") VALUES
  ('google', 'Google', 'https://www.google.com/search?q=', '/icons/library/svg/google.svg', 0),
  ('bing', 'Bing', 'https://www.bing.com/search?q=', '/icons/library/svg/bing.svg', 1),
  ('baidu', '百度', 'https://www.baidu.com/s?wd=', '/icons/library/svg/baidu.svg', 2),
  ('github', 'GitHub', 'https://github.com/search?q=', '/icons/library/svg/github.svg', 3),
  ('stackoverflow', 'Stack Overflow', 'https://stackoverflow.com/search?q=', '/icons/library/svg/stackoverflow.svg', 4);