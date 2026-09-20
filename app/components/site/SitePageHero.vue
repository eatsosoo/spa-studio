<script setup lang="ts">
defineOptions({ inheritAttrs: false })

type SitePageBreadcrumb = {
  label: string
  to?: string
}

type SitePageHeroAction = {
  label: string
  to: string
}

withDefaults(defineProps<{
  title: string
  accentTitle?: string
  description?: string
  eyebrow?: string
  image?: string
  imageAlt?: string
  imagePosition?: string
  breadcrumbs?: SitePageBreadcrumb[]
  action?: SitePageHeroAction
  containerClass?: string
  contentClass?: string
}>(), {
  accentTitle: '',
  description: '',
  eyebrow: '',
  image: '',
  imageAlt: '',
  imagePosition: 'center',
  breadcrumbs: () => [],
  action: undefined,
  containerClass: '',
  contentClass: '',
})
</script>

<template>
  <section v-bind="$attrs" class="px-5 pb-14 pt-12 md:px-10 md:pb-20 md:pt-16 lg:px-14">
    <div class="mx-auto max-w-[1400px]" :class="containerClass">
      <nav v-if="breadcrumbs.length" class="mb-8 flex flex-wrap items-center gap-2 text-[0.66rem] font-medium text-[#798075]" aria-label="Đường dẫn trang">
        <template v-for="(item, index) in breadcrumbs" :key="`${item.label}-${index}`">
          <AppIcon v-if="index" name="chevron" :size="11" class="text-[#9a9f96]" aria-hidden="true" />
          <NuxtLink v-if="item.to && index < breadcrumbs.length - 1" :to="item.to" class="rounded-sm transition hover:text-[#394433] focus-visible:outline-offset-2">{{ item.label }}</NuxtLink>
          <span v-else :aria-current="index === breadcrumbs.length - 1 ? 'page' : undefined">{{ item.label }}</span>
        </template>
      </nav>

      <p v-if="eyebrow" class="section-label">{{ eyebrow }}</p>
      <div class="mt-7 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end" :class="contentClass">
        <h1 class="max-w-[860px] whitespace-pre-line font-display text-[clamp(3.2rem,6vw,6.4rem)] font-light leading-[0.9] tracking-[-0.055em]">
          {{ title }}<template v-if="accentTitle"><br><span class="italic text-[#65715e]">{{ accentTitle }}</span></template>
        </h1>
        <div class="lg:pb-2">
          <p v-if="description" class="max-w-[56ch] text-sm leading-7 text-[#62695f]">{{ description }}</p>
          <div v-if="action || $slots.action" class="mt-7 flex flex-wrap items-center gap-4">
            <slot name="action">
              <NuxtLink v-if="action" :to="action.to" class="button-primary">
                {{ action.label }}
                <AppIcon name="arrow" :size="15" />
              </NuxtLink>
            </slot>
          </div>
        </div>
      </div>

      <figure v-if="image" class="mt-12 overflow-hidden rounded-[0.35rem] bg-[#ddd8cc] md:mt-16">
        <img :src="image" :alt="imageAlt" width="1400" height="620" class="aspect-[16/7] h-auto w-full object-cover" :style="{ objectPosition: imagePosition }">
      </figure>
    </div>
  </section>
</template>
