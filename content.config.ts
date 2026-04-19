import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    manual: defineCollection({
      source: 'user-manual/**/*.md',
      type: 'page',
      schema: z.object({
        title: z.string(),
        description: z.string().optional()
      })
    })
  }
})
