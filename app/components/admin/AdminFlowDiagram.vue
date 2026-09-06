<script setup lang="ts">
type FlowStep = {
  title: string
  detail: string
  type?: 'client' | 'api' | 'service' | 'database' | 'result'
}

defineProps<{
  title: string
  description: string
  steps: FlowStep[]
}>()
</script>

<template>
  <article class="flow-diagram scroll-mt-28 border-t border-[#78816f]/20 py-8 first:border-t-0 first:pt-0">
    <div class="grid gap-4 lg:grid-cols-[0.7fr_1.3fr] lg:gap-10">
      <div>
        <p class="text-[0.6rem] font-semibold uppercase tracking-[0.17em] text-[#75806f]">Sơ đồ quy trình</p>
        <h3 class="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#30392d]">{{ title }}</h3>
        <p class="mt-3 max-w-md text-xs leading-5 text-[#71796e]">{{ description }}</p>
      </div>

      <ol class="flow-track" :aria-label="`Luồng ${title}`">
        <li v-for="(step, index) in steps" :key="step.title" class="flow-step" :style="{ '--flow-index': index }">
          <div class="flow-node" :class="`flow-node--${step.type ?? 'service'}`">
            <div class="flex items-center justify-between gap-3">
              <span class="flow-index">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="flow-type">{{ step.type ?? 'service' }}</span>
            </div>
            <strong class="mt-5 block text-xs font-semibold text-[#30392d]">{{ step.title }}</strong>
            <span class="mt-1.5 block text-[0.66rem] leading-[1.55] text-[#747b70]">{{ step.detail }}</span>
          </div>
          <span v-if="index < steps.length - 1" class="flow-arrow" aria-hidden="true"><AppIcon name="arrow" :size="14" /></span>
        </li>
      </ol>
    </div>
  </article>
</template>

<style scoped>
.flow-track { display: grid; gap: 2.5rem; }

.flow-step {
  position: relative;
  min-width: 0;
  animation: flow-reveal 480ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: calc(var(--flow-index) * 70ms);
}

.flow-node {
  min-height: 9.5rem;
  border-top: 2px solid #7a8673;
  background: #eeebe2;
  padding: 1rem;
  transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1), background-color 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.flow-node:hover { transform: translateY(-3px); background: #e9e6dc; }
.flow-node--client { border-color: #9a8971; }
.flow-node--api { border-color: #65745e; }
.flow-node--service { border-color: #52654d; }
.flow-node--database { border-color: #8b685d; }
.flow-node--result { border-color: #718268; }
.flow-index { font-size: 0.62rem; font-weight: 600; color: #5f6b59; font-variant-numeric: tabular-nums; }
.flow-type { font-size: 0.52rem; text-transform: uppercase; letter-spacing: 0.12em; color: #858b81; }
.flow-arrow { position: absolute; right: -1.25rem; top: 4.1rem; color: #879080; }

@media (min-width: 640px) {
  .flow-track {
    display: flex;
    gap: 1.6rem;
    overflow-x: auto;
    padding-bottom: 0.75rem;
    scrollbar-color: #a4ab9f transparent;
    scrollbar-width: thin;
  }
  .flow-step { flex: 0 0 11.5rem; }
}

@media (max-width: 639px) {
  .flow-arrow { right: auto; top: auto; bottom: -1.65rem; left: 50%; transform: translateX(-50%) rotate(90deg); }
}

@media (prefers-reduced-motion: reduce) {
  .flow-step { animation: none; }
  .flow-node { transition: none; }
}

@keyframes flow-reveal {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
