-- Step 1: Add batch_id column as nullable (to allow updating existing rows)
ALTER TABLE `coach_attendance` ADD COLUMN `batch_id` INT NULL;

-- Step 2: Add foreign key constraint for batch_id
ALTER TABLE `coach_attendance` ADD CONSTRAINT `coach_att_batch_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 3: Drop the old unique constraint (coach_id, date)
ALTER TABLE `coach_attendance` DROP INDEX `coach_attendance_coach_id_date_key`;

-- Step 4: Add the new unique constraint (coach_id, batch_id, date)
ALTER TABLE `coach_attendance` ADD UNIQUE INDEX `coach_attendance_coach_id_batch_id_date_key` (`coach_id`, `batch_id`, `date`);

-- Note: Existing rows will have batch_id as NULL. You'll need to update them manually
-- to assign appropriate batch IDs before making the column NOT NULL.
-- After updating existing rows, run:
-- ALTER TABLE `coach_attendance` MODIFY COLUMN `batch_id` INT NOT NULL;
