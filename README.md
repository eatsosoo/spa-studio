# MIÊN Spa

Website Nuxt 4 cho một thương hiệu spa cao cấp, gồm landing page, cửa hàng và trang quản trị kết nối MySQL qua Nitro API.

Backend database dùng MySQL 8 và Drizzle ORM. Xem [thiết kế database](./docs/database.md) để biết schema, migration và các quy ước nghiệp vụ.

## Các trang chính

- `/` — landing page và form đặt lịch.
- `/san-pham` — danh sách sản phẩm phía khách hàng.
- `/san-pham/:slug` — chi tiết sản phẩm.
- `/admin` — tổng quan quản trị.
- `/admin/khach-hang` — quản lý khách hàng.
- `/admin/san-pham` — quản lý sản phẩm và tồn kho.
- `/admin/kho` — tồn hiện tại, chứng từ nhập/điều chỉnh/điều chuyển và lịch sử kho.
- `/admin/dat-lich` — quản lý lịch hẹn.
- `/admin/nhan-vien` — quản lý nhân viên.
- `/admin/bai-viet` — quản lý bài viết.

## Chạy dự án

```bash
corepack pnpm install
copy .env.example .env
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm dev
```

Điền chuỗi kết nối MySQL vào `DATABASE_URL`. Để khởi tạo tài khoản quản trị đầu tiên, đặt `ADMIN_BOOTSTRAP_USERNAME`, `ADMIN_BOOTSTRAP_PASSWORD` (tối thiểu 8 ký tự) và `ADMIN_BOOTSTRAP_EMAIL` trong `.env`. Tài khoản chỉ được tạo khi chưa có owner hoặc manager.

Sau đó mở `http://localhost:3000/admin/dang-nhap` để đăng nhập. Session quản trị được lưu bằng cookie HttpOnly và có thời hạn bảy ngày.

## API quản trị

- `GET, POST /api/admin/:resource`
- `GET, PATCH, DELETE /api/admin/:resource/:id`
- Các resource: `customers`, `products`, `bookings`, `employees`, `posts`.
- `GET /api/admin/dashboard` trả dữ liệu tổng hợp cho trang tổng quan.
- `GET /api/admin/inventory` trả không gian quản lý tồn, chứng từ và lịch sử kho.
- `POST /api/admin/inventory/documents` tạo chứng từ kho nháp; các action `/post` và `/cancel` dùng để ghi sổ hoặc hủy chứng từ nháp.
- `POST /api/admin/orders/:id/pay` chuyển đơn bán hàng sang đã thanh toán và trừ kho trong cùng transaction.
- `POST /api/booking` ghi yêu cầu đặt lịch từ landing page vào MySQL.
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` xử lý session quản trị.
- `PATCH /api/auth/profile` cập nhật hồ sơ hoặc đổi mật khẩu.

Nhóm API `/api/admin` yêu cầu tài khoản có vai trò `owner` hoặc `manager`.

## Dữ liệu mẫu

Chạy `pnpm db:seed` sau migration để tạo dữ liệu mẫu cho tài khoản quản trị, vai trò, dịch vụ, sản phẩm, tồn kho, khách hàng, nhân viên, lịch hẹn trong ngày và bài viết. Seeder dùng upsert nên có thể chạy lại mà không nhân đôi dữ liệu mẫu.

Seeder tạo một tài khoản `owner` từ nhóm biến `ADMIN_BOOTSTRAP_*` và một tài khoản `manager` từ nhóm `SEED_MANAGER_*`. Nếu không cấu hình mật khẩu khi tạo user mới, seeder sinh mật khẩu ngẫu nhiên mạnh và chỉ in ra terminal một lần. Seeder không ghi đè mật khẩu của tài khoản đã tồn tại.
