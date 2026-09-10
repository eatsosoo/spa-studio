<script setup lang="ts">
import type { SeoInput } from '~/utils/postSeo'

type PostForm = {
  title: string; category: string; summary: string; content: string; featuredImage: string; status: string
  metaTitle: string; metaDescription: string; slug: string; focusKeyword: string; secondaryKeywords: string
}

const props = defineProps<{ postId?: number }>()
const router = useRouter()
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const view = ref<'editor' | 'article' | 'serp' | 'social'>('editor')
const previewViewport = ref<'desktop' | 'mobile'>('desktop')
const showMedia = ref(false)
const dirty = ref(false)
const initialized = ref(false)
const form = reactive<PostForm>({ title: '', category: '', summary: '', content: '<p></p>', featuredImage: '', status: 'Bản nháp', metaTitle: '', metaDescription: '', slug: '', focusKeyword: '', secondaryKeywords: '' })
const draftKey = computed(() => `mien-post-draft-${props.postId ?? 'new'}`)

const { data: optionsResponse } = await useAsyncData('admin-post-options', () => $fetch<{ data: { postCategories: string[] } }>('/api/admin/form-options'))
const categories = computed(() => optionsResponse.value?.data.postCategories ?? [])
const { data: postResponse, pending, error } = props.postId
  ? await useAsyncData(`admin-post-${props.postId}`, () => $fetch<{ data: Omit<PostForm, 'secondaryKeywords'> & { secondaryKeywords?: string[] | string } }>(`/api/admin/posts/${props.postId}`))
  : { data: ref(null), pending: ref(false), error: ref(null) }

if (postResponse.value?.data) {
  Object.assign(form, postResponse.value.data)
  form.summary = String(postResponse.value.data.summary ?? '')
  form.content = String(postResponse.value.data.content ?? '<p></p>')
  form.featuredImage = String(postResponse.value.data.featuredImage ?? '')
  form.metaTitle = String(postResponse.value.data.metaTitle ?? '')
  form.metaDescription = String(postResponse.value.data.metaDescription ?? '')
  form.focusKeyword = String(postResponse.value.data.focusKeyword ?? '')
  form.secondaryKeywords = Array.isArray(postResponse.value.data.secondaryKeywords) ? postResponse.value.data.secondaryKeywords.join(', ') : String(postResponse.value.data.secondaryKeywords ?? '')
}
if (!form.category && categories.value.length) form.category = categories.value[0] ?? ''
if (import.meta.client) {
  const draft = localStorage.getItem(draftKey.value)
  if (draft && window.confirm('Có bản nháp tự động chưa lưu. Bạn muốn khôi phục không?')) {
    try { Object.assign(form, JSON.parse(draft)) } catch { localStorage.removeItem(draftKey.value) }
  }
}
initialized.value = true

const isContentEmpty = computed(() => !form.content.replace(/<[^>]*>/g, '').trim())
const canSave = computed(() => Boolean(form.title.trim() && form.category && !isContentEmpty.value))
const previewContent = computed(() => form.content || '<p>Chưa có nội dung.</p>')
const seoInput = computed<SeoInput>(() => ({ ...form }))
const canonicalPath = computed(() => `/bai-viet/${form.slug || slugify(form.title) || 'bai-viet-moi'}`)
const socialTitle = computed(() => form.metaTitle || form.title || 'Tiêu đề bài viết')
const socialDescription = computed(() => form.metaDescription || form.summary || 'Mô tả bài viết sẽ xuất hiện ở đây.')
const previewTabs: Array<{ id: 'editor' | 'article' | 'serp' | 'social'; label: string }> = [{ id: 'editor', label: 'Biên tập' }, { id: 'article', label: 'Bài viết' }, { id: 'serp', label: 'SERP' }, { id: 'social', label: 'Social' }]

