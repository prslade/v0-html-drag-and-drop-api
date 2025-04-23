"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { createComponentData } from "@/lib/drag-drop-utils"
import { logDragEvent } from "@/lib/event-logger-utils"
import type React from "react"

// Define a recursive component type to support nesting
export interface ComponentItem {
  id: string
  type: string
  props: Record<string, any>
  children?: ComponentItem[]
}

interface CanvasProps {
  setSelectedElement: (element: { type: string; id: string; path?: number[] } | null) => void
  selectedElement: { type: string; id: string; path?: number[] } | null
  components: ComponentItem[]
  setComponents: React.Dispatch<React.SetStateAction<ComponentItem[]>>
  isEventLoggerVisible: boolean
}

export default function Canvas({
  setSelectedElement,
  selectedElement,
  components,
  setComponents,
  isEventLoggerVisible,
}: CanvasProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    index: number
    isContainer?: boolean
    containerId?: string
    path?: number[]
  } | null>(null)

  // Reference to track if we're dragging from sidebar or within canvas
  const dragSourceRef = useRef<"sidebar" | "canvas">("sidebar")
  const dragPathRef = useRef<number[]>([])

  // Track active container to prevent flickering when moving between nested elements
  const activeContainerRef = useRef<string | null>(null)

  // Track if we're currently dragging over a section container
  const isDraggingOverContainerRef = useRef(false)

  // Track if a drop operation was just completed
  const justCompletedDropRef = useRef(false)

  // Timer to reset the justCompletedDrop flag
  const dropResetTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Store a backup of components before drag to restore if needed
  const componentsBackupRef = useRef<ComponentItem[]>([])

  // Create a backup of components when drag starts
  useEffect(() => {
    if (draggedItem) {
      componentsBackupRef.current = JSON.parse(JSON.stringify(components))
    }
  }, [draggedItem, components])

  // Reset the justCompletedDrop flag after a short delay
  useEffect(() => {
    return () => {
      // Clean up timer on unmount
      if (dropResetTimerRef.current) {
        clearTimeout(dropResetTimerRef.current)
      }
    }
  }, [])

  // Helper function to find a component by path
  const findComponentByPath = useCallback(
    (
      components: ComponentItem[],
      path: number[],
    ): { parent: ComponentItem[] | null; index: number; item?: ComponentItem } => {
      if (path.length === 0) return { parent: null, index: -1 }

      if (path.length === 1) {
        return {
          parent: components,
          index: path[0],
          item: path[0] >= 0 && path[0] < components.length ? components[path[0]] : undefined,
        }
      }

      let current = components
      let parent = null

      for (let i = 0; i < path.length - 1; i++) {
        const index = path[i]
        if (!current[index] || !current[index].children) {
          return { parent: null, index: -1 }
        }
        parent = current
        current = current[index].children!
      }

      const lastIndex = path[path.length - 1]
      return {
        parent: current,
        index: lastIndex,
        item: lastIndex >= 0 && lastIndex < current.length ? current[lastIndex] : undefined,
      }
    },
    [],
  )

  // Helper function to update components at a specific path
  const updateComponentsAtPath = useCallback(
    (
      components: ComponentItem[],
      path: number[],
      updater: (items: ComponentItem[]) => ComponentItem[],
    ): ComponentItem[] => {
      if (path.length === 0) {
        return updater(components)
      }

      const result = [...components]
      let current = result

      for (let i = 0; i < path.length - 1; i++) {
        const index = path[i]
        if (!current[index] || !current[index].children) {
          return components
        }
        current[index] = {
          ...current[index],
          children: [...(current[index].children || [])],
        }
        current = current[index].children!
      }

      const lastIndex = path[path.length - 1]
      current[lastIndex] = {
        ...current[lastIndex],
        children: updater(current[lastIndex].children || []),
      }

      return result
    },
    [],
  )

  // Find a component by ID in the component tree
  const findComponentById = useCallback((items: ComponentItem[], id: string, path: number[] = []): number[] | null => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        return [...path, i]
      }
      if (items[i].children && items[i].children.length > 0) {
        const result = findComponentById(items[i].children, id, [...path, i])
        if (result) return result
      }
    }
    return null
  }, [])

  // Reset all drag states
  const resetDragStates = useCallback(() => {
    setIsDraggingOver(false)
    setDropTarget(null)
    setDraggedItem(null)
    activeContainerRef.current = null
    isDraggingOverContainerRef.current = false
    dragSourceRef.current = "sidebar"
    dragPathRef.current = []

    // Set the justCompletedDrop flag to prevent immediate canvas highlight
    justCompletedDropRef.current = true

    // Clear any existing timer
    if (dropResetTimerRef.current) {
      clearTimeout(dropResetTimerRef.current)
    }

    // Reset the flag after a short delay
    dropResetTimerRef.current = setTimeout(() => {
      justCompletedDropRef.current = false
    }, 300) // 300ms delay to prevent immediate re-highlighting
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()

    // If we just completed a drop or are dragging over a container, don't activate the canvas drop zone
    if (justCompletedDropRef.current || isDraggingOverContainerRef.current) {
      return
    }

    // Set the dropEffect based on the source
    e.dataTransfer.dropEffect = dragSourceRef.current === "sidebar" ? "copy" : "move"
    setIsDraggingOver(true)

    // Log the event (but throttle dragover events as they fire continuously)
    if (isEventLoggerVisible && Math.random() < 0.1) {
      // Only log ~10% of dragover events
      logDragEvent("dragover", e, "canvas", { source: dragSourceRef.current })
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only reset if we're actually leaving the canvas, not entering a child
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false)

      // Log the event
      if (isEventLoggerVisible) {
        logDragEvent("dragleave", e, "canvas", { source: dragSourceRef.current })
      }
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    // If we just completed a drop, don't activate the canvas drop zone
    if (justCompletedDropRef.current) {
      return
    }

    // Log the event
    if (isEventLoggerVisible) {
      logDragEvent("dragenter", e, "canvas", { source: dragSourceRef.current })
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    // Log the event
    if (isEventLoggerVisible) {
      logDragEvent("drop", e, "canvas", {
        source: dragSourceRef.current,
        componentType: e.dataTransfer.getData("componentType"),
      })
    }

    try {
      // Handle drop from sidebar (new component)
      if (dragSourceRef.current === "sidebar") {
        const componentType = e.dataTransfer.getData("componentType")
        if (!componentType) return

        const id = `${componentType}-${Date.now()}`
        const newComponent = createComponentData(componentType, id)

        // Update state with the new component
        setComponents((prevComponents) => [...prevComponents, newComponent])
      } else {
        // Handle reordering - moving an existing component to the end of the canvas
        const sourcePath = dragPathRef.current
        if (sourcePath.length === 0) return

        // Create a copy of the components
        const newComponents = [...components]

        // Get the component to move
        const { parent, index, item } = findComponentByPath(newComponents, sourcePath)
        if (!parent || index === -1 || !item) return

        // Remove the item from its original position
        parent.splice(index, 1)

        // Add it to the end of the main canvas
        newComponents.push(item)

        // Update state with the reordered components
        setComponents(newComponents)
      }
    } catch (error) {
      console.error("Error during drop:", error)
      // Restore from backup if there was an error
      setComponents(componentsBackupRef.current)
    }

    // Reset all drag states
    resetDragStates()
  }

  // Handle container drag enter
  const handleContainerDragEnter = useCallback(
    (e: React.DragEvent, containerId: string) => {
      e.preventDefault()
      e.stopPropagation()

      // Set flag to indicate we're dragging over a container
      isDraggingOverContainerRef.current = true

      // Ensure canvas dropzone is not active
      setIsDraggingOver(false)

      // Log the event
      if (isEventLoggerVisible) {
        logDragEvent("dragenter", e, `container-${containerId}`, {
          source: dragSourceRef.current,
          containerId,
        })
      }

      // Set this as the active container
      activeContainerRef.current = containerId

      // Find the container path
      const containerPath = findComponentById(components, containerId)
      if (!containerPath) return

      // Validate that we're not trying to drop a container into itself or its children
      if (dragSourceRef.current === "canvas") {
        const sourcePath = dragPathRef.current
        if (containerPath.join(".").startsWith(sourcePath.join("."))) {
          // Invalid drop target - container can't be dropped into itself
          return
        }
      }

      setDropTarget({
        index: -1,
        isContainer: true,
        containerId,
        path: containerPath,
      })
    },
    [components, findComponentById, isEventLoggerVisible],
  )

  // Handle container drag leave
  const handleContainerDragLeave = useCallback(
    (e: React.DragEvent, containerId: string) => {
      e.preventDefault()
      e.stopPropagation()

      // Log the event
      if (isEventLoggerVisible) {
        logDragEvent("dragleave", e, `container-${containerId}`, {
          source: dragSourceRef.current,
          containerId,
        })
      }

      // Only clear if we're actually leaving the container, not entering a child
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        activeContainerRef.current = null
        isDraggingOverContainerRef.current = false
        setDropTarget((prev) => (prev?.isContainer ? null : prev))
      }
    },
    [isEventLoggerVisible],
  )

  // Handle dropping a component inside a container
  const handleContainerDrop = useCallback(
    (e: React.DragEvent, containerId: string) => {
      e.preventDefault()
      e.stopPropagation()

      // Log the event
      if (isEventLoggerVisible) {
        logDragEvent("drop", e, `container-${containerId}`, {
          source: dragSourceRef.current,
          containerId,
          componentType: e.dataTransfer.getData("componentType"),
          sourcePath: dragPathRef.current,
        })
      }

      // Find the container in our component tree
      const containerPath = findComponentById(components, containerId)
      if (!containerPath) return

      try {
        if (dragSourceRef.current === "sidebar") {
          // Adding a new component from the sidebar
          const componentType = e.dataTransfer.getData("componentType")
          if (!componentType) return

          const id = `${componentType}-${Date.now()}`
          const newComponent = createComponentData(componentType, id)

          // Update state with the new component in the container
          setComponents((prevComponents) =>
            updateComponentsAtPath(prevComponents, containerPath, (items) => [...(items || []), newComponent]),
          )
        } else {
          // Moving an existing component
          const sourcePath = dragPathRef.current
          if (sourcePath.length === 0) return

          // Create a copy of the components
          const newComponents = [...components]

          // Get the component to move
          const { parent, index, item } = findComponentByPath(newComponents, sourcePath)
          if (!parent || index === -1 || !item) return

          // Don't drop inside itself or its children
          if (containerPath.join(".").startsWith(sourcePath.join("."))) {
            return
          }

          // Remove the item from its original position
          parent.splice(index, 1)

          // Add it to the container
          setComponents(updateComponentsAtPath(newComponents, containerPath, (items) => [...(items || []), item]))
        }
      } catch (error) {
        console.error("Error during container drop:", error)
        // Restore from backup if there was an error
        setComponents(componentsBackupRef.current)
      }

      // Reset all drag states
      resetDragStates()
    },
    [components, findComponentById, findComponentByPath, updateComponentsAtPath, isEventLoggerVisible, resetDragStates],
  )

  // Handle dragging over a container
  const handleContainerDragOver = useCallback(
    (e: React.DragEvent, containerId: string) => {
      e.preventDefault()
      e.stopPropagation()

      // Set flag to indicate we're dragging over a container
      isDraggingOverContainerRef.current = true

      // Ensure canvas dropzone is not active
      setIsDraggingOver(false)

      // Set the dropEffect based on the source
      e.dataTransfer.dropEffect = dragSourceRef.current === "sidebar" ? "copy" : "move"

      // Log the event (throttled)
      if (isEventLoggerVisible && Math.random() < 0.05) {
        // Only log ~5% of dragover events
        logDragEvent("dragover", e, `container-${containerId}`, {
          source: dragSourceRef.current,
          containerId,
        })
      }

      // If this is already the active container, no need to update
      if (activeContainerRef.current === containerId) return

      // Set this as the active container
      activeContainerRef.current = containerId

      // Find the container path
      const containerPath = findComponentById(components, containerId)
      if (!containerPath) return

      // Validate that we're not trying to drop a container into itself or its children
      if (dragSourceRef.current === "canvas") {
        const sourcePath = dragPathRef.current
        if (containerPath.join(".").startsWith(sourcePath.join("."))) {
          // Invalid drop target - container can't be dropped into itself
          return
        }
      }

      setDropTarget({
        index: -1,
        isContainer: true,
        containerId,
        path: containerPath,
      })
    },
    [components, findComponentById, isEventLoggerVisible],
  )

  const handleComponentClick = useCallback(
    (id: string, type: string, path: number[] = []) => {
      setSelectedElement({ id, type, path })
    },
    [setSelectedElement],
  )

  // Handle starting drag on an existing component
  const handleComponentDragStart = useCallback(
    (e: React.DragEvent, path: number[], id: string, type: string) => {
      dragSourceRef.current = "canvas"
      dragPathRef.current = path
      setDraggedItem(id)

      e.dataTransfer.setData("componentPath", JSON.stringify(path))
      e.dataTransfer.effectAllowed = "move"

      // Add some transparency to the dragged item
      e.currentTarget.classList.add("opacity-50")

      // Add a pulse animation to show it's being dragged
      e.currentTarget.classList.add("animate-pulse")

      // Log the event
      if (isEventLoggerVisible) {
        logDragEvent("dragstart", e, `component-${id}`, {
          componentType: type,
          path,
        })
      }
    },
    [isEventLoggerVisible],
  )

  // Handle drag end
  const handleComponentDragEnd = useCallback(
    (e: React.DragEvent, id: string) => {
      e.currentTarget.classList.remove("opacity-50", "animate-pulse")

      // Log the event
      if (isEventLoggerVisible) {
        logDragEvent("dragend", e, `component-${id}`, {
          success: e.dataTransfer.dropEffect !== "none",
        })
      }

      // Reset all drag states
      resetDragStates()
    },
    [isEventLoggerVisible, resetDragStates],
  )

  // Handle dropping a component on another component
  const handleComponentDrop = useCallback(
    (e: React.DragEvent, dropPath: number[], id: string) => {
      e.stopPropagation()
      e.preventDefault()

      // Log the event
      if (isEventLoggerVisible) {
        logDragEvent("drop", e, `component-${id}`, {
          source: dragSourceRef.current,
          dropPath,
          sourcePath: dragPathRef.current,
        })
      }

      if (dragSourceRef.current !== "canvas") return

      const sourcePath = dragPathRef.current
      if (sourcePath.length === 0) return

      // Don't do anything if dropping on the same item
      if (sourcePath.join(".") === dropPath.join(".")) return

      // Don't drop inside itself or its children
      if (dropPath.join(".").startsWith(sourcePath.join("."))) {
        return
      }

      try {
        // Create a copy of the components
        const newComponents = [...components]

        // Get the component to move
        const {
          parent: sourceParent,
          index: sourceIndex,
          item: movedItem,
        } = findComponentByPath(newComponents, sourcePath)
        if (!sourceParent || sourceIndex === -1 || !movedItem) return

        // Remove the item from its original position
        sourceParent.splice(sourceIndex, 1)

        const dropIndex = dropPath[dropPath.length - 1]
        const dropParentPath = dropPath.slice(0, -1)

        // If source and target have the same parent, adjust the drop index
        if (dropParentPath.join(".") === sourcePath.slice(0, -1).join(".") && sourceIndex < dropIndex) {
          dropPath[dropPath.length - 1] -= 1
        }

        // Insert the item at the new position
        const { parent: targetParent } = findComponentByPath(newComponents, dropParentPath)
        if (!targetParent) {
          // If we can't find the target parent, restore from backup
          setComponents(componentsBackupRef.current)
          return
        }

        targetParent.splice(dropPath[dropPath.length - 1], 0, movedItem)

        // Update state with the reordered components
        setComponents(newComponents)
      } catch (error) {
        console.error("Error during component drop:", error)
        // Restore from backup if there was an error
        setComponents(componentsBackupRef.current)
      }

      // Reset all drag states
      resetDragStates()
    },
    [components, findComponentByPath, isEventLoggerVisible, resetDragStates],
  )

  // Handle dragging over a component
  const handleComponentDragOver = useCallback(
    (e: React.DragEvent, path: number[], id: string) => {
      e.preventDefault()
      e.stopPropagation()

      if (dragSourceRef.current !== "canvas") return

      // Set the dropEffect to 'move'
      e.dataTransfer.dropEffect = "move"

      // Log the event (throttled)
      if (isEventLoggerVisible && Math.random() < 0.05) {
        // Only log ~5% of dragover events
        logDragEvent("dragover", e, `component-${id}`, {
          path,
        })
      }

      // Determine if we're in the top or bottom half of the component
      const rect = e.currentTarget.getBoundingClientRect()
      const y = e.clientY - rect.top
      const isInTopHalf = y < rect.height / 2

      // Calculate the drop index
      const dropIndex = path[path.length - 1]
      const newPath = [...path.slice(0, -1), isInTopHalf ? dropIndex : dropIndex + 1]

      // Set the drop target
      setDropTarget({
        index: newPath[newPath.length - 1],
        path: path.slice(0, -1),
      })
    },
    [isEventLoggerVisible],
  )

  // Check if a position is the current drop target
  const isDropTargetPosition = useCallback(
    (path: number[], index: number) => {
      if (!dropTarget || dropTarget.isContainer) return false

      const targetPath = dropTarget.path || []
      return targetPath.join(".") === path.join(".") && dropTarget.index === index
    },
    [dropTarget],
  )

  // Render a component based on its type and props
  const renderComponent = useCallback(
    (item: ComponentItem, path: number[]) => {
      const { id, type, props } = item
      const isContainer = type === "section"
      const isSelected = selectedElement?.id === id

      // Create event handlers for this specific component
      const componentHandlers = {
        onDragStart: (e: React.DragEvent) => handleComponentDragStart(e, path, id, type),
        onDragEnd: (e: React.DragEvent) => handleComponentDragEnd(e, id),
        onDragOver: (e: React.DragEvent) => handleComponentDragOver(e, path, id),
        onDragEnter: (e: React.DragEvent) => {
          if (isEventLoggerVisible) {
            logDragEvent("dragenter", e, `component-${id}`, { path })
          }
        },
        onDragLeave: (e: React.DragEvent) => {
          if (isEventLoggerVisible && !e.currentTarget.contains(e.relatedTarget as Node)) {
            logDragEvent("dragleave", e, `component-${id}`, { path })
          }
        },
        onDrop: (e: React.DragEvent) => handleComponentDrop(e, path, id),
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation()
          handleComponentClick(id, type, path)
        },
        className: `cursor-move hover:ring-2 hover:ring-indigo-500/50 rounded-md transition-all ${
          draggedItem === id ? "opacity-50" : ""
        } ${isSelected ? "ring-2 ring-indigo-500" : ""}`,
        draggable: "true",
      }

      // Render based on component type
      switch (type) {
        case "text":
          return (
            <div {...componentHandlers} key={id}>
              <div className="p-4 bg-zinc-800 rounded-md relative group">
                <div className="absolute top-2 right-2 text-zinc-500 opacity-50 hover:opacity-100 transition-opacity">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                <p className="text-zinc-200">This is a text block. Click to edit this text.</p>
              </div>
            </div>
          )

        case "image":
          return (
            <div {...componentHandlers} key={id}>
              <div className="p-4 bg-zinc-800 rounded-md flex flex-col items-center justify-center h-40 relative group">
                <div className="absolute top-2 right-2 text-zinc-500 opacity-50 hover:opacity-100 transition-opacity">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-zinc-700 rounded-md">
                  <span className="text-zinc-500">Image Placeholder</span>
                </div>
              </div>
            </div>
          )

        case "button":
          return (
            <div {...componentHandlers} key={id}>
              <div className="p-4 bg-zinc-800 rounded-md relative group">
                <div className="absolute top-2 right-2 text-zinc-500 opacity-50 hover:opacity-100 transition-opacity">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors">
                  Button
                </button>
              </div>
            </div>
          )

        case "section":
          return (
            <div {...componentHandlers} key={id}>
              <div className="p-4 bg-zinc-800 rounded-md border border-zinc-700 relative group">
                <div className="absolute top-2 right-2 text-zinc-500 opacity-50 hover:opacity-100 transition-opacity">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                </div>
                <div
                  className="p-4 border-2 border-dashed border-zinc-700 rounded-md min-h-[100px] flex items-center justify-center transition-all duration-200"
                  onDragEnter={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    handleContainerDragEnter(e, id)
                  }}
                  onDragOver={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    const isFromSidebar = !e.dataTransfer.getData("componentPath")
                    e.dataTransfer.dropEffect = isFromSidebar ? "copy" : "move"
                    e.currentTarget.classList.add(
                      "border-indigo-500",
                      "bg-indigo-500/10",
                      "shadow-[0_0_0_4px_rgba(99,102,241,0.1)]",
                    )
                    handleContainerDragOver(e, id)
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      e.currentTarget.classList.remove(
                        "border-indigo-500",
                        "bg-indigo-500/10",
                        "shadow-[0_0_0_4px_rgba(99,102,241,0.1)]",
                      )
                      handleContainerDragLeave(e, id)
                    }
                  }}
                  onDrop={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    e.currentTarget.classList.remove(
                      "border-indigo-500",
                      "bg-indigo-500/10",
                      "shadow-[0_0_0_4px_rgba(99,102,241,0.1)]",
                    )
                    handleContainerDrop(e, id)
                  }}
                  data-container-id={id}
                  data-droppable="true"
                >
                  {/* Empty container with no text */}
                </div>
              </div>
            </div>
          )

        default:
          return <div key={id}>Unknown component type: {type}</div>
      }
    },
    [
      draggedItem,
      selectedElement,
      handleComponentDragStart,
      handleComponentDragEnd,
      handleComponentDragOver,
      handleComponentDrop,
      handleComponentClick,
      handleContainerDragEnter,
      handleContainerDragOver,
      handleContainerDragLeave,
      handleContainerDrop,
      isEventLoggerVisible,
    ],
  )

  // Recursive function to render components
  const renderComponents = useCallback(
    (items: ComponentItem[], path: number[] = []) => {
      if (!items.length) return null

      return (
        <div className="space-y-1">
          {/* Drop indicator for the first position */}
          {draggedItem && isDropTargetPosition(path, 0) && (
            <div className="h-2 w-full bg-indigo-500 rounded-full my-2 animate-pulse"></div>
          )}

          {items.map((item, index) => {
            const currentPath = [...path, index]
            const isContainer = item.type === "section"

            return (
              <div key={item.id}>
                {renderComponent(item, currentPath)}

                {/* Render children if this is a section container */}
                {isContainer && (
                  <div className="ml-4 mt-2 pl-2 border-l-2 border-zinc-700">
                    {item.children && item.children.length > 0 ? renderComponents(item.children, currentPath) : null}
                  </div>
                )}

                {/* Drop indicator between components */}
                {draggedItem && isDropTargetPosition(path, index + 1) && (
                  <div className="h-2 w-full bg-indigo-500 rounded-full my-2 animate-pulse"></div>
                )}
              </div>
            )
          })}
        </div>
      )
    },
    [draggedItem, isDropTargetPosition, renderComponent],
  )

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div
        className={`min-h-full rounded-lg border-2 border-dashed transition-colors p-4 ${
          isDraggingOver &&
          dragSourceRef.current === "sidebar" &&
          !isDraggingOverContainerRef.current &&
          !justCompletedDropRef.current
            ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_0_4px_rgba(99,102,241,0.1)]"
            : "border-zinc-700 bg-zinc-800/50"
        }`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {components.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <p className="text-lg">Drag components here</p>
            <p className="text-sm">Drop elements from the sidebar to build your page</p>
          </div>
        ) : (
          renderComponents(components)
        )}
      </div>
    </div>
  )
}
