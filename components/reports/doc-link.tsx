"use client"

type DocType = "invoice" | "sales-order" | "delivery-order" | "grn" | "gin" | "purchase-order"

const DOC_ROUTES: Record<DocType, string> = {
    "invoice": "/invoices",
    "sales-order": "/sales",
    "delivery-order": "/delivery-orders",
    "grn": "/grn",
    "gin": "/gins",
    "purchase-order": "/purchase-orders",
}

interface DocLinkProps {
    docType: DocType
    docId: number | string
    label: string
    className?: string
}

export function DocLink({ docType, docId, label, className }: DocLinkProps) {
    const route = DOC_ROUTES[docType]

    const handleClick = () => {
        window.open(`${route}?view=${docId}`, "_blank", "noopener,noreferrer")
    }

    return (
        <button
            onClick={handleClick}
            className={`inline-flex items-center gap-1 font-semibold text-primary hover:text-primary/80 hover:underline underline-offset-2 transition-colors cursor-pointer group ${className ?? ""}`}
            title={`Open ${label} in new tab`}
        >
            {label}
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
        </button>
    )
}
