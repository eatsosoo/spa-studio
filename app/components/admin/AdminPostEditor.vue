<script setup lang="ts">
import { Editor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const imageInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const uploadError = ref('')

const editor = new Editor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({ heading: { levels: [2, 3] } }),
    Image.configure({ inline: false, allowBase64: false }),
    Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
    Placeholder.configure({ placeholder: 'Bắt đầu câu chuyện ở đây…' }),
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

function setLink() {
  const previous = editor.getAttributes('link').href as string | undefined
  const url = window.prompt('Địa chỉ liên kết', previous ?? 'https://')
  if (url === null) return
  if (!url.trim()) editor.chain().focus().extendMarkRange('link').unsetLink().run()
  else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim(), target: '_blank' }).run()
}

async function uploadImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  uploadError.value = ''
  try {
    const body = new FormData()
    body.append('image', file)
    const response = await $fetch<{ data: { url: string } }>('/api/admin/post-images', { method: 'POST', body })
    editor.chain().focus().setImage({ src: response.data.url, alt: file.name.replace(/\.[^.]+$/, '') }).run()
  } catch (failure) {
    const error = failure as { data?: { statusMessage?: string }; statusMessage?: string }
    uploadError.value = error.data?.statusMessage ?? error.statusMessage ?? 'Không thể tải ảnh lên.'
  } finally {
    uploading.value = false
    input.value = ''
  }
}

onBeforeUnmount(() => editor.destroy())
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
      <button type="button" class="editor-tool" :class="editor.isActive('link') ? 'editor-tool--active' : ''" aria-label="Thêm liên kết" title="Thêm liên kết" @click="setLink">↗</button>
      <button type="button" class="editor-tool gap-1.5 px-3" :disabled="uploading" aria-label="Chèn ảnh" title="Chèn ảnh" @click="imageInput?.click()">
        <AppIcon name="image" :size="15" />
        <span class="hidden sm:inline">{{ uploading ? 'Đang tải' : 'Ảnh' }}</span>
      </button>
      <input ref="imageInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="uploadImage">
      <span class="mx-1 h-6 w-px bg-[#78816f]/20" />
      <button type="button" class="editor-tool" :disabled="!editor.can().undo()" aria-label="Hoàn tác" title="Hoàn tác" @click="editor.chain().focus().undo().run()">↶</button>
      <button type="button" class="editor-tool" :disabled="!editor.can().redo()" aria-label="Làm lại" title="Làm lại" @click="editor.chain().focus().redo().run()">↷</button>
    </div>
    <EditorContent :editor="editor" />
    <p v-if="uploadError" class="border-t border-[#a66e64]/20 bg-[#f3e6e1] px-4 py-3 text-xs text-[#804d44]" role="alert">{{ uploadError }}</p>
    <div class="flex items-center justify-between border-t border-[#78816f]/15 px-4 py-2 text-[0.64rem] text-[#858a81]">
      <span>Ảnh tối đa 5 MB · JPG, PNG, WebP hoặc GIF</span>
      <span>{{ editor.getText().length }} ký tự</span>
    </div>
  </div>
</template>
