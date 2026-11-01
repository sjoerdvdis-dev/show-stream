-- A job from before the worker has no video in its payload, and any process running it is gone.
-- Removing it reads as `not ready`, and asking again queues a new job.
DELETE FROM `jobs` WHERE `status` IN ('not ready', 'in progress');--> statement-breakpoint
UPDATE `jobs` SET `status` = 'done', `announced` = 1 WHERE `status` = 'ready';
