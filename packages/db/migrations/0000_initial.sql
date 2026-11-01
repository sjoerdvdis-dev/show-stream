CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`media_id` integer,
	`status` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error` text,
	FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_type_media_id_unique` ON `jobs` (`type`,`media_id`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`tmdb_id` integer,
	`title` text NOT NULL,
	`year` integer,
	`path` text NOT NULL,
	`release_date` text,
	`runtime` integer,
	`vote_average` real,
	`vote_count` integer,
	`popularity` real,
	`metadata` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_type_tmdb_id_unique` ON `media` (`type`,`tmdb_id`);--> statement-breakpoint
CREATE INDEX `media_type_title_idx` ON `media` (`type`,`title`);--> statement-breakpoint
CREATE INDEX `media_type_year_idx` ON `media` (`type`,`year`);--> statement-breakpoint
CREATE INDEX `media_type_release_date_idx` ON `media` (`type`,`release_date`);--> statement-breakpoint
CREATE INDEX `media_type_runtime_idx` ON `media` (`type`,`runtime`);--> statement-breakpoint
CREATE INDEX `media_type_vote_average_idx` ON `media` (`type`,`vote_average`);--> statement-breakpoint
CREATE INDEX `media_type_vote_count_idx` ON `media` (`type`,`vote_count`);--> statement-breakpoint
CREATE INDEX `media_type_popularity_idx` ON `media` (`type`,`popularity`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);