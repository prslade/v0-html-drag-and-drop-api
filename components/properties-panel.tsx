"use client"

import { useState, useEffect } from "react"
import { X, ArrowUpDown } from "lucide-react"

interface PropertiesPanelProps {
  selectedElement: { type: string; id: string; path?: number[] } | null
  isEventLoggerVisible: boolean
  toggleEventLogger: () => void
}

interface LogEvent {
  id: string
  timestamp: number
  type: string
  target?: string
  position?: { x: number; y: number }
  extra?: Record<string, any>
}

export default function PropertiesPanel({
  selectedElement,
  isEventLoggerVisible,
  toggleEventLogger,
}: PropertiesPanelProps) {
  return (
    <div className="w-72 border-l border-zinc-800 bg-zinc-950 p-0 flex flex-col overflow-hidden">
      {/* Properties Section */}
      <div className="p-4 overflow-y-auto flex-1">
        <h2 className="text-lg font-medium mb-4 text-zinc-200">Properties Panel</h2>

        {selectedElement ? (
          <div className="space-y-4">
            <div className="p-3 bg-zinc-900 rounded-md border border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Element Info</h3>
              <div className="space-y-2 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Type:</span>
                  <span className="text-zinc-300">{selectedElement.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>ID:</span>
                  <span className="text-zinc-300">{selectedElement.id}</span>
                </div>
                {selectedElement.path && (
                  <div className="flex justify-between">
                    <span>Path:</span>
                    <span className="text-zinc-300">{selectedElement.path.join(" > ")}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-zinc-900 rounded-md border border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-300 mb-2">Styling</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Width</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs"
                      placeholder="100%"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1">Height</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs"
                      placeholder="auto"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Padding</label>
                  <input
                    type="text"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs"
                    placeholder="0px"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-zinc-500 text-sm">Select an element to view its properties</div>
        )}
      </div>

      {/* Event Logger Section */}
      {isEventLoggerVisible && (
        <div className="border-t border-zinc-800 h-[300px] overflow-hidden flex flex-col">
          <EmbeddedEventLogger onClose={toggleEventLogger} />
        </div>
      )}
    </div>
  )
}

// Embedded version of the event logger that fits within the properties panel
function EmbeddedEventLogger({ onClose }: { onClose: () => void }) {
  const [events, setEvents] = useState<LogEvent[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [reorderCount, setReorderCount] = useState(0)

  // Subscribe to custom events
  useEffect(() => {
    const handleDragEvent = (e: CustomEvent) => {
      if (isPaused) return

      const newEvent = e.detail as LogEvent

      // Track successful reordering operations
      if (newEvent.type === "drop" && newEvent.extra?.reordering) {
        setReorderCount((prev) => prev + 1)
      }

      setEvents((prev) => {
        // Keep only the last 10 events
        const updated = [newEvent, ...prev].slice(0, 10)
        return updated
      })
    }

    // Add event listener for our custom drag events
    window.addEventListener("drag-event-log" as any, handleDragEvent)

    return () => {
      window.removeEventListener("drag-event-log" as any, handleDragEvent)
    }
  }, [isPaused])

  // Get relative time string
  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 1) return "just now"
    if (seconds < 60) return `${seconds}s ago`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`
  }

  // Get color for event type
  const getEventColor = (type: string) => {
    switch (type) {
      case "dragstart":
        return "bg-blue-500"
      case "dragenter":
        return "bg-green-500"
      case "dragover":
        return "bg-yellow-500"
      case "dragleave":
        return "bg-orange-500"
      case "drop":
        return "bg-purple-500"
      case "dragend":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center">
          <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
          <h3 className="font-medium text-sm">Drag Event Logger</h3>

          {/* Reorder counter */}
          {reorderCount > 0 && (
            <div className="ml-2 flex items-center text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
              <ArrowUpDown size={12} className="mr-1" />
              <span>{reorderCount}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`text-xs px-2 py-1 rounded ${
              isPaused ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {isPaused ? "Resume" : "Pause"}
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-300">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="overflow-y-auto p-2 flex-grow">
        {events.length === 0 ? (
          <div className="text-zinc-500 text-sm p-2">No events logged yet. Start dragging components!</div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div key={event.id} className="text-xs bg-zinc-800 rounded-md p-2 border border-zinc-700">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getEventColor(event.type)}`}></span>
                    <span className="font-medium">{event.type}</span>

                    {/* Show reordering badge */}
                    {event.extra?.reordering && (
                      <span className="ml-2 bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded text-[10px]">
                        reorder
                      </span>
                    )}
                  </div>
                  <span className="text-zinc-500">{getTimeAgo(event.timestamp)}</span>
                </div>
                {event.target && (
                  <div className="text-zinc-400">
                    Target: <span className="text-zinc-300">{event.target}</span>
                  </div>
                )}
                {event.position && (
                  <div className="text-zinc-400">
                    Position:{" "}
                    <span className="text-zinc-300">
                      x: {event.position.x}, y: {event.position.y}
                    </span>
                  </div>
                )}
                {event.extra && Object.keys(event.extra).length > 0 && (
                  <div className="mt-1 pt-1 border-t border-zinc-700">
                    {Object.entries(event.extra).map(([key, value]) => (
                      <div key={key} className="text-zinc-400">
                        {key}: <span className="text-zinc-300">{JSON.stringify(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
