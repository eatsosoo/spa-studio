<script setup lang="ts">
defineProps<{ activeChapter: number; progress: number }>()
const scenes = [
  { color: '#f3efe5', accent: '#d7dfcf' },
  { color: '#e8eee4', accent: '#bdd8c8' },
  { color: '#e1eee2', accent: '#9fc8aa' },
  { color: '#dcebe4', accent: '#9bc8c1' },
  { color: '#f1e8d7', accent: '#e9c993' },
  { color: '#eee6d8', accent: '#d8c1a0' },
]
</script>

<template>
  <div class="story-background" aria-hidden="true">
    <div v-for="(scene, index) in scenes" :key="scene.color" class="story-background__scene" :class="{ 'is-active': activeChapter === index }" :style="{ '--scene': scene.color, '--accent': scene.accent }">
      <span class="story-background__orb story-background__orb--one" />
      <span class="story-background__orb story-background__orb--two" />
      <svg class="story-background__line" viewBox="0 0 900 380" fill="none" preserveAspectRatio="none"><path d="M-50 245C116 128 256 355 427 225C601 94 730 148 955 12" pathLength="1" /></svg>
    </div>
  </div>
</template>

<style scoped>
.story-background { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.story-background__scene { position: absolute; inset: -5%; opacity: 0; background: var(--scene); transform: scale(1.035); transition: opacity 1.15s ease, transform 1.8s cubic-bezier(.16,1,.3,1); }
.story-background__scene.is-active { opacity: 1; transform: scale(1); }
.story-background__orb { position: absolute; display: block; border-radius: 44% 56% 61% 39% / 48% 42% 58% 52%; background: var(--accent); opacity: .42; }
.story-background__orb--one { width: clamp(22rem,42vw,48rem); aspect-ratio: 1; right: -13vw; top: 9vh; transform: translate3d(0,calc(var(--story-progress,0) * -4vh),0) rotate(calc(var(--story-progress,0) * 8deg)); }
.story-background__orb--two { width: clamp(16rem,29vw,34rem); aspect-ratio: 1; left: -12vw; bottom: -13vh; opacity: .25; transform: translate3d(0,calc(var(--story-progress,0) * 3vh),0) rotate(calc(var(--story-progress,0) * -7deg)); }
.story-background__line { position: absolute; inset: auto 0 13%; width: 100%; height: 38vh; opacity: .26; }
.story-background__line path { stroke: color-mix(in srgb,var(--accent) 65%,#53614b); stroke-width: 1.4; stroke-dasharray: 1; stroke-dashoffset: calc(1 - var(--story-progress,0)); }
@media (prefers-reduced-motion: reduce) { .story-background__scene { transition: none; } .story-background__orb { transform: none; } }
</style>
