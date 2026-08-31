<script setup lang="ts">
type PostForm = {
  title: string
  category: string
  summary: string
  content: string
  featuredImage: string
  status: string
  metaTitle: string
  metaDescription: string
  slug?: string
}

const props = defineProps<{ postId?: number }>()
const router = useRouter()
const saving = ref(false)
const imageUploading = ref(false)
const errorMessage = ref('')
const showPreview = ref(false)
const coverInput = ref<HTMLInputElement | null>(null)
const form = reactive<PostForm>({
  title: '',
  category: '',
  summary: '',
  content: '<p></p>',
  featuredImage: '',
  status: 'Bản nháp',
  metaTitle: '',
  metaDescription: '',
})

const { data: optionsResponse } = await useAsyncData(
  'admin-post-options',
  () => $fetch<{ data: { postCategories: string[] } }>('/api/admin/form-options'),
)
const categories = computed(() => optionsResponse.value?.data.postCategories ?? [])

const { data: postResponse, pending, error } = props.postId
  ? await useAsyncData(`admin-post-${props.postId}`, () => $fetch<{ data: PostForm }>(`/api/admin/posts/${props.postId}`))
  : { data: ref(null), pending: ref(false), error: ref(null) }

if (postResponse.value?.data) Object.assign(form, postResponse.value.data)
if (!form.category && categories.value.length) form.category = categories.value[0] ?? ''

const isContentEmpty = computed(() => !form.content.replace(/<[^>]*>/g, '').trim())
const canSave = computed(() => Boolean(form.title.trim() && form.category && !isContentEmpty.value))
const previewContent = computed(() => form.content || '<p>Chưa có nội dung.</p>')

function failureText(value: unknown) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? failure.message ?? 'Không thể lưu bài viết. Vui lòng thử lại.'
}

async function uploadCover(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  imageUploading.value = true
  errorMessage.value = ''
  try {
    const body = new FormData()
    body.append('image', file)
    const response = await $fetch<{ data: { url: string } }>('/api/admin/post-images', { method: 'POST', body })
    form.featuredImage = response.data.url
  } catch (failure) {
    errorMessage.value = failureText(failure)
  } finally {
    imageUploading.value = false
    input.value = ''
  }
}

async function save() {
  if (!canSave.value) {
    errorMessage.value = 'Vui lòng nhập tiêu đề, chuyên mục và nội dung bài viết.'
    return
  }
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch(props.postId ? `/api/admin/posts/${props.postId}` : '/api/admin/posts', {
      method: props.postId ? 'PATCH' : 'POST',
      body: form,
    })
    await router.push({ path: '/admin/bai-viet', query: { saved: props.postId ? 'updated' : 'created' } })
  } catch (failure) {
    errorMessage.value = failureText(failure)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    saving.value = false
  }
}

useHead({ title: `${props.postId ? 'Chỉnh sửa' : 'Bài viết mới'} | MIÊN Admin` })
</script>

