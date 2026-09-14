<script setup lang="ts">
import type { AiPostMediaSource } from '~/types/ai-content'

type Folder = { name: string; path: string; count: number; bytes: number }
type MediaImage = { folder: string; filename: string; url: string; thumbnailUrl: string; bytes: number; width: number; height: number }

const props = defineProps<{ open: boolean; modelValue: AiPostMediaSource | null }>()
const emit = defineEmits<{ close: []; select: [value: AiPostMediaSource] }>()
const currentPath = ref('')
const folders = ref<Folder[]>([])
const images = ref<MediaImage[]>([])
const selected = ref<AiPostMediaSource | null>(null)
const search = ref('')
const loading = ref(false)
const error = ref('')

const parentPath = computed(() => currentPath.value.split('/').slice(0, -1).join('/'))
const breadcrumbs = computed(() => currentPath.value.split('/').filter(Boolean).map((name, index, parts) => ({ name, path: parts.slice(0, index + 1).join('/') })))
const selectedLabel = computed(() => {
  if (!selected.value) return 'Chưa chọn mục nào'
  return selected.value.kind === 'folder' ? `Thư mục: ${selected.value.path || 'posts'}` : `Ảnh: ${selected.value.filename}`
})

const byteLabel = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(0, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
function failureText(value: unknown) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? 'Không thể tải thư viện ảnh.'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await $fetch<{ data: { path: string; folders: Folder[]; images: MediaImage[] } }>('/api/admin/media-browser', { query: { path: currentPath.value, search: search.value } })
    folders.value = response.data.folders
    images.value = response.data.images
  } catch (failure) {
    error.value = failureText(failure)
  } finally {
    loading.value = false
  }
}

async function navigate(path: string) {
  currentPath.value = path
  search.value = ''
  await load()
}

function selectFolder(folder: Folder) {
  selected.value = { kind: 'folder', path: folder.path, name: folder.name, count: folder.count }
}

function selectImage(image: MediaImage) {
  selected.value = { kind: 'image', folder: image.folder, filename: image.filename, url: image.url, thumbnailUrl: image.thumbnailUrl }
}

function selectCurrentFolder() {
  selected.value = { kind: 'folder', path: currentPath.value, name: currentPath.value.split('/').at(-1) || 'posts', count: images.value.length }
}

