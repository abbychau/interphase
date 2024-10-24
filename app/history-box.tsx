"use client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Send, ArrowDownToLine } from "lucide-react"

interface HistoryItem {
  type: 'sent' | 'received'
  message: string
  timestamp: Date
}

interface HistoryBoxProps {
  history: HistoryItem[]
  onResend: (message: string) => void
}

export function HistoryBox({ history, onResend }: HistoryBoxProps) {
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
                <ArrowDownToLine className="h-4 w-4 mt-1 text-green-500" />
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
              {item.type === 'sent' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onResend(item.message)}
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  )
}