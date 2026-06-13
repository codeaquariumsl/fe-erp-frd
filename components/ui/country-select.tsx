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

const DEFAULT_COUNTRIES = [
  "Sri Lanka", "India", "China", "United Kingdom", "USA", "Singapore", "Japan", "Malaysia", "Vietnam", "Thailand", "Germany", "France", "Italy", "Spain", "Netherlands", "Belgium", "Switzerland", "Sweden", "Norway", "Denmark", "Finland", "Ireland", "Portugal", "Austria", "Greece", "Russia", "Turkey", "Saudi Arabia", "UAE", "Qatar", "Kuwait", "Oman", "Bahrain", "Jordan", "Lebanon", "Egypt", "South Africa", "Nigeria", "Kenya", "Ghana", "Canada", "Mexico", "Brazil", "Argentina", "Chile", "Colombia", "Peru", "Australia", "New Zealand", "Fiji"
]

interface CountrySelectProps {
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder = "Select country...",
  className,
  disabled = false,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false)

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
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-2" align="start">
        <Command>
          <CommandInput placeholder="Search country..." className="h-9" />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {DEFAULT_COUNTRIES.map((country) => (
                <CommandItem
                  key={country}
                  value={country}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {country}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
