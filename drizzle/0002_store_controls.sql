CREATE TABLE `checkout_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`gateway_id` text NOT NULL,
	`data` text NOT NULL,
	`settled` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);

--> statement-breakpoint
CREATE UNIQUE INDEX `checkout_sessions_gateway_id_unique` ON `checkout_sessions` (`gateway_id`);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`mime` text NOT NULL,
	`data` text NOT NULL
);

--> statement-breakpoint
CREATE TABLE `store_config` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
