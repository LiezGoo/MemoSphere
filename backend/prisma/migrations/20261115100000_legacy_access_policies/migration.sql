ALTER TABLE `beneficiaries`
  MODIFY `relationship` VARCHAR(80) NULL,
  ADD COLUMN `verifiedAt` DATETIME(3) NULL,
  MODIFY `status` ENUM('INVITED', 'REGISTERED', 'VERIFIED', 'SUSPENDED', 'REMOVED', 'DECLINED', 'REVOKED') NOT NULL DEFAULT 'INVITED';

ALTER TABLE `diary_entries` ADD COLUMN `neverShare` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `legacy_policies` (
  `id` VARCHAR(191) NOT NULL,
  `ownerId` VARCHAR(191) NOT NULL,
  `beneficiaryId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'REVOKED', 'RELEASED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
  `accessLevel` VARCHAR(30) NOT NULL DEFAULT 'read_only',
  `scopeType` VARCHAR(30) NOT NULL,
  `scopeCategories` JSON NULL,
  `scopeDateFrom` DATETIME(3) NULL,
  `scopeDateTo` DATETIME(3) NULL,
  `excludedEntryIds` JSON NOT NULL,
  `releaseMethod` VARCHAR(30) NOT NULL,
  `releaseAt` DATETIME(3) NULL,
  `verifierBeneficiaryId` VARCHAR(191) NULL,
  `coolingOffDays` INTEGER NOT NULL DEFAULT 7,
  `expiresAt` DATETIME(3) NULL,
  `releasedAt` DATETIME(3) NULL,
  `releaseRequestedAt` DATETIME(3) NULL,
  `releaseReadyAt` DATETIME(3) NULL,
  `activeScopeKey` VARCHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `legacy_policies_ownerId_beneficiaryId_activeScopeKey_key` (`ownerId`, `beneficiaryId`, `activeScopeKey`),
  INDEX `legacy_policies_ownerId_status_idx` (`ownerId`, `status`),
  INDEX `legacy_policies_beneficiaryId_idx` (`beneficiaryId`),
  CONSTRAINT `legacy_policies_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `legacy_policies_beneficiaryId_fkey` FOREIGN KEY (`beneficiaryId`) REFERENCES `beneficiaries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `policy_entry_links` (
  `policyId` VARCHAR(191) NOT NULL,
  `entryId` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`policyId`, `entryId`),
  INDEX `policy_entry_links_policyId_idx` (`policyId`),
  CONSTRAINT `policy_entry_links_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `legacy_policies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `policy_entry_links_entryId_fkey` FOREIGN KEY (`entryId`) REFERENCES `diary_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `legacy_audit_log` (
  `id` VARCHAR(191) NOT NULL,
  `ownerId` VARCHAR(191) NOT NULL,
  `policyId` VARCHAR(191) NULL,
  `actorType` VARCHAR(20) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `action` VARCHAR(100) NOT NULL,
  `metadata` JSON NULL,
  `ipHash` VARCHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `legacy_audit_log_ownerId_createdAt_idx` (`ownerId`, `createdAt`),
  INDEX `legacy_audit_log_policyId_idx` (`policyId`),
  CONSTRAINT `legacy_audit_log_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `owners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `legacy_audit_log_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `legacy_policies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `legacy_release_tokens` (
  `id` VARCHAR(191) NOT NULL,
  `policyId` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `legacy_release_tokens_tokenHash_key` (`tokenHash`),
  INDEX `legacy_release_tokens_policyId_idx` (`policyId`),
  INDEX `legacy_release_tokens_expiresAt_idx` (`expiresAt`),
  CONSTRAINT `legacy_release_tokens_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `legacy_policies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `users` ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL;
