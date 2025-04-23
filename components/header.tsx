"use client"

import { Layers } from "lucide-react"

interface HeaderProps {
  toggleLayersPanel: () => void
  isLayersPanelVisible: boolean
  toggleEventLogger: () => void
  isEventLoggerVisible: boolean
}

export default function Header({
  toggleLayersPanel,
  isLayersPanelVisible,
  toggleEventLogger,
  isEventLoggerVisible,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-zinc-800 bg-zinc-950">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-white">Atomic Builder</h1>
        <span className="ml-4 text-xs text-zinc-400 hidden sm:inline-block">
          Drag components to reorder or nest them within section containers
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleLayersPanel}
          className={`p-1.5 rounded-md text-sm transition-colors ${
            isLayersPanelVisible ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
          title="Toggle Layers Panel"
        >
          <Layers size={18} />
        </button>
        <button className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors">
          Preview Page
        </button>
      </div>
    </header>
  )
}
