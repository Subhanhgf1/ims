"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Package } from "lucide-react"
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

  const selectedItem = items.find((item) => item.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left h-10 border rounded-md px-3 text-sm font-normal",
            !selectedItem && "text-muted-foreground",
            className,
          )}
        >
          {selectedItem ? (
            <div className="flex items-center gap-2 overflow-hidden">
              {selectedItem.imageUrl ? (
                <img
                  src={selectedItem.imageUrl || "/placeholder.svg"}
                  alt={selectedItem.name}
                  className="w-5 h-5 rounded object-cover"
                  onError={(e) => {
                    e.target.style.display = "none"
                    e.target.nextSibling.style.display = "flex"
                  }}
                />
              ) : null}
              <div
                className={`w-5 h-5 bg-gray-100 rounded flex items-center justify-center ${selectedItem.imageUrl ? "hidden" : "flex"}`}
              >
                <Package className="h-3 w-3 text-gray-400" />
              </div>
              <span className="truncate">
                {selectedItem.name} ({selectedItem.sku})
              </span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search items..." />
          <CommandList>
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.sku} ${item.description || ""}`}
                  onSelect={() => {
                    onValueChange(item.id)
                    setOpen(false)
                  }}
                  className="flex items-center gap-3 p-3"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl || "/placeholder.svg"}
                        alt={item.name}
                        className="w-8 h-8 rounded object-cover"
                        onError={(e) => {
                          e.target.style.display = "none"
                          e.target.nextSibling.style.display = "flex"
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-8 h-8 bg-gray-100 rounded flex items-center justify-center ${item.imageUrl ? "hidden" : "flex"}`}
                    >
                      <Package className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.sku} • {item.quantity} {item.unit} available
                      </div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground truncate">{item.description}</div>
                      )}
                    </div>
                  </div>
                  <Check className={cn("ml-auto h-4 w-4", value === item.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
