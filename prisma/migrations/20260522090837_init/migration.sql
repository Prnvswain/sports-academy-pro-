-- CreateTable
CREATE TABLE `Academies` (
    `academy_id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `owner_name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone_number` VARCHAR(191) NOT NULL,
    `subscription_plan` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Academies_email_key`(`email`),
    PRIMARY KEY (`academy_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
