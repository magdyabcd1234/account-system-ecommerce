export default async function handler(request, response) {
  const baseUrl = process.env.JSON_SERVER_URL

  if (!baseUrl) {
    return response.status(503).json({ error: 'JSON_SERVER_URL is not configured' })
  }

  const requestUrl = new URL(request.url, 'http://localhost')
  const resourcePath = requestUrl.pathname.replace(/^\/api\/?/, '')
  const upstreamUrl = new URL(`${resourcePath}${requestUrl.search}`, `${baseUrl.replace(/\/$/, '')}/`)
  const headers = new Headers()

  for (const headerName of ['accept', 'content-type']) {
    const headerValue = request.headers[headerName]
    if (headerValue) headers.set(headerName, headerValue)
  }

  const method = request.method ?? 'GET'
  const hasBody = !['GET', 'HEAD'].includes(method)
  const requestBody = typeof request.body === 'string'
    ? request.body
    : JSON.stringify(request.body)

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers,
      body: hasBody ? requestBody : undefined,
    })

    response.status(upstreamResponse.status)
    const contentType = upstreamResponse.headers.get('content-type')
    if (contentType) response.setHeader('content-type', contentType)

    if (method === 'HEAD') return response.end()
    return response.send(await upstreamResponse.text())
  } catch {
    return response.status(502).json({ error: 'Could not reach the accounting API' })
  }
}