<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Handle, MarkerType, Position, VueFlow, useVueFlow, type Edge, type Node } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

type FlowLink = {
  to: string
  label?: string
  tone?: 'default' | 'success' | 'danger'
}

type FlowStep = {
  id?: string
  title: string
  detail: string
  type?: 'client' | 'api' | 'service' | 'database' | 'result'
  kind?: 'start' | 'process' | 'decision' | 'end'
  next?: FlowLink[]
  transaction?: boolean
}

const props = defineProps<{ steps: FlowStep[]; title: string }>()
const isLocked = ref(true)
const isCompact = ref(import.meta.client ? window.innerWidth < 640 : false)
const selectedId = ref<string | null>(null)
const { fitView, zoomIn, zoomOut } = useVueFlow('admin-feature-flow')

const stepId = (step: FlowStep, index: number) => step.id ?? `step-${index + 1}`

const links = computed(() => props.steps.flatMap((step, index) => {
  const source = stepId(step, index)
  if (step.next?.length) return step.next.map(link => ({ source, ...link }))
  if (step.kind === 'end') return []
  const nextStep = props.steps[index + 1]
  return nextStep ? [{ source, to: stepId(nextStep, index + 1), tone: 'default' as const }] : []
}))

const graphNodes = computed<Node[]>(() => {
  const ids = props.steps.map(stepId)
  const incoming = new Map(ids.map(id => [id, 0]))
  const outgoing = new Map(ids.map(id => [id, [] as string[]]))

  for (const link of links.value) {
    if (!incoming.has(link.to)) continue
    incoming.set(link.to, (incoming.get(link.to) ?? 0) + 1)
    outgoing.get(link.source)?.push(link.to)
  }

  const layer = new Map<string, number>()
  const queue = ids.filter(id => (incoming.get(id) ?? 0) === 0)
  queue.forEach(id => layer.set(id, 0))

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const id = queue[cursor]
    if (!id) continue
    for (const target of outgoing.get(id) ?? []) {
      layer.set(target, Math.max(layer.get(target) ?? 0, (layer.get(id) ?? 0) + 1))
      incoming.set(target, (incoming.get(target) ?? 1) - 1)
      if (incoming.get(target) === 0) queue.push(target)
    }
  }

  ids.forEach((id, index) => {
    if (!layer.has(id)) layer.set(id, index)
  })

  const groups = new Map<number, string[]>()
  ids.forEach(id => {
    const level = layer.get(id) ?? 0
    groups.set(level, [...(groups.get(level) ?? []), id])
  })

  return props.steps.map((step, index) => {
    const id = stepId(step, index)
    const level = layer.get(id) ?? index
    const peers = groups.get(level) ?? [id]
    const row = peers.indexOf(id)
    const position = isCompact.value
      ? { x: 44 + row * 214, y: 42 + level * 164 }
      : { x: 48 + level * 260, y: 220 + (row - (peers.length - 1) / 2) * 176 }

    return {
      id,
      type: 'flow',
      position,
      draggable: !isLocked.value,
      selectable: true,
      data: {
        index: index + 1,
        title: step.title,
        detail: step.detail,
        kind: step.kind ?? (index === 0 ? 'start' : index === props.steps.length - 1 ? 'end' : 'process'),
        type: step.type ?? 'service',
        transaction: Boolean(step.transaction),
      },
    }
  })
})

const graphEdges = computed<Edge[]>(() => links.value.map((link, index) => ({
  id: `${link.source}-${link.to}-${index}`,
  source: link.source,
  target: link.to,
  label: link.label,
  type: 'smoothstep',
  markerEnd: MarkerType.ArrowClosed,
  class: `flow-edge flow-edge--${link.tone ?? 'default'}`,
  labelBgPadding: [7, 4],
  labelBgBorderRadius: 3,
  data: { tone: link.tone ?? 'default' },
})))

const selectedStep = computed(() => {
  const index = props.steps.findIndex((step, stepIndex) => stepId(step, stepIndex) === selectedId.value)
  return index >= 0 ? props.steps[index] : null
})

const fitDiagram = () => fitView({ padding: 0.18, duration: 420, maxZoom: 1.05 })
const handleNodeClick = ({ node }: { node: Node }) => { selectedId.value = node.id }
const clearSelection = () => { selectedId.value = null }
const updateCompactLayout = () => { isCompact.value = window.innerWidth < 640 }

onMounted(() => window.addEventListener('resize', updateCompactLayout, { passive: true }))
onBeforeUnmount(() => window.removeEventListener('resize', updateCompactLayout))

watch(() => props.steps, async () => {
  await nextTick()
  fitDiagram()
}, { deep: true })
</script>

