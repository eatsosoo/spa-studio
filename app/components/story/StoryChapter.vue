<script setup lang="ts">
defineProps<{ chapter: string; title: string; description: string; illustration: 'listening' | 'nature' | 'renewal'; reverse?: boolean }>()
</script>

<template>
  <section class="story-chapter story-observe relative flex min-h-[92svh] items-center px-5 py-24 md:px-10 lg:min-h-[110svh] lg:px-14" :class="{ 'story-chapter--reverse': reverse }" :data-story-section="Number(chapter) - 1">
    <div class="mx-auto grid w-full max-w-[1400px] items-center gap-12 lg:grid-cols-2 lg:gap-[8vw]">
      <div class="story-chapter__copy max-w-xl" :class="reverse ? 'lg:order-2' : ''">
        <p class="section-label">Chương {{ chapter.padStart(2, '0') }}</p>
        <h2 class="mt-6 font-display text-[clamp(3rem,5vw,5.7rem)] font-light tracking-[-0.045em] text-[#30382c]">{{ title }}</h2>
        <p class="mt-8 max-w-[48ch] text-[0.98rem] leading-8 text-[#59635a]">{{ description }}</p>
        <slot />
      </div>
      <div class="story-chapter__art" :class="reverse ? 'lg:order-1' : ''"><StoryIllustration :variant="illustration" /></div>
    </div>
  </section>
</template>

<style scoped>
.story-chapter__copy,.story-chapter__art { opacity: 0; transition: opacity .9s ease,transform 1.1s cubic-bezier(.16,1,.3,1); }
.story-chapter__copy { transform: translate3d(-38px,30px,0); }.story-chapter__art { transform: translate3d(45px,20px,0) scale(.97); }
.story-chapter--reverse .story-chapter__copy { transform: translate3d(38px,30px,0); }.story-chapter--reverse .story-chapter__art { transform: translate3d(-45px,20px,0) scale(.97); }
.story-chapter.is-visible :is(.story-chapter__copy,.story-chapter__art) { opacity: 1; transform: none; }
@media (max-width:767px) { .story-chapter__copy,.story-chapter--reverse .story-chapter__copy,.story-chapter__art,.story-chapter--reverse .story-chapter__art { transform: translateY(22px); } }
@media (prefers-reduced-motion:reduce) { .story-chapter__copy,.story-chapter__art { opacity: 1; transform: none; transition: none; } }
</style>
