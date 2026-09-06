---
title: Đăng nhập khu vực quản trị
description: Mật khẩu và session token không được lưu ở dạng rõ; middleware kiểm tra phiên trên mọi route admin.
order: 4
entrypoint: POST /api/auth/login
transaction: Tạo session là một lần ghi; mỗi request hợp lệ cập nhật last_seen_at
steps:
  - title: Gửi thông tin đăng nhập
    type: client
    detail: Quản trị viên gửi username hoặc email, mật khẩu và tùy chọn ghi nhớ.
    source: app/pages/admin/dang-nhap.vue
    tables: []
  - title: Tìm tài khoản
    type: api
    detail: API chỉ chấp nhận tài khoản chưa bị soft delete và kiểm tra trạng thái trước khi tạo phiên.
    source: server/api/auth/login.post.ts
    tables:
      - name: users
        operation: SELECT
        purpose: Tìm theo username hoặc email.
        fields:
          - name: username, email
            change: Điều kiện OR
            value: Identifier đã chuẩn hóa
          - name: deleted_at
            change: Điều kiện
            value: null
          - name: password_hash
            change: Đọc để xác minh
            value: Chuỗi scrypt:salt:derived-key
  - title: Xác minh mật khẩu
    type: service
    detail: Dẫn xuất khóa bằng scrypt với salt đã lưu và so sánh constant-time.
    source: server/utils/admin-auth.ts#verifyPassword
    tables: []
  - title: Tạo session
    type: database
    detail: Sinh token 32 byte; database chỉ nhận SHA-256 hash, địa chỉ IP, user agent và thời hạn.
    source: server/utils/admin-auth.ts#createAdminSession
    tables:
      - name: auth_sessions
        operation: INSERT
        purpose: Lưu phiên đăng nhập có thể thu hồi.
        fields:
          - name: user_id
            change: Gán mới
            value: users.id đã xác thực
          - name: token_hash
            change: Gán mới
            value: SHA-256 của token ngẫu nhiên
          - name: ip_address, user_agent
            change: Snapshot
            value: Metadata của request
          - name: expires_at
            change: Gán mới
            value: Thời điểm tạo + 7 ngày
          - name: revoked_at
            change: Giá trị mặc định
            value: null
  - title: Gửi cookie an toàn
    type: result
    detail: Trình duyệt nhận mien_admin_session; JavaScript phía client không đọc được token.
    source: server/utils/admin-auth.ts#createAdminSession
    tables: []
  - title: Kiểm tra mỗi request
    type: service
    detail: Middleware hash cookie, kiểm tra thời hạn, trạng thái thu hồi, tài khoản và vai trò owner hoặc manager.
    source: server/utils/admin-auth.ts#getAdminUser
    tables:
      - name: auth_sessions
        operation: SELECT
        purpose: Xác minh phiên còn hiệu lực.
        fields:
          - name: token_hash
            change: Điều kiện
            value: SHA-256 của cookie
          - name: revoked_at
            change: Điều kiện
            value: null
          - name: expires_at
            change: Điều kiện
            value: Lớn hơn thời điểm hiện tại
      - name: auth_sessions
        operation: UPDATE
        purpose: Đánh dấu thời điểm phiên vừa hoạt động.
        fields:
          - name: last_seen_at
            change: Cập nhật
            value: Thời điểm request hiện tại
      - name: user_roles, roles, branches
        operation: SELECT
        purpose: Nạp vai trò theo chi nhánh và yêu cầu owner hoặc manager.
        fields: []
  - title: Thu hồi khi đăng xuất
    type: database
    detail: Session được đánh dấu thu hồi trước khi cookie bị xóa khỏi trình duyệt.
    source: server/utils/admin-auth.ts#revokeAdminSession
    tables:
      - name: auth_sessions
        operation: UPDATE
        purpose: Vô hiệu hóa token hiện tại.
        fields:
          - name: revoked_at
            change: null → thời điểm đăng xuất
            value: Thời điểm hiện tại
          - name: revoke_reason
            change: Gán mới
            value: logout
---

## Thuộc tính cookie

- `HttpOnly`: mã JavaScript phía client không thể đọc session token.
- `SameSite=Lax`: giảm nguy cơ gửi cookie trong request chéo site không mong muốn.
- `Secure`: bật ở production để cookie chỉ đi qua HTTPS.
- `Path=/`: phiên dùng cho toàn bộ khu vực quản trị.

Mật khẩu được hash bằng `scrypt`; session token được hash bằng SHA-256 vì bản thân token đã có entropy ngẫu nhiên cao. Hai loại hash phục vụ hai mô hình đe dọa khác nhau.

