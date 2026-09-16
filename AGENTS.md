# Quy ước làm việc trong dự án

- Trước khi triển khai tính năng hoặc sửa lỗi, tìm và đọc các thành phần, hàm tiện ích, service, kiểu dữ liệu và luồng nghiệp vụ liên quan đã có trong dự án.
- Ưu tiên tái sử dụng hoặc mở rộng code hiện có khi phù hợp. Tránh tạo thêm thành phần hoặc logic trùng chức năng.
- Chỉ tách phần dùng chung khi có nhu cầu tái sử dụng thực tế; giữ thay đổi rõ ràng và phù hợp với cấu trúc hiện tại của dự án.
- Khi xây hoặc sửa giao diện, kiểm tra `app/components/common` trước. Dùng các component có sẵn cho ô nhập, danh sách chọn, vùng văn bản, tab, hộp thoại và nút; chỉ dùng thẻ HTML trực tiếp khi component chung không đáp ứng được yêu cầu cụ thể.
