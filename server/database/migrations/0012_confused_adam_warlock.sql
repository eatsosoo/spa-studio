SET default_storage_engine = InnoDB;
--> statement-breakpoint
ALTER TABLE `customers` ADD `password_hash` varchar(255);
--> statement-breakpoint
ALTER TABLE `customers` ADD `password_changed_at` timestamp;
