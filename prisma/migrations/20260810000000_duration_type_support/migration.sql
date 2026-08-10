-- Migration: Add Duration Type Support (MONTHS/DAYS)
-- This migration adds support for both month-based and day-based duration plans

-- Add duration_type column to duration_plans table with default 'MONTHS'
ALTER TABLE duration_plans ADD COLUMN duration_type VARCHAR(20) NOT NULL DEFAULT 'MONTHS';

-- Rename duration_months to duration
ALTER TABLE duration_plans CHANGE COLUMN duration_months duration INT NOT NULL;

-- Update existing data: ensure all existing plans have duration_type as MONTHS
UPDATE duration_plans SET duration_type = 'MONTHS' WHERE duration_type IS NULL OR duration_type = '';

-- Add constraint to ensure only valid values (optional, for data integrity)
ALTER TABLE duration_plans ADD CONSTRAINT chk_duration_type CHECK (duration_type IN ('MONTHS', 'DAYS'));

-- Add index on duration_type for better query performance
CREATE INDEX idx_duration_plans_duration_type ON duration_plans(duration_type);

-- Update table comment
ALTER TABLE duration_plans COMMENT = 'Duration plans (1/3/6/12 months or custom days) — separate from subscription tiers';
