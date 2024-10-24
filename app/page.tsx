"use client"
import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Globe, Wifi, Server, Radio, Plus, MoreHorizontal, Send, Pencil } from "lucide-react"

type RequestType = "http" | "websocket" | "tcp" | "mqtt"

interface Request {
  id: string
  name: string
  type: RequestType
}

export default function PostmanLikeTool() {
  const [requests, setRequests] = useState<Request[]>([
    { id: "1", name: "Get Users", type: "http" },
    { id: "2", name: "Chat Socket", type: "websocket" },
    { id: "3", name: "Server Ping", type: "tcp" },
    { id: "4", name: "Temperature Updates", type: "mqtt" },
  ])
  const [activeRequest, setActiveRequest] = useState<Request | null>(requests[0])
  const [response, setResponse] = useState("")
  const [newRequestName, setNewRequestName] = useState("")
  const [newRequestType, setNewRequestType] = useState<RequestType>("http")
  const [isConnected, setIsConnected] = useState(false)
  const [customMessage, setCustomMessage] = useState("")
  const [sentMessages, setSentMessages] = useState<string[]>([])
  const [isHexEncoded, setIsHexEncoded] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setResponse("Response will appear here after making a request.")
    if (activeRequest?.type !== "http") {
      setIsConnected(true)
    }
  }

  const handleNewRequest = () => {
    const newRequest: Request = {
      id: Date.now().toString(),
      name: newRequestName,
      type: newRequestType,
    }
    setRequests([...requests, newRequest])
    setActiveRequest(newRequest)
    setNewRequestName("")
    setNewRequestType("http")
  }

  const handleDeleteRequest = (id: string) => {
    const updatedRequests = requests.filter((request) => request.id !== id)
    setRequests(updatedRequests)
    if (activeRequest?.id === id) {
      setActiveRequest(updatedRequests[0] || null)
    }
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

  const handleSendCustomMessage = () => {
    if (customMessage) {
      let messageToSend = customMessage
      if (isHexEncoded && (activeRequest?.type === "tcp" || activeRequest?.type === "mqtt")) {
        messageToSend = hexToBytes(customMessage)
      }
      setResponse(`Sent: ${messageToSend}`)
      setSentMessages([customMessage, ...sentMessages])
      setCustomMessage("")
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

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [isEditingTitle])

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-muted p-4 hidden md:block">
        <h2 className="text-lg font-semibold mb-4">Requests</h2>
        <ScrollArea className="h-[calc(100vh-8rem)]">
          <ul className="space-y-2">
            {requests.map((request) => (
              <li key={request.id} className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left"
                  onClick={() => setActiveRequest(request)}
                >
                  {getIconForType(request.type)}
                  <div>
                    <span>{request.name}</span>
                    <p className="text-xs text-gray-500 truncate">{request.type.toUpperCase()}</p>
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
          <h1 className="text-2xl font-bold">Postman-like Tool</h1>
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
              <div className="flex items-center mb-4">
                {isEditingTitle ? (
                  <Input
                    ref={titleInputRef}
                    value={activeRequest.name}
                    onChange={handleTitleChange}
                    onBlur={handleTitleBlur}
                    className="text-xl font-semibold"
                  />
                ) : (
                  <h2 className="text-xl font-semibold mr-2">{activeRequest.name}</h2>
                )}
                <Button variant="ghost" size="icon" onClick={handleEditTitle}>
                  <Pencil className="h-4 w-4" />
                </Button>
                {getIconForType(activeRequest.type)}
                <span className="ml-2 text-sm text-gray-500">{activeRequest.type.toUpperCase()}</span>
              </div>

              {activeRequest.type === "http" && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex space-x-4">
                    <Select defaultValue="get">
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="HTTP Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="get">GET</SelectItem>
                        <SelectItem value="post">POST</SelectItem>
                        <SelectItem value="put">PUT</SelectItem>
                        <SelectItem value="delete">DELETE</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Enter URL" className="flex-1" />
                    <Button type="submit">Send</Button>
                  </div>
                  <Textarea placeholder="Request Body (for POST/PUT)" />
                </form>
              )}

              {activeRequest.type === "websocket" && (
                <div className="space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input placeholder="WebSocket URL" />
                    <Button type="submit">{isConnected ? "Disconnect" : "Connect"}</Button>
                  </form>
                  {isConnected && (
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Enter message to send"
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                      />
                      <Button onClick={handleSendCustomMessage}>Send Message</Button>
                    </div>
                  )}
                </div>
              )}

              {activeRequest.type === "tcp" && (
                <div className="space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex space-x-4">
                      <Input placeholder="Host" className="flex-1" />
                      <Input placeholder="Port" className="w-24" />
                    </div>
                    <Button type="submit">{isConnected ? "Disconnect" : "Connect"}</Button>
                  </form>
                  {isConnected && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="Enter message to send"
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          className="flex-1"
                        />
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
                      </div>
                      <Button onClick={handleSendCustomMessage}>Send Message</Button>
                    </div>
                  )}
                </div>
              )}

              {activeRequest.type === "mqtt" && (
                <div className="space-y-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input placeholder="MQTT Broker URL" />
                    <Input placeholder="Topic" />
                    <Button type="submit">{isConnected ? "Disconnect" : "Connect"}</Button>
                  </form>
                  {isConnected && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="Enter message to publish"
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          className="flex-1"
                        />
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
                      </div>
                      <Button onClick={handleSendCustomMessage}>Publish Message</Button>
                    </div>
                  )}
                </div>
              )}

              {/* Sent Messages */}
              {(activeRequest.type === "websocket" || activeRequest.type === "tcp" || activeRequest.type === "mqtt") && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Sent  Messages</h3>
                  <ScrollArea className="h-32 border rounded">
                    <ul className="p-2">
                      {sentMessages.map((message, index) => (
                        <li key={index} className="flex items-center justify-between py-1">
                          <span className="truncate">{message}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCustomMessage(message)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </>
          )}

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-2">Response</h2>
            <Textarea value={response} readOnly className="h-64" />
          </div>
        </div>
      </div>
    </div>
  )
}