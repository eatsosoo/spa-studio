# Thiết kế database MIÊN Spa

Database sử dụng MySQL 8 và Drizzle ORM. Migration thứ ba bổ sung quản lý lô FEFO, giữ hàng, định mức vật tư và giá vốn thực tế.

Các bảng nghiệp vụ sử dụng InnoDB để hỗ trợ khóa ngoại và transaction. Migration đầu tiên chủ động đặt engine của phiên là InnoDB, kể cả khi MySQL server đang mặc định dùng MyISAM.

## Phân nhóm dữ liệu

| Nhóm | Bảng chính | Ghi chú |
| --- | --- | --- |
| Xác thực và phân quyền | `users`, `auth_sessions`, `password_reset_tokens`, `roles`, `permissions`, `user_roles`, `role_permissions` | Logout được thực hiện bằng cách thu hồi session (`revoked_at`); token chỉ lưu dạng hash. Quyền có phạm vi chi nhánh. |
| Chi nhánh và nhân sự | `branches`, `employees`, `employee_salary_configs` | Lịch sử cấu hình lương được giữ theo khoảng hiệu lực. |
| Khách hàng | `customers` | Có điểm thành viên, tổng chi tiêu, nguồn và đồng ý marketing. |
| Dịch vụ và lịch hẹn | `service_categories`, `services`, `appointments`, `appointment_services` | Snapshot tên/giá dịch vụ giữ nguyên lịch sử kể cả khi danh mục thay đổi. |
| Chấm công và lương | `attendance_records`, `payroll_periods`, `payrolls`, `payroll_items` | Bảng lương lưu cả số tổng và dòng chi tiết để đối soát. |
| Sản phẩm và kho | `product_categories`, `products`, `inventory_locations`, `inventory_stocks`, `inventory_lots`, `inventory_reservations`, `inventory_documents`, `inventory_document_items`, `inventory_transactions` | `inventory_stocks` là số dư tổng hợp; lô là nguồn chi tiết và được xuất FEFO. Chứng từ nháp chưa làm thay đổi tồn. |
| Dịch vụ và vật tư | `services`, `service_product_usages`, `appointment_services` | Khi một dịch vụ hoàn tất, định mức được xuất FEFO đúng một lần và lưu giá vật tư thực tế. |
| Bán hàng | `sales_orders`, `sales_order_items`, `sales_order_status_history` | Đơn website giữ hàng theo lô trong transaction; hoàn tất đơn tiêu thụ giữ hàng và chốt giá vốn/lợi nhuận gộp. |
| Khuyến mãi | `promotions`, `promotion_products`, `promotion_services`, `coupons`, `coupon_redemptions` | Hỗ trợ giảm phần trăm/số tiền, giới hạn lượt và phạm vi sản phẩm/dịch vụ. |
| Nội dung và hệ thống | `post_categories`, `posts`, `system_settings`, `audit_logs` | Cấu hình lưu JSON, có cờ công khai; thao tác nhạy cảm cần ghi audit log. |

## Quy ước quan trọng

- Tiền dùng `DECIMAL(14,2)`, không dùng số thực.
- Ngày giờ nghiệp vụ lưu UTC; `branches.timezone` dùng để hiển thị theo địa phương.
- Dữ liệu chủ như khách hàng, nhân viên, sản phẩm và bài viết dùng soft delete.
- Không cập nhật trực tiếp `inventory_stocks.quantity` từ form sản phẩm. Phiếu nhập, điều chỉnh, điều chuyển và thanh toán đơn hàng phải đi qua inventory service, khóa dòng tồn và ghi ledger trong cùng transaction.
- Chứng từ kho đã `posted` là bất biến. Sai lệch phải được sửa bằng chứng từ điều chỉnh hoặc chứng từ đảo, không sửa lịch sử giao dịch.
- Lô được ưu tiên theo hạn dùng gần nhất, sau đó theo ngày nhập. Lô không có hạn dùng được xuất sau các lô có hạn.
- Hàng trả `sellable` tạo lô mới và tăng tồn; hàng `damaged` chỉ được ghi nhận trên chứng từ, không quay lại tồn khả dụng.
- Migration `0003` chuyển số tồn hiện hữu thành lô `LEGACY-*`, vì vậy phải chạy migration trước khi dùng luồng xuất FEFO.
- Tồn khả dụng được tính bằng `quantity - reserved_quantity`; nghiệp vụ xuất không được làm số dư thực tế thấp hơn lượng đang giữ.
- Giỏ hàng phía client không giữ tồn. API phải đọc lại giá và tồn khả dụng khi hiển thị giỏ và ngay trước khi tạo đơn.
- Đơn website được giữ tồn trong 24 giờ. Đơn chưa được xử lý khi quá hạn sẽ tự hủy và giải phóng reservation trong lần chạy API cửa hàng/quản trị tiếp theo.
- `idempotency_key` ngăn retry tạo đơn trùng. `access_token_hash` cho phép khách tra cứu đơn mà không công khai ID nội bộ.
- Thông tin người nhận và địa chỉ được snapshot trên `sales_orders`; lịch sử đơn không phụ thuộc vào thay đổi sau này của hồ sơ khách hàng.
- Chỉ hoàn tất đơn mới giảm `inventory_stocks.quantity`. Hủy đơn trước khi giao chỉ giảm `reserved_quantity`; không tạo giao dịch xuất kho.
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
