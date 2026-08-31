SET default_storage_engine = InnoDB;
--> statement-breakpoint
CREATE TABLE `inventory_lots` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`location_id` bigint unsigned NOT NULL,
	`document_item_id` bigint unsigned,
	`batch_number` varchar(80) NOT NULL,
	`received_at` timestamp NOT NULL,
	`expiry_date` date,
	`initial_quantity` decimal(14,3) NOT NULL,
	`quantity` decimal(14,3) NOT NULL,
	`reserved_quantity` decimal(14,3) NOT NULL DEFAULT '0',
	`unit_cost` decimal(14,2) NOT NULL DEFAULT '0',
	`status` enum('available','depleted','blocked') NOT NULL DEFAULT 'available',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_lots_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_lots_document_location_unique` UNIQUE(`document_item_id`,`location_id`,`batch_number`)
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE `inventory_reservations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_item_id` bigint unsigned NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`location_id` bigint unsigned NOT NULL,
	`lot_id` bigint unsigned NOT NULL,
	`quantity` decimal(14,3) NOT NULL,
	`status` enum('active','consumed','released') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_reservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_reservations_order_lot_unique` UNIQUE(`order_item_id`,`lot_id`)
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE `service_product_usages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`service_id` bigint unsigned NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`quantity` decimal(14,3) NOT NULL,
	`note` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_product_usages_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_product_usages_service_product_unique` UNIQUE(`service_id`,`product_id`)
) ENGINE=InnoDB;
--> statement-breakpoint
INSERT INTO `inventory_lots` (`product_id`, `location_id`, `batch_number`, `received_at`, `initial_quantity`, `quantity`, `reserved_quantity`, `unit_cost`, `status`)
SELECT s.`product_id`, s.`location_id`, CONCAT('LEGACY-', s.`product_id`, '-', s.`location_id`), CURRENT_TIMESTAMP, s.`quantity`, s.`quantity`, s.`reserved_quantity`, p.`cost_price`, CASE WHEN s.`quantity` > 0 THEN 'available' ELSE 'depleted' END
FROM `inventory_stocks` s
INNER JOIN `products` p ON p.`id` = s.`product_id`
WHERE s.`quantity` > 0;
--> statement-breakpoint
ALTER TABLE `inventory_transactions` DROP FOREIGN KEY `inventory_tx_document_item_fk`;
--> statement-breakpoint
ALTER TABLE `inventory_transactions` DROP INDEX `inventory_transactions_document_item_unique`;
--> statement-breakpoint
ALTER TABLE `inventory_transactions` DROP INDEX `inventory_transactions_source_unique`;
--> statement-breakpoint
ALTER TABLE `inventory_documents` DROP FOREIGN KEY `inventory_docs_destination_location_fk`;
--> statement-breakpoint
ALTER TABLE `inventory_documents` MODIFY COLUMN `type` enum('receipt','adjustment','transfer','return') NOT NULL;
--> statement-breakpoint
ALTER TABLE `appointment_services` ADD `inventory_deducted_at` timestamp;
--> statement-breakpoint
ALTER TABLE `appointment_services` ADD `material_cost` decimal(14,2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE `inventory_document_items` ADD `disposition` enum('sellable','damaged') DEFAULT 'sellable' NOT NULL;
--> statement-breakpoint
ALTER TABLE `inventory_documents` ADD `source_order_id` bigint unsigned;
--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD `lot_id` bigint unsigned;
--> statement-breakpoint
ALTER TABLE `sales_order_items` ADD `unit_cost` decimal(14,2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sales_order_items` ADD `cost_amount` decimal(14,2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `total_cost` decimal(14,2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_document_item_unique` UNIQUE(`document_item_id`,`location_id`,`lot_id`,`type`);
--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_source_unique` UNIQUE(`reference_type`,`reference_id`,`location_id`,`lot_id`,`type`);
--> statement-breakpoint
ALTER TABLE `inventory_lots` ADD CONSTRAINT `inventory_lots_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `inventory_lots` ADD CONSTRAINT `inventory_lots_location_id_inventory_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `inventory_lots` ADD CONSTRAINT `inventory_lots_document_item_id_inventory_document_items_id_fk` FOREIGN KEY (`document_item_id`) REFERENCES `inventory_document_items`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_location_id_inventory_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `inventory_reservations` ADD CONSTRAINT `inventory_reservations_lot_id_inventory_lots_id_fk` FOREIGN KEY (`lot_id`) REFERENCES `inventory_lots`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `service_product_usages` ADD CONSTRAINT `service_product_usages_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `service_product_usages` ADD CONSTRAINT `service_product_usages_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `inventory_lots_fefo_idx` ON `inventory_lots` (`product_id`,`location_id`,`status`,`expiry_date`,`received_at`);
--> statement-breakpoint
CREATE INDEX `inventory_lots_expiry_idx` ON `inventory_lots` (`expiry_date`,`status`);
--> statement-breakpoint
CREATE INDEX `inventory_reservations_order_idx` ON `inventory_reservations` (`order_item_id`,`status`);
--> statement-breakpoint
CREATE INDEX `service_product_usages_product_idx` ON `service_product_usages` (`product_id`);
--> statement-breakpoint
ALTER TABLE `inventory_documents` ADD CONSTRAINT `inventory_documents_destination_location_id_inventory_l_91080e71` FOREIGN KEY (`destination_location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_document_item_id_inventory_docum_1f96f99b` FOREIGN KEY (`document_item_id`) REFERENCES `inventory_document_items`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_lot_id_inventory_lots_id_fk` FOREIGN KEY (`lot_id`) REFERENCES `inventory_lots`(`id`) ON DELETE set null ON UPDATE no action;
