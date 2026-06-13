import { useState, useMemo, useEffect } from "react"

interface UsePaginationProps<T> {
    data: T[]
    initialItemsPerPage?: number
    filterFn?: (item: T) => boolean
}

export function usePagination<T>({
    data,
    initialItemsPerPage = 10,
    filterFn
}: UsePaginationProps<T>) {
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)

    // Ensure data is always an array
    const safeData = useMemo(() => {
        return Array.isArray(data) ? data : []
    }, [data])

    // Reset to first page when data changes
    useEffect(() => {
        setCurrentPage(1)
    }, [safeData.length])

    const filteredData = useMemo(() => {
        return filterFn ? safeData.filter(filterFn) : safeData
    }, [safeData, filterFn])

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        return filteredData.slice(startIndex, startIndex + itemsPerPage)
    }, [filteredData, currentPage, itemsPerPage])

    const totalPages = useMemo(() => {
        return Math.ceil(filteredData.length / itemsPerPage)
    }, [filteredData.length, itemsPerPage])

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
    }

    const handleItemsPerPageChange = (newItemsPerPage: number) => {
        setItemsPerPage(newItemsPerPage)
        setCurrentPage(1) // Reset to first page when changing page size
    }

    return {
        currentPage,
        itemsPerPage,
        totalPages,
        filteredData,
        paginatedData,
        handlePageChange,
        handleItemsPerPageChange,
        // Pagination props for the component
        paginationProps: {
            currentPage,
            totalItems: safeData.length,
            itemsPerPage,
            totalFilteredItems: filteredData.length,
            onPageChange: handlePageChange,
            onItemsPerPageChange: handleItemsPerPageChange
        }
    }
}
