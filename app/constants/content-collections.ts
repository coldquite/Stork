// Keep this list in sync with page-type collections in content.config.ts.
export const CONTENT_PAGE_COLLECTIONS = ['manual'] as const

export type ContentPageCollectionName = (typeof CONTENT_PAGE_COLLECTIONS)[number]
