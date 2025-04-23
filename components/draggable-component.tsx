"use client"

import type React from "react"
import { MousePointerClick, Type, ImageIcon, LayoutGrid } from "lucide-react"
import { logDragEvent } from "@/lib/event-logger-utils"

interface DraggableComponentProps {
  id: string
  label: string
  icon: string
  isEventLoggerVisible: boolean
}

export function DraggableComponent({ id, label, icon, isEventLoggerVisible }: DraggableComponentProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("componentType", id)
    e.dataTransfer.effectAllowed = "copy"
    e.currentTarget.classList.add("scale-105", "opacity-70", "shadow-lg", "shadow-indigo-500/20")

    // Log the event
    if (isEventLoggerVisible) {
      logDragEvent("dragstart", e, `sidebar-${id}`, { componentType: id })
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("scale-105", "opacity-70", "shadow-lg", "shadow-indigo-500/20")

    // Log the event
    if (isEventLoggerVisible) {
      logDragEvent("dragend", e, `sidebar-${id}`, {
        componentType: id,
        success: e.dataTransfer.dropEffect !== "none",
      })
    }
  }

  const getIcon = () => {
    switch (icon) {
      case "Type":
        return <Type className="h-4 w-4" />
      case "Image":
        return <ImageIcon className="h-4 w-4" />
      case "MousePointerClick":
        return <MousePointerClick className="h-4 w-4" />
      case "LayoutGrid":
        return <LayoutGrid className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <div
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="flex items-center gap-2 p-3 bg-zinc-900 rounded-md border border-zinc-800 cursor-move hover:border-zinc-700 transition-all duration-200"
    >
      <div className="text-zinc-400">{getIcon()}</div>
      <span className="text-sm">{label}</span>
    </div>
  )
}
