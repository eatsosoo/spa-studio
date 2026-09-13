<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Trình quản lý ảnh | MIÊN Admin' })

type Folder = { name: string; path: string; count: number; bytes: number }
type MediaImage = { folder: string; filename: string; url: string; thumbnailUrl: string; bytes: number; width: number; height: number }
type ExplorerTarget = { kind: 'folder'; folder: Folder } | { kind: 'image'; image: MediaImage }
type DialogAction = 'create' | 'rename' | 'delete' | null

const currentPath = ref('')
const folders = ref<Folder[]>([])
const images = ref<MediaImage[]>([])
const search = ref('')
const itemsPerRow = ref(5)
const selectedKey = ref('')
const loading = ref(true)
const uploading = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const uploadInput = ref<HTMLInputElement | null>(null)
const dialogAction = ref<DialogAction>(null)
const dialogTarget = ref<ExplorerTarget | null>(null)
const editName = ref('')
const contextMenu = ref<{ x: number; y: number; target: ExplorerTarget } | null>(null)

const gridClass = computed(() => ({
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-4 xl:grid-cols-5',
  6: 'md:grid-cols-4 xl:grid-cols-6',
} as Record<number, string>)[itemsPerRow.value] ?? 'md:grid-cols-4 xl:grid-cols-5')
const itemCount = computed(() => folders.value.length + images.value.length)
const parentPath = computed(() => currentPath.value.split('/').slice(0, -1).join('/'))
const breadcrumbs = computed(() => {
  const parts = currentPath.value.split('/').filter(Boolean)
  return parts.map((name, index) => ({ name, path: parts.slice(0, index + 1).join('/') }))
})

const byteLabel = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(0, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
const normalizeName = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
function failureText(value: unknown) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? 'Không thể thực hiện thao tác.'
}
function clearNotice() { errorMessage.value = ''; successMessage.value = '' }

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ data: { path: string; folders: Folder[]; images: MediaImage[] } }>('/api/admin/media-browser', { query: { path: currentPath.value, search: search.value } })
    folders.value = response.data.folders
    images.value = response.data.images
  } catch (failure) { errorMessage.value = failureText(failure) } finally { loading.value = false }
}

async function navigate(path: string) {
  currentPath.value = path
  selectedKey.value = ''
  search.value = ''
  contextMenu.value = null
  await load()
}
function selectTarget(target: ExplorerTarget) { selectedKey.value = target.kind === 'folder' ? `folder:${target.folder.path}` : `image:${target.image.url}` }
function openFolder(folder: Folder) { navigate(folder.path) }
function closeContextMenu() { contextMenu.value = null }
function showContextMenu(event: MouseEvent, target: ExplorerTarget) {
  contextMenu.value = { x: Math.min(event.clientX, window.innerWidth - 196), y: Math.min(event.clientY, window.innerHeight - 142), target }
  selectTarget(target)
}
function showButtonMenu(event: MouseEvent, target: ExplorerTarget) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  contextMenu.value = { x: Math.min(rect.right - 188, window.innerWidth - 196), y: Math.min(rect.bottom + 5, window.innerHeight - 142), target }
  selectTarget(target)
}

function openCreate() { clearNotice(); closeContextMenu(); dialogTarget.value = null; editName.value = ''; dialogAction.value = 'create' }
function openRename(target: ExplorerTarget) {
  clearNotice(); closeContextMenu(); dialogTarget.value = target
  editName.value = target.kind === 'folder' ? target.folder.name : target.image.filename.replace(/\.webp$/i, '')
  dialogAction.value = 'rename'
}
function openDelete(target: ExplorerTarget) { clearNotice(); closeContextMenu(); dialogTarget.value = target; dialogAction.value = 'delete' }
function closeDialog() { if (!submitting.value) { dialogAction.value = null; dialogTarget.value = null; editName.value = ''; errorMessage.value = '' } }
function duplicateFolderName(name: string, target?: ExplorerTarget | null) {
  const slug = normalizeName(name)
  return folders.value.some(folder => folder.name === slug && (target?.kind !== 'folder' || folder.path !== target.folder.path))
}

