<script setup lang="ts">defineProps<{ progress: number }>()</script>
<template>
  <section class="story-spa relative min-h-[180svh] px-5 md:px-10 lg:min-h-[280svh] lg:px-14" data-story-section="3">
    <div class="sticky top-0 flex min-h-[100svh] items-center py-20">
      <div class="mx-auto grid w-full max-w-[1400px] items-center gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-[5vw]">
        <div class="relative z-[1] max-w-lg">
          <p class="section-label">Chương 04 · Nghi thức chính</p>
          <h2 class="mt-6 font-display text-[clamp(3rem,5vw,5.8rem)] font-light tracking-[-0.045em]">Khoảnh khắc<br><span class="italic text-[#627268]">được thả lỏng.</span></h2>
          <p class="mt-7 max-w-[44ch] text-sm leading-7 text-[#58635d]">Hơi ấm, nhịp chạm và mùi hương dịu đi vào đúng lúc. Không cần cố gắng thư giãn — cơ thể sẽ tự tìm về nhịp chậm của mình.</p>
          <div class="mt-9 flex items-center gap-4 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#657169]"><span class="h-px w-12 bg-[#657169]" /><span>Cuộn để mở từng lớp nghi thức</span></div>
        </div>
        <div class="story-spa__scene" :style="{ '--spa-progress': progress }"><span class="story-spa__halo" aria-hidden="true" /><SpaRelaxationIllustration size="100%" :animated="true" primary-color="#52614b" /></div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.story-spa__scene { position: relative; min-width: 0; transform: translateY(calc((.5 - var(--spa-progress)) * 26px)) scale(calc(.94 + var(--spa-progress) * .06)); }
.story-spa__halo { position: absolute; inset: 10% 8%; border-radius: 45% 55% 48% 52%; background: rgba(255,250,238,.48); transform: scale(calc(.82 + var(--spa-progress) * .2)); }
.story-spa__scene :deep([data-part="facial-mask"]),.story-spa__scene :deep([data-part="cucumber-slices"]),.story-spa__scene :deep([data-part="candle"]),.story-spa__scene :deep([data-part="flowers"]) { transition: opacity .35s ease,transform .65s cubic-bezier(.16,1,.3,1); }
.story-spa__scene :deep([data-part="facial-mask"]) { opacity: clamp(0,calc((var(--spa-progress) - .18) * 5),1); }.story-spa__scene :deep([data-part="cucumber-slices"]) { opacity: clamp(0,calc((var(--spa-progress) - .34) * 5),1); }.story-spa__scene :deep([data-part="candle"]) { opacity: clamp(.18,calc((var(--spa-progress) - .5) * 5),1); }.story-spa__scene :deep([data-part="flowers"]) { opacity: clamp(.2,calc((var(--spa-progress) - .62) * 5),1); }
@media (max-width:767px) { .story-spa__scene { transform: scale(calc(.96 + var(--spa-progress) * .04)); } }
@media (prefers-reduced-motion:reduce) { .story-spa__scene,.story-spa__halo { transform:none; }.story-spa__scene :deep([data-part]) { opacity:1 !important; } }
</style>
