import type { NextApiRequest, NextApiResponse } from 'next'
import { WebSocket } from 'ws'
import net from 'net'
import mqtt from 'mqtt'

type RequestBody = {
  type: 'http' | 'websocket' | 'tcp' | 'mqtt'
  method?: string
  url: string
  body?: string
  headers?: Record<string, string>
  port?: number
  topic?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { type, method, url, body, headers, port, topic } = req.body as RequestBody

  try {
    switch (type) {
      case 'http':
        return handleHttpRequest(res, method, url, body, headers)
      case 'websocket':
        return handleWebSocketRequest(res, url)
      case 'tcp':
        if (port === undefined) {
          return res.status(400).json({ message: 'Port is required for TCP requests' })
        }
        return handleTcpRequest(res, url, port, body || '')
      case 'mqtt':
        return handleMqttRequest(res, url, topic || '', body || '')
      default:
        return res.status(400).json({ message: 'Invalid request type' })
    }
  } catch (error) {
    console.error('Error handling request:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

async function handleHttpRequest(
  res: NextApiResponse,
  method: string = 'GET',
  url: string,
  body?: string,
  headers?: Record<string, string>
) {
  const response = await fetch(url, {
    method,
    headers: headers || {},
    body: body ? body : undefined,
  })

  const responseBody = await response.text()
  const responseHeaders = Object.fromEntries(response.headers.entries())

  res.status(response.status).json({
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: responseBody,
  })
}

function handleWebSocketRequest(res: NextApiResponse, url: string) {
  return new Promise((resolve) => {
    const ws = new WebSocket(url)

    ws.on('open', () => {
      res.write(JSON.stringify({ type: 'connection', status: 'open' }))
    })

    ws.on('message', (data) => {
      res.write(JSON.stringify({ type: 'message', data: data.toString() }))
    })

    ws.on('close', () => {
      res.write(JSON.stringify({ type: 'connection', status: 'closed' }))
      res.end()
      resolve(null)
    })

    ws.on('error', (error) => {
      res.write(JSON.stringify({ type: 'error', message: error.message }))
      res.end()
      resolve(null)
    })
  })
}

function handleTcpRequest(res: NextApiResponse, host: string, port: number, data: string) {
  return new Promise((resolve) => {
    const client = new net.Socket()

    client.connect(port, host, () => {
      res.write(JSON.stringify({ type: 'connection', status: 'open' }))
      client.write(data)
    })

    client.on('data', (receivedData) => {
      res.write(JSON.stringify({ type: 'message', data: receivedData.toString() }))
    })

    client.on('close', () => {
      res.write(JSON.stringify({ type: 'connection', status: 'closed' }))
      res.end()
      resolve(null)
    })

    client.on('error', (error) => {
      res.write(JSON.stringify({ type: 'error', message: error.message }))
      res.end()
      resolve(null)
    })
  })
}

function handleMqttRequest(res: NextApiResponse, url: string, topic: string, message: string) {
  return new Promise((resolve) => {
    const client = mqtt.connect(url)

    client.on('connect', () => {
      res.write(JSON.stringify({ type: 'connection', status: 'open' }))
      client.publish(topic, message)
    })

    client.on('message', (receivedTopic, receivedMessage) => {
      res.write(JSON.stringify({ type: 'message', topic: receivedTopic, data: receivedMessage.toString() }))
    })

    client.on('close', () => {
      res.write(JSON.stringify({ type: 'connection', status: 'closed' }))
      res.end()
      resolve(null)
    })

    client.on('error', (error) => {
      res.write(JSON.stringify({ type: 'error', message: error.message }))
      res.end()
      resolve(null)
    })
  })
}