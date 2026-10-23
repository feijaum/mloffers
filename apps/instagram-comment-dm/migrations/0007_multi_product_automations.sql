CREATE TABLE automation_rule_products (
  automation_rule_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (automation_rule_id, product_id),
  FOREIGN KEY (automation_rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

INSERT OR IGNORE INTO automation_rule_products (automation_rule_id, product_id, position)
SELECT id, product_id, 0 FROM automation_rules;

CREATE INDEX idx_automation_rule_products_rule
  ON automation_rule_products(automation_rule_id, position);
