"use client"

import { useState } from "react"
import Header from "@/components/header"
import ComponentsSidebar from "@/components/components-sidebar"
import Canvas, { type ComponentItem } from "@/components/canvas"
import PropertiesPanel from "@/components/properties-panel"

export default function PageBuilder() {
  const [selectedElement, setSelectedElement] = useState<null | {
    type: string
    id: string
    path?: number[]
  }>(null)

  const [components, setComponents] = useState<ComponentItem[]>([])
  const [isLayersPanelVisible, setIsLayersPanelVisible] = useState(false)
  const [isEventLoggerVisible, setIsEventLoggerVisible] = useState(true)

  const toggleLayersPanel = () => {
    setIsLayersPanelVisible(!isLayersPanelVisible)
  }

  const toggleEventLogger = () => {
    setIsEventLoggerVisible(!isEventLoggerVisible)
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-zinc-100">
      <Header
        toggleLayersPanel={toggleLayersPanel}
        isLayersPanelVisible={isLayersPanelVisible}
        toggleEventLogger={toggleEventLogger}
        isEventLoggerVisible={isEventLoggerVisible}
      />
      <div className="flex flex-1 overflow-hidden">
        <ComponentsSidebar
          isEventLoggerVisible={isEventLoggerVisible}
          components={components}
          selectedElement={selectedElement}
          setSelectedElement={setSelectedElement}
          isLayersPanelVisible={isLayersPanelVisible}
        />
        <Canvas
          setSelectedElement={setSelectedElement}
          selectedElement={selectedElement}
          components={components}
          setComponents={setComponents}
          isEventLoggerVisible={isEventLoggerVisible}
        />
        <PropertiesPanel
          selectedElement={selectedElement}
          isEventLoggerVisible={isEventLoggerVisible}
          toggleEventLogger={toggleEventLogger}
        />
      </div>
    </div>
  )
}
