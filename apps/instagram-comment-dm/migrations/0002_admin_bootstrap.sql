-- Bootstrap do primeiro administrador.
-- A linha única impede rebootstrap mesmo se o usuário inicial for removido depois.
CREATE TABLE admin_bootstrap (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  used_at TEXT NOT NULL DEFAULT (datetime('now'))
);
