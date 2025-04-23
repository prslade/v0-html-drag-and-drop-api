"use client"

import { useState } from "react"
import { DraggableComponent } from "./draggable-component"
import type { ComponentItem } from "./canvas"
import { ChevronDown, ChevronRight, Layers } from "lucide-react"

const components = [
  { id: "text", label: "Text Block", icon: "Type" },
  { id: "image", label: "Image Placeholder", icon: "Image" },
  { id: "button", label: "Button", icon: "MousePointerClick" },
  { id: "section", label: "Section Container", icon: "LayoutGrid" },
]

interface ComponentsSidebarProps {
  isEventLoggerVisible: boolean
  components: ComponentItem[]
  selectedElement: { id: string; type: string; path?: number[] } | null
  setSelectedElement: (element: { id: string; type: string; path: number[] } | null) => void
  isLayersPanelVisible: boolean
}

export default function ComponentsSidebar({
  isEventLoggerVisible,
  components: pageComponents,
  selectedElement,
  setSelectedElement,
  isLayersPanelVisible,
}: ComponentsSidebarProps) {
  return (
    <div className="w-64 border-r border-zinc-800 bg-zinc-950 p-0 flex flex-col overflow-hidden">
      {/* Components Section */}
      <div className="p-4 overflow-y-auto flex-1">
        <h2 className="text-lg font-medium mb-4 text-zinc-200">Components</h2>
        <div className="space-y-2">
          {components.map((component) => (
            <DraggableComponent
              key={component.id}
              id={component.id}
              label={component.label}
              icon={component.icon}
              isEventLoggerVisible={isEventLoggerVisible}
            />
          ))}
        </div>
      </div>

      {/* Layers Panel Section */}
      {isLayersPanelVisible && (
        <div className="border-t border-zinc-800 h-[300px] overflow-hidden flex flex-col">
          <EmbeddedLayersPanel
            components={pageComponents}
            selectedElement={selectedElement}
            setSelectedElement={setSelectedElement}
          />
        </div>
      )}
    </div>
  )
}

// Embedded version of the layers panel that fits within the components sidebar
function EmbeddedLayersPanel({
  components,
  selectedElement,
  setSelectedElement,
}: {
  components: ComponentItem[]
  selectedElement: { id: string; type: string; path?: number[] } | null
  setSelectedElement: (element: { id: string; type: string; path: number[] } | null) => void
}) {
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
  const renderComponentTree = (items: ComponentItem[], path: number[] = []) => {
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
          </div>

          {/* Render children if expanded */}
          {hasChildren && isExpanded && (
            <div className="pl-4 ml-2 border-l border-zinc-700">{renderComponentTree(item.children!, currentPath)}</div>
          )}
        </div>
      )
    })
  }

  return (
    <>
      <div className="flex items-center p-3 border-b border-zinc-800 bg-zinc-900">
        <Layers size={16} className="mr-2 text-zinc-400" />
        <h3 className="font-medium text-sm">Layers</h3>
      </div>

      <div className="overflow-y-auto p-2 flex-grow">
        {components.length === 0 ? (
          <div className="text-zinc-500 text-sm p-2">No components added yet</div>
        ) : (
          renderComponentTree(components)
        )}
      </div>
    </>
  )
}
