-- Remove preferences superseded by the fixed horizontal widget strip.
DELETE FROM "user_preferences"
WHERE "key" IN ('widgetLayout', 'widgetBarWidth');