async function submitName() {
  const name = editName.value.trim()
  if (!name) { errorMessage.value = 'Vui lòng nhập tên.'; return }
  if ((dialogAction.value === 'create' || dialogTarget.value?.kind === 'folder') && duplicateFolderName(name, dialogTarget.value)) {
    errorMessage.value = 'Thư mục cùng tên đã tồn tại ở cấp này.'
    return
  }
  submitting.value = true; clearNotice()
  try {
    if (dialogAction.value === 'create') {
      await $fetch('/api/admin/media-browser/folders', { method: 'POST', body: { path: currentPath.value, name } })
      successMessage.value = `Đã tạo thư mục “${normalizeName(name)}”.`
    } else if (dialogTarget.value?.kind === 'folder') {
      await $fetch('/api/admin/media-browser/folders', { method: 'PATCH', body: { path: dialogTarget.value.folder.path, name } })
      successMessage.value = `Đã đổi tên thư mục thành “${normalizeName(name)}”.`
    } else if (dialogTarget.value?.kind === 'image') {
      const image = dialogTarget.value.image
      const response = await $fetch<{ data: { filename: string } }>('/api/admin/media-browser/files', { method: 'PATCH', body: { path: image.folder, filename: image.filename, name } })
      successMessage.value = `Đã đổi tên ảnh thành “${response.data.filename}”.`
    }
    dialogAction.value = null; dialogTarget.value = null; selectedKey.value = ''; await load()
  } catch (failure) { errorMessage.value = failureText(failure) } finally { submitting.value = false }
}

async function deleteTarget(force = false) {
  const target = dialogTarget.value
  if (!target) return
  submitting.value = true; clearNotice()
  try {
    if (target.kind === 'folder') {
      await $fetch('/api/admin/media-browser/folders', { method: 'DELETE', query: { path: target.folder.path, force } })
      successMessage.value = `Đã xóa thư mục “${target.folder.name}”.`
    } else {
      await $fetch('/api/admin/media-browser/files', { method: 'DELETE', query: { path: target.image.folder, filename: target.image.filename, force } })
      successMessage.value = `Đã xóa ảnh “${target.image.filename}”.`
    }
    dialogAction.value = null; dialogTarget.value = null; selectedKey.value = ''; await load()
  } catch (failure) {
    errorMessage.value = failureText(failure)
    if (force || (failure as { statusCode?: number }).statusCode !== 409) dialogAction.value = null
  } finally { submitting.value = false }
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  if (!files.length) return
  uploading.value = true; clearNotice()
  try {
    const body = new FormData(); body.append('path', currentPath.value); files.forEach(file => body.append('images', file))
    const response = await $fetch<{ data: Array<{ reductionPercent: number }> }>('/api/admin/media-browser', { method: 'POST', body })
    const average = Math.round(response.data.reduce((sum, item) => sum + item.reductionPercent, 0) / response.data.length)
    successMessage.value = `Đã tải ${response.data.length} ảnh, giảm trung bình ${average}% dung lượng.`; await load()
  } catch (failure) { errorMessage.value = failureText(failure) } finally { uploading.value = false; input.value = '' }
}

async function copyUrl(image: MediaImage) { closeContextMenu(); await navigator.clipboard.writeText(image.url); successMessage.value = 'Đã sao chép đường dẫn ảnh.' }
function handleKeydown(event: KeyboardEvent) { if (event.key === 'Escape') closeContextMenu() }
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 280) })
onMounted(() => {
  load(); window.addEventListener('click', closeContextMenu); window.addEventListener('keydown', handleKeydown); window.addEventListener('resize', closeContextMenu); window.addEventListener('scroll', closeContextMenu, true)
})
onBeforeUnmount(() => {
  clearTimeout(searchTimer); window.removeEventListener('click', closeContextMenu); window.removeEventListener('keydown', handleKeydown); window.removeEventListener('resize', closeContextMenu); window.removeEventListener('scroll', closeContextMenu, true)
})
</script>

