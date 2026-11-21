ALTER TABLE `ai_message_sources`
  MODIFY COLUMN `diaryEntryId` VARCHAR(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;

ALTER TABLE `ai_message_sources` ADD COLUMN `sourceType` VARCHAR(30) NOT NULL DEFAULT 'DIARY_ENTRY';
ALTER TABLE `ai_message_sources` ADD COLUMN `sourceId` VARCHAR(191) NULL;
ALTER TABLE `ai_message_sources` ADD COLUMN `sourceTitle` VARCHAR(255) NULL;
ALTER TABLE `ai_message_sources` ADD COLUMN `sourceDate` DATETIME(3) NULL;
