CREATE TABLE `life_countdowns` (
  `id` VARCHAR(191) NOT NULL,
  `ownerId` VARCHAR(191) NOT NULL,
  `durationDays` INTEGER NOT NULL,
  `startDate` DATETIME(3) NOT NULL,
  `expirationDate` DATETIME(3) NOT NULL,
  `status` ENUM('ACTIVE', 'COMPLETED') NOT NULL DEFAULT 'ACTIVE',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `life_countdowns_ownerId_createdAt_idx`(`ownerId`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `life_countdowns_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
