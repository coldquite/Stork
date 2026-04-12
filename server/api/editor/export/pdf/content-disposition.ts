interface BuildPdfAttachmentContentDispositionOptions {
  asciiFileName: string
  utf8FileName?: string
}

export function buildPdfAttachmentContentDisposition(options: BuildPdfAttachmentContentDispositionOptions): string {
  const utf8FileName = options.utf8FileName?.trim()
  if (!utf8FileName) {
    return `attachment; filename="${options.asciiFileName}"`
  }

  return `attachment; filename="${options.asciiFileName}"; filename*=UTF-8''${encodeURIComponent(utf8FileName)}`
}
