-- =============================================
-- Session 3.2: Activities, Documents & Reports
-- Adapted to existing Prisma schema field names
-- =============================================

-- Add new columns to activities table
ALTER TABLE activities ADD COLUMN IF NOT EXISTS person_id TEXT REFERENCES persons(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS subtipo TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS include_in_report BOOLEAN DEFAULT TRUE;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS report_priority INTEGER DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS communication_type TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS recipients TEXT[] DEFAULT '{}';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS financial_impact DECIMAL(15,2);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS financial_type TEXT;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_activities_person ON activities(person_id);
CREATE INDEX IF NOT EXISTS idx_activities_tipo ON activities(tipo);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_report ON activities(include_in_report, report_priority) WHERE include_in_report = TRUE;

-- =============================================
-- TABLE: financial_releases (alvarás, RPVs, precatórios)
-- =============================================
CREATE TABLE IF NOT EXISTS financial_releases (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tipo TEXT NOT NULL CHECK (tipo IN ('ALVARA','RPV','PRECATORIO')),
  numero_referencia TEXT NOT NULL,
  case_id TEXT REFERENCES cases(id) ON DELETE SET NULL,
  person_id TEXT REFERENCES persons(id) ON DELETE SET NULL,
  valor DECIMAL(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','EXPEDIDO','LIBERADO','BLOQUEADO','CANCELADO')),
  data_prevista DATE,
  data_liberacao DATE,
  observacoes TEXT,
  activity_id TEXT,
  created_by_id TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_releases_person ON financial_releases(person_id);
CREATE INDEX IF NOT EXISTS idx_financial_releases_case ON financial_releases(case_id);
CREATE INDEX IF NOT EXISTS idx_financial_releases_status ON financial_releases(status);

-- =============================================
-- TABLE: report_snapshots (relatórios salvos)
-- =============================================
CREATE TABLE IF NOT EXISTS report_snapshots (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  person_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  executive_summary TEXT,
  next_steps TEXT,
  kpis_data JSONB,
  report_data JSONB,
  pdf_path TEXT,
  shared_with_client BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMPTZ,
  created_by_id TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_person ON report_snapshots(person_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_period ON report_snapshots(period_start, period_end);

-- =============================================
-- Triggers para updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS financial_releases_updated_at ON financial_releases;
CREATE TRIGGER financial_releases_updated_at BEFORE UPDATE ON financial_releases FOR EACH ROW EXECUTE FUNCTION update_updated_at();
