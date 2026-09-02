-- 图标库完全切换到 homarr-labs/dashboard-icons
UPDATE "cards"
SET "icon" = 'https://gcore.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/' ||
             substr("icon", length('https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/') + 1)
WHERE "icon" LIKE 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/%';

UPDATE "cards"
SET "icon" = 'https://gcore.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/' ||
             substr("icon", length('https://gcore.jsdelivr.net/gh/walkxcode/dashboard-icons/png/') + 1)
WHERE "icon" LIKE 'https://gcore.jsdelivr.net/gh/walkxcode/dashboard-icons/png/%';

UPDATE "cards"
SET "icon" = replace(
    "icon",
    '/resilio-sync.png',
    '/resiliosync.png'
)
WHERE "icon" LIKE 'https://gcore.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/%';

UPDATE "cards"
SET "icon" = ''
WHERE "icon" = 'https://gcore.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/stackedit.png';
