-- Genres and search are kept in step with `media` by triggers, so that every way of saving a
-- title, including an upsert, updates them in the same statement. Existing titles are filled here.
INSERT OR IGNORE INTO `media_genres` (`media_id`, `genre`)
	SELECT `media`.`id`, json_extract(`genre`.`value`, '$.name')
	FROM `media`, json_each(`media`.`metadata`, '$.details.genres') AS `genre`
	WHERE json_type(`genre`.`value`, '$.name') = 'text';
--> statement-breakpoint
CREATE TRIGGER `media_genres_after_insert` AFTER INSERT ON `media` BEGIN
	INSERT OR IGNORE INTO `media_genres` (`media_id`, `genre`)
		SELECT NEW.`id`, json_extract(`value`, '$.name')
		FROM json_each(NEW.`metadata`, '$.details.genres')
		WHERE json_type(`value`, '$.name') = 'text';
END;
--> statement-breakpoint
CREATE TRIGGER `media_genres_after_update` AFTER UPDATE OF `metadata` ON `media` BEGIN
	DELETE FROM `media_genres` WHERE `media_id` = OLD.`id`;
	INSERT OR IGNORE INTO `media_genres` (`media_id`, `genre`)
		SELECT NEW.`id`, json_extract(`value`, '$.name')
		FROM json_each(NEW.`metadata`, '$.details.genres')
		WHERE json_type(`value`, '$.name') = 'text';
END;
--> statement-breakpoint
-- The rowid is the title's `id`. The tokenizer folds case and accents.
CREATE VIRTUAL TABLE `media_search` USING fts5(`title`, `original_title`, tokenize = 'unicode61 remove_diacritics 2');
--> statement-breakpoint
INSERT INTO `media_search` (`rowid`, `title`, `original_title`)
	SELECT `id`, `title`, json_extract(`metadata`, '$.details.original_title') FROM `media`;
--> statement-breakpoint
CREATE TRIGGER `media_search_after_insert` AFTER INSERT ON `media` BEGIN
	INSERT INTO `media_search` (`rowid`, `title`, `original_title`)
		VALUES (NEW.`id`, NEW.`title`, json_extract(NEW.`metadata`, '$.details.original_title'));
END;
--> statement-breakpoint
CREATE TRIGGER `media_search_after_update` AFTER UPDATE OF `title`, `metadata` ON `media` BEGIN
	DELETE FROM `media_search` WHERE `rowid` = OLD.`id`;
	INSERT INTO `media_search` (`rowid`, `title`, `original_title`)
		VALUES (NEW.`id`, NEW.`title`, json_extract(NEW.`metadata`, '$.details.original_title'));
END;
--> statement-breakpoint
CREATE TRIGGER `media_search_after_delete` AFTER DELETE ON `media` BEGIN
	DELETE FROM `media_search` WHERE `rowid` = OLD.`id`;
END;
