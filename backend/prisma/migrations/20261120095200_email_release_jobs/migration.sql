ALTER TABLE `legacy_release_tokens`
  ADD COLUMN `kind` VARCHAR(20) NOT NULL DEFAULT 'release',
  ADD COLUMN `beneficiaryId` VARCHAR(191) NULL;

ALTER TABLE `legacy_release_tokens`
  ADD INDEX `legacy_release_tokens_policyId_kind_idx` (`policyId`, `kind`);

ALTER TABLE `beneficiaries`
  ADD COLUMN `invitationTokenHash` VARCHAR(64) NULL,
  ADD COLUMN `invitationExpiresAt` DATETIME(3) NULL,
  ADD COLUMN `invitationUsedAt` DATETIME(3) NULL;

CREATE TABLE `email_outbox` (
  `id` VARCHAR(191) NOT NULL,
  `toEmail` VARCHAR(255) NOT NULL,
  `template` VARCHAR(40) NOT NULL,
  `payload` JSON NOT NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastError` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `sentAt` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `email_outbox_idempotencyKey_key` (`idempotencyKey`),
  INDEX `email_outbox_status_nextAttemptAt_idx` (`status`, `nextAttemptAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
