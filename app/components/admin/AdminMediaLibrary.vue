<script setup lang="ts">
type Folder = { name: string; count: number; bytes: number }
type MediaImage = { folder: string; filename: string; url: string; thumbnailUrl: string; bytes: number; width: number; height: number }

const props = withDefaults(defineProps<{ open: boolean; title?: string }>(), { title: 'Thư viện ảnh' })
const emit = defineEmits<{ close: []; select: [image: MediaImage] }>()
const selectedFolder = ref('chung')
const selectedImage = ref<MediaImage | null>(null)
const search = ref('')
const loading = ref(false)
const uploading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const uploadInput = ref<HTMLInputElement | null>(null)
const folders = ref<Folder[]>([])
const images = ref<MediaImage[]>([])

const visibleImages = computed(() => images.value.filter(image => image.folder === selectedFolder.value))
const byteLabel = (bytes: number) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
function failureText(value: unknown) {
  const failure = value as { data?: { statusMessage?: string; data?: { references?: string[] } }; statusMessage?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? 'Không thể thực hiện thao tác.'
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: { folders: Folder[]; images: MediaImage[] } }>('/api/admin/post-media', { query: { search: search.value } })
    folders.value = response.data.folders
    images.value = response.data.images
    if (!folders.value.some(folder => folder.name === selectedFolder.value)) selectedFolder.value = folders.value[0]?.name ?? 'chung'
  } catch (failure) { errorMessage.value = failureText(failure) } finally { loading.value = false }
}

async function createFolder() {
  const name = window.prompt('Tên thư mục mới')
  if (!name) return
  try { await $fetch('/api/admin/post-media/folders', { method: 'POST', body: { name } }); await load() } catch (failure) { errorMessage.value = failureText(failure) }
}

async function renameSelectedFolder() {
  if (selectedFolder.value === 'chung') return
  const name = window.prompt('Tên thư mục mới', selectedFolder.value)
  if (!name) return
  try {
    const response = await $fetch<{ data: { name: string } }>(`/api/admin/post-media/folders/${selectedFolder.value}`, { method: 'PATCH', body: { name } })
    selectedFolder.value = response.data.name
    await load()
  } catch (failure) { errorMessage.value = failureText(failure) }
}

async function deleteSelectedFolder() {
  const folder = folders.value.find(item => item.name === selectedFolder.value)
  if (!folder || selectedFolder.value === 'chung') return
  const confirmed = window.confirm(folder.count ? `Thư mục “${folder.name}” có ${folder.count} ảnh. Kiểm tra nơi đang sử dụng trước khi xóa?` : `Xóa thư mục “${folder.name}”?`)
  if (!confirmed) return
  try { await $fetch(`/api/admin/post-media/folders/${folder.name}`, { method: 'DELETE' }); selectedFolder.value = 'chung'; await load() } catch (failure) {
    errorMessage.value = failureText(failure)
    if ((failure as { statusCode?: number }).statusCode === 409 && window.confirm(`${errorMessage.value}\nBạn xác nhận xóa vĩnh viễn thư mục và toàn bộ ảnh?`)) {
      await $fetch(`/api/admin/post-media/folders/${folder.name}`, { method: 'DELETE', query: { force: true } })
      selectedFolder.value = 'chung'; await load()
    }
  }
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (!files.length) return
  uploading.value = true
  errorMessage.value = ''
  try {
    const body = new FormData()
    body.append('folder', selectedFolder.value)
    for (const file of files) body.append('images', file)
    const response = await $fetch<{ data: Array<{ reductionPercent: number }> }>('/api/admin/post-media', { method: 'POST', body })
    const average = Math.round(response.data.reduce((sum, item) => sum + item.reductionPercent, 0) / response.data.length)
    successMessage.value = `Đã tối ưu ${response.data.length} ảnh, giảm trung bình ${average}%.`
    await load()
  } catch (failure) { errorMessage.value = failureText(failure) } finally { uploading.value = false; input.value = '' }
}

async function moveSelected() {
  if (!selectedImage.value) return
  const target = window.prompt(`Chuyển ảnh sang thư mục nào?\n${folders.value.map(item => item.name).join(', ')}`, selectedImage.value.folder)
  if (!target || target === selectedImage.value.folder) return
  try { await $fetch(`/api/admin/post-media/images/${selectedImage.value.folder}/${selectedImage.value.filename}`, { method: 'PATCH', body: { folder: target } }); selectedImage.value = null; await load() } catch (failure) { errorMessage.value = failureText(failure) }
}

async function deleteSelected(force = false) {
  if (!selectedImage.value || !window.confirm(`Xóa ảnh “${selectedImage.value.filename}”?`)) return
  try {
    await $fetch(`/api/admin/post-media/images/${selectedImage.value.folder}/${selectedImage.value.filename}`, { method: 'DELETE', query: { force } })
    selectedImage.value = null
    await load()
  } catch (failure) {
    errorMessage.value = failureText(failure)
    if (!force && (failure as { statusCode?: number }).statusCode === 409 && window.confirm(`${errorMessage.value}\nVẫn xóa ảnh?`)) await deleteSelected(true)
  }
}

async function copyUrl() {
  if (!selectedImage.value) return
  await navigator.clipboard.writeText(selectedImage.value.url)
  successMessage.value = 'Đã sao chép URL ảnh.'
}

