export function downloadFile(content: string, mime: string, fileName: string) {
  const link = document.createElement('a')
  const configBlob = new Blob([content], { type: mime })
  link.download = fileName
  link.href = URL.createObjectURL(configBlob)
  link.click()
}
