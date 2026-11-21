CREATE TABLE `user_files` (
  `id` VARCHAR(191) NOT NULL,
  `owner_id` VARCHAR(191) NOT NULL,
  `drive_file_id` VARCHAR(200) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `mime` VARCHAR(150) NOT NULL,
  `size` BIGINT UNSIGNED NOT NULL,
  `category` VARCHAR(20) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `user_files_owner_id_drive_file_id_key` (`owner_id`, `drive_file_id`),
  INDEX `user_files_owner_id_category_created_at_idx` (`owner_id`, `category`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `user_files_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `user_playlists` (
  `id` VARCHAR(191) NOT NULL,
  `owner_id` VARCHAR(191) NOT NULL,
  `youtube_playlist_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `position` INTEGER NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `user_playlists_owner_id_position_created_at_idx` (`owner_id`, `position`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `user_playlists_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
