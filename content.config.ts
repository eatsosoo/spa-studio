import { defineCollection, defineContentConfig, z } from '@nuxt/content'

const fieldChange = z.object({
  name: z.string(),
  change: z.string(),
  value: z.string(),
})

const tableChange = z.object({
  name: z.string(),
  operation: z.enum(['SELECT', 'INSERT', 'UPDATE', 'UPSERT', 'DELETE', 'LOCK']),
  purpose: z.string(),
  fields: z.array(fieldChange).default([]),
})

const flowStep = z.object({
  title: z.string(),
  type: z.enum(['client', 'api', 'service', 'database', 'result']),
  detail: z.string(),
  source: z.string(),
  transaction: z.boolean().default(false),
  tables: z.array(tableChange).default([]),
})

export default defineContentConfig({
  collections: {
    flows: defineCollection({
      type: 'page',
      source: 'flows/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        order: z.number(),
        entrypoint: z.string(),
        transaction: z.string(),
        steps: z.array(flowStep),
      }),
    }),
  },
})
