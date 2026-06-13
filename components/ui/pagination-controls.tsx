"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface PaginationControlsProps {
    currentPage: number
    totalItems: number
    itemsPerPage: number
    totalFilteredItems?: number
    onPageChange: (page: number) => void
    onItemsPerPageChange: (itemsPerPage: number) => void
    pageSizeOptions?: number[]
}

export function PaginationControls({
    currentPage,
    totalItems,
    itemsPerPage,
    totalFilteredItems,
    onPageChange,
    onItemsPerPageChange,
    pageSizeOptions = [5, 10, 20, 50, 100]
}: PaginationControlsProps) {
    const displayedItems = totalFilteredItems ?? totalItems
    const totalPages = Math.ceil(displayedItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage + 1
    const endIndex = Math.min(currentPage * itemsPerPage, displayedItems)
    
    const getPageNumbers = () => {
        const pages = []
        const maxVisiblePages = 5
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
        
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1)
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i)
        }
        return pages
    }

    if (totalPages <= 1) return null

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                    Showing {startIndex} to {endIndex} of {displayedItems} entries
                    {totalFilteredItems && totalFilteredItems !== totalItems && 
                        ` (filtered from ${totalItems} total)`
                    }
                </span>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Rows per page:</span>
                    <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => onItemsPerPageChange(Number(value))}
                    >
                        <SelectTrigger className="w-20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {pageSizeOptions.map((size) => (
                                <SelectItem key={size} value={size.toString()}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                    >
                        First
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Prev
                    </Button>
                    
                    {getPageNumbers().map((pageNum) => (
                        <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => onPageChange(pageNum)}
                            className="min-w-[32px]"
                        >
                            {pageNum}
                        </Button>
                    ))}
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                    >
                        Last
                    </Button>
                </div>
            </div>
        </div>
    )
}
