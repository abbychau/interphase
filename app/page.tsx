'use client'

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Globe, Wifi, Server, Radio, Plus, MoreHorizontal, Send, Pencil, Settings, List, Layers } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SettingsModal } from './settings-modal'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog"

type RequestType = "http" | "websocket" | "tcp" | "mqtt"

interface Request {
  id: string
  name: string
  type: RequestType
  url: string
  method?: string
  body?: string
  headers?: Record<string, string>
  port?: number
  topic?: string
}

interface HistoryItem {
  type: 'sent' | 'received'
  message: string
  timestamp: Date
}

function HistoryBox({ history, onResend, onCopy }: { 
  history: HistoryItem[], 
  onResend: (message: string) => void,
  onCopy: (message: string) => void
}) {
  return (
    <div className="mt-4 border rounded-md">
      <h3 className="text-lg font-semibold p-2 border-b">Message History</h3>
      <ScrollArea className="h-64">
        <ul className="p-2 space-y-2">
          {history.map((item, index) => (
            <li key={index} className="flex items-start space-x-2">
              {item.type === 'sent' ? (
                <Send className="h-4 w-4 mt-1 text-blue-500" />
              ) : (
                <Globe className="h-4 w-4 mt-1 text-green-500" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {item.type === 'sent' ? 'Sent' : 'Received'}
                  <span className="ml-2 text-xs text-gray-500">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </p>
                <p className="text-sm break-all">{item.message}</p>
              </div>
              {item.type === 'sent' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onResend(item.message)}
                >
                  <Send className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(item.message)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  )
}

export default function Interphase() {
  const [requests, setRequests] = useState<Request[]>([
    { id: "1", name: "Get Users", type: "http", url: "https://jsonplaceholder.typicode.com/users", method: "GET" },
    { id: "2", name: "Chat Socket", type: "websocket", url: "wss://echo.websocket.org" },
    { id: "3", name: "Server Ping", type: "tcp", url: "example.com", port: 80 },
    { id: "4", name: "Temperature Updates", type: "mqtt", url: "mqtt://test.mosquitto.org:1883", topic: "temperature" },
  ])
  const [activeRequest, setActiveRequest] = useState<Request | null>(requests[0])
  const [response, setResponse] = useState("")
  const [newRequestName, setNewRequestName] = useState("")
  const [newRequestType, setNewRequestType] = useState<RequestType>("http")
  const [isConnected, setIsConnected] = useState(false)
  const [customMessage, setCustomMessage] = useState("")
  const [messageHistory, setMessageHistory] = useState<HistoryItem[]>([])
  const [isHexEncoded, setIsHexEncoded] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [warnOnDelete, setWarnOnDelete] = useState(true)
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRequest) return

    try {
      const response = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...activeRequest,
          action: isConnected ? 'disconnect' : 'connect'
        }),
      })
      if (!response.ok) {
        throw new Error('Network response was not ok')
      }
      if (activeRequest.type === 'http') {
        const data = await response.json()
        setResponse(JSON.stringify(data, null, 2))
      } else {
        if (isConnected) {
          // Handle disconnect
          const data = await response.json()
          toast({
            title: "Disconnected",
            description: data.message,
          })
          setIsConnected(false)
          setMessageHistory([])
        } else {
          // Handle connect
          setIsConnected(true)
          const reader = response.body?.getReader()
          if (reader) {
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const decodedValue = new TextDecoder().decode(value)
                const messages = decodedValue.split('\n').filter(Boolean).map(
                  message => {
                    try {
                      return JSON.parse(message)
                    } catch (error) {
                      console.error('Error parsing message:', error)
                      return null
                    }
                  }
                ).filter(Boolean)
                messages.forEach((message: any) => {
                  if (message.type === 'message') {
                    setMessageHistory(prev => [
                      { type: 'received', message: message.data, timestamp: new Date() },
                      ...prev
                    ])
                  } else if (message.type === 'error') {
                    toast({
                      title: "Error",
                      description: message.message,
                      variant: "destructive",
                    })
                    setIsConnected(false)
                  } else if (message.type === 'connection' && message.status === 'closed') {
                    setIsConnected(false)
                    toast({
                      title: "Disconnected",
                      description: "The connection was closed.",
                    })
                  }
                })
              }
            } catch (error) {
              console.error('Error reading stream:', error)
              toast({
                title: "Error",
                description: "An error occurred while processing the response stream.",
                variant: "destructive",
              })
              setIsConnected(false)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "An error occurred while processing your request.",
        variant: "destructive",
      })
    }
  }

  const handleDisconnect = async () => {
    if (!activeRequest) return

    try {
      const response = await fetch('/api/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...activeRequest,
          action: 'disconnect'
        }),
      })

      if (!response.ok) {
        throw new Error('Network response was not ok')
      }

      const data = await response.json()
      toast({
        title: "Disconnected",
        description: data.message,
      })
      setIsConnected(false)
      setMessageHistory([])
    } catch (error) {
      console.error('Error:', error)
      toast({
        title: "Error",
        description: "An error occurred while disconnecting.",
        variant: "destructive",
      })
    }
  }

  const handleNewRequest = () => {
    const newRequest: Request = {
      id: Date.now().toString(),
      name:  newRequestName,
      type: newRequestType,
      url: "",
    }
    setRequests([...requests, newRequest])
    setActiveRequest(newRequest)
    setNewRequestName("")
    setNewRequestType("http")
  }

  const handleDeleteRequest = (id: string) => {
    if (warnOnDelete) {
      setDeleteRequestId(id)
    } else {
      deleteRequest(id)
    }
  }

  const deleteRequest = (id: string) => {
    const updatedRequests = requests.filter((request) => request.id !== id)
    setRequests(updatedRequests)
    if (activeRequest?.id === id) {
      setActiveRequest(updatedRequests[0] || null)
    }
    setDeleteRequestId(null)
  }

  const handleDuplicateRequest = (request: Request) => {
    const newRequest = { ...request, id: Date.now().toString(), name: `${request.name} (Copy)` }
    setRequests([...requests, newRequest])
  }

  const handleEditTitle = () => {
    setIsEditingTitle(true)
  }

  const handleTitleChange = (e: React.FormEvent<HTMLInputElement>) => {
    if (activeRequest) {
      const updatedRequest = { ...activeRequest, name: e.currentTarget.value }
      setActiveRequest(updatedRequest)
      setRequests(requests.map(req => req.id === updatedRequest.id ? updatedRequest : req))
    }
  }

  const handleTitleBlur = () => {
    setIsEditingTitle(false)
  }

  const handleSendCustomMessage = async () => {
    if (customMessage && isConnected && activeRequest) {
      let messageToSend = customMessage
      if (isHexEncoded && (activeRequest.type === "tcp" || activeRequest.type === "mqtt")) {
        messageToSend = hexToBytes(customMessage)
      }
      setMessageHistory(prev => [
        { type: 'sent', message: messageToSend, timestamp: new Date() },
        ...prev
      ])
      setCustomMessage("")

      try {
        const response = await fetch('/api/request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...activeRequest,
            body: messageToSend,
          }),
        })

        if (!response.ok) {
          throw new Error('Network response was not ok')
        }

        const reader = response.body?.getReader()
        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              const decodedValue = new TextDecoder().decode(value)
              const messages = decodedValue.split('\n').filter(Boolean).map(message => {
                try {
                  return JSON.parse(message)
                } catch (error) {
                  console.error('Error parsing message:', error)
                  return null
                }
              }).filter(Boolean)
              messages.forEach((message: any) => {
                if (message.type === 'message') {
                  setMessageHistory(prev => [
                    { type: 'received', message: message.data, timestamp: new Date() },
                    ...prev
                  ])
                } else if (message.type === 'error') {
                  toast({
                    title: "Error",
                    description: message.message,
                    variant: "destructive",
                  })
                  setIsConnected(false)
                }
              })
            }
          } catch (error) {
            console.error('Error reading stream:', error)
            throw new Error('An error occurred while processing the response stream.')
          }
        }
      } catch (error) {
        console.error('Error:', error)
        toast({
          title: "Error",
          description: (error instanceof Error ? error.message : "An error occurred while sending your message."),
          variant: "destructive",
        })
        setIsConnected(false)
      }
    }
  }

  const hexToBytes = (hex: string) => {
    const bytes = []
    for (let c = 0; c < hex.length; c += 2) {
      bytes.push(parseInt(hex.substr(c, 2), 16))
    }
    return String.fromCharCode(...bytes)
  }

  const getIconForType = (type: RequestType) => {
    switch (type) {
      case "http":
        return <Globe className="h-4 w-4" />
      case "websocket":
        return <Wifi className="h-4 w-4" />
      case "tcp":
        return <Server className="h-4 w-4" />
      case "mqtt":
        return <Radio className="h-4 w-4" />
    }
  }

  const handleCopyMessage = (message: string) => {
    navigator.clipboard.writeText(message)
    toast({
      title: "Copied to clipboard",
      description: "The message has been copied to your clipboard.",
    })
  }

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [isEditingTitle])

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-90 bg-muted p-4 hidden md:block">
        <div className="flex items-center mb-4">
          <List className="mr-2 h-5 w-5" />
          <h2 className="text-lg font-semibold">Requests</h2>
        </div>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <ul className="space-y-2">
            {requests.map((request) => (
              <li key={request.id} className="flex items-start justify-between">
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-left px-4 py-3 hover:bg-transparent ${
                    activeRequest?.id === request.id ? 'bg-primary text-primary-foreground' : ''
                  }`}
                  onClick={() => setActiveRequest(request)}
                >
                  <div className="flex flex-col items-start">
                    <span>{request.name}</span>
                    <div className="flex items-center mt-1">
                      {getIconForType(request.type)}
                      <span className="ml-1 text-xs text-gray-500">{request.type.toUpperCase()}</span>
                    </div>
                  </div>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleEditTitle()}>
                      Edit Title
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicateRequest(request)}>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDeleteRequest(request.id)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-muted p-4 flex justify-between items-center">
          <div className="flex items-center">
            <Layers className="mr-2 h-6 w-6" />
            <h1 className="text-2xl font-bold">Interphase</h1>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Request</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newRequestName}
                    onChange={(e) => setNewRequestName(e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">
                    Type
                  </Label>
                  <Select
                    value={newRequestType}
                    onValueChange={(value) => setNewRequestType(value as RequestType)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select request type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="websocket">WebSocket</SelectItem>
                      <SelectItem value="tcp">TCP</SelectItem>
                      <SelectItem value="mqtt">MQTT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleNewRequest}>Create Request</Button>
            </DialogContent>
          </Dialog>
        </header>

        {/* Request/Response Area */}
        <div className="flex-1 overflow-auto p-4">
          {activeRequest && (
            <>
              <div className="flex flex-col items-start mb-4">
                {isEditingTitle ? (
                  <Input
                    ref={titleInputRef}
                    value={activeRequest.name}
                    onChange={handleTitleChange}
                    onBlur={handleTitleBlur}
                    className="text-xl font-semibold mb-2"
                  />
                ) : (
                  <h2 className="text-xl font-semibold mb-2">{activeRequest.name}</h2>
                )}
                <div className="flex items-center">
                  {getIconForType(activeRequest.type)}
                  <span className="ml-2 text-sm text-gray-500">{activeRequest.type.toUpperCase()}</span>
                  <Button variant="ghost" size="icon" onClick={handleEditTitle} className="ml-2">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {activeRequest.type === "http" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex space-x-4">
                    <Select
                      value={activeRequest.method || "GET"}
                      onValueChange={(value) => setActiveRequest({ ...activeRequest, method: value })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="HTTP Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Enter URL"
                      className="flex-1"
                      value={activeRequest.url}
                      onChange={(e) => setActiveRequest({ ...activeRequest, url: e.target.value })}
                    />
                    <Button type="submit">Send</Button>
                  </div>
                  <Textarea
                    placeholder="Request Body (for POST/PUT)"
                    value={activeRequest.body || ""}
                    onChange={(e) => setActiveRequest({ ...activeRequest, body: e.target.value })}
                  />
                </form>
              )}

              {(activeRequest.type === "websocket" || activeRequest.type === "tcp" || activeRequest.type === "mqtt") && (
                <div className="space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {activeRequest.type === "websocket" && (
                      <Input
                        placeholder="WebSocket URL"
                        value={activeRequest.url}
                        onChange={(e) => setActiveRequest({ ...activeRequest, url: e.target.value })}
                      />
                    )}
                    {activeRequest.type === "tcp" && (
                      <div className="flex space-x-4">
                        <Input
                          placeholder="Host"
                          className="flex-1"
                          value={activeRequest.url}
                          onChange={(e) => setActiveRequest({ ...activeRequest, url: e.target.value })}
                        />
                        <Input
                          placeholder="Port"
                          className="w-24"
                          value={activeRequest.port?.toString() || ""}
                          onChange={(e) => setActiveRequest({ ...activeRequest, port: parseInt(e.target.value) })}
                        />
                      </div>
                    )}
                    {activeRequest.type === "mqtt" && (
                      <>
                        <Input
                          placeholder="MQTT Broker URL"
                          value={activeRequest.url}
                          onChange={(e) => setActiveRequest({ ...activeRequest, url: e.target.value })}
                        />
                        <Input
                          placeholder="Topic"
                          value={activeRequest.topic || ""}
                          onChange={(e) => setActiveRequest({ ...activeRequest, topic: e.target.value })}
                        />
                      </>
                    )}
                    <Button type="submit">{isConnected ? "Disconnect" : "Connect"}</Button>
                  </form>
                  {isConnected && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder={`Enter message to ${activeRequest.type === "mqtt" ? "publish" : "send"}`}
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          className="flex-1"
                        />
                        {(activeRequest.type === "tcp" || activeRequest.type === "mqtt") && (
                          <Select
                            value={isHexEncoded ? "hex" : "text"}
                            onValueChange={(value) => setIsHexEncoded(value === "hex")}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue placeholder="Encoding" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="hex">Hex</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <Button onClick={handleSendCustomMessage} className="w-full">
                        {activeRequest.type === "mqtt" ? "Publish Message" : "Send Message"}
                      </Button>
                    </div>
                  )}
                  <HistoryBox
                    history={messageHistory}
                    onResend={(message) => setCustomMessage(message)}
                    onCopy={handleCopyMessage}
                  />
                </div>
              )}
            </>
          )}

          {activeRequest?.type === "http" && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-2">Response</h2>
              <Textarea value={response} readOnly className="h-64" />
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSettingsOpen(true)}
          className="absolute bottom-4 right-4"
        >
          <Settings className="h-5 w-5" />
        </Button>

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          warnOnDelete={warnOnDelete}
          onWarnOnDeleteChange={setWarnOnDelete}
        />

        <AlertDialog open={deleteRequestId !== null} onOpenChange={() => setDeleteRequestId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete this request?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the request.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteRequestId && deleteRequest(deleteRequestId)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}