SET default_storage_engine = InnoDB;
--> statement-breakpoint
CREATE TABLE `ai_post_jobs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`title` varchar(250) NOT NULL,
	`category` varchar(150) NOT NULL,
	`keyword` varchar(180) NOT NULL DEFAULT '',
	`cluster` varchar(150) NOT NULL DEFAULT '',
	`article_type` varchar(80) NOT NULL DEFAULT 'Hướng dẫn',
	`word_range` varchar(40) NOT NULL DEFAULT '900–1.200',
	`target_action` varchar(500) NOT NULL DEFAULT '',
	`image_source` json,
	`scheduled_at` timestamp,
	`after_create` enum('draft','published') NOT NULL DEFAULT 'draft',
	`keep_title` boolean NOT NULL DEFAULT true,
	`status` enum('queued','generating','generated','scheduled','published','error') NOT NULL DEFAULT 'queued',
	`generated_post_id` bigint unsigned,
	`error` text,
	`created_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ai_post_jobs_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE `ai_prompt_revisions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`prompt_key` varchar(80) NOT NULL,
	`content` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT false,
	`created_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ai_prompt_revisions_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE `chat_leads` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`session_id` bigint unsigned NOT NULL,
	`customer_name` varchar(150),
	`phone` varchar(30),
	`service_name` varchar(150),
	`preferred_at` timestamp,
	`note` text,
	`status` enum('incomplete','complete','booked','contacted','closed') NOT NULL DEFAULT 'incomplete',
	`appointment_id` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_leads_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_leads_session_unique` UNIQUE(`session_id`)
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`session_id` bigint unsigned NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`sources` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE `chat_sessions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`public_token` varchar(64) NOT NULL,
	`status` enum('active','closed','hidden') NOT NULL DEFAULT 'active',
	`page_url` varchar(500),
	`last_message_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chat_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_sessions_public_token_unique` UNIQUE(`public_token`)
) ENGINE=InnoDB;
--> statement-breakpoint
ALTER TABLE `appointments` MODIFY COLUMN `source` enum('website','chatbot','phone','walk_in','admin') NOT NULL DEFAULT 'website';
--> statement-breakpoint
ALTER TABLE `ai_post_jobs` ADD CONSTRAINT `ai_post_jobs_generated_post_id_posts_id_fk` FOREIGN KEY (`generated_post_id`) REFERENCES `posts`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `ai_post_jobs` ADD CONSTRAINT `ai_post_jobs_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `ai_prompt_revisions` ADD CONSTRAINT `ai_prompt_revisions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `chat_leads` ADD CONSTRAINT `chat_leads_session_id_chat_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `chat_leads` ADD CONSTRAINT `chat_leads_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_session_id_chat_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `chat_sessions`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `ai_post_jobs_status_schedule_idx` ON `ai_post_jobs` (`status`,`scheduled_at`);
--> statement-breakpoint
CREATE INDEX `ai_post_jobs_created_idx` ON `ai_post_jobs` (`created_at`);
--> statement-breakpoint
CREATE INDEX `ai_prompt_revisions_key_created_idx` ON `ai_prompt_revisions` (`prompt_key`,`created_at`);
--> statement-breakpoint
CREATE INDEX `ai_prompt_revisions_key_active_idx` ON `ai_prompt_revisions` (`prompt_key`,`is_active`);
--> statement-breakpoint
CREATE INDEX `chat_leads_status_updated_idx` ON `chat_leads` (`status`,`updated_at`);
--> statement-breakpoint
CREATE INDEX `chat_leads_phone_idx` ON `chat_leads` (`phone`);
--> statement-breakpoint
CREATE INDEX `chat_messages_session_created_idx` ON `chat_messages` (`session_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `chat_sessions_status_last_idx` ON `chat_sessions` (`status`,`last_message_at`);
