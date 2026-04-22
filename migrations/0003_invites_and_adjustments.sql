CREATE TABLE IF NOT EXISTS household_invites (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    household_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_household_invites_household_id ON household_invites(household_id);
CREATE INDEX IF NOT EXISTS idx_household_invites_expires_at ON household_invites(expires_at);

ALTER TABLE expenses ADD COLUMN entry_type TEXT NOT NULL DEFAULT 'expense';

CREATE INDEX IF NOT EXISTS idx_expenses_household_entry_type ON expenses(household_id, entry_type);

UPDATE expenses
SET entry_type = 'balance_adjustment'
WHERE transaction_date = '2000-01-01'
  AND description IN ('月次予算', '資産初期残高', '残高追加');
