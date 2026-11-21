ALTER TABLE `user_playlists`
  ADD COLUMN `kind` VARCHAR(10) NOT NULL DEFAULT 'playlist',
  ADD COLUMN `youtube_video_id` CHAR(11) NULL,
  ADD COLUMN `start_seconds` INT NULL,
  MODIFY COLUMN `youtube_playlist_id` VARCHAR(64) NULL;

ALTER TABLE `user_playlists`
  ADD CONSTRAINT `user_playlists_exactly_one_youtube_id_chk`
  CHECK (
    (`kind` = 'playlist' AND `youtube_playlist_id` IS NOT NULL AND `youtube_video_id` IS NULL)
    OR (`kind` = 'video' AND `youtube_playlist_id` IS NULL AND `youtube_video_id` IS NOT NULL)
  );
