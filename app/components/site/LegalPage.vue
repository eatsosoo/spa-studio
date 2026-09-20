<script setup lang="ts">
import { legalPages, siteInfo } from '~/data/site'

type LegalPageKey = keyof typeof legalPages

const props = defineProps<{ page: LegalPageKey }>()
const content = computed(() => legalPages[props.page])

useStoreSeo(
  `${content.value.title} | ${siteInfo.brand}`,
  content.value.description,
  `/${props.page}`,
)
</script>

<template>
  <div class="min-h-[100dvh] bg-[#f3efe5] text-[#293126]">
    <SiteHeader compact />
    <main class="px-5 py-16 md:px-10 md:py-24 lg:px-14">
      <div class="mx-auto max-w-[1100px]">
        <p class="section-label">{{ content.eyebrow }}</p>
        <h1 class="mt-7 max-w-4xl font-display text-5xl font-light leading-[0.95] tracking-[-0.045em] md:text-7xl">
          {{ content.title }}
        </h1>
        <p class="mt-7 max-w-2xl text-sm leading-7 text-[#656d62]">{{ content.description }}</p>

        <div class="mt-14 divide-y divide-[#78816f]/25 border-y border-[#78816f]/25">
          <section v-for="section in content.sections" :key="section.title" class="grid gap-4 py-9 md:grid-cols-[0.42fr_1fr] md:gap-10">
            <h2 class="font-display text-3xl font-light">{{ section.title }}</h2>
            <p class="max-w-[64ch] text-sm leading-7 text-[#626a5f]">{{ section.body }}</p>
          </section>
        </div>

        <p class="mt-10 text-xs leading-6 text-[#6c7368]">
          Cần thêm thông tin? Liên hệ <a class="text-link" :href="siteInfo.emailHref">{{ siteInfo.email }}</a>
          hoặc <a class="text-link" :href="siteInfo.phoneHref">{{ siteInfo.phone }}</a>.
        </p>
      </div>
    </main>
    <SiteFooter />
  </div>
</template>
