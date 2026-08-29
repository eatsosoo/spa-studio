SET default_storage_engine = InnoDB;
--> statement-breakpoint
CREATE TABLE `inventory_document_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`document_id` bigint unsigned NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`direction` enum('increase','decrease'),
	`quantity` decimal(14,3) NOT NULL,
	`unit_cost` decimal(14,2),
	`reason_code` varchar(60),
	`batch_number` varchar(80),
	`expiry_date` date,
	`note` varchar(500),
	CONSTRAINT `inventory_document_items_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE `inventory_documents` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`reference` varchar(40) NOT NULL,
	`type` enum('receipt','adjustment','transfer') NOT NULL,
	`status` enum('draft','posted','cancelled') NOT NULL DEFAULT 'draft',
	`source_location_id` bigint unsigned,
	`destination_location_id` bigint unsigned,
	`supplier_name` varchar(180),
	`invoice_number` varchar(80),
	`note` varchar(500),
	`occurred_at` timestamp NOT NULL,
	`created_by` bigint unsigned,
	`posted_by` bigint unsigned,
	`posted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_documents_reference_unique` UNIQUE(`reference`)
) ENGINE=InnoDB;
--> statement-breakpoint
ALTER TABLE `inventory_stocks` MODIFY COLUMN `quantity` decimal(14,3) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE `inventory_stocks` MODIFY COLUMN `reserved_quantity` decimal(14,3) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE `inventory_stocks` MODIFY COLUMN `min_quantity` decimal(14,3) NOT NULL DEFAULT '0';--> statement-breakpoint
ALTER TABLE `inventory_transactions` MODIFY COLUMN `quantity_delta` decimal(14,3) NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_transactions` MODIFY COLUMN `quantity_after` decimal(14,3) NOT NULL;--> statement-breakpoint
INSERT INTO `inventory_transactions` (`product_id`, `location_id`, `type`, `quantity_delta`, `quantity_after`, `reference_type`, `reference_id`, `note`)
SELECT s.`product_id`, s.`location_id`, 'opening', s.`quantity`, s.`quantity`, 'migration_opening', s.`product_id`, 'Tồn đầu kỳ khi kích hoạt sổ kho'
FROM `inventory_stocks` s
WHERE s.`quantity` <> 0
  AND NOT EXISTS (
    SELECT 1 FROM `inventory_transactions` it
    WHERE it.`product_id` = s.`product_id` AND it.`location_id` = s.`location_id`
  );--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD `document_item_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD `inventory_location_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_document_item_unique` UNIQUE(`document_item_id`,`location_id`,`type`);--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_source_unique` UNIQUE(`reference_type`,`reference_id`,`location_id`,`type`);--> statement-breakpoint
ALTER TABLE `inventory_document_items` ADD CONSTRAINT `inventory_document_items_document_id_inventory_documents_id_fk` FOREIGN KEY (`document_id`) REFERENCES `inventory_documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_document_items` ADD CONSTRAINT `inventory_document_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_documents` ADD CONSTRAINT `inventory_documents_source_location_id_inventory_locations_id_fk` FOREIGN KEY (`source_location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_documents` ADD CONSTRAINT `inventory_docs_destination_location_fk` FOREIGN KEY (`destination_location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_documents` ADD CONSTRAINT `inventory_documents_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_documents` ADD CONSTRAINT `inventory_documents_posted_by_users_id_fk` FOREIGN KEY (`posted_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `inventory_document_items_document_idx` ON `inventory_document_items` (`document_id`);--> statement-breakpoint
CREATE INDEX `inventory_document_items_product_idx` ON `inventory_document_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `inventory_documents_status_occurred_idx` ON `inventory_documents` (`status`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `inventory_documents_type_occurred_idx` ON `inventory_documents` (`type`,`occurred_at`);--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_tx_document_item_fk` FOREIGN KEY (`document_item_id`) REFERENCES `inventory_document_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_inventory_location_id_inventory_locations_id_fk` FOREIGN KEY (`inventory_location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO `permissions` (`code`, `module`, `action`, `description`)
VALUES ('inventory.receive', 'inventory', 'receive', 'Nhập hàng và ghi sổ phiếu nhập')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);
--> statement-breakpoint
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id` FROM `roles` r CROSS JOIN `permissions` p
WHERE r.`code` IN ('owner', 'manager', 'warehouse') AND p.`code` = 'inventory.receive';
