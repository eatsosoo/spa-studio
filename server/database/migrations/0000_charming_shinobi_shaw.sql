SET default_storage_engine = InnoDB;
--> statement-breakpoint
SET NAMES utf8mb4;
--> statement-breakpoint
CREATE TABLE `appointment_services` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`appointment_id` bigint unsigned NOT NULL,
	`service_id` bigint unsigned NOT NULL,
	`employee_id` bigint unsigned,
	`service_name` varchar(150) NOT NULL,
	`duration_minutes` int unsigned NOT NULL,
	`unit_price` decimal(14,2) NOT NULL,
	`discount_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`final_price` decimal(14,2) NOT NULL,
	`commission_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`status` enum('scheduled','in_progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`started_at` timestamp,
	`completed_at` timestamp,
	CONSTRAINT `appointment_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`reference` varchar(30) NOT NULL,
	`branch_id` bigint unsigned NOT NULL,
	`customer_id` bigint unsigned,
	`customer_name` varchar(150) NOT NULL,
	`customer_phone` varchar(30) NOT NULL,
	`starts_at` timestamp NOT NULL,
	`ends_at` timestamp NOT NULL,
	`status` enum('pending','confirmed','checked_in','in_service','completed','cancelled','no_show') NOT NULL DEFAULT 'pending',
	`source` enum('website','phone','walk_in','admin') NOT NULL DEFAULT 'website',
	`subtotal` decimal(14,2) NOT NULL DEFAULT '0',
	`discount_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`total_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`promotion_id` bigint unsigned,
	`coupon_id` bigint unsigned,
	`notes` text,
	`cancellation_reason` varchar(500),
	`created_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `appointments_id` PRIMARY KEY(`id`),
	CONSTRAINT `appointments_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`employee_id` bigint unsigned NOT NULL,
	`branch_id` bigint unsigned NOT NULL,
	`work_date` date NOT NULL,
	`shift_start` time,
	`shift_end` time,
	`check_in_at` timestamp,
	`check_out_at` timestamp,
	`regular_minutes` int unsigned NOT NULL DEFAULT 0,
	`overtime_minutes` int unsigned NOT NULL DEFAULT 0,
	`late_minutes` int unsigned NOT NULL DEFAULT 0,
	`status` enum('present','absent','leave','holiday') NOT NULL DEFAULT 'present',
	`note` varchar(500),
	`approved_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attendance_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_employee_date_unique` UNIQUE(`employee_id`,`work_date`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`action` varchar(80) NOT NULL,
	`entity_type` varchar(80) NOT NULL,
	`entity_id` varchar(80),
	`old_values` json,
	`new_values` json,
	`ip_address` varchar(45),
	`user_agent` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`ip_address` varchar(45),
	`user_agent` varchar(500),
	`expires_at` timestamp NOT NULL,
	`last_seen_at` timestamp NOT NULL DEFAULT (now()),
	`revoked_at` timestamp,
	`revoke_reason` varchar(120),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_sessions_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(30) NOT NULL,
	`name` varchar(150) NOT NULL,
	`phone` varchar(30),
	`email` varchar(190),
	`address_line` varchar(255),
	`ward` varchar(100),
	`district` varchar(100),
	`province` varchar(100),
	`country` varchar(2) NOT NULL DEFAULT 'VN',
	`timezone` varchar(50) NOT NULL DEFAULT 'Asia/Bangkok',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `coupon_redemptions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`coupon_id` bigint unsigned NOT NULL,
	`customer_id` bigint unsigned,
	`appointment_id` bigint unsigned,
	`order_id` bigint unsigned,
	`discount_amount` decimal(14,2) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupon_redemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`promotion_id` bigint unsigned NOT NULL,
	`code` varchar(60) NOT NULL,
	`usage_limit` int unsigned,
	`used_count` int unsigned NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(30) NOT NULL,
	`full_name` varchar(150) NOT NULL,
	`phone` varchar(30) NOT NULL,
	`email` varchar(190),
	`gender` enum('female','male','other'),
	`date_of_birth` date,
	`address` varchar(255),
	`source` varchar(80),
	`loyalty_points` int NOT NULL DEFAULT 0,
	`total_spent` decimal(14,2) NOT NULL DEFAULT '0',
	`notes` text,
	`marketing_consent` boolean NOT NULL DEFAULT false,
	`status` enum('active','inactive','blocked') NOT NULL DEFAULT 'active',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_code_unique` UNIQUE(`code`),
	CONSTRAINT `customers_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `employee_salary_configs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`employee_id` bigint unsigned NOT NULL,
	`salary_type` enum('monthly','daily','hourly') NOT NULL DEFAULT 'monthly',
	`base_salary` decimal(14,2) NOT NULL DEFAULT '0',
	`hourly_rate` decimal(14,2) NOT NULL DEFAULT '0',
	`overtime_rate` decimal(14,2) NOT NULL DEFAULT '0',
	`service_commission_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`product_commission_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`effective_from` date NOT NULL,
	`effective_to` date,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `employee_salary_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned,
	`branch_id` bigint unsigned NOT NULL,
	`code` varchar(30) NOT NULL,
	`full_name` varchar(150) NOT NULL,
	`phone` varchar(30),
	`email` varchar(190),
	`gender` enum('female','male','other'),
	`date_of_birth` date,
	`address` varchar(255),
	`identity_number` varchar(30),
	`hire_date` date NOT NULL,
	`termination_date` date,
	`job_title` varchar(100),
	`employment_type` enum('full_time','part_time','contract') NOT NULL DEFAULT 'full_time',
	`status` enum('active','on_leave','terminated') NOT NULL DEFAULT 'active',
	`emergency_contact` varchar(150),
	`emergency_phone` varchar(30),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_user_unique` UNIQUE(`user_id`),
	CONSTRAINT `employees_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `inventory_locations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`branch_id` bigint unsigned NOT NULL,
	`code` varchar(30) NOT NULL,
	`name` varchar(120) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_locations_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `inventory_stocks` (
	`product_id` bigint unsigned NOT NULL,
	`location_id` bigint unsigned NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`reserved_quantity` int unsigned NOT NULL DEFAULT 0,
	`min_quantity` int unsigned NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `inventory_stocks_product_id_location_id_pk` PRIMARY KEY(`product_id`,`location_id`)
);
--> statement-breakpoint
CREATE TABLE `inventory_transactions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	`location_id` bigint unsigned NOT NULL,
	`type` enum('opening','purchase','sale','service_usage','adjustment','transfer_in','transfer_out','return') NOT NULL,
	`quantity_delta` int NOT NULL,
	`quantity_after` int NOT NULL,
	`unit_cost` decimal(14,2),
	`reference_type` varchar(50),
	`reference_id` bigint unsigned,
	`note` varchar(500),
	`performed_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` bigint unsigned NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `payroll_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`payroll_id` bigint unsigned NOT NULL,
	`type` enum('earning','deduction') NOT NULL,
	`code` varchar(50) NOT NULL,
	`description` varchar(255) NOT NULL,
	`quantity` decimal(10,2) NOT NULL DEFAULT '1',
	`rate` decimal(14,2) NOT NULL DEFAULT '0',
	`amount` decimal(14,2) NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payroll_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payroll_periods` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`branch_id` bigint unsigned NOT NULL,
	`name` varchar(100) NOT NULL,
	`starts_on` date NOT NULL,
	`ends_on` date NOT NULL,
	`status` enum('draft','calculated','approved','paid','cancelled') NOT NULL DEFAULT 'draft',
	`approved_by` bigint unsigned,
	`approved_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payroll_periods_id` PRIMARY KEY(`id`),
	CONSTRAINT `payroll_period_branch_dates_unique` UNIQUE(`branch_id`,`starts_on`,`ends_on`)
);
--> statement-breakpoint
CREATE TABLE `payrolls` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`period_id` bigint unsigned NOT NULL,
	`employee_id` bigint unsigned NOT NULL,
	`base_salary` decimal(14,2) NOT NULL DEFAULT '0',
	`attendance_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`overtime_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`service_commission` decimal(14,2) NOT NULL DEFAULT '0',
	`product_commission` decimal(14,2) NOT NULL DEFAULT '0',
	`bonus_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`deduction_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`gross_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`net_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`paid_at` timestamp,
	`note` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payrolls_id` PRIMARY KEY(`id`),
	CONSTRAINT `payrolls_period_employee_unique` UNIQUE(`period_id`,`employee_id`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(120) NOT NULL,
	`module` varchar(60) NOT NULL,
	`action` varchar(40) NOT NULL,
	`description` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `post_categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`slug` varchar(150) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `post_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `post_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`category_id` bigint unsigned,
	`author_id` bigint unsigned,
	`title` varchar(250) NOT NULL,
	`slug` varchar(280) NOT NULL,
	`excerpt` varchar(500),
	`content` text NOT NULL,
	`featured_image_url` varchar(500),
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`published_at` timestamp,
	`meta_title` varchar(250),
	`meta_description` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`),
	CONSTRAINT `posts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`parent_id` bigint unsigned,
	`name` varchar(120) NOT NULL,
	`slug` varchar(150) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`category_id` bigint unsigned,
	`sku` varchar(60) NOT NULL,
	`barcode` varchar(80),
	`name` varchar(180) NOT NULL,
	`slug` varchar(200) NOT NULL,
	`short_description` varchar(500),
	`description` text,
	`unit` varchar(30) NOT NULL DEFAULT 'sản phẩm',
	`cost_price` decimal(14,2) NOT NULL DEFAULT '0',
	`sale_price` decimal(14,2) NOT NULL,
	`track_inventory` boolean NOT NULL DEFAULT true,
	`status` enum('draft','active','inactive','out_of_stock') NOT NULL DEFAULT 'draft',
	`image_url` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_sku_unique` UNIQUE(`sku`),
	CONSTRAINT `products_barcode_unique` UNIQUE(`barcode`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `promotion_products` (
	`promotion_id` bigint unsigned NOT NULL,
	`product_id` bigint unsigned NOT NULL,
	CONSTRAINT `promotion_products_promotion_id_product_id_pk` PRIMARY KEY(`promotion_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `promotion_services` (
	`promotion_id` bigint unsigned NOT NULL,
	`service_id` bigint unsigned NOT NULL,
	CONSTRAINT `promotion_services_promotion_id_service_id_pk` PRIMARY KEY(`promotion_id`,`service_id`)
);
--> statement-breakpoint
CREATE TABLE `promotions` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(150) NOT NULL,
	`description` text,
	`discount_type` enum('percent','fixed_amount') NOT NULL,
	`discount_value` decimal(14,2) NOT NULL,
	`max_discount_amount` decimal(14,2),
	`min_order_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`usage_limit` int unsigned,
	`per_customer_limit` int unsigned,
	`starts_at` timestamp NOT NULL,
	`ends_at` timestamp NOT NULL,
	`is_automatic` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `promotions_id` PRIMARY KEY(`id`),
	CONSTRAINT `promotions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` bigint unsigned NOT NULL,
	`permission_id` bigint unsigned NOT NULL,
	CONSTRAINT `role_permissions_role_id_permission_id_pk` PRIMARY KEY(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(80) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` varchar(255),
	`is_system` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `sales_order_items` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`product_id` bigint unsigned,
	`sku` varchar(60) NOT NULL,
	`product_name` varchar(180) NOT NULL,
	`quantity` int unsigned NOT NULL,
	`unit_price` decimal(14,2) NOT NULL,
	`discount_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`total_amount` decimal(14,2) NOT NULL,
	`commission_amount` decimal(14,2) NOT NULL DEFAULT '0',
	CONSTRAINT `sales_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_orders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`reference` varchar(30) NOT NULL,
	`branch_id` bigint unsigned NOT NULL,
	`customer_id` bigint unsigned,
	`status` enum('draft','confirmed','paid','cancelled','refunded') NOT NULL DEFAULT 'draft',
	`subtotal` decimal(14,2) NOT NULL DEFAULT '0',
	`discount_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`total_amount` decimal(14,2) NOT NULL DEFAULT '0',
	`promotion_id` bigint unsigned,
	`coupon_id` bigint unsigned,
	`sold_by` bigint unsigned,
	`paid_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sales_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_orders_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `service_categories` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`parent_id` bigint unsigned,
	`name` varchar(120) NOT NULL,
	`slug` varchar(150) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`category_id` bigint unsigned,
	`code` varchar(30) NOT NULL,
	`name` varchar(150) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`description` text,
	`duration_minutes` int unsigned NOT NULL,
	`buffer_minutes` int unsigned NOT NULL DEFAULT 0,
	`price` decimal(14,2) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `services_id` PRIMARY KEY(`id`),
	CONSTRAINT `services_code_unique` UNIQUE(`code`),
	CONSTRAINT `services_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`branch_id` bigint unsigned,
	`group` varchar(60) NOT NULL DEFAULT 'general',
	`key` varchar(120) NOT NULL,
	`value` json NOT NULL,
	`is_public` boolean NOT NULL DEFAULT false,
	`description` varchar(255),
	`updated_by` bigint unsigned,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_scope_key_unique` UNIQUE(`branch_id`,`key`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` bigint unsigned NOT NULL,
	`role_id` bigint unsigned NOT NULL,
	`branch_id` bigint unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_roles_user_id_role_id_branch_id_pk` PRIMARY KEY(`user_id`,`role_id`,`branch_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`username` varchar(80) NOT NULL,
	`email` varchar(190),
	`phone` varchar(30),
	`password_hash` varchar(255) NOT NULL,
	`status` enum('pending','active','locked','disabled') NOT NULL DEFAULT 'active',
	`email_verified_at` timestamp,
	`phone_verified_at` timestamp,
	`failed_login_attempts` int unsigned NOT NULL DEFAULT 0,
	`locked_until` timestamp,
	`last_login_at` timestamp,
	`password_changed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
ALTER TABLE `appointment_services` ADD CONSTRAINT `appointment_services_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointment_services` ADD CONSTRAINT `appointment_services_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointment_services` ADD CONSTRAINT `appointment_services_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_promotion_id_promotions_id_fk` FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `appointments` ADD CONSTRAINT `appointments_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `attendance_records` ADD CONSTRAINT `attendance_records_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD CONSTRAINT `auth_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_appointment_id_appointments_id_fk` FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupon_redemptions` ADD CONSTRAINT `coupon_redemptions_order_id_sales_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `sales_orders`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_promotion_id_promotions_id_fk` FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employee_salary_configs` ADD CONSTRAINT `employee_salary_configs_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_locations` ADD CONSTRAINT `inventory_locations_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_stocks` ADD CONSTRAINT `inventory_stocks_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_stocks` ADD CONSTRAINT `inventory_stocks_location_id_inventory_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_location_id_inventory_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_performed_by_users_id_fk` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_items` ADD CONSTRAINT `payroll_items_payroll_id_payrolls_id_fk` FOREIGN KEY (`payroll_id`) REFERENCES `payrolls`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_periods` ADD CONSTRAINT `payroll_periods_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payroll_periods` ADD CONSTRAINT `payroll_periods_approved_by_users_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_period_id_payroll_periods_id_fk` FOREIGN KEY (`period_id`) REFERENCES `payroll_periods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payrolls` ADD CONSTRAINT `payrolls_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_category_id_post_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `post_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `posts` ADD CONSTRAINT `posts_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_product_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotion_products` ADD CONSTRAINT `promotion_products_promotion_id_promotions_id_fk` FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotion_products` ADD CONSTRAINT `promotion_products_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotion_services` ADD CONSTRAINT `promotion_services_promotion_id_promotions_id_fk` FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `promotion_services` ADD CONSTRAINT `promotion_services_service_id_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_order_items` ADD CONSTRAINT `sales_order_items_order_id_sales_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `sales_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_order_items` ADD CONSTRAINT `sales_order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_promotion_id_promotions_id_fk` FOREIGN KEY (`promotion_id`) REFERENCES `promotions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_sold_by_employees_id_fk` FOREIGN KEY (`sold_by`) REFERENCES `employees`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `services` ADD CONSTRAINT `services_category_id_service_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `service_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `system_settings` ADD CONSTRAINT `system_settings_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_branch_id_branches_id_fk` FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `appointment_services_appointment_idx` ON `appointment_services` (`appointment_id`);--> statement-breakpoint
CREATE INDEX `appointment_services_employee_idx` ON `appointment_services` (`employee_id`);--> statement-breakpoint
CREATE INDEX `appointments_branch_start_idx` ON `appointments` (`branch_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `appointments_customer_idx` ON `appointments` (`customer_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `appointments_status_idx` ON `appointments` (`status`);--> statement-breakpoint
CREATE INDEX `attendance_branch_date_idx` ON `attendance_records` (`branch_id`,`work_date`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_user_created_idx` ON `audit_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_expires_idx` ON `auth_sessions` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `coupon_redemptions_coupon_idx` ON `coupon_redemptions` (`coupon_id`);--> statement-breakpoint
CREATE INDEX `coupon_redemptions_customer_idx` ON `coupon_redemptions` (`customer_id`);--> statement-breakpoint
CREATE INDEX `customers_name_idx` ON `customers` (`full_name`);--> statement-breakpoint
CREATE INDEX `salary_configs_employee_effective_idx` ON `employee_salary_configs` (`employee_id`,`effective_from`);--> statement-breakpoint
CREATE INDEX `employees_branch_status_idx` ON `employees` (`branch_id`,`status`);--> statement-breakpoint
CREATE INDEX `inventory_transactions_product_location_idx` ON `inventory_transactions` (`product_id`,`location_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `inventory_transactions_reference_idx` ON `inventory_transactions` (`reference_type`,`reference_id`);--> statement-breakpoint
CREATE INDEX `payroll_items_payroll_idx` ON `payroll_items` (`payroll_id`);--> statement-breakpoint
CREATE INDEX `permissions_module_idx` ON `permissions` (`module`);--> statement-breakpoint
CREATE INDEX `posts_status_published_idx` ON `posts` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `products_category_status_idx` ON `products` (`category_id`,`status`);--> statement-breakpoint
CREATE INDEX `promotions_active_period_idx` ON `promotions` (`is_active`,`starts_at`,`ends_at`);--> statement-breakpoint
CREATE INDEX `sales_order_items_order_idx` ON `sales_order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `sales_orders_branch_created_idx` ON `sales_orders` (`branch_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `system_settings_group_idx` ON `system_settings` (`group`);--> statement-breakpoint
CREATE INDEX `users_status_idx` ON `users` (`status`);
