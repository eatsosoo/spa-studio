<script setup lang="ts">
const props = defineProps<{ content: string }>()
type Part = { type: 'html'; content: string } | { type: 'product'; productId: number }
const parts = computed<Part[]>(() => {
  const result: Part[] = []
  const pattern = /<div[^>]*data-product-id=["'](\d+)["'][^>]*>\s*<\/div>/gi
  let cursor = 0
  for (const match of props.content.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > cursor) result.push({ type: 'html', content: props.content.slice(cursor, index) })
    result.push({ type: 'product', productId: Number(match[1]) })
    cursor = index + match[0].length
  }
  if (cursor < props.content.length) result.push({ type: 'html', content: props.content.slice(cursor) })
  return result.length ? result : [{ type: 'html', content: props.content }]
})
</script>

<template>
  <div class="article-content">
    <template v-for="(part, index) in parts" :key="`${part.type}-${index}`">
      <div v-if="part.type === 'html'" class="article-html-segment" v-html="part.content" />
      <ArticleProductBlock v-else :product-id="part.productId" />
    </template>
  </div>
</template>
