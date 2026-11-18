ALTER TABLE `users`
  ADD COLUMN `faceEnabled` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `faceConsentAt` DATETIME(3) NULL;

CREATE TABLE `face_templates` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `encryptedVector` LONGTEXT NOT NULL,
  `keyVersion` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `face_templates_userId_idx` (`userId`),
  CONSTRAINT `face_templates_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `face_challenges` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `nonceHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `face_challenges_nonceHash_key` (`nonceHash`),
  INDEX `face_challenges_userId_expiresAt_idx` (`userId`, `expiresAt`),
  CONSTRAINT `face_challenges_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `face_audit_events` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NULL,
  `action` VARCHAR(40) NOT NULL,
  `result` VARCHAR(20) NOT NULL,
  `ipHash` VARCHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `face_audit_events_userId_createdAt_idx` (`userId`, `createdAt`),
  INDEX `face_audit_events_action_createdAt_idx` (`action`, `createdAt`),
  CONSTRAINT `face_audit_events_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