function slugify(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
function failureText(value: unknown) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? failure.message ?? 'Không thể lưu bài viết. Vui lòng thử lại.'
}
function chooseCover(image: { url: string }) { form.featuredImage = image.url; showMedia.value = false }
function focusField(field: string) {
  if (view.value !== 'editor') view.value = 'editor'
  nextTick(() => {
    const target = document.querySelector<HTMLElement>(`[data-seo-field="${field}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target?.querySelector<HTMLElement>('input, textarea, select, [contenteditable="true"]')?.focus()
  })
}
async function save() {
  if (!canSave.value) { errorMessage.value = 'Vui lòng nhập tiêu đề, chuyên mục và nội dung bài viết.'; return }
  saving.value = true; errorMessage.value = ''; successMessage.value = ''
  try {
    await $fetch(props.postId ? `/api/admin/posts/${props.postId}` : '/api/admin/posts', { method: props.postId ? 'PATCH' : 'POST', body: form })
    dirty.value = false
    if (import.meta.client) localStorage.removeItem(draftKey.value)
    await router.push({ path: '/admin/bai-viet', query: { saved: props.postId ? 'updated' : 'created' } })
  } catch (failure) { errorMessage.value = failureText(failure); window.scrollTo({ top: 0, behavior: 'smooth' }) } finally { saving.value = false }
}

let autosaveTimer: ReturnType<typeof setTimeout> | undefined
watch(form, () => {
  if (!initialized.value) return
  dirty.value = true
  if (!props.postId && !form.slug) form.slug = slugify(form.title)
  clearTimeout(autosaveTimer)
  autosaveTimer = setTimeout(() => {
    if (import.meta.client) localStorage.setItem(draftKey.value, JSON.stringify(form))
    successMessage.value = 'Đã tự động lưu bản nháp trên thiết bị.'
  }, 1100)
}, { deep: true })
function beforeUnload(event: BeforeUnloadEvent) { if (dirty.value) event.preventDefault() }
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => { clearTimeout(autosaveTimer); window.removeEventListener('beforeunload', beforeUnload) })
onBeforeRouteLeave(() => !dirty.value || window.confirm('Bài viết có thay đổi chưa lưu. Bạn vẫn muốn rời trang?'))
useHead({ title: `${props.postId ? 'Chỉnh sửa' : 'Bài viết mới'} | MIÊN Admin` })
</script>

<template>
  <section class="mx-auto w-full max-w-[1580px] px-4 py-6 md:px-8 md:py-9 lg:px-10">
    <div v-if="pending" class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]"><div class="space-y-5"><div class="h-12 animate-pulse bg-[#e6e1d6]"/><div class="h-[560px] animate-pulse bg-[#e6e1d6]"/></div><div class="h-[520px] animate-pulse bg-[#e6e1d6]"/></div>
    <div v-else-if="error" class="mx-auto max-w-xl py-24 text-center"><p class="text-sm font-semibold text-[#65443e]">Không tải được bài viết</p><p class="mt-2 text-xs leading-5 text-[#80665f]">{{ failureText(error) }}</p><NuxtLink to="/admin/bai-viet" class="app-action app-action--secondary mt-6">Quay lại danh sách</NuxtLink></div>
    <template v-else>
      <header class="mb-7 flex flex-col gap-5 border-b border-[#78816f]/20 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-start gap-4"><NuxtLink to="/admin/bai-viet" class="mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-[#78816f]/25 text-[#53604e] transition hover:bg-[#e7e2d7] active:translate-y-px" aria-label="Quay lại danh sách"><AppIcon name="arrow-left" :size="16"/></NuxtLink><div><p class="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#73806d]">Không gian biên tập</p><h1 class="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#2f382c] md:text-3xl">{{ postId ? 'Chỉnh sửa bài viết' : 'Viết bài mới' }}</h1><p v-if="successMessage" class="mt-1 text-[0.65rem] text-[#687760]" role="status">{{ successMessage }}</p></div></div>
        <div class="flex flex-wrap items-center gap-2"><div class="flex border border-[#78816f]/25 bg-[#efebe1] p-1" role="tablist"><button v-for="item in previewTabs" :key="item.id" type="button" class="px-3 py-2 text-[0.66rem] font-semibold transition" :class="view === item.id ? 'bg-[#fffcf6] text-[#34402f] shadow-sm' : 'text-[#727a6f]'" @click="view = item.id">{{ item.label }}</button></div><AppButton :label="saving ? 'Đang lưu…' : form.status === 'Đã xuất bản' ? 'Lưu và xuất bản' : 'Lưu bài viết'" icon="check" :disabled="saving" @click="save"/></div>
      </header>
      <p v-if="errorMessage" class="mb-6 border-l-2 border-[#9a6157] bg-[#f1e4df] px-4 py-3 text-xs leading-5 text-[#75483f]" role="alert">{{ errorMessage }}</p>

      <div v-if="view !== 'editor'" class="border border-[#78816f]/20 bg-[#f3efe5]">
        <div v-if="view === 'article'" class="border-b border-[#78816f]/20 px-4 py-3 text-right"><button type="button" class="text-[0.68rem] font-semibold text-[#596650]" @click="previewViewport = previewViewport === 'desktop' ? 'mobile' : 'desktop'">{{ previewViewport === 'desktop' ? 'Xem khung mobile' : 'Xem khung desktop' }}</button></div>
        <article v-if="view === 'article'" class="mx-auto bg-[#f3efe5] transition-[max-width] duration-300" :class="previewViewport === 'mobile' ? 'max-w-[390px]' : 'max-w-[980px]'">
          <div class="px-5 py-14 md:px-10 md:py-20"><p class="section-label">{{ form.category || 'Chuyện từ MIÊN' }}</p><h2 class="mt-6 max-w-[850px] font-display text-5xl font-light leading-[0.95] tracking-[-0.045em] md:text-7xl">{{ form.title || 'Tiêu đề bài viết' }}</h2><p v-if="form.summary" class="mt-7 max-w-[60ch] text-base leading-7 text-[#687064]">{{ form.summary }}</p><img v-if="form.featuredImage" :src="form.featuredImage" :alt="form.title" class="mt-10 aspect-[16/8.5] w-full object-cover"><div class="mx-auto mt-12 max-w-[720px]"><ArticleBody :content="previewContent"/></div></div>
        </article>
        <div v-else-if="view === 'serp'" class="mx-auto max-w-[760px] px-5 py-20"><p class="section-label">Xem trước kết quả tìm kiếm</p><div class="mt-7 bg-white px-5 py-5 shadow-[0_16px_48px_rgba(52,64,47,0.07)]"><p class="truncate text-sm text-[#2f6a43]">mienspa.vn{{ canonicalPath }}</p><h2 class="mt-1 text-xl text-[#1a0dab]">{{ socialTitle }}</h2><p class="mt-1 text-sm leading-6 text-[#4d5156]">{{ socialDescription }}</p></div><p class="mt-4 text-xs text-[#7b8277]">{{ socialTitle.length }}/65 ký tự tiêu đề · {{ socialDescription.length }}/165 ký tự mô tả. Nội dung dài hơn có thể bị cắt.</p></div>
        <div v-else class="mx-auto max-w-[760px] px-5 py-20"><p class="section-label">Xem trước khi chia sẻ</p><div class="mt-7 overflow-hidden border border-[#78816f]/25 bg-[#faf7f0]"><img :src="form.featuredImage || '/images/mien-spa-hero.png'" :alt="form.title" class="aspect-[1.91/1] w-full object-cover"><div class="p-5"><p class="text-[0.65rem] uppercase tracking-[0.12em] text-[#7d8479]">MIENSPA.VN</p><h2 class="mt-2 text-lg font-semibold text-[#30382c]">{{ socialTitle }}</h2><p class="mt-1 line-clamp-2 text-sm text-[#72796f]">{{ socialDescription }}</p></div></div></div>
      </div>

      <div v-else class="grid gap-9 xl:grid-cols-[minmax(0,1fr)_350px] xl:items-start">
        <div class="min-w-0">
          <label class="block" data-seo-field="title"><span class="sr-only">Tiêu đề bài viết</span><textarea v-model="form.title" rows="2" class="w-full resize-none border-0 bg-transparent text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#2f382c] outline-none placeholder:text-[#a6aa9f] md:text-5xl" placeholder="Tiêu đề bài viết"/></label>
          <label class="admin-field mt-5" data-seo-field="summary"><span>Mô tả ngắn <small class="font-normal text-[#858a81]">hiển thị ở trang danh sách và đầu bài viết</small></span><textarea v-model="form.summary" rows="3" maxlength="500" placeholder="Tóm tắt điều người đọc sẽ nhận được từ bài viết này."/></label>
          <div class="mt-7" data-seo-field="content"><div class="mb-2 flex items-center justify-between"><label class="text-[0.71rem] font-semibold text-[#4d5748]">Nội dung bài viết</label><span class="text-[0.65rem] text-[#858a81]">Renderer dùng chung với trang client</span></div><AdminPostEditor v-model="form.content" :post-id="postId" :category="form.category"/></div>
        </div>
        <aside class="space-y-7 xl:sticky xl:top-6">
          <div class="border-t border-[#78816f]/25 pt-5"><h2 class="text-xs font-semibold text-[#394433]">Xuất bản</h2><div class="mt-4 grid gap-4"><label class="admin-field" data-seo-field="status"><span>Trạng thái</span><select v-model="form.status"><option>Bản nháp</option><option>Đã xuất bản</option><option>Lưu trữ</option></select></label><label class="admin-field"><span>Chuyên mục</span><select v-model="form.category"><option value="" disabled>Chọn chuyên mục</option><option v-for="category in categories" :key="category">{{ category }}</option></select></label><label class="admin-field" data-seo-field="slug"><span>Slug <small v-if="postId" class="font-normal text-[#858a81]">được khóa sau lần xuất bản đầu</small></span><input v-model="form.slug" placeholder="duong-dan-bai-viet"></label></div></div>
          <div class="border-t border-[#78816f]/25 pt-5" data-seo-field="featuredImage"><div class="flex items-center justify-between"><h2 class="text-xs font-semibold text-[#394433]">Ảnh đại diện</h2><button v-if="form.featuredImage" type="button" class="text-[0.66rem] font-semibold text-[#7a4a41]" @click="form.featuredImage = ''">Gỡ ảnh</button></div><button type="button" class="mt-4 grid aspect-[16/10] w-full place-items-center overflow-hidden border border-dashed border-[#78816f]/35 bg-[#efebe1] text-[#65705f] transition hover:bg-[#e7e2d6]" @click="showMedia = true"><img v-if="form.featuredImage" :src="form.featuredImage" alt="Ảnh đại diện bài viết" class="h-full w-full object-cover"><span v-else class="flex flex-col items-center gap-2 text-[0.68rem]"><AppIcon name="image" :size="22"/>Chọn từ thư viện</span></button></div>
          <div class="border-t border-[#78816f]/25 pt-5"><h2 class="text-xs font-semibold text-[#394433]">Tìm kiếm & chia sẻ</h2><div class="mt-4 grid gap-4"><label class="admin-field" data-seo-field="metaTitle"><span>Tiêu đề SEO</span><input v-model="form.metaTitle" maxlength="250" placeholder="Mặc định dùng tiêu đề bài viết"></label><label class="admin-field" data-seo-field="metaDescription"><span>Mô tả SEO</span><textarea v-model="form.metaDescription" rows="3" maxlength="500" placeholder="Mặc định dùng mô tả ngắn"/></label></div></div>
          <AdminPostSeoPanel :model-value="seoInput" :secondary-keywords="form.secondaryKeywords" @update:focus-keyword="form.focusKeyword = $event" @update:secondary-keywords="form.secondaryKeywords = $event" @focus="focusField"/>
        </aside>
      </div>
      <AdminMediaLibrary :open="showMedia" title="Chọn ảnh đại diện" @close="showMedia = false" @select="chooseCover"/>
    </template>
  </section>
</template>
