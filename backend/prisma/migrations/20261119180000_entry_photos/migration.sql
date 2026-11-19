CREATE TABLE `entry_photos` (
  `id` VARCHAR(191) NOT NULL,
  `entry_id` VARCHAR(191) NOT NULL,
  `owner_id` VARCHAR(191) NOT NULL,
  `cloudinary_public_id` VARCHAR(512) NOT NULL,
  `width` INT NOT NULL,
  `height` INT NOT NULL,
  `bytes` INT NOT NULL,
  `alt_text` VARCHAR(200) NULL,
  `position` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `entry_photos_cloudinary_public_id_key` (`cloudinary_public_id`),
  INDEX `entry_photos_entry_id_position_idx` (`entry_id`, `position`),
  INDEX `entry_photos_owner_id_idx` (`owner_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `entry_photos_entry_id_fkey` FOREIGN KEY (`entry_id`) REFERENCES `diary_entries` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