<template>
  <section class="flow-canvas-shell" aria-label="Sơ đồ luồng chức năng">
    <header class="flow-canvas-toolbar">
      <div class="min-w-0">
        <p class="flow-canvas-kicker">Bản đồ tương tác</p>
        <p class="truncate text-xs font-semibold text-[#34402f]">{{ title }}</p>
      </div>
      <div class="flex items-center gap-1" aria-label="Điều khiển sơ đồ">
        <button class="flow-tool" type="button" title="Thu nhỏ" aria-label="Thu nhỏ" @click="zoomOut({ duration: 220 })"><AppIcon name="minus" :size="15" /></button>
        <button class="flow-tool" type="button" title="Phóng to" aria-label="Phóng to" @click="zoomIn({ duration: 220 })"><AppIcon name="plus" :size="15" /></button>
        <button class="flow-tool flow-tool--wide" type="button" @click="fitDiagram"><AppIcon name="maximize" :size="14" /><span>Vừa khung</span></button>
        <button class="flow-tool flow-tool--wide" :class="{ 'flow-tool--active': !isLocked }" type="button" :aria-pressed="!isLocked" @click="isLocked = !isLocked"><AppIcon :name="isLocked ? 'lock' : 'unlock'" :size="14" /><span>{{ isLocked ? 'Cố định' : 'Đang kéo' }}</span></button>
      </div>
    </header>

    <div class="flow-canvas-stage">
      <VueFlow
        id="admin-feature-flow"
        :nodes="graphNodes"
        :edges="graphEdges"
        :nodes-draggable="!isLocked"
        :nodes-connectable="false"
        :elements-selectable="true"
        :min-zoom="0.35"
        :max-zoom="1.7"
        :default-viewport="isCompact ? { x: 0, y: 10, zoom: 0.86 } : { x: 24, y: 0, zoom: 0.8 }"
        :fit-view-on-init="!isCompact"
        :fit-view-on-init-options="{ padding: 0.18, maxZoom: 1.05 }"
        pan-on-scroll
        zoom-on-pinch
        @node-click="handleNodeClick"
        @pane-click="clearSelection"
      >
        <template #node-flow="{ data, selected }">
          <div class="diagram-node" :class="[`diagram-node--${data.kind}`, `diagram-node--${data.type}`, { 'diagram-node--selected': selected }]">
            <Handle type="target" :position="Position.Left" class="diagram-handle" />
            <div class="diagram-node-surface">
              <div class="diagram-node-meta"><span>{{ String(data.index).padStart(2, '0') }}</span><span>{{ data.type }}</span></div>
              <strong>{{ data.title }}</strong>
              <span v-if="data.transaction" class="diagram-node-transaction">transaction</span>
            </div>
            <Handle type="source" :position="Position.Right" class="diagram-handle" />
          </div>
        </template>
      </VueFlow>

      <div class="flow-canvas-hint"><span>Cuộn để di chuyển</span><span>Chụm để thu phóng</span><span>Chọn node để xem mô tả</span></div>
    </div>

    <Transition name="flow-inspector">
      <aside v-if="selectedStep" class="flow-inspector" aria-live="polite">
        <div>
          <p class="flow-canvas-kicker">Node đang chọn</p>
          <h4 class="mt-1 text-sm font-semibold text-[#30392d]">{{ selectedStep.title }}</h4>
          <p class="mt-2 max-w-3xl text-[0.68rem] leading-5 text-[#6f776c]">{{ selectedStep.detail }}</p>
        </div>
        <button type="button" class="flow-tool shrink-0" aria-label="Đóng mô tả node" @click="clearSelection"><AppIcon name="close" :size="14" /></button>
      </aside>
    </Transition>
  </section>
</template>

