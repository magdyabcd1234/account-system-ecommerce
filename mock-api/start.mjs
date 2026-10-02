import { copyFile, access } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'

const dataFile = '/var/data/db.json'
const seedFile = resolve('mock-api/db.json')
const serverFile = resolve('node_modules/json-server/lib/cli/bin.js')

try {
  await access(dataFile)
} catch {
  await copyFile(seedFile, dataFile)
}

const server = spawn(process.execPath, [
  serverFile,
  '--watch',
  dataFile,
  '--host',
  '0.0.0.0',
  '--port',
  process.env.PORT ?? '10000',
], { stdio: 'inherit' })

server.on('error', (error) => {
  console.error('Could not start json-server:', error)
  process.exitCode = 1
})

server.on('exit', (code) => {
  process.exit(code ?? 1)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.kill(signal))
}