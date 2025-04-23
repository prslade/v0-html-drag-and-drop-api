import type React from "react"
// Helper function to log drag events
export function logDragEvent(type: string, e: React.DragEvent, target?: string, extra?: Record<string, any>) {
  const event = new CustomEvent("drag-event-log", {
    detail: {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      timestamp: Date.now(),
      target,
      position: { x: e.clientX, y: e.clientY },
      extra: {
        ...extra,
        // Add reordering info for drop events
        ...(type === "drop" && extra?.sourcePath && extra?.dropPath ? { reordering: true, operation: "move" } : {}),
      },
    },
  })
  window.dispatchEvent(event)
}
