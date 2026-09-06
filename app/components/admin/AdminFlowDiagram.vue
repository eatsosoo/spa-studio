<script setup lang="ts">
type FlowStep = {
  title: string
  detail: string
  type?: 'client' | 'api' | 'service' | 'database' | 'result'
  source: string
  transaction?: boolean
  tables?: Array<{
    name: string
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE' | 'LOCK'
    purpose: string
    fields?: Array<{ name: string; change: string; value: string }>
  }>
}

defineProps<{
  title: string
  description: string
  entrypoint: string
  transaction: string
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
        <div class="mt-4 space-y-2 text-[0.62rem] leading-5 text-[#687265]">
          <p><span class="font-semibold text-[#3e4b39]">Điểm vào:</span> <code class="font-mono">{{ entrypoint }}</code></p>
          <p><span class="font-semibold text-[#3e4b39]">Transaction:</span> {{ transaction }}</p>
        </div>
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

    <section class="mt-8 border-t border-[#78816f]/18 pt-6">
      <div class="flex items-end justify-between gap-4">
        <div><p class="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-[#75806f]">Database impact</p><h4 class="mt-1.5 text-sm font-semibold text-[#30392d]">Bảng và field theo từng bước</h4></div>
        <span class="hidden text-[0.62rem] text-[#7a8277] sm:block">Chọn một bước để mở chi tiết</span>
      </div>

      <div class="mt-4 divide-y divide-[#78816f]/16 border-y border-[#78816f]/16">
        <details v-for="(step, index) in steps" :key="`detail-${step.title}`" class="flow-detail group">
          <summary class="grid cursor-pointer list-none grid-cols-[32px_1fr_auto] items-center gap-3 py-4 text-xs active:translate-y-px">
            <span class="font-mono text-[0.6rem] text-[#768071]">{{ String(index + 1).padStart(2, '0') }}</span>
            <span><strong class="font-semibold text-[#34402f]">{{ step.title }}</strong><span class="ml-2 hidden font-mono text-[0.58rem] text-[#858b81] md:inline">{{ step.source }}</span></span>
            <span class="flex items-center gap-3"><span v-if="step.transaction" class="hidden bg-[#dfe4da] px-2 py-1 text-[0.54rem] font-semibold uppercase tracking-[0.08em] text-[#53624d] sm:inline">transaction</span><AppIcon name="chevron-down" :size="14" class="text-[#737c6e] transition-transform group-open:rotate-180" /></span>
          </summary>

          <div class="pb-6 pl-0 md:pl-11">
            <p class="mb-4 font-mono text-[0.6rem] text-[#737b70] md:hidden">{{ step.source }}</p>
            <div v-if="step.tables?.length" class="divide-y divide-[#78816f]/16 border-t border-[#78816f]/16">
              <section v-for="table in step.tables ?? []" :key="`${step.title}-${table.name}-${table.operation}`" class="py-5">
                <div class="grid gap-2 sm:grid-cols-[82px_minmax(160px,0.55fr)_1fr] sm:items-start">
                  <span class="w-fit bg-[#e4e7df] px-2 py-1 font-mono text-[0.56rem] font-semibold text-[#4f6049]">{{ table.operation }}</span>
                  <code class="break-all font-mono text-[0.68rem] font-semibold text-[#3d4939]">{{ table.name }}</code>
                  <p class="text-[0.65rem] leading-5 text-[#747c71]">{{ table.purpose }}</p>
                </div>
                <div v-if="table.fields?.length" class="mt-4 overflow-x-auto">
                  <table class="w-full min-w-[560px] border-collapse text-left">
                    <thead><tr class="border-y border-[#78816f]/14 text-[0.54rem] uppercase tracking-[0.1em] text-[#7a8277]"><th class="w-[28%] px-2 py-2 font-semibold">Field</th><th class="w-[24%] px-2 py-2 font-semibold">Thay đổi</th><th class="px-2 py-2 font-semibold">Giá trị / nguồn</th></tr></thead>
                    <tbody><tr v-for="field in table.fields ?? []" :key="`${table.name}-${field.name}`" class="border-b border-[#78816f]/10 align-top"><td class="px-2 py-2.5 font-mono text-[0.61rem] font-semibold text-[#465242]">{{ field.name }}</td><td class="px-2 py-2.5 text-[0.62rem] text-[#687265]">{{ field.change }}</td><td class="px-2 py-2.5 text-[0.62rem] leading-5 text-[#727a6f]">{{ field.value }}</td></tr></tbody>
                  </table>
                </div>
              </section>
            </div>
            <p v-else class="border-l-2 border-[#9ba395] px-4 py-2 text-[0.65rem] leading-5 text-[#747c71]">Bước này không đọc hoặc ghi database trực tiếp.</p>
          </div>
        </details>
      </div>
    </section>

    <div class="flow-markdown mt-7"><slot /></div>
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
.flow-detail summary::-webkit-details-marker { display: none; }
.flow-markdown :deep(h2) { margin-top: 1.5rem; font-size: 0.86rem; font-weight: 600; color: #30392d; }
.flow-markdown :deep(p), .flow-markdown :deep(li) { font-size: 0.68rem; line-height: 1.75; color: #6f776c; }
.flow-markdown :deep(p) { margin-top: 0.75rem; }
.flow-markdown :deep(ul) { margin-top: 0.75rem; list-style: disc; padding-left: 1.1rem; }
.flow-markdown :deep(table) { margin-top: 1rem; width: 100%; min-width: 620px; border-collapse: collapse; text-align: left; }
.flow-markdown :deep(th) { border-block: 1px solid rgb(120 129 111 / 18%); padding: 0.65rem; font-size: 0.58rem; text-transform: uppercase; letter-spacing: 0.08em; color: #697365; }
.flow-markdown :deep(td) { border-bottom: 1px solid rgb(120 129 111 / 12%); padding: 0.65rem; font-size: 0.64rem; line-height: 1.6; color: #6f776c; }
.flow-markdown :deep(code) { font-family: monospace; color: #465242; }
.flow-markdown { overflow-x: auto; }

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