<template>
  <section class="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 md:py-10 lg:px-10 lg:py-12">
    <header class="grid gap-6 border-b border-[#78816f]/20 pb-7 lg:grid-cols-[1fr_auto] lg:items-end">
      <div><p class="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#72806c]">Public media</p><h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Trình quản lý ảnh</h1><p class="mt-3 max-w-xl text-sm leading-6 text-[#6d746a]">Tạo cấu trúc thư mục nhiều tầng và quản lý ảnh như trên máy tính.</p></div>
      <div class="flex flex-wrap gap-2"><AppButton label="Thư mục mới" icon="folder" variant="secondary" @click="openCreate" /><AppButton :label="uploading ? 'Đang tối ưu…' : 'Tải ảnh lên'" icon="upload" :disabled="uploading" @click="uploadInput?.click()" /><CommonInput ref="uploadInput" class="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" @change="upload" /></div>
    </header>

    <p v-if="errorMessage && !dialogAction" class="mt-5 flex items-start gap-3 border-l-2 border-[#9a5d51] bg-[#f1e4df] px-4 py-3 text-xs text-[#75483f]" role="alert"><AppIcon name="alert" :size="16" />{{ errorMessage }}</p>
    <p v-if="successMessage" class="mt-5 flex items-start gap-3 border-l-2 border-[#65765c] bg-[#e4eadf] px-4 py-3 text-xs text-[#526049]" role="status"><AppIcon name="check" :size="16" />{{ successMessage }}</p>

    <section class="mt-7 overflow-hidden border border-[#78816f]/22 bg-[#faf8f2] shadow-[0_22px_55px_-38px_rgba(43,53,39,0.4)]" @contextmenu.self.prevent>
      <div class="flex flex-wrap items-center gap-2 border-b border-[#78816f]/18 bg-[#ece8de] px-3 py-2.5 sm:px-4">
        <button type="button" class="explorer-tool" :disabled="!currentPath" aria-label="Quay lại thư mục cha" @click="navigate(parentPath)"><AppIcon name="arrow-left" :size="15" /></button>
        <button type="button" class="explorer-tool" aria-label="Tải lại" @click="load"><AppIcon name="refresh" :size="15" /></button>
        <nav class="flex min-w-0 flex-1 items-center gap-1 border border-[#78816f]/22 bg-[#f8f6ef] px-3 py-2 text-[0.67rem]" aria-label="Đường dẫn thư mục">
          <button type="button" class="breadcrumb-part" @click="navigate('')">public</button><AppIcon name="chevron" :size="10" class="opacity-40" /><span class="text-[#7a8376]">uploads</span><AppIcon name="chevron" :size="10" class="opacity-40" /><button type="button" class="breadcrumb-part" @click="navigate('')">posts</button>
          <template v-for="crumb in breadcrumbs" :key="crumb.path"><AppIcon name="chevron" :size="10" class="shrink-0 opacity-40" /><button type="button" class="breadcrumb-part truncate" @click="navigate(crumb.path)">{{ crumb.name }}</button></template>
        </nav>
        <label class="relative w-full sm:w-56"><span class="sr-only">Tìm ảnh</span><AppIcon name="search" :size="14" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8476]" /><CommonInput v-model="search" type="search" class="h-9 w-full border border-[#78816f]/22 bg-[#f8f6ef] pl-9 pr-3 text-xs focus:border-[#596a52]" placeholder="Tìm trong thư mục" /></label>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#78816f]/14 px-4 py-3 sm:px-6">
        <div><p class="text-xs font-semibold text-[#3d4838]">{{ currentPath.split('/').at(-1) || 'posts' }}</p><p class="mt-0.5 text-[0.58rem] text-[#899084]">{{ itemCount }} mục cùng cấp</p></div>
        <label class="flex items-center gap-2 text-[0.62rem] text-[#737c70]"><span>Số mục mỗi hàng</span><CommonSelect v-model.number="itemsPerRow" class="h-8 border border-[#78816f]/25 bg-[#f8f6ef] px-2 text-xs text-[#3f493a]"><option :value="3">3</option><option :value="4">4</option><option :value="5">5</option><option :value="6">6</option></CommonSelect></label>
      </div>

      <div class="min-h-[540px] p-4 sm:p-6" @click="selectedKey = ''">
        <div v-if="loading" class="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5"><div v-for="index in 10" :key="index" class="h-36 animate-pulse bg-[#e6e1d7]" /></div>
        <AdminEmptyState v-else-if="!itemCount" :title="search ? 'Không tìm thấy ảnh phù hợp' : 'Thư mục đang trống'" :description="search ? 'Thử một tên tệp khác.' : 'Tạo thư mục con hoặc tải ảnh lên để bắt đầu.'" />
        <div v-else class="grid grid-cols-2 gap-x-3 gap-y-5" :class="gridClass">
          <div v-for="folder in folders" :key="folder.path" class="explorer-item group" :class="selectedKey === `folder:${folder.path}` ? 'explorer-item--selected' : ''" role="button" tabindex="0" @click.stop="selectTarget({ kind: 'folder', folder })" @dblclick="openFolder(folder)" @keydown.enter="openFolder(folder)" @contextmenu.prevent.stop="showContextMenu($event, { kind: 'folder', folder })">
            <button type="button" class="item-menu-trigger" aria-label="Tùy chọn thư mục" @click.stop="showButtonMenu($event, { kind: 'folder', folder })"><AppIcon name="dots" :size="16" /></button><span class="explorer-folder"><span class="explorer-folder__count">{{ folder.count }}</span></span><strong class="item-name">{{ folder.name }}</strong><span class="item-meta">{{ folder.count }} ảnh · {{ byteLabel(folder.bytes) }}</span>
          </div>
          <div v-for="image in images" :key="image.url" class="explorer-item group" :class="selectedKey === `image:${image.url}` ? 'explorer-item--selected' : ''" role="button" tabindex="0" @click.stop="selectTarget({ kind: 'image', image })" @keydown.enter="selectTarget({ kind: 'image', image })" @contextmenu.prevent.stop="showContextMenu($event, { kind: 'image', image })">
            <button type="button" class="item-menu-trigger" aria-label="Thao tác với ảnh" @click.stop="showButtonMenu($event, { kind: 'image', image })"><AppIcon name="dots" :size="16" /></button><span class="image-file"><img :src="image.thumbnailUrl" :alt="image.filename"></span><strong class="item-name">{{ image.filename }}</strong><span class="item-meta">{{ image.width }} × {{ image.height }} · {{ byteLabel(image.bytes) }}</span>
          </div>
        </div>
      </div>
      <footer class="flex justify-between border-t border-[#78816f]/18 bg-[#ece8de] px-4 py-2.5 text-[0.6rem] text-[#737c70]"><span>{{ itemCount }} mục</span><span>{{ selectedKey ? 'Đã chọn 1 mục' : 'Chưa chọn mục nào' }}</span></footer>
    </section>

    <Teleport to="body"><Transition name="context-pop"><div v-if="contextMenu" class="context-menu" :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }" role="menu" @click.stop>
      <button v-if="contextMenu.target.kind === 'folder'" type="button" class="context-item" @click="openFolder(contextMenu.target.folder)"><AppIcon name="folder" :size="15" />Mở thư mục</button><button v-else type="button" class="context-item" @click="copyUrl(contextMenu.target.image)"><AppIcon name="copy" :size="15" />Sao chép URL</button><div class="my-1 border-t border-[#78816f]/16" /><button type="button" class="context-item" @click="openRename(contextMenu.target)"><AppIcon name="edit" :size="15" />Đổi tên</button><button type="button" class="context-item context-item--danger" @click="openDelete(contextMenu.target)"><AppIcon name="trash" :size="15" />Xóa</button>
    </div></Transition></Teleport>

    <CommonModal :open="dialogAction !== null" :title="dialogAction === 'create' ? 'Tạo thư mục mới' : dialogAction === 'rename' ? 'Đổi tên' : 'Xác nhận xóa'" size="sm" :close-on-backdrop="!submitting" @close="closeDialog">
      <form v-if="dialogAction !== 'delete'" class="grid gap-2" @submit.prevent="submitName"><label for="media-name" class="text-[0.68rem] font-semibold text-[#4d5848]">Tên {{ dialogTarget?.kind === 'image' ? 'tệp' : 'thư mục' }}</label><CommonInput id="media-name" v-model="editName" autofocus class="admin-control" /><small class="text-[0.62rem] leading-5 text-[#7c8478]">Tên sẽ được chuẩn hóa thành chữ thường, không dấu và dấu gạch ngang.{{ dialogTarget?.kind === 'image' ? ' Định dạng .webp được giữ nguyên.' : '' }}</small><p v-if="errorMessage" class="mt-2 text-xs text-[#8a534a]" role="alert">{{ errorMessage }}</p></form>
      <div v-else><p class="text-sm font-semibold text-[#3e4939]">“{{ dialogTarget?.kind === 'folder' ? dialogTarget.folder.name : dialogTarget?.image.filename }}”</p><p class="mt-3 text-xs leading-6 text-[#727a6f]">{{ dialogTarget?.kind === 'folder' ? `Thư mục và toàn bộ ${dialogTarget.folder.count} ảnh bên trong sẽ bị xóa.` : 'Ảnh sẽ bị xóa khỏi thư mục hiện tại.' }}</p><p v-if="errorMessage" class="mt-4 border-l-2 border-[#9a5d51] bg-[#f1e4df] px-3 py-2 text-xs text-[#75483f]">{{ errorMessage }}</p></div>
      <template #footer><div class="flex justify-end gap-2"><AppButton label="Hủy" variant="ghost" @click="closeDialog" /><AppButton v-if="dialogAction !== 'delete'" :label="submitting ? 'Đang lưu…' : 'Lưu'" :disabled="submitting" @click="submitName" /><button v-else type="button" class="app-action border border-[#98675d] bg-[#8a534a] text-white" :disabled="submitting" @click="deleteTarget(Boolean(errorMessage))">{{ submitting ? 'Đang xóa…' : errorMessage ? 'Xóa vĩnh viễn' : 'Xóa' }}</button></div></template>
    </CommonModal>
  </section>
