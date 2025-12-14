CREATE TABLE `albums` (
	`id` text PRIMARY KEY NOT NULL,
	`spotify_id` text NOT NULL,
	`name` text NOT NULL,
	`artist` text NOT NULL,
	`image_url` text NOT NULL,
	`release_date` text,
	`spotify_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `albums_spotify_id_unique` ON `albums` (`spotify_id`);--> statement-breakpoint
CREATE TABLE `post_albums` (
	`id` text PRIMARY KEY NOT NULL,
	`post_id` text NOT NULL,
	`album_id` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
