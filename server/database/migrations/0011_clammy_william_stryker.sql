SET default_storage_engine = InnoDB;
--> statement-breakpoint
CREATE TABLE `appointment_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`appointment_id` bigint unsigned NOT NULL,
	`customer_id` bigint unsigned,
	`actor` enum('customer','staff','system') NOT NULL,
	`action` varchar(80) NOT NULL,
	`old_values` json,
	`new_values` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `appointment_events_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE `customer_auth_challenges` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`phone` varchar(30) NOT NULL,
	`customer_name` varchar(150),
	`code_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`attempts` int unsigned NOT NULL DEFAULT 0,
	`consumed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_auth_challenges_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE `customer_notifications` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`customer_id` bigint unsigned NOT NULL,
	`appointment_id` bigint unsigned,
	`type` enum('booking_created','booking_updated','booking_cancelled','reminder') NOT NULL,
	`channel` enum('in_app','sms') NOT NULL DEFAULT 'in_app',
	`title` varchar(180) NOT NULL,
	`message` varchar(500) NOT NULL,
	`scheduled_at` timestamp NOT NULL DEFAULT (now()),
	`sent_at` timestamp,
	`read_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_notifications_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE `customer_sessions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`customer_id` bigint unsigned NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` varchar(500),
	`expires_at` timestamp NOT NULL,
	`last_seen_at` timestamp NOT NULL DEFAULT (now()),
	`revoked_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `customer_sessions_token_hash_unique` UNIQUE(`token_hash`)
) ENGINE=InnoDB;
--> statement-breakpoint
ALTER TABLE `appointment_events` ADD CONSTRAINT `appointment_events_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `appointment_events` ADD CONSTRAINT `appointment_events_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `customer_notifications` ADD CONSTRAINT `customer_notifications_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `customer_notifications` ADD CONSTRAINT `customer_notifications_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `customer_sessions` ADD CONSTRAINT `customer_sessions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `appointment_events_appointment_created_idx` ON `appointment_events` (`appointment_id`,`created_at`);
--> statement-breakpoint
CREATE INDEX `customer_auth_challenges_phone_created_idx` ON `customer_auth_challenges` (`phone`,`created_at`);
--> statement-breakpoint
CREATE INDEX `customer_notifications_customer_schedule_idx` ON `customer_notifications` (`customer_id`,`scheduled_at`);
--> statement-breakpoint
CREATE INDEX `customer_notifications_pending_idx` ON `customer_notifications` (`channel`,`sent_at`,`scheduled_at`);
--> statement-breakpoint
CREATE INDEX `customer_sessions_customer_expires_idx` ON `customer_sessions` (`customer_id`,`expires_at`);