</template>

<style scoped>
.explorer-tool { display: grid; width: 2rem; height: 2rem; place-items: center; color: #697464; transition: background-color 180ms ease, opacity 180ms ease; }
.explorer-tool:hover:not(:disabled) { background: #ded9ce; }
.explorer-tool:disabled { cursor: not-allowed; opacity: .3; }
.breadcrumb-part { flex-shrink: 0; font-weight: 600; color: #465240; }
.breadcrumb-part:hover { text-decoration: underline; }
.explorer-item { position: relative; display: flex; min-width: 0; min-height: 9.5rem; flex-direction: column; align-items: center; justify-content: flex-end; border-radius: .2rem; padding: 1rem .5rem .75rem; text-align: center; outline: none; transition: background-color 180ms ease, transform 180ms ease, box-shadow 180ms ease; }
.explorer-item:hover { background: #eeebe2; }
.explorer-item:active { transform: scale(.985); }
.explorer-item--selected { background: #dfe5da; box-shadow: inset 0 0 0 1px rgba(102,118,94,.35); }
.explorer-folder { position: relative; display: block; width: 6.5rem; height: 4.25rem; border: 1px solid rgba(109,112,80,.2); border-radius: .35rem .6rem .6rem; background: #d9cda5; box-shadow: inset 0 1px 0 rgba(255,255,255,.38), 0 14px 22px -18px rgba(50,55,38,.65); transition: transform 300ms cubic-bezier(.16,1,.3,1); }
.explorer-folder::before { position: absolute; left: -.05rem; top: -.78rem; width: 3rem; height: 1rem; content: ''; border: 1px solid rgba(109,112,80,.18); border-bottom: 0; border-radius: .35rem .55rem 0 0; background: #d0c291; }
.explorer-folder::after { position: absolute; inset: .5rem .4rem .4rem; content: ''; border-radius: .2rem; background: linear-gradient(150deg, rgba(255,255,255,.24), transparent); }
.group:hover .explorer-folder { transform: translateY(-3px); }
.explorer-folder__count { position: absolute; right: .5rem; bottom: .42rem; z-index: 1; font-size: .56rem; font-weight: 700; color: #655f48; }
.image-file { display: grid; width: 100%; aspect-ratio: 4/3; place-items: center; overflow: hidden; border: 1px solid rgba(120,129,111,.18); background: #e5e1d7; box-shadow: 0 8px 20px -15px rgba(43,53,39,.65); }
.image-file img { width: 100%; height: 100%; object-fit: cover; transition: transform 300ms ease; }
.group:hover .image-file img { transform: scale(1.025); }
.item-name { display: block; width: 100%; overflow: hidden; margin-top: .65rem; color: #3f493a; font-size: .66rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.item-meta { margin-top: .2rem; color: #899084; font-size: .56rem; }
.item-menu-trigger { position: absolute; top: .35rem; right: .35rem; z-index: 2; display: grid; width: 1.8rem; height: 1.8rem; place-items: center; border: 1px solid rgba(120,129,111,.2); background: rgba(250,248,242,.92); color: #66715f; opacity: 0; transition: opacity 180ms ease, background-color 180ms ease; }
.group:hover .item-menu-trigger, .item-menu-trigger:focus-visible, .explorer-item--selected .item-menu-trigger { opacity: 1; }
.item-menu-trigger:hover { background: #e1ddd3; }
.context-menu { position: fixed; z-index: 50; width: 188px; border: 1px solid rgba(120,129,111,.25); background: rgba(251,249,244,.96); padding: .375rem 0; box-shadow: 0 18px 48px -18px rgba(33,42,30,.42); backdrop-filter: blur(12px); }
.context-item { display: flex; width: 100%; align-items: center; gap: .65rem; padding: .58rem .75rem; text-align: left; color: #475242; font-size: .68rem; font-weight: 600; transition: background-color 150ms ease, color 150ms ease; }
.context-item:hover { background: #e8e5dc; }
.context-item--danger { color: #8a534a; }
.context-pop-enter-active, .context-pop-leave-active { transition: opacity 140ms ease, transform 180ms cubic-bezier(.16,1,.3,1); transform-origin: top left; }
.context-pop-enter-from, .context-pop-leave-to { opacity: 0; transform: scale(.96); }
@media (hover: none) { .item-menu-trigger { opacity: 1; } }
</style>
