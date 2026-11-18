ALTER TABLE `users`
  ADD COLUMN `bio` TEXT NULL,
  ADD COLUMN `avatarUrl` VARCHAR(500) NULL,
  ADD COLUMN `timezone` VARCHAR(100) NOT NULL DEFAULT 'UTC',
  ADD COLUMN `notificationPreferences` JSON NOT NULL DEFAULT (JSON_OBJECT());

CREATE TABLE `notifications` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `type` ENUM('COUNTDOWN', 'REMINDER', 'REVISION_READY', 'SECURITY', 'SYSTEM') NOT NULL,
  `title` VARCHAR(160) NOT NULL,
  `body` VARCHAR(500) NOT NULL,
  `link` VARCHAR(500) NULL,
  `isRead` BOOLEAN NOT NULL DEFAULT false,
  `readAt` DATETIME(3) NULL,
  `dedupeKey` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `notifications_dedupeKey_key` (`dedupeKey`),
  INDEX `notifications_userId_isRead_createdAt_idx` (`userId`, `isRead`, `createdAt` DESC),
  CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
