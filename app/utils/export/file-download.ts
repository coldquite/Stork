export function downloadBlobFile(blob: Blob, fileName: string): void {
  const objectUrl = window.URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  link.style.display = 'none'
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
  window.URL.revokeObjectURL(objectUrl)
}
