import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  warnOnDelete: boolean
  onWarnOnDeleteChange: (value: boolean) => void
}

export function SettingsModal({ isOpen, onClose, warnOnDelete, onWarnOnDeleteChange }: SettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure your Interphase preferences
          </DialogDescription>
        </DialogHeader>
        <div className="py-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="warn-on-delete" className="flex flex-col space-y-1">
              <span>Warn on delete</span>
              <span className="font-normal text-sm text-muted-foreground">
                Show a warning when deleting a request
              </span>
            </Label>
            <Switch
              id="warn-on-delete"
              checked={warnOnDelete}
              onCheckedChange={onWarnOnDeleteChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}