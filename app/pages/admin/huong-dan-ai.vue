<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Hướng dẫn AI | MIÊN' })

type Revision = { id: number; content: string; isActive: boolean; createdAt: string; author: string }
const content = ref('')
const revisions = ref<Revision[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const notice = ref('')

function failureText(value: unknown) {
  const failure = value as { data?: { statusMessage?: string }; statusMessage?: string }
  return failure.data?.statusMessage ?? failure.statusMessage ?? 'Không thể thực hiện thao tác.'
}

async function load() {
  loading.value = true
  try {
    const response = await $fetch<{ data: { content: string; revisions: Revision[] } }>('/api/admin/ai-prompt')
    content.value = response.data.content
    revisions.value = response.data.revisions
  } catch (failure) { error.value = failureText(failure) } finally { loading.value = false }
}

async function save() {
  saving.value = true; error.value = ''; notice.value = ''
  try {
    await $fetch('/api/admin/ai-prompt', { method: 'POST', body: { content: content.value } })
    notice.value = 'Đã lưu và kích hoạt phiên bản hướng dẫn mới.'
    await load()
  } catch (failure) { error.value = failureText(failure) } finally { saving.value = false }
}

async function restore(revision: Revision) {
  saving.value = true; error.value = ''; notice.value = ''
  try {
    await $fetch(`/api/admin/ai-prompt/${revision.id}/activate`, { method: 'POST' })
    notice.value = 'Đã khôi phục phiên bản đã chọn.'
    await load()
  } catch (failure) { error.value = failureText(failure) } finally { saving.value = false }
}

onMounted(load)
</script>

<template>
  <main class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <header class="flex flex-col gap-5 border-b border-[#78816f]/20 pb-8 lg:flex-row lg:items-end lg:justify-between">
      <div><p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Nội dung và kiến thức</p><h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Hướng dẫn AI viết bài</h1><p class="mt-3 max-w-2xl text-sm leading-6 text-[#6d746a]">Markdown đang hoạt động được nạp vào mọi lần tạo bài. Mỗi lần lưu tạo một phiên bản có thể khôi phục.</p></div>
      <AppButton :label="saving ? 'Đang lưu…' : 'Lưu và kích hoạt'" icon="check" :disabled="saving || loading" @click="save" />
    </header>

    <p v-if="error" class="mt-5 border-l-2 border-[#9a5d51] bg-[#f1e4df] px-4 py-3 text-xs text-[#75483f]" role="alert">{{ error }}</p>
    <p v-if="notice" class="mt-5 border-l-2 border-[#65765c] bg-[#e4eadf] px-4 py-3 text-xs text-[#526049]" role="status">{{ notice }}</p>

    <div class="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section class="rounded-xl border border-[#78816f]/20 bg-[#fbf8f1] p-5 md:p-6">
        <label class="admin-field"><span>Nội dung Markdown</span><CommonTextarea v-model="content" class="min-h-[640px] resize-y bg-[#fffdf8] p-4 font-mono text-xs leading-6" spellcheck="false" /></label>
        <p class="mt-3 text-[0.66rem] text-[#7c8478]">{{ content.length.toLocaleString('vi-VN') }} ký tự · Không đặt API key, mật khẩu hoặc dữ liệu khách hàng trong hướng dẫn.</p>
      </section>
      <aside class="h-fit rounded-xl border border-[#78816f]/20 bg-[#f4f0e7] p-5">
        <h2 class="text-sm font-semibold text-[#354031]">Lịch sử phiên bản</h2>
        <div v-if="revisions.length" class="mt-4 grid gap-3">
          <article v-for="revision in revisions" :key="revision.id" class="rounded-md border border-[#78816f]/18 bg-[#fffdf8] p-3">
            <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-semibold tabular-nums text-[#3e4939]">{{ new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(revision.createdAt)) }}</p><p class="mt-1 text-[0.63rem] text-[#7b8277]">{{ revision.author }} · {{ revision.content.length.toLocaleString('vi-VN') }} ký tự</p></div><StatusBadge v-if="revision.isActive" label="Đang dùng" /></div>
            <button v-if="!revision.isActive" type="button" class="mt-3 text-[0.68rem] font-semibold text-[#596951] underline underline-offset-4 disabled:opacity-50" :disabled="saving" @click="restore(revision)">Khôi phục</button>
          </article>
        </div>
        <p v-else class="mt-4 text-xs leading-5 text-[#7b8277]">Chưa có bản lưu. Hướng dẫn mặc định đang được sử dụng.</p>
      </aside>
    </div>
  </main>
</template>
