"use client"

import * as React from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Column<TData> {
  accessorKey?: keyof TData
  header: string
  cell?: (data: any) => React.ReactNode
  id?: string
}

interface DataTableProps<TData> {
  columns: Column<TData>[]
  data: TData[]
  isLoading?: boolean
  searchPlaceholder?: string
  searchKey?: string
}

export function DataTable<TData extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  searchPlaceholder = "Search...",
  searchKey,
}: DataTableProps<TData>) {
  const [searchValue, setSearchValue] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(0)
  const itemsPerPage = 10

  // Filter data based on search
  const filteredData = React.useMemo(() => {
    if (!searchKey || !searchValue) return data
    return data.filter((row) => {
      const cellValue = String(row[searchKey as keyof TData] || "").toLowerCase()
      return cellValue.includes(searchValue.toLowerCase())
    })
  }, [data, searchKey, searchValue])

  // Paginate data
  const paginatedData = React.useMemo(() => {
    const startIndex = currentPage * itemsPerPage
    return filteredData.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredData, currentPage])

  const pageCount = Math.ceil(filteredData.length / itemsPerPage)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {searchKey && (
        <div className="flex items-center py-4">
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => {
              setSearchValue(event.target.value)
              setCurrentPage(0) // Reset to first page on search
            }}
            className="max-w-sm"
          />
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.id || String(column.accessorKey)}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length ? (
              paginatedData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => (
                    <TableCell key={column.id || String(column.accessorKey)}>
                      {column.cell
                        ? column.cell(row)
                        : String(
                            column.accessorKey
                              ? row[column.accessorKey]
                              : ""
                          )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="text-sm text-muted-foreground">
          Page {currentPage + 1} of {pageCount || 1} ({filteredData.length} results)
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage >= pageCount - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
