"use client"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronsUpDown, Package, Search } from "lucide-react"
import { cn } from "@/lib/utils"

export function ItemSelector({
  items = [],
  value,
  onValueChange,
  placeholder = "Select item...",
  className,
  required = false,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [dropUp, setDropUp] = useState(false)
  const containerRef = useRef(null)
  const searchRef = useRef(null)

  const selectedItem = items.find((item) => item.id === value)

  const filtered = items.filter((item) => {
    const q = search.toLowerCase()
    return (
      item.name?.toLowerCase().includes(q) ||
      item.sku?.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)
    )
  })

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Focus search input when opened
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus()
    }
  }, [open])

  const handleSelect = (itemId) => {
    onValueChange(itemId)
    setOpen(false)
    setSearch("")
  }

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false)
      setSearch("")
    }
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)} onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "w-full flex items-center justify-between gap-2 h-10 border rounded-md px-3 text-sm bg-white",
          "border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
          "transition-colors cursor-pointer",
          !selectedItem && "text-gray-400",
        )}
      >
        {selectedItem ? (
          <div className="flex items-center gap-2 overflow-hidden">
            <ItemImage item={selectedItem} size="sm" />
            <span className="truncate text-gray-900">
              {selectedItem.name} ({selectedItem.sku})
            </span>
          </div>
        ) : (
          <span>{placeholder}</span>
        )}
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-gray-400" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute z-[9999] mt-1 w-full min-w-[320px] bg-white border border-gray-200 rounded-lg shadow-lg",
            "overflow-hidden",
          )}
          style={{ left: 0 }}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items..."
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
            />
          </div>

          {/* List */}
          <ul
            role="listbox"
            className="max-h-56 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">No items found.</li>
            ) : (
              filtered.map((item) => (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={value === item.id}
                  onClick={() => handleSelect(item.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm transition-colors",
                    "hover:bg-gray-50 active:bg-gray-100",
                    value === item.id && "bg-blue-50",
                  )}
                >
                  <ItemImage item={item} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{item.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {item.sku} · {item.quantity} {item.unit} available
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-400 truncate">{item.description}</div>
                    )}
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 text-blue-600 transition-opacity",
                      value === item.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function ItemImage({ item, size = "md" }) {
  const [errored, setErrored] = useState(false)
  const dim = size === "sm" ? "w-5 h-5" : "w-8 h-8"
  const iconDim = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  if (item.imageUrl && !errored) {
    return (
      <img
        src={item.imageUrl}
        alt={item.name}
        className={cn(dim, "rounded object-cover shrink-0")}
        onError={() => setErrored(true)}
      />
    )
  }

  return (
    <div className={cn(dim, "bg-gray-100 rounded flex items-center justify-center shrink-0")}>
      <Package className={cn(iconDim, "text-gray-400")} />
    </div>
  )
}