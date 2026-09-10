SET default_storage_engine = InnoDB;
--> statement-breakpoint
ALTER TABLE `posts` ADD `focus_keyword` varchar(160);
--> statement-breakpoint
ALTER TABLE `posts` ADD `secondary_keywords` json;
