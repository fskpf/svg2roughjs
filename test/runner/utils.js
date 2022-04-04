window.loadSvg = function loadSvg(url) {
  const request = new XMLHttpRequest()
  request.open('GET', url, false)
  request.overrideMimeType('text/plain; charset=utf-8')
  request.send()

  if (request.status !== 200) {
    throw new Error(`Unable to fetch ${url}, status code: ${request.status}`)
  }

  return request.responseText
}

window.loadConfig = function loadConfig(url) {
  const request = new XMLHttpRequest()
  request.open('GET', url, false)
  request.send()

  if (request.status !== 200) {
    throw new Error(`Unable to fetch ${url}, status code: ${request.status}`)
  }

  return JSON.parse(request.responseText)
}
