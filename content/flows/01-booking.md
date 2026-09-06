---
title: Khách đặt lịch từ website
description: Yêu cầu được kiểm tra ở API, chuyển thành lịch chờ xác nhận và xuất hiện trong lịch quản trị.
order: 1
entrypoint: POST /api/booking
transaction: appointments và appointment_services được ghi trong cùng transaction
steps:
  - title: Gửi biểu mẫu
    type: client
    detail: Khách nhập tên, số điện thoại, dịch vụ, ngày mong muốn và ghi chú.
    source: app/pages/index.vue
    tables: []
  - title: Kiểm tra payload
    type: api
    detail: Chuẩn hóa số điện thoại và từ chối dữ liệu thiếu hoặc sai định dạng với HTTP 422.
    source: server/api/booking.post.ts
    tables: []
  - title: Chuẩn bị dữ liệu
    type: service
    detail: Tìm khách theo số điện thoại, tìm dịch vụ theo tên và xác định chi nhánh mặc định.
    source: server/modules/admin/resources/bookings.ts
    tables:
      - name: customers
        operation: SELECT
        purpose: Tái sử dụng customer_id khi số điện thoại đã tồn tại.
        fields:
          - name: phone
            change: Điều kiện tìm kiếm
            value: Số điện thoại đã chuẩn hóa
      - name: services
        operation: SELECT
        purpose: Lấy thời lượng, giá và id của dịch vụ.
        fields:
          - name: name
            change: Điều kiện tìm kiếm
            value: Tên dịch vụ từ biểu mẫu
      - name: branches
        operation: SELECT
        purpose: Xác định branch_id mặc định cho lịch hẹn.
        fields: []
  - title: Tạo lịch hẹn
    type: database
    detail: Tạo bản ghi lịch chính với snapshot khách hàng, thời gian và tổng tiền.
    source: server/modules/admin/resources/bookings.ts#saveBooking
    transaction: true
    tables:
      - name: appointments
        operation: INSERT
        purpose: Lưu lịch hẹn chính.
        fields:
          - name: reference
            change: Gán mới
            value: LH-{timestamp base36}
          - name: branch_id
            change: Gán mới
            value: Chi nhánh mặc định
          - name: customer_id
            change: Gán nếu tìm thấy
            value: customers.id hoặc null
          - name: customer_name, customer_phone
            change: Snapshot
            value: Dữ liệu khách gửi lên
          - name: starts_at
            change: Gán mới
            value: Ngày yêu cầu lúc 09:00, timezone +07:00
          - name: ends_at
            change: Tính mới
            value: starts_at + services.duration_minutes
          - name: status
            change: Gán mới
            value: pending
          - name: source
            change: Gán mới
            value: website
          - name: subtotal, total_amount
            change: Snapshot
            value: services.price
  - title: Tạo dòng dịch vụ
    type: database
    detail: Snapshot dịch vụ để lịch sử không thay đổi khi danh mục dịch vụ được sửa sau này.
    source: server/modules/admin/resources/bookings.ts#saveBooking
    transaction: true
    tables:
      - name: appointment_services
        operation: INSERT
        purpose: Liên kết dịch vụ với lịch hẹn.
        fields:
          - name: appointment_id, service_id
            change: Gán khóa ngoại
            value: appointments.id và services.id
          - name: service_name
            change: Snapshot
            value: services.name
          - name: duration_minutes
            change: Snapshot
            value: services.duration_minutes
          - name: unit_price, final_price
            change: Snapshot
            value: services.price
          - name: status
            change: Gán mới
            value: scheduled
  - title: Chờ quản trị xác nhận
    type: result
    detail: API trả mã tham chiếu; lịch xuất hiện trên màn hình Đặt lịch để nhân viên phân công và xác nhận.
    source: app/pages/admin/dat-lich.vue
    tables:
      - name: appointments
        operation: SELECT
        purpose: Đọc lịch theo khoảng ngày.
        fields:
          - name: starts_at
            change: Điều kiện lọc
            value: Từ đầu đến cuối ngày đang xem
      - name: appointment_services
        operation: SELECT
        purpose: Hiển thị dịch vụ và nhân viên phụ trách.
        fields: []
---

## Trường hợp cần chú ý

- Website hiện gán giờ mặc định là `09:00`; nhân viên cần xác nhận lại giờ với khách.
- Khi một lịch được chuyển sang `completed`, hệ thống có thể xuất vật tư theo định mức FEFO. Thao tác này chỉ được thực hiện một lần qua `inventory_deducted_at`.
- Nếu dịch vụ chưa có trong danh mục, resource hiện có thể tạo dịch vụ tạm với giá `0`. Nên chuẩn hóa danh mục trước khi mở rộng form đặt lịch.

