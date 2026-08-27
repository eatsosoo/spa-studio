# Thiết kế database MIÊN Spa

Database sử dụng MySQL 8 và Drizzle ORM. Migration đầu tiên tạo 35 bảng; migration thứ hai khởi tạo chi nhánh mặc định, vai trò, quyền và cấu hình nền.

Các bảng nghiệp vụ sử dụng InnoDB để hỗ trợ khóa ngoại và transaction. Migration đầu tiên chủ động đặt engine của phiên là InnoDB, kể cả khi MySQL server đang mặc định dùng MyISAM.

## Phân nhóm dữ liệu

| Nhóm | Bảng chính | Ghi chú |
| --- | --- | --- |
| Xác thực và phân quyền | `users`, `auth_sessions`, `password_reset_tokens`, `roles`, `permissions`, `user_roles`, `role_permissions` | Logout được thực hiện bằng cách thu hồi session (`revoked_at`); token chỉ lưu dạng hash. Quyền có phạm vi chi nhánh. |
| Chi nhánh và nhân sự | `branches`, `employees`, `employee_salary_configs` | Lịch sử cấu hình lương được giữ theo khoảng hiệu lực. |
| Khách hàng | `customers` | Có điểm thành viên, tổng chi tiêu, nguồn và đồng ý marketing. |
| Dịch vụ và lịch hẹn | `service_categories`, `services`, `appointments`, `appointment_services` | Snapshot tên/giá dịch vụ giữ nguyên lịch sử kể cả khi danh mục thay đổi. |
| Chấm công và lương | `attendance_records`, `payroll_periods`, `payrolls`, `payroll_items` | Bảng lương lưu cả số tổng và dòng chi tiết để đối soát. |
| Sản phẩm và kho | `product_categories`, `products`, `inventory_locations`, `inventory_stocks`, `inventory_transactions` | `inventory_stocks` là số dư nhanh; mọi thay đổi phải đồng thời ghi sổ `inventory_transactions` trong một transaction. |
| Bán hàng | `sales_orders`, `sales_order_items` | Dùng để trừ kho, tính doanh thu và hoa hồng sản phẩm. |
| Khuyến mãi | `promotions`, `promotion_products`, `promotion_services`, `coupons`, `coupon_redemptions` | Hỗ trợ giảm phần trăm/số tiền, giới hạn lượt và phạm vi sản phẩm/dịch vụ. |
| Nội dung và hệ thống | `post_categories`, `posts`, `system_settings`, `audit_logs` | Cấu hình lưu JSON, có cờ công khai; thao tác nhạy cảm cần ghi audit log. |

## Quy ước quan trọng

- Tiền dùng `DECIMAL(14,2)`, không dùng số thực.
- Ngày giờ nghiệp vụ lưu UTC; `branches.timezone` dùng để hiển thị theo địa phương.
- Dữ liệu chủ như khách hàng, nhân viên, sản phẩm và bài viết dùng soft delete.
- Mật khẩu phải được hash bằng Argon2id hoặc bcrypt ở tầng service; không bao giờ lưu mật khẩu rõ.
- Đặt lịch cần kiểm tra trùng `employee_id` theo khoảng `starts_at`/`ends_at` trong transaction trước khi xác nhận.
- Khi chốt bảng lương, lấy snapshot từ chấm công, hoa hồng dịch vụ/đơn hàng và cấu hình lương có hiệu lực; không tính lại bảng lương đã duyệt nếu không tạo phiên bản điều chỉnh.

## Khởi tạo

```bash
copy .env.example .env
corepack pnpm install
corepack pnpm db:migrate
```

`DATABASE_URL` có dạng `mysql://user:password@host:3306/database`. Seed không tạo sẵn tài khoản quản trị nhằm tránh mật khẩu mặc định không an toàn. Tài khoản đầu tiên nên được tạo bằng luồng bootstrap riêng, hash mật khẩu, sau đó gán role `owner` tại branch `MAIN`.

Sau khi sửa `server/database/schema.ts`, tạo migration mới bằng:

```bash
corepack pnpm db:generate
```
