import { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"

interface KpiSectionProps {
  title: string
  badgeLabel: string
  accentDot: string      // e.g. "bg-emerald-600"
  badgeCls: string       // e.g. "bg-emerald-50 text-emerald-700 border-emerald-200"
  children: ReactNode
}

export function KpiSection({
  title,
  badgeLabel,
  accentDot,
  badgeCls,
  children,
}: KpiSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <span className={`w-1.5 h-3 ${accentDot} rounded-full`} />
          {title}
        </h2>
        <Badge variant="outline" className={`font-semibold ${badgeCls}`}>
          {badgeLabel}
        </Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-3">{children}</div>
    </div>
  )
}
