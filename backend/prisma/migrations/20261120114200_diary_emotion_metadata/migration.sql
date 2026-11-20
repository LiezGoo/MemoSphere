ALTER TABLE `diary_entries`
  ADD COLUMN `emotionConfidence` DOUBLE NULL,
  ADD COLUMN `emotionReason` VARCHAR(300) NULL,
  ADD COLUMN `emotionSource` VARCHAR(20) NULL,
  ADD COLUMN `emotionUpdatedAt` DATETIME(3) NULL;
