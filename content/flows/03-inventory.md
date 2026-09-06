---
title: Ghi sổ chứng từ kho
description: Bản nháp không ảnh hưởng tồn. Chỉ thao tác ghi sổ mới cập nhật lô, số dư tổng hợp và ledger.
order: 3
entrypoint: POST /api/admin/inventory/documents/:id/post
transaction: Toàn bộ lô, số dư, ledger, trạng thái chứng từ và audit log được ghi nguyên tử
steps:
  - title: Lập chứng từ
    type: client
    detail: Nhân viên chọn loại phiếu, kho nguồn/đích, ngày nghiệp vụ và các dòng sản phẩm.
    source: app/components/admin/AdminInventoryDocumentDrawer.vue
    tables: []
  - title: Lưu bản nháp
    type: api
    detail: API kiểm tra loại chứng từ, kho, sản phẩm, số lượng và giới hạn hàng trả trước khi lưu.
    source: server/services/inventory.ts#createInventoryDocument
    transaction: true
    tables:
      - name: inventory_documents
        operation: INSERT
        purpose: Tạo phần đầu chứng từ; trạng thái mặc định là draft.
        fields:
          - name: reference
            change: Gán mới
            value: NK, DC, CK hoặc TH + timestamp + random
          - name: type
            change: Gán mới
            value: receipt, adjustment, transfer hoặc return
          - name: source_location_id, destination_location_id
            change: Gán theo loại phiếu
            value: Kho nguồn và kho nhận hợp lệ
          - name: source_order_id
            change: Gán với phiếu trả
            value: sales_orders.id của đơn bán gốc
          - name: status
            change: Giá trị mặc định
            value: draft
          - name: occurred_at, created_by
            change: Gán mới
            value: Ngày nghiệp vụ và user hiện tại
      - name: inventory_document_items
        operation: INSERT
        purpose: Lưu các dòng hàng nhưng chưa làm thay đổi tồn.
        fields:
          - name: product_id, quantity, unit_cost
            change: Gán mới
            value: Sản phẩm, số lượng và giá vốn trên dòng
          - name: direction
            change: Gán với phiếu điều chỉnh
            value: increase hoặc decrease
          - name: batch_number, expiry_date
            change: Gán nếu có
            value: Thông tin lô nhập
          - name: disposition
            change: Gán với hàng trả
            value: sellable hoặc damaged
  - title: Khóa chứng từ
    type: service
    detail: Khi ghi sổ, transaction khóa chứng từ và chỉ tiếp tục nếu trạng thái vẫn là draft.
    source: server/services/inventory.ts#postInventoryDocument
    transaction: true
    tables:
      - name: inventory_documents
        operation: LOCK
        purpose: SELECT FOR UPDATE ngăn hai người ghi sổ cùng lúc.
        fields:
          - name: status
            change: Kiểm tra
            value: Phải bằng draft
      - name: inventory_document_items
        operation: SELECT
        purpose: Tải toàn bộ dòng theo thứ tự id.
        fields: []
  - title: Áp dụng biến động
    type: database
    detail: Nhập tạo lô mới; giảm kho xuất FEFO; điều chuyển vừa xuất kho nguồn vừa tạo lô tại kho đích.
    source: server/services/inventory.ts#applyInventoryMovement
    transaction: true
    tables:
      - name: inventory_lots
        operation: INSERT
        purpose: Tạo lô cho nhập, tăng điều chỉnh, hàng trả bán được hoặc kho nhận điều chuyển.
        fields:
          - name: initial_quantity, quantity
            change: Gán mới
            value: Số lượng nhập vào lô
          - name: batch_number, expiry_date, unit_cost
            change: Snapshot
            value: Dữ liệu dòng chứng từ
          - name: status
            change: Giá trị mặc định
            value: available
      - name: inventory_lots
        operation: UPDATE
        purpose: Giảm từng lô khi xuất FEFO.
        fields:
          - name: quantity
            change: Giảm
            value: quantity - lượng phân bổ
          - name: status
            change: Cập nhật
            value: depleted khi quantity về 0; ngược lại available
      - name: inventory_stocks
        operation: UPSERT
        purpose: Khởi tạo nếu thiếu, khóa dòng rồi cập nhật số dư tổng.
        fields:
          - name: quantity
            change: Tăng hoặc giảm
            value: quantity + quantity_delta
          - name: reserved_quantity
            change: Điều kiện bảo vệ
            value: Số dư sau cập nhật không được thấp hơn lượng đang giữ
      - name: inventory_transactions
        operation: INSERT
        purpose: Ghi ledger bất biến cho mỗi biến động của từng lô.
        fields:
          - name: type, quantity_delta, quantity_after
            change: Gán mới
            value: Loại nghiệp vụ, độ lệch có dấu và số dư sau cập nhật
          - name: product_id, location_id, lot_id
            change: Gán khóa liên kết
            value: Sản phẩm, kho và lô chịu tác động
          - name: document_item_id, reference_type, reference_id
            change: Gán nguồn truy vết
            value: Dòng chứng từ hiện tại
          - name: unit_cost, performed_by
            change: Snapshot
            value: Giá vốn lô và người ghi sổ
  - title: Chốt chứng từ
    type: database
    detail: Chứng từ được chuyển sang posted và thao tác được ghi audit log trong cùng transaction.
    source: server/services/inventory.ts#postInventoryDocument
    transaction: true
    tables:
      - name: inventory_documents
        operation: UPDATE
        purpose: Đánh dấu đã ghi sổ và không cho sửa trực tiếp.
        fields:
          - name: status
            change: draft → posted
            value: posted
          - name: posted_by
            change: Gán mới
            value: users.id đang thao tác
          - name: posted_at
            change: Gán mới
            value: Thời điểm ghi sổ
      - name: audit_logs
        operation: INSERT
        purpose: Ghi dấu thao tác nhạy cảm.
        fields:
          - name: action
            change: Gán mới
            value: inventory.post
          - name: entity_type, entity_id
            change: Gán mới
            value: inventory_document và id chứng từ
          - name: new_values
            change: Snapshot JSON
            value: reference, type và postedAt
  - title: Cập nhật báo cáo
    type: result
    detail: Workspace kho đọc lại tồn, lô, ledger và cảnh báo; không cần bước đồng bộ riêng.
    source: server/services/inventory.ts#getInventoryWorkspace
    tables:
      - name: inventory_stocks, inventory_lots, inventory_transactions
        operation: SELECT
        purpose: Tổng hợp số dư, giá trị tồn, cảnh báo hạn dùng và dòng hàng.
        fields: []
---

## Quy tắc theo loại chứng từ

| Loại | Kho nguồn | Kho đích | Tác động |
| --- | --- | --- | --- |
| `receipt` | Không | Bắt buộc | Tạo lô và tăng tồn |
| `adjustment` | Không | Bắt buộc | Tăng tạo lô; giảm xuất FEFO |
| `transfer` | Bắt buộc | Bắt buộc, phải khác nguồn | Xuất FEFO ở nguồn và tái tạo lô tại đích |
| `return` | Đơn bán gốc | Bắt buộc | Chỉ `sellable` quay lại tồn; `damaged` không tăng tồn |

Chứng từ `posted` là bất biến. Sai lệch sau ghi sổ cần được xử lý bằng chứng từ điều chỉnh hoặc chứng từ đảo, không sửa ledger cũ.

