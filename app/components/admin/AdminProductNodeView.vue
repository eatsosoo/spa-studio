<script setup lang="ts">
import { nodeViewProps, NodeViewWrapper } from '@tiptap/vue-3'

defineProps(nodeViewProps)
</script>

<template>
  <NodeViewWrapper class="my-8" data-drag-handle>
    <ArticleProductBlock :product-id="Number(node.attrs.productId)" :interactive="false" />
  </NodeViewWrapper>
</template>
