-- Migração saneada: adiciona o campo username, sem inserir senha ou usuário fixo.
ALTER TABLE users ADD COLUMN username TEXT COLLATE NOCASE;
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;
