SET default_storage_engine = InnoDB;
--> statement-breakpoint
ALTER TABLE `posts` ADD `related_product_ids` json;
