# MIÊN Spa

Landing page Nuxt 4 cho một thương hiệu spa cao cấp, với form đặt lịch kết nối qua Nitro API.

Backend database dùng MySQL 8 và Drizzle ORM. Xem [thiết kế database](./docs/database.md) để biết schema, migration và các quy ước nghiệp vụ.

## Các trang chính

- `/` — landing page và form đặt lịch.
- `/san-pham` — danh sách sản phẩm phía khách hàng.
- `/san-pham/:slug` — chi tiết sản phẩm.
- `/admin` — tổng quan quản trị.
- `/admin/khach-hang` — quản lý khách hàng.
- `/admin/san-pham` — quản lý sản phẩm và tồn kho.
- `/admin/dat-lich` — quản lý lịch hẹn.
- `/admin/nhan-vien` — quản lý nhân viên.
- `/admin/bai-viet` — quản lý bài viết.

## Chạy dự án

```bash
corepack pnpm install
corepack pnpm dev
```

Mở `http://localhost:3000`.

## Các bước tiếp theo

- Thay dữ liệu giả lập trong `server/api/booking.post.ts` bằng service ghi MySQL.
- Thay dữ liệu trong `app/data/admin.ts` và `app/data/products.ts` bằng API MySQL.
- Bổ sung xác nhận lịch qua Zalo, SMS hoặc email.
- Kết nối trang quản trị lịch hẹn và CRM.
