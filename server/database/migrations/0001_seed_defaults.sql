SET NAMES utf8mb4;
--> statement-breakpoint
INSERT INTO `branches` (`code`, `name`, `country`, `timezone`)
VALUES ('MAIN', 'MIÊN Spa', 'VN', 'Asia/Bangkok');
--> statement-breakpoint
INSERT INTO `roles` (`code`, `name`, `description`, `is_system`) VALUES
  ('owner', 'Chủ hệ thống', 'Toàn quyền trên hệ thống', true),
  ('manager', 'Quản lý', 'Quản lý hoạt động chi nhánh', true),
  ('receptionist', 'Lễ tân', 'Khách hàng, lịch hẹn và thanh toán', true),
  ('therapist', 'Kỹ thuật viên', 'Xem lịch và cập nhật liệu trình được giao', true),
  ('warehouse', 'Thủ kho', 'Sản phẩm và tồn kho', true),
  ('hr', 'Nhân sự', 'Nhân viên, chấm công và tiền lương', true);
--> statement-breakpoint
INSERT INTO `permissions` (`code`, `module`, `action`, `description`) VALUES
  ('dashboard.read', 'dashboard', 'read', 'Xem tổng quan'),
  ('users.read', 'users', 'read', 'Xem tài khoản'),
  ('users.create', 'users', 'create', 'Tạo tài khoản'),
  ('users.update', 'users', 'update', 'Cập nhật tài khoản'),
  ('users.delete', 'users', 'delete', 'Vô hiệu hóa tài khoản'),
  ('roles.read', 'roles', 'read', 'Xem vai trò và quyền'),
  ('roles.manage', 'roles', 'manage', 'Quản lý vai trò và quyền'),
  ('customers.read', 'customers', 'read', 'Xem khách hàng'),
  ('customers.create', 'customers', 'create', 'Tạo khách hàng'),
  ('customers.update', 'customers', 'update', 'Cập nhật khách hàng'),
  ('customers.delete', 'customers', 'delete', 'Xóa mềm khách hàng'),
  ('employees.read', 'employees', 'read', 'Xem nhân viên'),
  ('employees.create', 'employees', 'create', 'Tạo nhân viên'),
  ('employees.update', 'employees', 'update', 'Cập nhật nhân viên'),
  ('employees.delete', 'employees', 'delete', 'Xóa mềm nhân viên'),
  ('services.read', 'services', 'read', 'Xem dịch vụ'),
  ('services.create', 'services', 'create', 'Tạo dịch vụ'),
  ('services.update', 'services', 'update', 'Cập nhật dịch vụ'),
  ('services.delete', 'services', 'delete', 'Xóa mềm dịch vụ'),
  ('products.read', 'products', 'read', 'Xem sản phẩm'),
  ('products.create', 'products', 'create', 'Tạo sản phẩm'),
  ('products.update', 'products', 'update', 'Cập nhật sản phẩm'),
  ('products.delete', 'products', 'delete', 'Xóa mềm sản phẩm'),
  ('inventory.read', 'inventory', 'read', 'Xem tồn kho'),
  ('inventory.adjust', 'inventory', 'adjust', 'Điều chỉnh tồn kho'),
  ('inventory.transfer', 'inventory', 'transfer', 'Điều chuyển tồn kho'),
  ('appointments.read', 'appointments', 'read', 'Xem lịch hẹn'),
  ('appointments.create', 'appointments', 'create', 'Tạo lịch hẹn'),
  ('appointments.update', 'appointments', 'update', 'Cập nhật lịch hẹn'),
  ('appointments.cancel', 'appointments', 'cancel', 'Hủy lịch hẹn'),
  ('appointments.assign', 'appointments', 'assign', 'Phân công kỹ thuật viên'),
  ('attendance.read', 'attendance', 'read', 'Xem chấm công'),
  ('attendance.check', 'attendance', 'check', 'Chấm công'),
  ('attendance.approve', 'attendance', 'approve', 'Duyệt chấm công'),
  ('payroll.read', 'payroll', 'read', 'Xem bảng lương'),
  ('payroll.calculate', 'payroll', 'calculate', 'Tính lương'),
  ('payroll.approve', 'payroll', 'approve', 'Duyệt bảng lương'),
  ('payroll.pay', 'payroll', 'pay', 'Đánh dấu đã trả lương'),
  ('promotions.read', 'promotions', 'read', 'Xem khuyến mãi'),
  ('promotions.create', 'promotions', 'create', 'Tạo khuyến mãi'),
  ('promotions.update', 'promotions', 'update', 'Cập nhật khuyến mãi'),
  ('promotions.delete', 'promotions', 'delete', 'Ngừng khuyến mãi'),
  ('orders.read', 'orders', 'read', 'Xem đơn bán hàng'),
  ('orders.create', 'orders', 'create', 'Tạo đơn bán hàng'),
  ('orders.refund', 'orders', 'refund', 'Hoàn tiền đơn hàng'),
  ('posts.read', 'posts', 'read', 'Xem bài viết'),
  ('posts.create', 'posts', 'create', 'Tạo bài viết'),
  ('posts.update', 'posts', 'update', 'Cập nhật bài viết'),
  ('posts.publish', 'posts', 'publish', 'Xuất bản bài viết'),
  ('posts.delete', 'posts', 'delete', 'Xóa mềm bài viết'),
  ('settings.read', 'settings', 'read', 'Xem cấu hình'),
  ('settings.update', 'settings', 'update', 'Cập nhật cấu hình'),
  ('audit.read', 'audit', 'read', 'Xem nhật ký hệ thống');
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r CROSS JOIN `permissions` p WHERE r.code = 'owner';
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r CROSS JOIN `permissions` p
WHERE r.code = 'manager' AND p.code NOT IN ('roles.manage', 'payroll.pay');
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r CROSS JOIN `permissions` p
WHERE r.code = 'receptionist' AND p.code IN (
  'dashboard.read', 'customers.read', 'customers.create', 'customers.update',
  'services.read', 'products.read', 'inventory.read', 'appointments.read',
  'appointments.create', 'appointments.update', 'appointments.cancel',
  'orders.read', 'orders.create', 'promotions.read'
);
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r CROSS JOIN `permissions` p
WHERE r.code = 'therapist' AND p.code IN (
  'dashboard.read', 'customers.read', 'services.read', 'appointments.read',
  'appointments.update', 'attendance.read', 'attendance.check', 'products.read'
);
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r CROSS JOIN `permissions` p
WHERE r.code = 'warehouse' AND (p.module IN ('products', 'inventory') OR p.code = 'dashboard.read');
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r CROSS JOIN `permissions` p
WHERE r.code = 'hr' AND (p.module IN ('employees', 'attendance', 'payroll') OR p.code = 'dashboard.read');
--> statement-breakpoint
INSERT INTO `system_settings` (`branch_id`, `group`, `key`, `value`, `is_public`, `description`)
SELECT b.id, seed.setting_group, seed.setting_key, seed.setting_value, seed.is_public, seed.description
FROM `branches` b
JOIN (
  SELECT 'general' setting_group, 'business.name' setting_key, JSON_QUOTE('MIÊN Spa') setting_value, true is_public, 'Tên thương hiệu' description
  UNION ALL SELECT 'contact', 'business.phone', JSON_QUOTE(''), true, 'Số điện thoại liên hệ'
  UNION ALL SELECT 'contact', 'business.email', JSON_QUOTE(''), true, 'Email liên hệ'
  UNION ALL SELECT 'contact', 'business.address', JSON_QUOTE(''), true, 'Địa chỉ hiển thị'
  UNION ALL SELECT 'booking', 'booking.slot_interval_minutes', CAST(30 AS JSON), false, 'Khoảng cách giữa các khung giờ'
  UNION ALL SELECT 'booking', 'booking.advance_days', CAST(30 AS JSON), false, 'Số ngày cho phép đặt trước'
  UNION ALL SELECT 'localization', 'currency', JSON_QUOTE('VND'), true, 'Đơn vị tiền tệ'
) seed ON true
WHERE b.code = 'MAIN';
