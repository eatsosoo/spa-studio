---
title: Tạo và đăng bài viết bằng AI
description: Chủ đề được đưa vào hàng chờ, kết hợp prompt và ảnh đã chọn, gửi đến OpenAI, rồi nội dung được làm sạch và lưu thành bản nháp hoặc xuất bản ngay.
order: 5
entrypoint: POST /api/admin/ai-post-jobs và POST /api/admin/ai-posts-generate
transaction: Hàng chờ, lần gọi AI và bài viết được xử lý qua các request riêng; không có một transaction bao trùm toàn bộ luồng
steps:
  - title: Chuẩn bị chủ đề
    id: prepare-topic
    kind: start
    next:
      - to: save-jobs
    type: client
    detail: Quản trị viên nhập từng chủ đề hoặc nhập từ Excel, chọn danh mục, từ khóa, độ dài, nguồn ảnh, thời điểm dự kiến và kết quả sau khi tạo.
    source: app/pages/admin/viet-bai-ai.vue
    tables: []
  - title: Lưu hàng chờ
    id: save-jobs
    next:
      - to: start-generation
    type: database
    detail: API kiểm tra tối đa 200 chủ đề mỗi request, bỏ qua tiêu đề trùng và tạo các công việc đang chờ hoặc đã được lên lịch.
    source: server/api/admin/ai-post-jobs/index.post.ts
    tables:
      - name: ai_post_jobs
        operation: SELECT
        purpose: Tìm các tiêu đề đã tồn tại để tránh tạo công việc trùng.
        fields:
          - name: title
            change: Điều kiện IN
            value: Danh sách tiêu đề đã chuẩn hóa
      - name: ai_post_jobs
        operation: INSERT
        purpose: Lưu cấu hình tạo bài của từng chủ đề.
        fields:
          - name: title, category, keyword, cluster
            change: Gán mới
            value: Nội dung từ biểu mẫu hoặc file Excel
          - name: article_type, word_range, target_action
            change: Gán mới
            value: Yêu cầu biên tập
          - name: image_source, keep_title, after_create
            change: Gán mới
            value: Cấu hình ảnh và đầu ra
          - name: scheduled_at
            change: Gán mới
            value: Thời điểm dự kiến hoặc null
          - name: status
            change: Gán mới
            value: scheduled nếu có lịch, ngược lại queued
  - title: Bắt đầu tạo nội dung
    id: start-generation
    next:
      - to: load-context
    type: api
    detail: Khi người dùng yêu cầu tạo bài, giao diện lần lượt đánh dấu từng công việc là generating rồi gửi dữ liệu công việc đến API tạo nội dung.
    source: app/pages/admin/viet-bai-ai.vue#generate
    tables:
      - name: ai_post_jobs
        operation: UPDATE
        purpose: Phản ánh công việc đang được xử lý và xóa lỗi cũ.
        fields:
          - name: status
            change: Cập nhật
            value: generating
          - name: error
            change: Xóa
            value: null
  - title: Nạp prompt và ảnh
    id: load-context
    next:
      - to: call-openai
    type: service
    detail: Hệ thống lấy phiên bản prompt article-writer đang hoạt động. Nếu chọn thư mục hoặc một ảnh, đường dẫn được chuẩn hóa và chỉ ảnh nằm trong vùng media hợp lệ mới được đưa vào ngữ cảnh.
    source: server/api/admin/ai-posts-generate.post.ts
    tables:
      - name: ai_prompt_revisions
        operation: SELECT
        purpose: Lấy hướng dẫn viết bài đang hoạt động; dùng prompt mặc định nếu chưa có bản ghi.
        fields:
          - name: prompt_key
            change: Điều kiện
            value: article-writer
          - name: is_active
            change: Điều kiện
            value: 1
          - name: content
            change: Đọc
            value: Nội dung system prompt
  - title: Gọi OpenAI Responses API
    id: call-openai
    kind: decision
    next:
      - to: save-post
        label: Tạo thành công
        tone: success
      - to: record-error
        label: Có lỗi
        tone: danger
    type: api
    detail: API gửi prompt, yêu cầu bài viết và danh sách ảnh; kết quả phải khớp JSON Schema gồm tiêu đề, tóm tắt, nội dung và metadata SEO. Request dùng store=false.
    source: server/api/admin/ai-posts-generate.post.ts
    tables: []
  - title: Làm sạch và lưu bài viết
    id: save-post
    kind: decision
    next:
      - to: mark-published
        label: Xuất bản ngay
        tone: success
      - to: mark-scheduled
        label: Có thời gian dự kiến
      - to: mark-draft
        label: Lưu bản nháp
    type: database
    detail: Nội dung HTML được làm sạch, danh mục được tìm hoặc tạo, slug được bảo đảm duy nhất, rồi bài viết được ghi với trạng thái đã xuất bản hoặc bản nháp.
    source: server/modules/admin/resources/posts.ts#savePost
    tables:
      - name: post_categories
        operation: SELECT
        purpose: Tìm danh mục theo tên đã chọn.
        fields:
          - name: name
            change: Điều kiện
            value: Danh mục của công việc AI
      - name: post_categories
        operation: INSERT
        purpose: Tạo danh mục nếu tên chưa tồn tại.
        fields:
          - name: name, slug
            change: Gán mới
            value: Tên danh mục và slug duy nhất
      - name: posts
        operation: INSERT
        purpose: Lưu nội dung đã tạo cùng metadata SEO và ảnh đại diện.
        fields:
          - name: title, slug, summary, content
            change: Gán mới
            value: Kết quả AI sau khi kiểm tra và làm sạch
          - name: focus_keyword, meta_title, meta_description
            change: Gán mới
            value: Metadata SEO từ kết quả AI
          - name: featured_image
            change: Gán mới
            value: Ảnh hợp lệ đầu tiên của nguồn đã chọn hoặc null
          - name: status
            change: Gán mới
            value: published khi xuất bản ngay và không có lịch; các trường hợp khác là draft
          - name: published_at
            change: Gán có điều kiện
            value: Thời điểm hiện tại khi xuất bản ngay, ngược lại null
  - title: Hoàn tất xuất bản ngay
    id: mark-published
    kind: end
    type: database
    detail: Công việc được đánh dấu published; bài viết đã có trạng thái published và published_at ngay khi được tạo.
    source: app/pages/admin/viet-bai-ai.vue#generate
    tables:
      - name: ai_post_jobs
        operation: UPDATE
        purpose: Ghi nhận công việc đã hoàn tất và bài đã được xuất bản.
        fields:
          - name: status
            change: Cập nhật
            value: published
          - name: error
            change: Xóa
            value: null
  - title: Ghi nhận lịch dự kiến
    id: mark-scheduled
    kind: end
    type: database
    detail: Công việc giữ trạng thái scheduled và bài viết được lưu ở trạng thái draft. Hiện chưa có scheduler phía server để tự động xuất bản khi đến scheduled_at.
    source: app/pages/admin/viet-bai-ai.vue#generate
    tables:
      - name: ai_post_jobs
        operation: UPDATE
        purpose: Giữ bài trong lịch nội dung để theo dõi và xử lý sau.
        fields:
          - name: status
            change: Cập nhật
            value: scheduled
          - name: scheduled_at
            change: Giữ nguyên
            value: Thời điểm dự kiến đã chọn
  - title: Hoàn tất bản nháp
    id: mark-draft
    kind: end
    type: database
    detail: Công việc được đánh dấu generated và bài viết ở trạng thái draft để quản trị viên rà soát trước khi xuất bản.
    source: app/pages/admin/viet-bai-ai.vue#generate
    tables:
      - name: ai_post_jobs
        operation: UPDATE
        purpose: Ghi nhận nội dung đã tạo thành công và đang chờ duyệt.
        fields:
          - name: status
            change: Cập nhật
            value: generated
          - name: error
            change: Xóa
            value: null
  - title: Ghi nhận lỗi
    id: record-error
    kind: end
    type: database
    detail: Nếu gọi AI hoặc lưu bài thất bại, giao diện đánh dấu công việc là error và lưu thông báo để người dùng biết chủ đề nào cần chạy lại.
    source: app/pages/admin/viet-bai-ai.vue#generate
    tables:
      - name: ai_post_jobs
        operation: UPDATE
        purpose: Lưu kết quả thất bại của riêng công việc hiện tại.
        fields:
          - name: status
            change: Cập nhật
            value: error
          - name: error
            change: Gán mới
            value: Thông báo lỗi từ request
