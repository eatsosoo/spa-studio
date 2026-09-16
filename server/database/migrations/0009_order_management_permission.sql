SET default_storage_engine = InnoDB;
--> statement-breakpoint
INSERT INTO `permissions` (`code`, `module`, `action`, `description`)
VALUES ('orders.manage', 'orders', 'manage', 'Xác nhận, thanh toán, hoàn tất và hủy đơn hàng');
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r CROSS JOIN `permissions` p
WHERE p.code = 'orders.manage' AND r.code IN ('owner', 'manager', 'receptionist');
