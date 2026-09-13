BEGIN;
ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE savings_goals DROP CONSTRAINT IF EXISTS chk_savings_goal_status;
ALTER TABLE savings_goals ADD CONSTRAINT chk_savings_goal_status CHECK (status IN ('ACTIVE','COMPLETED','PAUSED','CANCELLED','ARCHIVED','DELETED'));
CREATE TABLE IF NOT EXISTS goal_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  goal_id UUID NOT NULL REFERENCES savings_goals(id),
  action TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION audit_savings_goal() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO goal_audit(user_id, goal_id, action, before_state, after_state)
  VALUES (NEW.user_id, NEW.id, TG_OP, CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END, to_jsonb(NEW));
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS savings_goal_audit ON savings_goals;
CREATE TRIGGER savings_goal_audit AFTER INSERT OR UPDATE ON savings_goals FOR EACH ROW EXECUTE FUNCTION audit_savings_goal();
COMMIT;