<style scoped>
.flow-canvas-shell { overflow: hidden; border: 1px solid rgb(120 129 111 / 24%); background: #f0ede4; box-shadow: 0 24px 60px -42px rgb(53 64 47 / 42%); }
.flow-canvas-toolbar { display: flex; min-height: 4.25rem; align-items: center; justify-content: space-between; gap: 1rem; border-bottom: 1px solid rgb(120 129 111 / 20%); background: rgb(249 247 241 / 82%); padding: 0.8rem 1rem; backdrop-filter: blur(12px); }
.flow-canvas-kicker { margin-bottom: 0.25rem; font-size: 0.52rem; font-weight: 700; letter-spacing: 0.14em; color: #7b8377; text-transform: uppercase; }
.flow-tool { display: inline-flex; min-height: 2.25rem; min-width: 2.25rem; align-items: center; justify-content: center; gap: 0.4rem; border: 1px solid rgb(99 112 91 / 20%); background: #f6f3eb; color: #5a6655; transition: transform 180ms ease, background-color 220ms ease, border-color 220ms ease; }
.flow-tool:hover { border-color: rgb(82 101 77 / 38%); background: #ebe9e0; }
.flow-tool:active { transform: translateY(1px) scale(0.98); }
.flow-tool--wide { padding-inline: 0.65rem; font-size: 0.58rem; font-weight: 600; }
.flow-tool--active { border-color: rgb(83 105 76 / 42%); background: #dfe6da; color: #3e5139; }
.flow-canvas-stage { position: relative; height: clamp(28rem, 58vw, 39rem); background-color: #efede6; background-image: radial-gradient(circle, rgb(82 96 75 / 18%) 1px, transparent 1px); background-size: 22px 22px; }
.flow-canvas-hint { position: absolute; right: 1rem; bottom: 0.85rem; display: flex; gap: 0.9rem; color: #7d8479; font-size: 0.54rem; pointer-events: none; }
.flow-inspector { display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; border-top: 1px solid rgb(120 129 111 / 18%); background: #f8f5ed; padding: 1rem; }

.diagram-node { position: relative; width: 188px; color: #34402f; }
.diagram-node-surface { position: relative; display: flex; min-height: 104px; flex-direction: column; justify-content: center; border: 1px solid rgb(89 104 81 / 40%); background: #fbf8f0; padding: 1rem 1.05rem; box-shadow: 0 14px 30px -25px rgb(47 59 42 / 60%); transition: transform 280ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease, background-color 220ms ease; }
.diagram-node:hover .diagram-node-surface { transform: translateY(-3px); border-color: rgb(75 93 68 / 65%); background: #fffdf7; }
.diagram-node--selected .diagram-node-surface { border-color: #52654d; box-shadow: inset 0 0 0 1px rgb(82 101 77 / 22%), 0 18px 36px -27px rgb(47 59 42 / 62%); }
.diagram-node-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.55rem; color: #7b8377; font-family: monospace; font-size: 0.5rem; letter-spacing: 0.09em; text-transform: uppercase; }
.diagram-node strong { display: block; font-size: 0.7rem; font-weight: 650; line-height: 1.45; }
.diagram-node-transaction { align-self: flex-start; margin-top: 0.55rem; background: #e1e6dc; padding: 0.2rem 0.35rem; color: #51604c; font-family: monospace; font-size: 0.45rem; letter-spacing: 0.06em; text-transform: uppercase; }
.diagram-node--client .diagram-node-surface { border-top: 3px solid #9a8971; }
.diagram-node--api .diagram-node-surface { border-top: 3px solid #687861; }
.diagram-node--service .diagram-node-surface { border-top: 3px solid #52654d; }
.diagram-node--database .diagram-node-surface { border-top: 3px solid #8b685d; }
.diagram-node--result .diagram-node-surface { border-top: 3px solid #718268; }
.diagram-node--start .diagram-node-surface, .diagram-node--end .diagram-node-surface { min-height: 82px; border-radius: 999px; padding-inline: 1.35rem; }
.diagram-node--start .diagram-node-surface { background: #e2e8dc; }
.diagram-node--end .diagram-node-surface { background: #ede4dc; }
.diagram-node--decision { width: 164px; }
.diagram-node--decision .diagram-node-surface { min-height: 132px; justify-content: center; clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%); border: 0; background: #dce6d8; padding: 2rem 1.65rem; text-align: center; }
.diagram-node--decision .diagram-node-meta { justify-content: center; gap: 0.5rem; margin-bottom: 0.35rem; }
.diagram-node--decision .diagram-node-transaction { align-self: center; }
.diagram-handle { width: 7px; height: 7px; border: 1px solid #f5f2e9; background: #687861; }

:deep(.vue-flow__edge-path) { stroke: #75816f; stroke-width: 1.35; }
:deep(.vue-flow__edge.flow-edge--success .vue-flow__edge-path) { stroke: #5d7758; }
:deep(.vue-flow__edge.flow-edge--danger .vue-flow__edge-path) { stroke: #98665d; stroke-dasharray: 5 4; }
:deep(.vue-flow__edge-text) { fill: #5e685a; font-size: 9px; font-weight: 600; }
:deep(.vue-flow__edge-textbg) { fill: #efede6; fill-opacity: 0.96; }
:deep(.vue-flow__selection) { background: rgb(91 111 82 / 8%); border: 1px solid rgb(91 111 82 / 35%); }
:deep(.vue-flow__pane) { cursor: grab; }
:deep(.vue-flow__pane.dragging) { cursor: grabbing; }

.flow-inspector-enter-active, .flow-inspector-leave-active { transition: opacity 240ms ease, transform 320ms cubic-bezier(0.16, 1, 0.3, 1); }
.flow-inspector-enter-from, .flow-inspector-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 639px) {
  .flow-canvas-toolbar { align-items: flex-start; flex-direction: column; }
  .flow-canvas-stage { height: 31rem; }
  .flow-canvas-hint { left: 0.75rem; right: auto; gap: 0.65rem; }
  .flow-canvas-hint span:nth-child(2) { display: none; }
  .flow-tool--wide span { display: none; }
  .flow-tool--wide { padding-inline: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .diagram-node-surface, .flow-tool, .flow-inspector-enter-active, .flow-inspector-leave-active { transition: none; }
}
</style>