watch(() => props.open, value => { if (value) load() }, { immediate: true })
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 280) })
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="fixed inset-0 z-40 flex bg-[#273025]/45 backdrop-blur-sm" role="dialog" aria-modal="true" :aria-label="title" @click.self="emit('close')">
        <section class="ml-auto flex h-full w-full max-w-[1120px] flex-col bg-[#f7f3ea] shadow-[-24px_0_70px_rgba(41,49,38,0.16)]">
          <header class="flex items-center justify-between border-b border-[#78816f]/20 px-5 py-4 md:px-7">
            <div><p class="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#73806d]">Nội dung bài viết</p><h2 class="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#30382c]">{{ title }}</h2></div>
            <button type="button" class="editor-tool" aria-label="Đóng thư viện" @click="emit('close')"><AppIcon name="close" :size="18" /></button>
          </header>
          <div class="grid min-h-0 flex-1 md:grid-cols-[220px_minmax(0,1fr)]">
            <aside class="border-b border-[#78816f]/20 p-4 md:border-b-0 md:border-r">
              <div class="flex items-center justify-between"><span class="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#687363]">Thư mục</span><button type="button" class="editor-tool" title="Tạo thư mục" @click="createFolder"><AppIcon name="plus" :size="15" /></button></div>
              <div class="mt-3 flex gap-2 overflow-x-auto md:grid">
                <button v-for="folder in folders" :key="folder.name" type="button" class="flex min-w-36 items-center justify-between border-l-2 px-3 py-2 text-left text-xs transition md:min-w-0" :class="selectedFolder === folder.name ? 'border-[#5e6d57] bg-[#e8e4d9] text-[#34402f]' : 'border-transparent text-[#737a70] hover:bg-[#eee9df]'" @click="selectedFolder = folder.name; selectedImage = null"><span class="truncate">{{ folder.name }}</span><span>{{ folder.count }}</span></button>
              </div>
              <div class="mt-4 flex gap-2" v-if="selectedFolder !== 'chung'"><button class="text-[0.66rem] font-semibold text-[#596650]" type="button" @click="renameSelectedFolder">Đổi tên</button><button class="text-[0.66rem] font-semibold text-[#8a534a]" type="button" @click="deleteSelectedFolder">Xóa</button></div>
            </aside>
            <div class="flex min-h-0 flex-col">
              <div class="flex flex-wrap gap-2 border-b border-[#78816f]/20 p-4 md:px-6">
                <label class="relative min-w-[220px] flex-1"><span class="sr-only">Tìm ảnh</span><AppIcon name="search" :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d8578]" /><input v-model="search" class="admin-control w-full pl-9" placeholder="Tìm theo tên ảnh"></label>
                <button type="button" class="app-action app-action--secondary" :disabled="uploading" @click="uploadInput?.click()"><AppIcon name="image" :size="15" />{{ uploading ? 'Đang tối ưu…' : 'Tải ảnh lên' }}</button>
                <input ref="uploadInput" class="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" @change="upload">
              </div>
              <p v-if="errorMessage" class="mx-4 mt-4 bg-[#f1e4df] px-4 py-3 text-xs text-[#75483f]" role="alert">{{ errorMessage }}</p>
              <p v-if="successMessage" class="mx-4 mt-4 bg-[#e4eadf] px-4 py-3 text-xs text-[#526049]" role="status">{{ successMessage }}</p>
              <div class="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
                <div v-if="loading" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"><div v-for="index in 8" :key="index" class="aspect-[4/3] animate-pulse bg-[#e4dfd4]" /></div>
                <div v-else-if="!visibleImages.length" class="grid min-h-72 place-items-center border border-dashed border-[#78816f]/30 text-center"><div><AppIcon name="image" :size="28" class="mx-auto text-[#81897a]" /><p class="mt-3 text-sm font-semibold text-[#485243]">Thư mục chưa có ảnh</p><p class="mt-1 text-xs text-[#858b82]">Tải JPG, PNG hoặc WebP để bắt đầu.</p></div></div>
                <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  <button v-for="image in visibleImages" :key="image.url" type="button" class="group overflow-hidden border bg-[#ede8de] text-left transition active:scale-[0.98]" :class="selectedImage?.url === image.url ? 'border-[#4f6048]' : 'border-transparent hover:border-[#78816f]/45'" @click="selectedImage = image"><img :src="image.thumbnailUrl" :alt="image.filename" class="aspect-[4/3] w-full object-cover"><span class="block truncate px-2.5 pt-2 text-[0.68rem] font-semibold text-[#485243]">{{ image.filename }}</span><span class="block px-2.5 pb-2 text-[0.6rem] text-[#858b81]">{{ image.width }}×{{ image.height }} · {{ byteLabel(image.bytes) }}</span></button>
                </div>
              </div>
              <footer class="flex min-h-16 flex-wrap items-center justify-between gap-3 border-t border-[#78816f]/20 px-4 py-3 md:px-6">
                <div class="flex gap-3"><button type="button" class="text-[0.68rem] font-semibold text-[#596650] disabled:opacity-35" :disabled="!selectedImage" @click="copyUrl">Sao chép URL</button><button type="button" class="text-[0.68rem] font-semibold text-[#596650] disabled:opacity-35" :disabled="!selectedImage" @click="moveSelected">Di chuyển</button><button type="button" class="text-[0.68rem] font-semibold text-[#8a534a] disabled:opacity-35" :disabled="!selectedImage" @click="deleteSelected()">Xóa ảnh</button></div>
                <button type="button" class="app-action app-action--primary" :disabled="!selectedImage" @click="selectedImage && emit('select', selectedImage)">Chọn ảnh này</button>
              </footer>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
