SET default_storage_engine = InnoDB;
--> statement-breakpoint
CREATE TABLE `feedbacks` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`customer_id` bigint unsigned NOT NULL,
	`product_id` bigint unsigned,
	`service_id` bigint unsigned,
	`appointment_id` bigint unsigned,
	`order_id` bigint unsigned,
	`subject_type` enum('product','service') NOT NULL,
	`rating` int unsigned NOT NULL,
	`content` text NOT NULL,
	`status` enum('pending','approved','hidden') NOT NULL DEFAULT 'pending',
	`moderation_note` varchar(500),
	`moderated_by` bigint unsigned,
	`moderated_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `feedbacks_id` PRIMARY KEY(`id`),
	CONSTRAINT `feedbacks_customer_appointment_service_unique` UNIQUE(`customer_id`,`appointment_id`,`service_id`),
	CONSTRAINT `feedbacks_customer_order_product_unique` UNIQUE(`customer_id`,`order_id`,`product_id`)
) ENGINE=InnoDB;
--> statement-breakpoint
ALTER TABLE `feedbacks` ADD CONSTRAINT `feedbacks_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `feedbacks` ADD CONSTRAINT `feedbacks_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `feedbacks` ADD CONSTRAINT `feedbacks_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `feedbacks` ADD CONSTRAINT `feedbacks_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `feedbacks` ADD CONSTRAINT `feedbacks_order_id_sales_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `sales_orders`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `feedbacks` ADD CONSTRAINT `feedbacks_moderated_by_users_id_fk` FOREIGN KEY (`moderated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `feedbacks_status_created_idx` ON `feedbacks` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `feedbacks_customer_created_idx` ON `feedbacks` (`customer_id`,`created_at`);
--> statement-breakpoint
UPDATE `sales_orders` SET `customer_id` = NULL WHERE `source` = 'website';
--> statement-breakpoint
INSERT INTO `permissions` (`code`, `module`, `action`, `description`) VALUES
	('feedback.read', 'feedback', 'read', 'Xem đánh giá khách hàng'),
	('feedback.update', 'feedback', 'update', 'Duyệt hoặc ẩn đánh giá khách hàng'),
	('feedback.delete', 'feedback', 'delete', 'Xóa đánh giá khách hàng')
ON DUPLICATE KEY UPDATE `module` = VALUES(`module`), `action` = VALUES(`action`), `description` = VALUES(`description`);
--> statement-breakpoint
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id` FROM `roles` r CROSS JOIN `permissions` p
WHERE r.`code` IN ('owner', 'manager') AND p.`code` IN ('feedback.read', 'feedback.update', 'feedback.delete');
--> statement-breakpoint
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id` FROM `roles` r CROSS JOIN `permissions` p
WHERE r.`code` = 'receptionist' AND p.`code` IN ('feedback.read', 'feedback.update');
