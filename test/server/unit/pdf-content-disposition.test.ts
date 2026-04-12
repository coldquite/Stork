// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { buildPdfAttachmentContentDisposition } from '#server/api/editor/export/pdf/content-disposition'

describe('pdf content disposition helper', () => {
  it('builds ascii-only attachment disposition', () => {
    const disposition = buildPdfAttachmentContentDisposition({
      asciiFileName: 'Dozor_export.pdf'
    })

    expect(disposition).toBe('attachment; filename="Dozor_export.pdf"')
  })

  it('builds utf-8 attachment disposition with filename*', () => {
    const disposition = buildPdfAttachmentContentDisposition({
      asciiFileName: 'Casovy plan SZZ export.pdf',
      utf8FileName: 'Časový plán SZZ export.pdf'
    })

    expect(disposition).toBe(
      `attachment; filename="Casovy plan SZZ export.pdf"; filename*=UTF-8''${encodeURIComponent('Časový plán SZZ export.pdf')}`
    )
  })
})
