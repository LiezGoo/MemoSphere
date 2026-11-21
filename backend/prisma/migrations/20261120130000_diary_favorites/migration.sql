ALTER TABLE `diary_entries`
  ADD COLUMN `isFavorite` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `diary_entries`
  ADD INDEX `diary_entries_ownerId_isFavorite_status_idx` (`ownerId`, `isFavorite`, `status`);
