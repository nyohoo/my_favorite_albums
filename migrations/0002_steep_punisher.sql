CREATE TABLE `short_urls` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action
);
