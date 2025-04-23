"use client"

import { useState, useCallback } from "react"
import { ChevronDown, ChevronRight, Layers, X } from "lucide-react"
import type { ComponentItem } from "./canvas"

interface LayersPanelProps {
  components: ComponentItem[]
  selectedElement: { id: string; type: string; path?: number[] } | null
  setSelectedElement: (element: { id: string; type: string; path: number[] } | null) => void
  onClose: () => void
}

export default function LayersPanel({ components, selectedElement, setSelectedElement, onClose }: LayersPanelProps) {
  // Track expanded state of folders
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({})

  // Toggle folder expansion
  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Check if a component is selected
  const isSelected = (id: string) => {
    return selectedElement?.id === id
  }

  // Recursive function to render component tree
  const renderComponentTree = useCallback(
    (items: ComponentItem[], path: number[] = []) => {
      return items.map((item, index) => {
        const currentPath = [...path, index]
        const hasChildren = item.type === "section" && item.children && item.children.length > 0
        const isExpanded = expandedFolders[item.id] !== false // Default to expanded

        // Get component type icon
        const getTypeIcon = () => {
          switch (item.type) {
            case "text":
              return <span className="text-blue-400">T</span>
            case "image":
              return <span className="text-green-400">I</span>
            case "button":
              return <span className="text-yellow-400">B</span>
            case "section":
              return <span className="text-purple-400">S</span>
            default:
              return <span>?</span>
          }
        }

        return (
          <div key={item.id} className="select-none">
            <div
              className={`flex items-center py-1 px-2 text-sm rounded-md ${
                isSelected(item.id) ? "bg-indigo-500/20 text-indigo-300" : "hover:bg-zinc-800"
              }`}
              onClick={() => setSelectedElement({ id: item.id, type: item.type, path: currentPath })}
            >
              <div className="w-5 flex-shrink-0">
                {hasChildren ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFolder(item.id)
                    }}
                    className="text-zinc-400 hover:text-zinc-300"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                ) : (
                  <span className="w-4 inline-block"></span>
                )}
              </div>
              <div className="w-5 mr-1">{getTypeIcon()}</div>
              <span className="truncate">{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
              <span className="text-zinc-500 text-xs ml-1">#{item.id.split("-")[1]}</span>

              {/* Show position indicator */}
              <span className="ml-auto text-zinc-500 text-xs">
                {path.length > 0 ? `${path.join(".")}.${index}` : index}
              </span>
            </div>

            {/* Render children if expanded */}
            {hasChildren && isExpanded && (
              <div className="pl-4 ml-2 border-l border-zinc-700">
                {renderComponentTree(item.children!, currentPath)}
              </div>
            )}
          </div>
        )
      })
    },
    [expandedFolders, selectedElement, setSelectedElement],
  )

  return (
    <div className="absolute right-4 top-20 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-10 flex flex-col max-h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <div className="flex items-center">
          <Layers size={16} className="mr-2 text-zinc-400" />
          <h3 className="font-medium text-sm">Layers</h3>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-300">
          <X size={16} />
        </button>
      </div>

      <div className="overflow-y-auto p-2 flex-grow">
        {components.length === 0 ? (
          <div className="text-zinc-500 text-sm p-2">No components added yet</div>
        ) : (
          <div>
            <div className="text-xs text-zinc-500 mb-2 px-2">Components are displayed in their current order</div>
            {renderComponentTree(components)}
          </div>
        )}
      </div>
    </div>
  )
}
