import fs from 'node:fs/promises'
import path from 'node:path'

const dbPath = path.join(process.cwd(), 'mock-api', 'db.json')

export default async function handler(request, response) {
  try {
    const db = JSON.parse(await fs.readFile(dbPath, 'utf8'))

    const requestUrl = new URL(request.url, 'http://localhost')
    const resource = requestUrl.pathname.replace(/^\/api\/?/, '')

    if (!db[resource]) {
      return response.status(404).json({ error: 'Resource not found' })
    }

    if (request.method === 'GET') {
      return response.status(200).json(db[resource])
    }

    return response.status(405).json({
      error: 'Write operations are not supported yet',
    })
  } catch (error) {
    return response.status(500).json({
      error: 'Failed to load database',
    })
  }
}