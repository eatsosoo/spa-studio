<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useHead({ title: 'Luồng chức năng | MIÊN Admin' })

const { data: flowDocuments, pending, error } = await useAsyncData(
  'feature-flow-documents',
  () => queryCollection('flows').order('order', 'ASC').all(),
)

const flows = computed(() => flowDocuments.value ?? [])
const flowSlug = (stem: string) => stem.split('/').at(-1) ?? ''
const flowHref = (stem: string) => `/admin/luong-chuc-nang/${flowSlug(stem)}`
const flowTableCount = (steps: Array<{ tables?: Array<{ name: string }> }>) => new Set(steps.flatMap(step => (step.tables ?? []).map(table => table.name))).size
</script>

<template>
  <section class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <header class="grid gap-8 border-b border-[#78816f]/20 pb-8 lg:grid-cols-[1fr_minmax(320px,0.62fr)] lg:items-end">
      <div>
        <p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Bản đồ vận hành</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">Luồng chức năng</h1>
        <p class="mt-3 max-w-3xl text-sm leading-6 text-[#6d746a]">Theo dõi một thao tác từ giao diện, qua API và service, đến transaction dữ liệu cùng kết quả nghiệp vụ.</p>
      </div>
      <div class="flex flex-wrap gap-x-5 gap-y-2 text-[0.58rem] uppercase tracking-[0.1em] text-[#7b8377]">
        <span>Client</span><span>API</span><span>Service</span><span>Database</span><span>Kết quả</span>
      </div>
    </header>

    <div v-if="error" class="mt-8 border-l-2 border-[#9a6258] bg-[#f2e4df] px-4 py-3 text-xs text-[#7d443c]">Không thể tải collection luồng chức năng.</div>
    <div v-else-if="pending" class="mt-8 space-y-4" aria-label="Đang tải luồng chức năng"><span v-for="index in 3" :key="index" class="block h-36 animate-pulse bg-[#e9e5da]" /></div>
    <AdminEmptyState v-else-if="!flows.length" title="Chưa có luồng chức năng" description="Thêm tệp Markdown vào content/flows để luồng xuất hiện tại đây." />
    <div v-else class="mt-8 divide-y divide-[#78816f]/18 border-y border-[#78816f]/18">
      <NuxtLink v-for="(flow, index) in flows" :key="flow.id" :to="flowHref(flow.stem)" class="group grid gap-4 py-6 transition active:translate-y-px md:grid-cols-[52px_minmax(0,1fr)_auto] md:items-center">
        <span class="grid size-11 place-items-center rounded-full bg-[#e5e3da] font-mono text-[0.63rem] font-semibold text-[#5d6a57]">{{ String(index + 1).padStart(2, '0') }}</span>
        <div>
          <div class="flex flex-wrap items-center gap-2"><h2 class="text-sm font-semibold text-[#33402f]">{{ flow.title }}</h2><code class="bg-[#e7ebe3] px-2 py-1 font-mono text-[0.56rem] text-[#53614e]">{{ flow.entrypoint }}</code></div>
          <p class="mt-2 max-w-3xl text-[0.68rem] leading-5 text-[#737b70]">{{ flow.description }}</p>
        </div>
        <div class="flex items-center gap-5 md:justify-end">
          <span class="text-[0.59rem] text-[#788076]"><strong class="font-mono text-[#4e5b49]">{{ flow.steps.length }}</strong> bước</span>
          <span class="text-[0.59rem] text-[#788076]"><strong class="font-mono text-[#4e5b49]">{{ flowTableCount(flow.steps) }}</strong> bảng</span>
          <AppIcon name="arrow" :size="16" class="text-[#74806e] transition-transform group-hover:translate-x-1" />
        </div>
      </NuxtLink>
    </div>
  </section>
</template>
