"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
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
import { type Customer } from "@/lib/api"

interface CustomerSelectProps {
  customers: Customer[]
  value: number | string
  onValueChange: (value: number) => void
  placeholder?: string
  className?: string
  showMainBadge?: boolean
  disabled?: boolean
}

export function CustomerSelect({
  customers,
  value,
  onValueChange,
  placeholder = "Select customer",
  className,
  showMainBadge = false,
  disabled = false,
}: CustomerSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedValue = typeof value === 'string' ? parseInt(value || "0") : value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
          disabled={disabled}
        >
          <span className="flex items-center gap-2 truncate">
            {selectedValue === 0 || isNaN(selectedValue)
              ? placeholder
              : customers.find((c) => c.id === selectedValue)?.name || placeholder}
          </span>
          <div className="flex items-center">
            {selectedValue !== 0 && !isNaN(selectedValue) && (
              <span
                role="button"
                className="inline-flex items-center justify-center h-5 w-5 rounded-md hover:bg-gray-100 transition-colors mr-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onValueChange(0)
                }}
              >
                <X className="h-3 w-3 opacity-50 hover:opacity-100" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start"
        onOpenAutoFocus={(e) => e.preventDefault()} // Avoid jumpy scroll when opening in dialog
      >
        <Command>
          <CommandInput placeholder="Search customer..." />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No customer found.</CommandEmpty>
            <CommandGroup>
              {(selectedValue !== 0 && !isNaN(selectedValue)) && (
                <CommandItem
                  onSelect={() => {
                    onValueChange(0)
                    setOpen(false)
                  }}
                  className="text-muted-foreground italic"
                >
                  <X className="mr-2 h-4 w-4" />
                  {placeholder || "All Customers"}
                </CommandItem>
              )}
              {customers.map((c) => (
                <CommandItem
                  key={c.id}
                  value={`${c.name} ${c.parentId === null ? 'main' : ''}`} // Add 'main' to search value
                  onSelect={() => {
                    onValueChange(c.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValue === c.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center justify-between w-full">
                    <span className="mr-2 truncate">{c.name}</span>
                    {showMainBadge && c.parentId === null && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                        Main
                      </span>
                    )}
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
