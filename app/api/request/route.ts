import { NextResponse } from 'next/server'
import { WebSocket } from 'ws'
import net from 'net'
import mqtt from 'mqtt'

// Store active connections
const activeConnections = new Map<string, {
  type: 'websocket' | 'tcp' | 'mqtt',
  connection: WebSocket | net.Socket | mqtt.MqttClient,
  id: string
}>()

// Generate unique connection ID
function generateConnectionId(): string {
  return Math.random().toString(36).substring(2, 15)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { type, method, url, body: requestBody, headers, port, topic, action, connectionId } = body

  try {
    switch (type) {
      case 'http':
        return handleHttpRequest(method, url, requestBody, headers)
      case 'websocket':
        return handleWebSocketRequest(url, requestBody, action, connectionId)
      case 'tcp':
        return handleTcpRequest(url, port, requestBody, action, connectionId)
      case 'mqtt':
        return handleMqttRequest(url, topic, requestBody, action, connectionId)
      default:
        return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error handling request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleHttpRequest(
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

  return NextResponse.json({
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: responseBody,
  })
}

function handleWebSocketRequest(url: string, requestBody:string, action: string, connectionId?: string) {
  console.log('handleWebSocketRequest', url, action, connectionId)
  if (action === 'disconnect' && connectionId) {
    const connection = activeConnections.get(connectionId)
    if (connection && connection.type === 'websocket') {
      const ws = connection.connection as WebSocket
      ws.close()
      activeConnections.delete(connectionId)
      
      return NextResponse.json({ message: 'WebSocket disconnected', connectionId })
    }
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }
  if(action ==='connect'){
    const ws = new WebSocket(url)
    const newConnectionId = generateConnectionId()
    activeConnections.set(newConnectionId, { type: 'websocket', connection: ws, id: newConnectionId })
  
    return new NextResponse(new ReadableStream(
        {
          start(controller) {
            ws.on('open', () => {
                controller.enqueue(JSON.stringify({ 
                type: 'connection', 
                status: 'open',
                connectionId: newConnectionId 
                }) + '\n')
            })
            ws.on('message', (data) => {
                controller.enqueue(JSON.stringify({ type: 'message', data: data.toString() }) + '\n')
            })
            ws.on('close', () => {
                controller.enqueue(JSON.stringify({ type: 'connection', status: 'closed' }) + '\n')
                activeConnections.delete(newConnectionId)
                controller.close()
            })
            ws.on('error', (error) => {
                controller.enqueue(JSON.stringify({ type: 'error', message: error.message }) + '\n')
                activeConnections.delete(newConnectionId)
                controller.close()
            })
          },
          cancel() {
          ws.close()
          activeConnections.delete(newConnectionId)
          }
        }
      )
    )
  }
  if(action === 'send'){

  }

}

function handleTcpRequest(host: string, port: number, data: string, action: string, connectionId?: string) {
  if (action === 'disconnect' && connectionId) {
    const connection = activeConnections.get(connectionId)
    if (connection && connection.type === 'tcp') {
      const client = connection.connection as net.Socket
      client.destroy()
      activeConnections.delete(connectionId)
      return NextResponse.json({ message: 'TCP connection closed', connectionId })
    }
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  const client = new net.Socket()
  const newConnectionId = generateConnectionId()
  activeConnections.set(newConnectionId, { type: 'tcp', connection: client, id: newConnectionId })

  return new NextResponse(new ReadableStream({
    start(controller) {
      try {
        client.connect(port, host, () => {
          controller.enqueue(JSON.stringify({ 
            type: 'connection', 
            status: 'open',
            connectionId: newConnectionId 
          }) + '\n')
          if (data) {
            client.write(data)
            controller.enqueue(JSON.stringify({ type: 'message', data: 'Data sent' }) + '\n')
          }
        })

        client.on('data', (receivedData) => {
          controller.enqueue(JSON.stringify({ type: 'message', data: receivedData.toString() }) + '\n')
        })

        client.on('close', () => {
          controller.enqueue(JSON.stringify({ type: 'connection', status: 'closed' }) + '\n')
          activeConnections.delete(newConnectionId)
          controller.close()
        })

        client.on('error', (error) => {
          controller.enqueue(JSON.stringify({ type: 'error', message: error.message }) + '\n')
          activeConnections.delete(newConnectionId)
          client.destroy()
          controller.close()
        })
      } catch (error) {
        controller.enqueue(JSON.stringify({ type: 'error', message: 'Failed to establish connection' }) + '\n')
        activeConnections.delete(newConnectionId)
        controller.close()
      }
    },
    cancel() {
      client.destroy()
      activeConnections.delete(newConnectionId)
    }
  }))
}

function handleMqttRequest(url: string, topic: string, message: string, action: string, connectionId?: string) {
  if (action === 'disconnect' && connectionId) {
    const connection = activeConnections.get(connectionId)
    if (connection && connection.type === 'mqtt') {
      const client = connection.connection as mqtt.MqttClient
      client.end(true) // force close
      activeConnections.delete(connectionId)
      return NextResponse.json({ message: 'MQTT connection closed', connectionId })
    }
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  const client = mqtt.connect(url)
  const newConnectionId = generateConnectionId()
  activeConnections.set(newConnectionId, { type: 'mqtt', connection: client, id: newConnectionId })

  return new NextResponse(new ReadableStream({
    start(controller) {
      client.on('connect', () => {
        controller.enqueue(JSON.stringify({ 
          type: 'connection', 
          status: 'open',
          connectionId: newConnectionId 
        }) + '\n')
        if (message) {
          client.publish(topic, message)
          controller.enqueue(JSON.stringify({ type: 'message', data: 'Message published' }) + '\n')
        }
        client.subscribe(topic)
      })

      client.on('message', (receivedTopic, receivedMessage) => {
        controller.enqueue(JSON.stringify({ 
          type: 'message', 
          topic: receivedTopic, 
          data: receivedMessage.toString() 
        }) + '\n')
      })

      client.on('close', () => {
        controller.enqueue(JSON.stringify({ type: 'connection', status: 'closed' }) + '\n')
        activeConnections.delete(newConnectionId)
        controller.close()
      })

      client.on('error', (error) => {
        controller.enqueue(JSON.stringify({ type: 'error', message: error.message }) + '\n')
        activeConnections.delete(newConnectionId)
        controller.close()
      })
    },
    cancel() {
      client.end()
      activeConnections.delete(newConnectionId)
    }
  }))
}