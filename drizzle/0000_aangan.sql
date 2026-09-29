CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`customer` text NOT NULL,
	`address` text NOT NULL,
	`phone` text NOT NULL,
	`pincode` text NOT NULL,
	`items` text NOT NULL,
	`total` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL
);

--> statement-breakpoint
CREATE INDEX `idx_orders_created_at` ON `orders` (`created_at`);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
