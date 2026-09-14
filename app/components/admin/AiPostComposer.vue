<script setup lang="ts">
import type { AiPostJob } from '~/types/ai-content'

const emit = defineEmits<{ add: [items: Omit<AiPostJob, 'id' | 'createdAt' | 'status'>[]] }>()
const titles = ref('')
const category = ref('Chăm sóc tại nhà')
const articleType = ref('Hướng dẫn')
const wordRange = ref('900–1.200')
const targetUrl = ref('/lieu-trinh')
const afterCreate = ref<'draft' | 'published'>('draft')
const keepTitle = ref(true)
const error = ref('')

function submit() {
  const rows = titles.value.split(/\r?\n/).map(title => title.trim()).filter(Boolean).slice(0, 200)
  if (!rows.length) {
    error.value = 'Nhập ít nhất một tiêu đề, mỗi tiêu đề trên một dòng.'
    return
  }
  error.value = ''
  emit('add', rows.map(title => ({
    title,
    category: category.value,
    keyword: '',
    cluster: category.value,
    articleType: articleType.value,
    wordRange: wordRange.value,
    targetUrl: targetUrl.value,
    scheduledAt: null,
    afterCreate: afterCreate.value,
    keepTitle: keepTitle.value,
  } as Omit<AiPostJob, 'id' | 'createdAt' | 'status'>)))
  titles.value = ''
}
</script>

<template>
  <section class="overflow-hidden rounded-xl border border-[#78816f]/20 bg-[#fbf8f1] shadow-[0_24px_55px_-38px_rgba(47,56,44,0.45)]">
    <div class="grid divide-y divide-[#78816f]/15 lg:grid-cols-[1.05fr_1fr_1fr] lg:divide-x lg:divide-y-0">
      <label class="admin-field p-5 md:p-6">
        <span>Chuyên mục</span>
        <CommonSelect v-model="category"><option>Chăm sóc tại nhà</option><option>Hiểu về cơ thể</option><option>Câu chuyện MIÊN</option><option>Chăm sóc sức khỏe</option></CommonSelect>
        <small class="font-normal leading-5 text-[#83897f]">Bài tạo mới sẽ được xếp vào chuyên mục này.</small>
      </label>
      <label class="admin-field p-5 md:p-6">
        <span>Dạng bài</span>
        <CommonSelect v-model="articleType"><option>Hướng dẫn</option><option>Giải thích</option><option>Danh sách</option><option>Câu chuyện</option><option>Hỏi đáp</option></CommonSelect>
        <small class="font-normal leading-5 text-[#83897f]">AI dùng cấu trúc phù hợp với mục đích đọc.</small>
      </label>
      <label class="admin-field p-5 md:p-6">
        <span>Sau khi tạo</span>
        <CommonSelect v-model="afterCreate"><option value="draft">Lưu nháp để duyệt</option><option value="published">Đăng ngay</option></CommonSelect>
        <small class="font-normal leading-5 text-[#83897f]">Nên duyệt nội dung sức khỏe trước khi xuất bản.</small>
      </label>
    </div>

    <div class="grid gap-5 border-t border-[#78816f]/15 p-5 md:p-6 lg:grid-cols-[0.65fr_1.35fr]">
      <label class="admin-field"><span>Độ dài bài viết</span><CommonSelect v-model="wordRange"><option>600–900</option><option>900–1.200</option><option>1.200–1.600</option><option>1.600–2.000</option></CommonSelect></label>
      <label class="admin-field"><span>Trang đích chính</span><CommonInput v-model="targetUrl" placeholder="/lieu-trinh hoặc https://..." /><small class="font-normal leading-5 text-[#83897f]">AI sẽ đặt một lời mời tự nhiên về trang này, không chèn quảng cáo dày.</small></label>
    </div>

    <div class="border-t border-[#78816f]/15 p-5 md:p-6">
      <label class="flex w-fit cursor-pointer items-center gap-3 text-xs font-medium text-[#4d5748]"><CommonInput v-model="keepTitle" type="checkbox" class="size-4 accent-[#4c5d43]" />Giữ nguyên tiêu đề khi tạo bài</label>
      <label class="admin-field mt-5">
        <span>Danh sách tiêu đề <span class="font-normal text-[#858b81]">— mỗi dòng một bài</span></span>
        <CommonTextarea v-model="titles" :aria-invalid="Boolean(error)" rows="6" placeholder="Ví dụ:&#10;5 cách thả lỏng vai gáy sau giờ làm&#10;Chu trình chăm sóc da tối giản cho người bận rộn" />
        <small v-if="error" class="font-normal text-[#8b5148]" role="alert">{{ error }}</small>
        <small v-else class="font-normal leading-5 text-[#83897f]">Tối đa 200 dòng mỗi lần. Tiêu đề trùng trong hàng chờ sẽ được bỏ qua.</small>
      </label>
      <div class="mt-5 flex flex-wrap items-center justify-between gap-4"><p class="text-[0.68rem] text-[#858b81]">Bài chỉ được gửi tới AI khi bạn bấm “Tạo bài” trong hàng chờ.</p><AppButton label="Thêm vào hàng chờ" icon="plus" @click="submit" /></div>
    </div>
  </section>
</template>
