ALTER TABLE posts ADD COLUMN thumbnail_url TEXT;
ALTER TABLE posts ADD COLUMN permalink TEXT;

UPDATE automation_rules
SET dm_template = 'Olá, @{{nome}}! Aqui estão os produtos que você pediu:

{{link_produto}}'
WHERE dm_template = 'Olá, {{nome}}! Aqui estão os produtos que você pediu:

{{link_produto}}';
