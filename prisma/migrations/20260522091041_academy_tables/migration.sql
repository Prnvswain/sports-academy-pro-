/*
  Warnings:

  - You are about to drop the `academies` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `academies`;

-- CreateTable
CREATE TABLE `Academy` (
    `academy_id` INTEGER NOT NULL AUTO_INCREMENT,
    `academy_name` VARCHAR(191) NOT NULL,
    `owner_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(191) NOT NULL,
    `subscription_plan` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Academy_email_key`(`email`),
    PRIMARY KEY (`academy_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Coach` (
    `coach_id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(191) NOT NULL,
    `specialization` VARCHAR(191) NULL,
    `academy_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Coach_email_key`(`email`),
    PRIMARY KEY (`coach_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Student` (
    `student_id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(191) NOT NULL,
    `dob` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `blood_group` VARCHAR(191) NULL,
    `phone_number` VARCHAR(191) NULL,
    `academy_id` INTEGER NOT NULL,
    `coach_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`student_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Coach` ADD CONSTRAINT `Coach_academy_id_fkey` FOREIGN KEY (`academy_id`) REFERENCES `Academy`(`academy_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_academy_id_fkey` FOREIGN KEY (`academy_id`) REFERENCES `Academy`(`academy_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_coach_id_fkey` FOREIGN KEY (`coach_id`) REFERENCES `Coach`(`coach_id`) ON DELETE SET NULL ON UPDATE CASCADE;
