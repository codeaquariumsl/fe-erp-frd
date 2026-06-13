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
import { Supplier } from "@/lib/api"

interface SupplierSelectProps {
  suppliers: Supplier[]
  value?: string | number
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function SupplierSelect({
  suppliers,
  value,
  onValueChange,
  placeholder = "Select supplier...",
  className,
  disabled = false,
}: SupplierSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedSupplier = React.useMemo(() => {
    if (!value) return null
    return suppliers.find((s) => s.id.toString() === value.toString())
  }, [suppliers, value])

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
          {selectedSupplier ? (
            <span className="truncate">{selectedSupplier.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-2" align="start">
        <Command>
          <CommandInput placeholder="Search supplier..." className="h-9" />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No supplier found.</CommandEmpty>
            <CommandGroup>
              {suppliers.map((supplier) => (
                <CommandItem
                  key={supplier.id}
                  value={supplier.name}
                  onSelect={() => {
                    onValueChange(supplier.id.toString())
                    setOpen(false)
                  }}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toString() === supplier.id.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {supplier.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
