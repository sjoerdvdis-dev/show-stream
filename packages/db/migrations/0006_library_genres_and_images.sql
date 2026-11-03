CREATE TABLE `media_genres` (
	`media_id` integer NOT NULL,
	`genre` text NOT NULL,
	PRIMARY KEY(`media_id`, `genre`),
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_genres_genre_idx` ON `media_genres` (`genre`);--> statement-breakpoint
ALTER TABLE `media` ADD `poster_format` text;--> statement-breakpoint
ALTER TABLE `media` ADD `backdrop_format` text;