<template>
  <section class="mx-auto w-full max-w-[1500px] px-4 py-6 md:px-8 md:py-9 lg:px-10">
    <div v-if="pending" class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div class="space-y-5"><div class="h-12 animate-pulse bg-[#e6e1d6]" /><div class="h-[560px] animate-pulse bg-[#e6e1d6]" /></div>
      <div class="h-[420px] animate-pulse bg-[#e6e1d6]" />
    </div>

    <div v-else-if="error" class="mx-auto max-w-xl py-24 text-center">
      <p class="text-sm font-semibold text-[#65443e]">Không tải được bài viết</p>
      <p class="mt-2 text-xs leading-5 text-[#80665f]">{{ failureText(error) }}</p>
      <NuxtLink to="/admin/bai-viet" class="app-action app-action--secondary mt-6">Quay lại danh sách</NuxtLink>
    </div>

    <template v-else>
      <header class="mb-8 flex flex-col gap-5 border-b border-[#78816f]/20 pb-6 md:flex-row md:items-center md:justify-between">
        <div class="flex items-start gap-4">
          <NuxtLink to="/admin/bai-viet" class="mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-[#78816f]/25 text-[#53604e] transition hover:bg-[#e7e2d7] active:translate-y-px" aria-label="Quay lại danh sách">
            <AppIcon name="arrow-left" :size="16" />
          </NuxtLink>
          <div>
            <p class="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#73806d]">Không gian biên tập</p>
            <h1 class="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[#2f382c] md:text-3xl">{{ postId ? 'Chỉnh sửa bài viết' : 'Viết bài mới' }}</h1>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="app-action app-action--secondary" @click="showPreview = !showPreview"><AppIcon name="eye" :size="16" />{{ showPreview ? 'Về trình soạn thảo' : 'Xem trước bài viết' }}</button>
          <AppButton :label="saving ? 'Đang lưu…' : form.status === 'Đã xuất bản' ? 'Lưu và xuất bản' : 'Lưu bài viết'" icon="check" :disabled="saving" @click="save" />
        </div>
      </header>

      <p v-if="errorMessage" class="mb-6 border-l-2 border-[#9a6157] bg-[#f1e4df] px-4 py-3 text-xs leading-5 text-[#75483f]" role="alert">{{ errorMessage }}</p>

      <div v-if="showPreview" class="overflow-hidden border border-[#78816f]/20 bg-[#f3efe5]">
        <div class="border-b border-[#78816f]/20 px-5 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#71796d]">Bản xem trước · cùng giao diện với trang thật</div>
        <article class="mx-auto max-w-[980px] px-5 py-14 md:px-10 md:py-20">
          <p class="section-label">{{ form.category || 'Chuyện từ MIÊN' }}</p>
          <h2 class="mt-6 max-w-[850px] font-display text-5xl font-light leading-[0.95] tracking-[-0.045em] md:text-7xl">{{ form.title || 'Tiêu đề bài viết' }}</h2>
          <p v-if="form.summary" class="mt-7 max-w-[60ch] text-base leading-7 text-[#687064]">{{ form.summary }}</p>
          <img v-if="form.featuredImage" :src="form.featuredImage" alt="" class="mt-10 aspect-[16/8.5] w-full object-cover">
          <div class="mx-auto mt-12 max-w-[720px]"><ArticleBody :content="previewContent" /></div>
        </article>
      </div>

      <div v-else class="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div class="min-w-0">
          <label class="block">
            <span class="sr-only">Tiêu đề bài viết</span>
            <textarea v-model="form.title" rows="2" class="w-full resize-none border-0 bg-transparent text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#2f382c] outline-none placeholder:text-[#a6aa9f] md:text-5xl" placeholder="Tiêu đề bài viết" />
          </label>
          <label class="admin-field mt-5">
            <span>Mô tả ngắn <small class="font-normal text-[#858a81]">hiển thị ở trang danh sách và đầu bài viết</small></span>
            <textarea v-model="form.summary" rows="3" maxlength="500" placeholder="Tóm tắt điều người đọc sẽ nhận được từ bài viết này." />
          </label>
          <div class="mt-7">
            <div class="mb-2 flex items-center justify-between">
              <label class="text-[0.71rem] font-semibold text-[#4d5748]">Nội dung bài viết</label>
              <span class="text-[0.65rem] text-[#858a81]">Preview dùng chung CSS với trang client</span>
            </div>
            <AdminPostEditor v-model="form.content" />
          </div>
        </div>

        <aside class="space-y-7 xl:sticky xl:top-6">
          <div class="border-t border-[#78816f]/25 pt-5">
            <h2 class="text-xs font-semibold text-[#394433]">Xuất bản</h2>
            <div class="mt-4 grid gap-4">
              <label class="admin-field"><span>Trạng thái</span><select v-model="form.status"><option>Bản nháp</option><option>Đã xuất bản</option><option>Lưu trữ</option></select></label>
              <label class="admin-field"><span>Chuyên mục</span><select v-model="form.category"><option value="" disabled>Chọn chuyên mục</option><option v-for="category in categories" :key="category">{{ category }}</option></select></label>
              <p class="text-[0.67rem] leading-5 text-[#7a8176]">Bài viết chỉ xuất hiện ngoài website khi trạng thái là “Đã xuất bản”.</p>
            </div>
          </div>

          <div class="border-t border-[#78816f]/25 pt-5">
            <div class="flex items-center justify-between"><h2 class="text-xs font-semibold text-[#394433]">Ảnh đại diện</h2><button v-if="form.featuredImage" type="button" class="text-[0.66rem] font-semibold text-[#7a4a41]" @click="form.featuredImage = ''">Gỡ ảnh</button></div>
            <button type="button" class="mt-4 grid aspect-[16/10] w-full place-items-center overflow-hidden border border-dashed border-[#78816f]/35 bg-[#efebe1] text-[#65705f] transition hover:bg-[#e7e2d6]" :disabled="imageUploading" @click="coverInput?.click()">
              <img v-if="form.featuredImage" :src="form.featuredImage" alt="Ảnh đại diện bài viết" class="h-full w-full object-cover">
              <span v-else class="flex flex-col items-center gap-2 text-[0.68rem]"><AppIcon name="image" :size="22" />{{ imageUploading ? 'Đang tải ảnh…' : 'Chọn ảnh đại diện' }}</span>
            </button>
            <input ref="coverInput" class="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" @change="uploadCover">
          </div>

          <details class="border-t border-[#78816f]/25 pt-5">
            <summary class="flex cursor-pointer items-center justify-between text-xs font-semibold text-[#394433]">Tìm kiếm & chia sẻ <AppIcon name="chevron-down" :size="14" /></summary>
            <div class="mt-4 grid gap-4">
              <label class="admin-field"><span>Tiêu đề SEO</span><input v-model="form.metaTitle" maxlength="250" placeholder="Mặc định dùng tiêu đề bài viết"></label>
              <label class="admin-field"><span>Mô tả SEO</span><textarea v-model="form.metaDescription" rows="3" maxlength="500" placeholder="Mặc định dùng mô tả ngắn" /></label>
            </div>
          </details>
        </aside>
      </div>
    </template>
  </section>
</template>
