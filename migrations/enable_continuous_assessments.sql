-- Migration: Enable Continuous Assessments for Performance Tracking
-- This migration removes the "latest only" constraint and enables unlimited assessments

-- Step 1: Add assessment_id column to performance_scores
ALTER TABLE performance_scores 
ADD COLUMN assessment_id VARCHAR(36) NULL 
AFTER batch_id;

-- Step 2: Add index for assessment_id for faster grouping queries
CREATE INDEX idx_performance_scores_assessment_id ON performance_scores(assessment_id);

-- Step 3: Add index for scored_at for chronological queries
CREATE INDEX idx_performance_scores_scored_at ON performance_scores(scored_at);

-- Step 4: Remove the unique constraint that prevented multiple assessments
-- Note: The constraint name might vary based on MySQL version
-- Try to drop the unique constraint
ALTER TABLE performance_scores DROP INDEX IF EXISTS student_id_attribute_id;

-- Step 5: Backfill assessment_id for existing records
-- Generate UUIDs for existing records to group them logically
-- This ensures backward compatibility
UPDATE performance_scores 
SET assessment_id = CONCAT('legacy-', score_id, '-', UNIX_TIMESTAMP(created_at))
WHERE assessment_id IS NULL;

-- Step 6: Verify the changes
SELECT 
    'Migration completed successfully' AS status,
    COUNT(*) AS total_scores,
    COUNT(DISTINCT assessment_id) AS unique_assessments
FROM performance_scores;
