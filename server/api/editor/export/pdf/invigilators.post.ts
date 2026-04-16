import { createError, readBody, setHeader } from 'h3'
import { z } from 'zod'
import { PDF_INVIGILATORS_EXPORT_DICTIONARY } from '#shared/i18n/pdf-invigilators-export'
import { buildPdfAttachmentContentDisposition } from '#server/api/editor/export/pdf/content-disposition'
import { requireAuthenticatedUser } from '#server/utils/require-auth'
import { renderPdfInvigilatorsHtml } from '#server/utils/export/pdf/templates/invigilators-html'
import { renderPdfFromHtml } from '#server/utils/export/pdf/playwright-renderer'
import { formatZodIssuePath } from '#server/utils/validation/format-zod-issue-path'
import type { PostPdfInvigilatorsExportRequestDto } from '#shared/types/export/pdf-invigilators'

const nonEmptyTrimmedStringSchema = z.string().trim().min(1, {
  message: 'must have at least 1 non-whitespace character'
})

const studentRowSchema = z
  .object({
    prepareStartTime: nonEmptyTrimmedStringSchema,
    committeeExamRangeTime: nonEmptyTrimmedStringSchema,
    studentName: nonEmptyTrimmedStringSchema,
    repeatLabel: nonEmptyTrimmedStringSchema,
    committeeLabel: nonEmptyTrimmedStringSchema,
    roomLabel: nonEmptyTrimmedStringSchema,
    secretaryLabel: nonEmptyTrimmedStringSchema
  })
  .strict()

const sectionSchema = z
  .object({
    dayKey: nonEmptyTrimmedStringSchema,
    dayLabel: nonEmptyTrimmedStringSchema,
    roomLabel: nonEmptyTrimmedStringSchema,
    invigilatorsLabel: nonEmptyTrimmedStringSchema,
    students: z.array(studentRowSchema)
  })
  .strict()

const requestSchema = z
  .object({
    draftName: nonEmptyTrimmedStringSchema,
    sections: z.array(sectionSchema).min(1, {
      message: 'must contain at least 1 section'
    })
  })
  .strict()

function invalidPayload(reason: string): never {
  throw createError({
    statusCode: 400,
    statusMessage: `Invalid invigilators pdf export payload: ${reason}`
  })
}

function parseRequestPayload(payload: unknown): PostPdfInvigilatorsExportRequestDto {
  const parseResult = requestSchema.safeParse(payload)
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]
    if (!firstIssue) {
      invalidPayload('unknown validation error')
    }

    invalidPayload(`${formatZodIssuePath(firstIssue.path)} ${firstIssue.message}`)
  }

  return parseResult.data as PostPdfInvigilatorsExportRequestDto
}

export default defineEventHandler(async (event): Promise<Buffer> => {
  requireAuthenticatedUser(event)

  const payload = parseRequestPayload(await readBody<unknown>(event))
  const html = await renderPdfInvigilatorsHtml(payload)
  const pdfBuffer = await renderPdfFromHtml(html)

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(
    event,
    'Content-Disposition',
    buildPdfAttachmentContentDisposition({
      asciiFileName: PDF_INVIGILATORS_EXPORT_DICTIONARY.downloadFileName
    })
  )

  return pdfBuffer
})
