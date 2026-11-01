ALTER TABLE `jobs` ADD `announced` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `jobs_status_announced_idx` ON `jobs` (`status`,`announced`);