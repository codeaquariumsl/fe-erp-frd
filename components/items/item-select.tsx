"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Item } from "@/lib/api"

interface ItemSelectProps {
  items: Item[]
  value?: string | number
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  disabledItemIds?: number[]
}

export function ItemSelect({
  items,
  value,
  onValueChange,
  placeholder = "Select item...",
  className,
  disabled = false,
  disabledItemIds = [],
}: ItemSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedItem = React.useMemo(() => {
    if (!value) return null
    return items.find((i) => i.id.toString() === value.toString())
  }, [items, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-9 text-sm font-normal", className)}
          disabled={disabled}
        >
          {selectedItem ? (
            <span className="truncate">{selectedItem.name} {selectedItem.barcode ? `(${selectedItem.barcode})` : ""}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-2" align="start">
        <Command>
          <CommandInput placeholder="Search item by name or barcode..." className="h-9" />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.barcode || ""}`}
                  onSelect={() => {
                    onValueChange(item.id.toString())
                    setOpen(false)
                  }}
                  disabled={disabledItemIds.includes(item.id)}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toString() === item.id.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.barcode && <span className="text-[10px] text-muted-foreground">{item.barcode}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