---

## Trạng thái hàng chờ

| Trạng thái | Ý nghĩa |
| --- | --- |
| `queued` | Chủ đề đã được thêm và đang chờ tạo nội dung. |
| `generating` | Giao diện đang gọi AI và lưu bài viết. |
| `generated` | Bài đã được tạo dưới dạng bản nháp để rà soát. |
| `scheduled` | Có thời điểm dự kiến; bài hiện vẫn là bản nháp. |
| `published` | Bài đã được xuất bản ngay sau khi tạo. |
| `error` | Một bước tạo nội dung hoặc lưu bài bị lỗi. |

## Dữ liệu ảnh và AI

- Ảnh được đọc từ vùng media hợp lệ trong `public/uploads/posts`; đường dẫn thư mục và tên file đều được kiểm tra trước khi sử dụng.
- OpenAI trả dữ liệu theo JSON Schema cố định và request dùng `store: false`.
- Nội dung HTML do AI sinh ra được làm sạch trước khi ghi vào bảng `posts`.

## Giới hạn của lịch đăng

`scheduled_at` hiện phục vụ lịch nội dung và trạng thái hàng chờ. Khi một công việc có lịch được tạo, bài viết tương ứng vẫn được lưu là `draft`; dự án chưa có tác vụ nền tự chuyển bài sang `published` khi đến giờ. Quản trị viên cần xuất bản thủ công cho đến khi bổ sung scheduler phía server.
