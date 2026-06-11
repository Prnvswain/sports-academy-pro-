/*
  Warnings:

  - You are about to drop the `academy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `coach` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `coach` DROP FOREIGN KEY `Coach_academy_id_fkey`;

-- DropForeignKey
ALTER TABLE `student` DROP FOREIGN KEY `Student_academy_id_fkey`;

-- DropForeignKey
ALTER TABLE `student` DROP FOREIGN KEY `Student_coach_id_fkey`;

-- DropTable
DROP TABLE `academy`;

-- DropTable
DROP TABLE `coach`;

-- DropTable
DROP TABLE `student`;

-- CreateTable
CREATE TABLE `academies` (
    `academy_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `owner_name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone_number` VARCHAR(191) NULL,
    `subscription_plan` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `academies_email_key`(`email`),
    PRIMARY KEY (`academy_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `academy_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'ADMIN',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coaches` (
    `coach_id` INTEGER NOT NULL AUTO_INCREMENT,
    `academy_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `specialization` VARCHAR(191) NULL,
    `phone_number` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,

    PRIMARY KEY (`coach_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sports` (
    `sport_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `sports_name_key`(`name`),
    PRIMARY KEY (`sport_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `batches` (
    `batch_id` INTEGER NOT NULL AUTO_INCREMENT,
    `academy_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `coach_id` INTEGER NULL,
    `sport_id` INTEGER NULL,
    `timing` VARCHAR(191) NULL,

    PRIMARY KEY (`batch_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `students` (
    `student_id` INTEGER NOT NULL AUTO_INCREMENT,
    `academy_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `age` INTEGER NULL,
    `gender` VARCHAR(191) NULL,
    `sport_id` INTEGER NULL,
    `batch_id` INTEGER NULL,
    `blood_group` VARCHAR(191) NULL,
    `fees_status` VARCHAR(191) NOT NULL DEFAULT 'unpaid',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`student_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `payment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_date` DATETIME(3) NOT NULL,
    `method` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',

    PRIMARY KEY (`payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_attendance` (
    `attendance_id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `batch_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `marked_by_coach_id` INTEGER NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`attendance_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coach_attendance` (
    `attendance_id` INTEGER NOT NULL AUTO_INCREMENT,
    `coach_id` INTEGER NOT NULL,
    `academy_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `marked_by_admin_id` INTEGER NULL,
    `remarks` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`attendance_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_academy_id_fkey` FOREIGN KEY (`academy_id`) REFERENCES `academies`(`academy_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coaches` ADD CONSTRAINT `coaches_academy_id_fkey` FOREIGN KEY (`academy_id`) REFERENCES `academies`(`academy_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `batches` ADD CONSTRAINT `batches_academy_id_fkey` FOREIGN KEY (`academy_id`) REFERENCES `academies`(`academy_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `batches` ADD CONSTRAINT `batches_coach_id_fkey` FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`coach_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `batches` ADD CONSTRAINT `batches_sport_id_fkey` FOREIGN KEY (`sport_id`) REFERENCES `sports`(`sport_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_academy_id_fkey` FOREIGN KEY (`academy_id`) REFERENCES `academies`(`academy_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_sport_id_fkey` FOREIGN KEY (`sport_id`) REFERENCES `sports`(`sport_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`batch_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_attendance` ADD CONSTRAINT `student_attendance_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`student_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_attendance` ADD CONSTRAINT `student_attendance_batch_id_fkey` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_attendance` ADD CONSTRAINT `student_attendance_marked_by_coach_id_fkey` FOREIGN KEY (`marked_by_coach_id`) REFERENCES `coaches`(`coach_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coach_attendance` ADD CONSTRAINT `coach_attendance_coach_id_fkey` FOREIGN KEY (`coach_id`) REFERENCES `coaches`(`coach_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coach_attendance` ADD CONSTRAINT `coach_attendance_academy_id_fkey` FOREIGN KEY (`academy_id`) REFERENCES `academies`(`academy_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coach_attendance` ADD CONSTRAINT `coach_attendance_marked_by_admin_id_fkey` FOREIGN KEY (`marked_by_admin_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
