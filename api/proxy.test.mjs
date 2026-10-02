import assert from 'node:assert/strict'
import test from 'node:test'
import handler from './[...path].js'

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code
      return this
    },
    setHeader(name, value) {
      this.headers[name] = value
    },
    send(body) {
      this.body = body
      return this
    },
    end() {
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

test('API proxy forwards the resource, query, method, and JSON body', async () => {
  const previousUrl = process.env.JSON_SERVER_URL
  const previousFetch = globalThis.fetch
  let forwardedRequest

  process.env.JSON_SERVER_URL = 'https://api.example.com/'
  globalThis.fetch = async (url, options) => {
    forwardedRequest = { url: url.href, ...options }
    return {
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => '{"updated":true}',
    }
  }

  try {
    const response = createResponse()
    await handler({
      url: '/api/invoices/INV-1?x=1',
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: { amount: 5 },
    }, response)

    assert.equal(forwardedRequest.url, 'https://api.example.com/invoices/INV-1?x=1')
    assert.equal(forwardedRequest.method, 'PATCH')
    assert.equal(forwardedRequest.body, JSON.stringify({ amount: 5 }))
    assert.equal(response.statusCode, 200)
    assert.equal(response.body, '{"updated":true}')
  } finally {
    globalThis.fetch = previousFetch
    if (previousUrl === undefined) delete process.env.JSON_SERVER_URL
    else process.env.JSON_SERVER_URL = previousUrl
  }
})

test('API proxy reports a missing backend configuration', async () => {
  const previousUrl = process.env.JSON_SERVER_URL
  delete process.env.JSON_SERVER_URL

  try {
    const response = createResponse()
    await handler({ url: '/api/invoices', method: 'GET', headers: {} }, response)

    assert.equal(response.statusCode, 503)
    assert.deepEqual(response.body, { error: 'JSON_SERVER_URL is not configured' })
  } finally {
    if (previousUrl !== undefined) process.env.JSON_SERVER_URL = previousUrl
  }
})