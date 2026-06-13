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
import { LedgerAccount } from "@/lib/api"

interface LedgerSelectProps {
  ledgers: LedgerAccount[]
  value?: string | number
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function LedgerSelect({
  ledgers,
  value,
  onValueChange,
  placeholder = "Select ledger...",
  className,
  disabled = false,
}: LedgerSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLedger = React.useMemo(() => {
    if (!value) return null
    return ledgers.find((ledger) => ledger.id.toString() === value.toString())
  }, [ledgers, value])

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
          {selectedLedger ? (
            <span className="truncate">
              {selectedLedger.name} <span className="text-muted-foreground ml-1">({selectedLedger.ledgerCode})</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-2" align="start">
        <Command>
          <CommandInput placeholder="Search ledger by name or code..." className="h-9" />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>No ledger found.</CommandEmpty>
            <CommandGroup>
              {ledgers.map((ledger) => (
                <CommandItem
                  key={ledger.id}
                  value={`${ledger.name} ${ledger.ledgerCode}`}
                  onSelect={(currentValue) => {
                    onValueChange(ledger.id.toString())
                    setOpen(false)
                  }}
                  className="text-xs"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value?.toString() === ledger.id.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-medium truncate">{ledger.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {ledger.ledgerCode} - {ledger.AccountCategory?.name || ledger.AccountType?.name || ledger.accountCategory?.name || ledger.accountType?.name || "N/A"}
                    </span>
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
