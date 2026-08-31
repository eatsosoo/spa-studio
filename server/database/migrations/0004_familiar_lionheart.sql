SET default_storage_engine = InnoDB;
--> statement-breakpoint
ALTER TABLE `inventory_documents` DROP FOREIGN KEY `inventory_documents_destination_location_id_inventory_l_91080e71`;
--> statement-breakpoint
ALTER TABLE `inventory_transactions` DROP FOREIGN KEY `inventory_transactions_document_item_id_inventory_docum_1f96f99b`;
--> statement-breakpoint
ALTER TABLE `inventory_documents` ADD CONSTRAINT `inventory_documents_destination_location_id_inventory_l_91080e71` FOREIGN KEY (`destination_location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_document_item_id_inventory_docum_1f96f99b` FOREIGN KEY (`document_item_id`) REFERENCES `inventory_document_items`(`id`) ON DELETE no action ON UPDATE no action;
