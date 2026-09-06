<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const route = useRoute()
const slug = computed(() => String(route.params.slug ?? ''))
const { data: flowDocument } = await useAsyncData(
  () => `flow-document-${slug.value}`,
  () => queryCollection('flows').path(`/flows/${slug.value}`).first(),
  { watch: [slug] },
)

if (!flowDocument.value) {
  throw createError({ statusCode: 404, statusMessage: 'Không tìm thấy luồng chức năng.' })
}

const { data: navigationData } = await useAsyncData(
  'flow-detail-navigation',
  () => queryCollection('flows').select('id', 'stem', 'title', 'order').order('order', 'ASC').all(),
)

const navigation = computed(() => navigationData.value ?? [])
const currentIndex = computed(() => navigation.value.findIndex(item => item.stem.endsWith(`/${slug.value}`)))
const previousFlow = computed(() => currentIndex.value > 0 ? navigation.value[currentIndex.value - 1] : null)
const nextFlow = computed(() => currentIndex.value >= 0 ? navigation.value[currentIndex.value + 1] ?? null : null)
const flowHref = (stem: string) => `/admin/luong-chuc-nang/${stem.split('/').at(-1)}`
const tableCount = computed(() => new Set(flowDocument.value?.steps.flatMap(step => (step.tables ?? []).map(table => table.name)) ?? []).size)
const fieldCount = computed(() => flowDocument.value?.steps.reduce((total, step) => total + (step.tables ?? []).reduce((sum, table) => sum + (table.fields?.length ?? 0), 0), 0) ?? 0)

useHead(() => ({ title: `${flowDocument.value?.title ?? 'Luồng chức năng'} | MIÊN Admin` }))
</script>

<template>
  <section v-if="flowDocument" class="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
    <nav class="flex flex-wrap items-center gap-2 text-[0.62rem] text-[#7b8377]" aria-label="Đường dẫn luồng chức năng">
      <NuxtLink to="/admin/luong-chuc-nang" class="transition hover:text-[#465342]">Luồng chức năng</NuxtLink><AppIcon name="chevron" :size="11" />
      <span class="text-[#465342]">{{ flowDocument.title }}</span>
    </nav>

    <header class="mt-6 grid gap-8 border-b border-[#78816f]/20 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <p class="text-[0.63rem] font-semibold uppercase tracking-[0.18em] text-[#73806d]">Chi tiết luồng</p>
        <h1 class="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.045em] text-[#2f382c] md:text-4xl">{{ flowDocument.title }}</h1>
        <p class="mt-3 max-w-3xl text-sm leading-6 text-[#6d746a]">{{ flowDocument.description }}</p>
      </div>
      <NuxtLink to="/admin/luong-chuc-nang" class="flex items-center gap-2 text-[0.68rem] font-semibold text-[#586653] transition hover:text-[#34402f] active:translate-y-px"><AppIcon name="arrow-left" :size="15" />Tất cả luồng</NuxtLink>
    </header>

    <div class="grid gap-px border-b border-[#78816f]/20 bg-[#78816f]/20 sm:grid-cols-3">
      <div class="bg-[#f6f3eb] px-5 py-4"><p class="text-[0.55rem] uppercase tracking-[0.12em] text-[#7b8277]">Các bước xử lý</p><p class="mt-2 font-mono text-lg font-semibold text-[#35402f]">{{ flowDocument.steps.length }}</p></div>
      <div class="bg-[#f6f3eb] px-5 py-4"><p class="text-[0.55rem] uppercase tracking-[0.12em] text-[#7b8277]">Bảng tham gia</p><p class="mt-2 font-mono text-lg font-semibold text-[#35402f]">{{ tableCount }}</p></div>
      <div class="bg-[#f6f3eb] px-5 py-4"><p class="text-[0.55rem] uppercase tracking-[0.12em] text-[#7b8277]">Field được mô tả</p><p class="mt-2 font-mono text-lg font-semibold text-[#35402f]">{{ fieldCount }}</p></div>
    </div>

    <AdminFlowDiagram class="mt-10" :title="flowDocument.title" :description="flowDocument.description" :entrypoint="flowDocument.entrypoint" :transaction="flowDocument.transaction" :steps="flowDocument.steps">
      <ContentRenderer :value="flowDocument" />
    </AdminFlowDiagram>

    <nav class="mt-10 grid gap-px border-y border-[#78816f]/20 bg-[#78816f]/20 sm:grid-cols-2" aria-label="Điều hướng giữa các luồng">
      <NuxtLink v-if="previousFlow" :to="flowHref(previousFlow.stem)" class="group bg-[#f6f3eb] p-5 transition hover:bg-[#efede5] active:translate-y-px"><span class="text-[0.56rem] uppercase tracking-[0.12em] text-[#7c8478]">Luồng trước</span><span class="mt-2 flex items-center gap-2 text-xs font-semibold text-[#3b4737]"><AppIcon name="arrow-left" :size="14" />{{ previousFlow.title }}</span></NuxtLink>
      <div v-else class="hidden bg-[#f6f3eb] sm:block" />
      <NuxtLink v-if="nextFlow" :to="flowHref(nextFlow.stem)" class="group bg-[#f6f3eb] p-5 text-right transition hover:bg-[#efede5] active:translate-y-px"><span class="text-[0.56rem] uppercase tracking-[0.12em] text-[#7c8478]">Luồng tiếp theo</span><span class="mt-2 flex items-center justify-end gap-2 text-xs font-semibold text-[#3b4737]">{{ nextFlow.title }}<AppIcon name="arrow" :size="14" /></span></NuxtLink>
    </nav>
  </section>
</template>
