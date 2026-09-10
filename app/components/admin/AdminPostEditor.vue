<script setup lang="ts">
import { Editor, EditorContent, VueNodeViewRenderer } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { ProductBlock } from '~/extensions/ProductBlock'
import AdminProductNodeView from './AdminProductNodeView.vue'

const props = defineProps<{ modelValue: string; postId?: number; category?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const showMedia = ref(false)
const pickerMode = ref<'link' | 'product' | null>(null)
const pickerSearch = ref('')
const pickerLoading = ref(false)
const pickerResults = ref<Array<{ id: number; title: string; type: string; url: string }>>([])

const editor = new Editor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({ heading: { levels: [2, 3] } }),
    Image.configure({ inline: false, allowBase64: false }),
    Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
    Placeholder.configure({ placeholder: 'Bắt đầu câu chuyện ở đây…' }),
    ProductBlock.extend({ addNodeView: () => VueNodeViewRenderer(AdminProductNodeView) }),
  ],
  editorProps: {
    attributes: {
      class: 'article-content article-content--editable',
      'aria-label': 'Nội dung bài viết',
    },
  },
  onUpdate: ({ editor: currentEditor }) => emit('update:modelValue', currentEditor.getHTML()),
})

const toolbar = [
  { label: 'Đậm', short: 'B', active: () => editor.isActive('bold'), run: () => editor.chain().focus().toggleBold().run() },
  { label: 'Nghiêng', short: 'I', active: () => editor.isActive('italic'), run: () => editor.chain().focus().toggleItalic().run() },
  { label: 'Tiêu đề 2', short: 'H2', active: () => editor.isActive('heading', { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Tiêu đề 3', short: 'H3', active: () => editor.isActive('heading', { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Danh sách chấm', short: '•', active: () => editor.isActive('bulletList'), run: () => editor.chain().focus().toggleBulletList().run() },
  { label: 'Danh sách số', short: '1.', active: () => editor.isActive('orderedList'), run: () => editor.chain().focus().toggleOrderedList().run() },
  { label: 'Trích dẫn', short: '“”', active: () => editor.isActive('blockquote'), run: () => editor.chain().focus().toggleBlockquote().run() },
]

watch(() => props.modelValue, (value) => {
  if (value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false })
})

function openPicker(mode: 'link' | 'product') {
  pickerMode.value = mode
  pickerSearch.value = ''
  searchContent()
}

async function searchContent() {
  pickerLoading.value = true
  try {
    const response = await $fetch<{ data: Array<{ id: number; title: string; type: string; url: string }> }>('/api/admin/content-search', { query: { q: pickerSearch.value, postId: props.postId, category: props.category } })
    pickerResults.value = pickerMode.value === 'product' ? response.data.filter(item => item.type === 'Sản phẩm') : response.data
  } finally { pickerLoading.value = false }
}

function chooseResult(item: { id: number; title: string; type: string; url: string }) {
  if (pickerMode.value === 'product') editor.chain().focus().insertProduct(item.id).run()
  else if (editor.state.selection.empty) editor.chain().focus().insertContent(`<a href="${item.url}">${item.title}</a>`).run()
  else editor.chain().focus().extendMarkRange('link').setLink({ href: item.url, target: null }).run()
  pickerMode.value = null
}

function removeLink() {
  editor.chain().focus().extendMarkRange('link').unsetLink().run()
}

function insertLibraryImage(image: { url: string; filename: string }) {
  const alt = window.prompt('Mô tả ảnh (alt text)', '')
  if (alt === null) return
  editor.chain().focus().setImage({ src: image.url, alt: alt.trim() }).run()
  showMedia.value = false
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(pickerSearch, () => { clearTimeout(searchTimer); searchTimer = setTimeout(searchContent, 280) })
onBeforeUnmount(() => { clearTimeout(searchTimer); editor.destroy() })
</script>

<template>
  <div class="post-editor overflow-hidden border border-[#78816f]/25 bg-[#fffcf6]">
    <div class="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-[#78816f]/20 bg-[#f2eee4]/95 px-3 py-2 backdrop-blur-md">
      <button
        v-for="item in toolbar"
        :key="item.label"
        type="button"
        class="editor-tool"
        :class="item.active() ? 'editor-tool--active' : ''"
        :aria-label="item.label"
        :title="item.label"
        @click="item.run"
      >
        {{ item.short }}
      </button>
      <span class="mx-1 h-6 w-px bg-[#78816f]/20" />
      <button type="button" class="editor-tool gap-1.5 px-3" :class="editor.isActive('link') ? 'editor-tool--active' : ''" aria-label="Chèn liên kết nội bộ" title="Chèn liên kết nội bộ" @click="openPicker('link')"><AppIcon name="link" :size="15" /><span class="hidden sm:inline">Liên kết</span></button>
      <button v-if="editor.isActive('link')" type="button" class="editor-tool" aria-label="Gỡ liên kết" title="Gỡ liên kết" @click="removeLink"><AppIcon name="close" :size="14" /></button>
      <button type="button" class="editor-tool gap-1.5 px-3" aria-label="Chèn ảnh" title="Chèn ảnh" @click="showMedia = true">
        <AppIcon name="image" :size="15" />
        <span class="hidden sm:inline">Ảnh</span>
      </button>
      <button type="button" class="editor-tool gap-1.5 px-3" aria-label="Chèn sản phẩm" title="Chèn sản phẩm" @click="openPicker('product')"><AppIcon name="products" :size="15" /><span class="hidden sm:inline">Sản phẩm</span></button>
      <span class="mx-1 h-6 w-px bg-[#78816f]/20" />
      <button type="button" class="editor-tool" :disabled="!editor.can().undo()" aria-label="Hoàn tác" title="Hoàn tác" @click="editor.chain().focus().undo().run()">↶</button>
      <button type="button" class="editor-tool" :disabled="!editor.can().redo()" aria-label="Làm lại" title="Làm lại" @click="editor.chain().focus().redo().run()">↷</button>
    </div>
    <EditorContent :editor="editor" />
    <div class="flex items-center justify-between border-t border-[#78816f]/15 px-4 py-2 text-[0.64rem] text-[#858a81]">
      <span>Nội dung được tự động lưu trong bản nháp</span>
      <span>{{ editor.getText().length }} ký tự</span>
    </div>
    <AdminMediaLibrary :open="showMedia" title="Chọn ảnh cho nội dung" @close="showMedia = false" @select="insertLibraryImage" />
    <Teleport to="body">
      <div v-if="pickerMode" class="fixed inset-0 z-40 grid place-items-center bg-[#273025]/45 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" @click.self="pickerMode = null">
        <section class="w-full max-w-xl bg-[#f8f4eb] shadow-[0_24px_70px_rgba(41,49,38,0.2)]">
          <header class="flex items-center justify-between border-b border-[#78816f]/20 px-5 py-4"><div><p class="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#75806f]">{{ pickerMode === 'product' ? 'Block nội dung' : 'URL tương đối' }}</p><h2 class="mt-1 text-lg font-semibold text-[#30382c]">{{ pickerMode === 'product' ? 'Chèn sản phẩm' : 'Chèn liên kết nội bộ' }}</h2></div><button type="button" class="editor-tool" @click="pickerMode = null"><AppIcon name="close" :size="16" /></button></header>
          <div class="p-5"><label class="admin-field"><span>Tìm theo tên</span><input v-model="pickerSearch" autofocus :placeholder="pickerMode === 'product' ? 'Tên sản phẩm…' : 'Bài viết, sản phẩm, dịch vụ hoặc trang…'"></label>
            <div class="mt-4 max-h-[420px] overflow-y-auto border-y border-[#78816f]/20">
              <div v-if="pickerLoading" class="space-y-2 py-3"><div v-for="index in 4" :key="index" class="h-14 animate-pulse bg-[#e8e3d8]" /></div>
              <p v-else-if="!pickerResults.length" class="py-12 text-center text-xs text-[#7a8275]">Không tìm thấy kết quả phù hợp.</p>
              <button v-for="item in pickerResults" v-else :key="`${item.type}-${item.id}`" type="button" class="flex w-full items-center justify-between gap-5 border-b border-[#78816f]/15 px-1 py-3 text-left transition last:border-0 hover:bg-[#ece8dd] active:translate-y-px" @click="chooseResult(item)"><span><strong class="block text-sm font-semibold text-[#394433]">{{ item.title }}</strong><small class="mt-1 block text-[0.66rem] text-[#7d8478]">{{ item.url }}</small></span><span class="shrink-0 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[#687363]">{{ item.type }}</span></button>
            </div>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>
