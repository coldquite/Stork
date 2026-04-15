import { createError, readBody, setHeader } from 'h3'
import { z } from 'zod'
import type { PostPdfPublicExportRequestDto } from '#shared/types/export/pdf-public'
import { buildPdfAttachmentContentDisposition } from '#server/api/editor/export/pdf/content-disposition'
import { renderPdfFromHtml } from '#server/utils/export/pdf/playwright-renderer'
import { renderPdfPublicHtml } from '#server/utils/export/pdf/templates/public-html'
import { requireAuthenticatedUser } from '#server/utils/require-auth'
import { formatZodIssuePath } from '#server/utils/validation/format-zod-issue-path'

const nonEmptyTrimmedStringSchema = z.string().trim().min(1, {
  message: 'must have at least 1 non-whitespace character'
})

const isoDateStringSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'must be a valid ISO date string'
  })

const studentRowSchema = z
  .object({
    kind: z.literal('STUDENT'),
    preparationStartTime: nonEmptyTrimmedStringSchema,
    committeeExamRangeTime: nonEmptyTrimmedStringSchema,
    studentName: nonEmptyTrimmedStringSchema,
    specializationLabel: nonEmptyTrimmedStringSchema,
    thesisTitle: nonEmptyTrimmedStringSchema,
    supervisorLabel: nonEmptyTrimmedStringSchema,
    reviewerLabel: nonEmptyTrimmedStringSchema
  })
  .strict()

const pauseRowSchema = z
  .object({
    kind: z.literal('PAUSE'),
    pauseLine: nonEmptyTrimmedStringSchema
  })
  .strict()

const sectionSchema = z
  .object({
    committeeId: nonEmptyTrimmedStringSchema,
    committeeDateIso: isoDateStringSchema,
    committeeRoomValue: nonEmptyTrimmedStringSchema,
    language: z.enum(['CZECH', 'ENGLISH']),
    topMetaDayLabel: nonEmptyTrimmedStringSchema,
    topMetaRoomLine: nonEmptyTrimmedStringSchema,
    degreeTitle: nonEmptyTrimmedStringSchema,
    semesterLabel: nonEmptyTrimmedStringSchema,
    studyProgramLine: nonEmptyTrimmedStringSchema,
    committeeLine: nonEmptyTrimmedStringSchema,
    departmentLine: nonEmptyTrimmedStringSchema,
    secretaryLine: nonEmptyTrimmedStringSchema,
    invigilatorsLineLabel: nonEmptyTrimmedStringSchema,
    invigilatorsMembers: z.array(nonEmptyTrimmedStringSchema).min(1),
    membersHeading: nonEmptyTrimmedStringSchema,
    membersLines: z.array(nonEmptyTrimmedStringSchema),
    tablePreparationStartHeader: nonEmptyTrimmedStringSchema,
    tableCommitteeExamHeader: nonEmptyTrimmedStringSchema,
    tableStudentSpecializationHeader: nonEmptyTrimmedStringSchema,
    tableThesisTitleHeader: nonEmptyTrimmedStringSchema,
    tableSupervisorReviewerHeader: nonEmptyTrimmedStringSchema,
    rowsEmptyFallback: nonEmptyTrimmedStringSchema,
    rows: z.array(z.union([studentRowSchema, pauseRowSchema]))
  })
  .strict()

const requestSchema = z
  .object({
    draftName: nonEmptyTrimmedStringSchema,
    documentHeaderTitle: nonEmptyTrimmedStringSchema,
    sections: z.array(sectionSchema).min(1, {
      message: 'must contain at least 1 section'
    })
  })
  .strict()

const PUBLIC_PDF_FILE_NAME_ASCII = 'Casovy plan SZZ export.pdf'
const PUBLIC_PDF_FILE_NAME_UTF8 = 'Časový plán SZZ export.pdf'
const PUBLIC_PDF_CONTENT_DISPOSITION = buildPdfAttachmentContentDisposition({
  asciiFileName: PUBLIC_PDF_FILE_NAME_ASCII,
  utf8FileName: PUBLIC_PDF_FILE_NAME_UTF8
})

function invalidPayload(reason: string): never {
  throw createError({
    statusCode: 400,
    statusMessage: `Invalid public pdf export payload: ${reason}`
  })
}

function parseRequestPayload(payload: unknown): PostPdfPublicExportRequestDto {
  const parseResult = requestSchema.safeParse(payload)
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]
    if (!firstIssue) {
      invalidPayload('unknown validation error')
    }

    invalidPayload(`${formatZodIssuePath(firstIssue.path)} ${firstIssue.message}`)
  }

  return parseResult.data as PostPdfPublicExportRequestDto
}

export default defineEventHandler(async (event): Promise<Buffer> => {
  requireAuthenticatedUser(event)

  const payload = parseRequestPayload(await readBody<unknown>(event))
  const html = await renderPdfPublicHtml(payload)
  const pdfBuffer = await renderPdfFromHtml(html)

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', PUBLIC_PDF_CONTENT_DISPOSITION)

  return pdfBuffer
})
