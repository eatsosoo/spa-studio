---
title: Đặt hàng và giữ tồn FEFO
description: Đơn website dùng idempotency key để tránh tạo trùng và giữ chính xác từng lô trong 24 giờ.
order: 2
entrypoint: POST /api/orders
transaction: Đơn hàng, dòng hàng và reservation được tạo nguyên tử; deadlock được thử lại tối đa ba lần
steps:
  - title: Xác minh giỏ hàng
    type: client
    detail: Client gọi API kiểm tra lại giá, trạng thái bán và tồn khả dụng trước khi gửi đơn.
    source: server/api/cart/validate.post.ts
    tables:
      - name: products
        operation: SELECT
        purpose: Đọc giá bán và trạng thái hiện tại.
        fields:
          - name: id
            change: Điều kiện lọc
            value: Danh sách productId trong giỏ
      - name: inventory_stocks
        operation: SELECT
        purpose: Tính quantity - reserved_quantity.
        fields: []
  - title: Kiểm tra đơn
    type: api
    detail: Chuẩn hóa người nhận, địa chỉ, phương thức thanh toán, idempotency key và access token.
    source: server/services/store-orders.ts#createStoreOrder
    tables:
      - name: sales_orders
        operation: SELECT
        purpose: Trả lại đơn cũ nếu idempotency_key đã tồn tại và token hợp lệ.
        fields:
          - name: idempotency_key
            change: Điều kiện duy nhất
            value: Khóa do client sinh, dài 20–80 ký tự
          - name: access_token_hash
            change: So sánh
            value: SHA-256 của access token
  - title: Khóa sản phẩm
    type: service
    detail: Khóa các dòng sản phẩm để giá và trạng thái không thay đổi giữa lúc kiểm tra và giữ tồn.
    source: server/services/store-orders.ts#createStoreOrder
    transaction: true
    tables:
      - name: products
        operation: LOCK
        purpose: SELECT FOR UPDATE toàn bộ sản phẩm của đơn.
        fields:
          - name: status
            change: Kiểm tra
            value: active hoặc out_of_stock
          - name: sale_price
            change: Snapshot
            value: Dùng tính subtotal và unit_price
  - title: Tạo khách và đơn
    type: database
    detail: Upsert khách theo số điện thoại, sau đó tạo đơn confirmed với snapshot giao hàng.
    source: server/services/store-orders.ts#createStoreOrder
    transaction: true
    tables:
      - name: customers
        operation: UPSERT
        purpose: Tạo mới hoặc cập nhật hồ sơ khách theo phone.
        fields:
          - name: full_name, email, address
            change: Gán hoặc cập nhật
            value: Thông tin nhận hàng đã chuẩn hóa
          - name: source
            change: Gán khi tạo
            value: website
      - name: sales_orders
        operation: INSERT
        purpose: Lưu đơn hàng và snapshot người nhận.
        fields:
          - name: reference
            change: Gán mới
            value: DH-{timestamp}-{random}
          - name: status
            change: Gán mới
            value: confirmed
          - name: payment_status
            change: Gán mới
            value: pending với chuyển khoản; unpaid với COD
          - name: fulfillment_status
            change: Gán mới
            value: unfulfilled
          - name: subtotal, shipping_fee, total_amount
            change: Tính mới
            value: Tổng snapshot giá; miễn phí vận chuyển từ 1.200.000đ
          - name: confirmed_at
            change: Gán mới
            value: Thời điểm tạo đơn
          - name: reservation_expires_at
            change: Gán mới
            value: Thời điểm tạo + 24 giờ
          - name: idempotency_key, access_token_hash
            change: Gán mới
            value: Khóa chống trùng và SHA-256 token tra cứu
  - title: Giữ tồn theo lô
    type: database
    detail: Tạo dòng hàng, phân bổ lô hạn gần nhất và tăng lượng giữ ở cả lô lẫn tồn tổng hợp.
    source: server/services/inventory.ts#reserveInventoryFefo
    transaction: true
    tables:
      - name: sales_order_items
        operation: INSERT
        purpose: Snapshot từng sản phẩm trong đơn.
        fields:
          - name: sku, product_name, quantity
            change: Snapshot
            value: Dữ liệu sản phẩm tại thời điểm đặt
          - name: unit_price, total_amount
            change: Snapshot và tính mới
            value: sale_price và sale_price × quantity
      - name: inventory_lots
        operation: UPDATE
        purpose: Giữ số lượng trên từng lô FEFO.
        fields:
          - name: reserved_quantity
            change: Tăng
            value: reserved_quantity + lượng phân bổ
      - name: inventory_stocks
        operation: UPDATE
        purpose: Đồng bộ tổng lượng đang giữ.
        fields:
          - name: reserved_quantity
            change: Tăng
            value: reserved_quantity + tổng lượng đặt
      - name: inventory_reservations
        operation: INSERT
        purpose: Lưu liên kết order item với từng lô đã giữ.
        fields:
          - name: order_item_id, product_id, location_id, lot_id
            change: Gán khóa liên kết
            value: Các bản ghi đang xử lý
          - name: quantity
            change: Gán mới
            value: Lượng giữ trên lô
          - name: status
            change: Gán mới
            value: active
  - title: Hoàn tất giao dịch
    type: result
    detail: Ghi lịch sử confirmed và trả reference cùng access token để khách tra cứu.
    source: server/services/store-orders.ts#createStoreOrder
    transaction: true
    tables:
      - name: sales_order_status_history
        operation: INSERT
        purpose: Ghi dấu đơn được tạo từ website và tồn được giữ 24 giờ.
        fields:
          - name: status
            change: Gán mới
            value: confirmed
---

## Khi thanh toán hoặc hủy

- Thanh toán chuyển reservation từ `active` sang `consumed`, giảm `inventory_lots.quantity`, giảm `reserved_quantity`, ghi `inventory_transactions` loại `sale`, rồi cập nhật giá vốn trên từng `sales_order_items`.
- `sales_orders` chuyển thành `paid`, `payment_status = paid`, `fulfillment_status = delivered`; đồng thời ghi `paid_at`, `completed_at` và `total_cost`.
- Hủy đơn chuyển reservation thành `released`, hoàn lại `reserved_quantity` trên lô và tồn tổng hợp nhưng không tăng `quantity` vì hàng chưa từng xuất.
- Đơn quá 24 giờ, chưa xử lý giao hàng, được tự hủy trong lần chạy API tiếp theo.