function confirm() {
  if (selected.value) emit('select', selected.value)
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  if (!props.open) return
  clearTimeout(searchTimer)
  searchTimer = setTimeout(load, 250)
})
watch(() => props.open, async (open) => {
  if (!open) return
  selected.value = props.modelValue
  currentPath.value = props.modelValue?.kind === 'image'
    ? props.modelValue.folder
    : props.modelValue?.kind === 'folder'
      ? props.modelValue.path.split('/').slice(0, -1).join('/')
      : ''
  search.value = ''
  await load()
})
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <CommonModal :open="open" title="Chọn ảnh cho bài viết" description="Mở thư mục để duyệt sâu hơn, sau đó chọn một ảnh hoặc toàn bộ thư mục." size="xl" @close="$emit('close')">
    <div class="overflow-hidden border border-[#78816f]/22 bg-[#fbf9f3] shadow-[0_18px_45px_-34px_rgba(43,53,39,0.45)]">
      <div class="flex flex-wrap items-center gap-2 border-b border-[#78816f]/18 bg-[#ece8de] px-3 py-2.5">
        <button type="button" class="media-tool" :disabled="!currentPath" aria-label="Quay lại thư mục cha" @click="navigate(parentPath)"><AppIcon name="arrow-left" :size="15" /></button>
        <button type="button" class="media-tool" aria-label="Tải lại" @click="load"><AppIcon name="refresh" :size="15" /></button>
        <nav class="flex min-w-0 flex-1 items-center gap-1 overflow-hidden border border-[#78816f]/22 bg-[#f8f6ef] px-3 py-2 text-[0.67rem]" aria-label="Đường dẫn thư mục">
          <button type="button" class="shrink-0 font-semibold text-[#4c5947]" @click="navigate('')">posts</button>
          <template v-for="crumb in breadcrumbs" :key="crumb.path"><AppIcon name="chevron" :size="10" class="shrink-0 opacity-40" /><button type="button" class="truncate text-[#657060] hover:text-[#35412f]" @click="navigate(crumb.path)">{{ crumb.name }}</button></template>
        </nav>
        <label class="relative w-full sm:w-56"><span class="sr-only">Tìm trong thư mục</span><AppIcon name="search" :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8476]" /><CommonInput v-model="search" type="search" class="h-9 w-full border border-[#78816f]/22 bg-[#f8f6ef] pl-9 pr-3 text-xs" placeholder="Tìm trong thư mục" /></label>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#78816f]/14 px-4 py-3">
        <div><p class="text-xs font-semibold text-[#3d4838]">{{ currentPath.split('/').at(-1) || 'posts' }}</p><p class="mt-0.5 text-[0.6rem] text-[#899084]">{{ folders.length }} thư mục · {{ images.length }} ảnh</p></div>
        <button type="button" class="inline-flex h-8 items-center gap-2 border border-[#65745e]/25 bg-[#e8ece3] px-3 text-[0.66rem] font-semibold text-[#4e5d48] transition hover:bg-[#dde5d8] active:translate-y-px" @click="selectCurrentFolder"><AppIcon name="folder" :size="13" />Chọn thư mục này</button>
      </div>

      <div class="min-h-[390px] p-4 sm:p-5">
        <div v-if="loading" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"><div v-for="index in 12" :key="index" class="h-32 animate-pulse bg-[#e7e2d8]" /></div>
        <p v-else-if="error" class="border-l-2 border-[#9a5d51] bg-[#f1e4df] px-4 py-3 text-xs text-[#75483f]" role="alert">{{ error }}</p>
        <AdminEmptyState v-else-if="!folders.length && !images.length" title="Thư mục đang trống" description="Quay lại thư mục cha hoặc mở Thư viện ảnh để tải thêm ảnh." />
        <div v-else class="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
          <div v-for="folder in folders" :key="folder.path" class="group relative min-w-0">
            <button type="button" class="media-item group w-full" :class="selected?.kind === 'folder' && selected.path === folder.path ? 'media-item--selected' : ''" @click="selectFolder(folder)" @dblclick="navigate(folder.path)">
              <span class="media-folder"><span>{{ folder.count }}</span></span>
              <strong class="mt-3 block truncate text-[0.68rem] text-[#3d4738]">{{ folder.name }}</strong>
              <span class="mt-1 block text-[0.58rem] text-[#858c82]">{{ folder.count }} ảnh · {{ byteLabel(folder.bytes) }}</span>
            </button>
            <button type="button" class="absolute right-1 top-1 grid size-7 place-items-center rounded-full border border-[#78816f]/18 bg-[#f8f5ed]/90 text-[#596653] opacity-100 transition hover:bg-white lg:opacity-0 lg:group-hover:opacity-100" :aria-label="`Mở thư mục ${folder.name}`" @click="navigate(folder.path)"><AppIcon name="chevron" :size="12" /></button>
          </div>
          <button v-for="image in images" :key="image.url" type="button" class="media-item group" :class="selected?.kind === 'image' && selected.url === image.url ? 'media-item--selected' : ''" @click="selectImage(image)">
            <span class="block aspect-[4/3] overflow-hidden bg-[#e7e2d8]"><img :src="image.thumbnailUrl" :alt="image.filename" class="size-full object-cover transition duration-300 group-hover:scale-[1.03]"></span>
            <strong class="mt-3 block truncate text-[0.68rem] text-[#3d4738]">{{ image.filename }}</strong>
            <span class="mt-1 block text-[0.58rem] text-[#858c82]">{{ image.width }} × {{ image.height }}</span>
          </button>
        </div>
      </div>
    </div>

    <template #footer><div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p class="truncate text-xs text-[#697267]">{{ selectedLabel }}</p><div class="flex justify-end gap-2"><AppButton label="Hủy" variant="secondary" @click="$emit('close')" /><AppButton label="Dùng mục đã chọn" icon="check" :disabled="!selected" @click="confirm" /></div></div></template>
  </CommonModal>
</template>

<style scoped>
.media-tool { display: grid; width: 2rem; height: 2rem; flex: none; place-items: center; color: #697464; transition: transform 180ms ease, background-color 180ms ease, opacity 180ms ease; }
.media-tool:hover:not(:disabled) { background: #ded9ce; }
.media-tool:active:not(:disabled) { transform: translateY(1px); }
.media-tool:disabled { cursor: not-allowed; opacity: .3; }
.media-item { min-width: 0; padding: .45rem; text-align: center; outline: none; transition: transform 200ms cubic-bezier(.16,1,.3,1), background-color 180ms ease, box-shadow 180ms ease; }
.media-item:hover { transform: translateY(-2px); background: #f0ece3; }
.media-item:active { transform: translateY(0) scale(.98); }
.media-item:focus-visible { outline: 2px solid #61705a; outline-offset: 2px; }
.media-item--selected { background: #e4eadf; box-shadow: inset 0 0 0 1px rgba(83,103,74,.45); }
.media-folder { position: relative; display: block; width: 5.6rem; height: 3.75rem; margin: .8rem auto 0; border: 1px solid rgba(109,112,80,.2); border-radius: .3rem .5rem .5rem; background: #d9cda5; box-shadow: inset 0 1px 0 rgba(255,255,255,.38), 0 13px 20px -18px rgba(50,55,38,.65); }
.media-folder::before { position: absolute; left: -.05rem; top: -.65rem; width: 2.5rem; height: .8rem; content: ''; border: 1px solid rgba(109,112,80,.18); border-bottom: 0; border-radius: .3rem .45rem 0 0; background: #d0c291; }
.media-folder span { position: absolute; right: .45rem; bottom: .35rem; font-size: .55rem; font-weight: 700; color: #655f48; }
</style>
