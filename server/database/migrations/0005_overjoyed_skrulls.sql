SET default_storage_engine = InnoDB;
--> statement-breakpoint
CREATE TABLE `sales_order_status_history` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`status` varchar(40) NOT NULL,
	`note` varchar(500),
	`changed_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sales_order_status_history_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB;
--> statement-breakpoint
ALTER TABLE `products` ADD `size` varchar(60);
--> statement-breakpoint
ALTER TABLE `products` ADD `benefits` json;
--> statement-breakpoint
ALTER TABLE `products` ADD `ingredients` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `usage` text;
--> statement-breakpoint
ALTER TABLE `products` ADD `image_position` varchar(60) DEFAULT 'center' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `source` enum('website','admin','walk_in') DEFAULT 'website' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `access_token_hash` varchar(64);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `idempotency_key` varchar(80);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `customer_name` varchar(150);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `customer_phone` varchar(30);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `customer_email` varchar(190);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `customer_note` varchar(500);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `shipping_address_line` varchar(255);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `shipping_ward` varchar(100);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `shipping_district` varchar(100);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `shipping_province` varchar(100);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `shipping_fee` decimal(14,2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `payment_method` enum('cod','bank_transfer') DEFAULT 'cod' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `payment_status` enum('unpaid','pending','paid','failed','partially_refunded','refunded') DEFAULT 'unpaid' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `fulfillment_status` enum('unfulfilled','packing','shipped','delivered','returned') DEFAULT 'unfulfilled' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `reservation_expires_at` timestamp;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `confirmed_at` timestamp;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `cancelled_at` timestamp;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `completed_at` timestamp;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `cancellation_reason` varchar(500);
--> statement-breakpoint
UPDATE `sales_orders` SET `payment_status` = 'paid', `fulfillment_status` = 'delivered', `completed_at` = `paid_at`, `confirmed_at` = COALESCE(`paid_at`, `created_at`) WHERE `status` = 'paid';
--> statement-breakpoint
UPDATE `sales_orders` SET `payment_status` = 'refunded', `fulfillment_status` = 'returned', `completed_at` = COALESCE(`paid_at`, `updated_at`), `confirmed_at` = `created_at` WHERE `status` = 'refunded';
--> statement-breakpoint
UPDATE `sales_orders` SET `confirmed_at` = `created_at` WHERE `status` = 'confirmed';
--> statement-breakpoint
UPDATE `sales_orders` SET `cancelled_at` = `updated_at` WHERE `status` = 'cancelled';
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_access_token_unique` UNIQUE(`access_token_hash`);
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_idempotency_unique` UNIQUE(`idempotency_key`);
--> statement-breakpoint
ALTER TABLE `sales_order_status_history` ADD CONSTRAINT `sales_order_status_history_order_id_sales_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `sales_orders`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `sales_order_status_history` ADD CONSTRAINT `sales_order_status_history_changed_by_users_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `sales_order_status_history_order_idx` ON `sales_order_status_history` (`order_id`,`created_at`);
--> statement-breakpoint
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_order_item_fk` FOREIGN KEY (`order_item_id`) REFERENCES `sales_order_items`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `sales_orders_status_created_idx` ON `sales_orders` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `sales_orders_customer_phone_idx` ON `sales_orders` (`customer_phone`,`created_at`);
