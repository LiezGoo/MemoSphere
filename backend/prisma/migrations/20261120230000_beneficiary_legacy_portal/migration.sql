ALTER TABLE `beneficiaries`
  MODIFY `status` ENUM('INVITED', 'REGISTERED', 'ACCEPTED', 'VERIFIED', 'SUSPENDED', 'REMOVED', 'DECLINED', 'REVOKED') NOT NULL DEFAULT 'INVITED';

ALTER TABLE `beneficiaries` ADD COLUMN `userId` VARCHAR(191) NULL;

ALTER TABLE `beneficiaries` ADD INDEX `beneficiaries_userId_status_idx` (`userId`, `status`);

ALTER TABLE `beneficiaries`
  ADD CONSTRAINT `beneficiaries_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `legacy_policy_resources` (
  `id` VARCHAR(191) NOT NULL,
  `policyId` VARCHAR(191) NOT NULL,
  `resourceType` ENUM('FILE', 'PLAYLIST', 'WISHES') NOT NULL,
  `resourceId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `legacy_policy_resources_policyId_resourceType_resourceId_key` (`policyId`, `resourceType`, `resourceId`),
  INDEX `legacy_policy_resources_resourceType_resourceId_idx` (`resourceType`, `resourceId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `legacy_policy_resources_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `legacy_policies` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
