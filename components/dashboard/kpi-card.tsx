"use client"

import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface KpiCardProps {
  label: string
  value: string | number
  trend: number
  trendLabel: string
  icon: ReactNode
  accentBg: string
  accentColor: string
  loading?: boolean
}

export function KpiCard({
  label,
  value,
  trend,
  trendLabel,
  icon,
  accentBg,
  accentColor,
  loading = false,
}: KpiCardProps) {
  const isUp = trend >= 0

  return (
    <Card className="border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-200 overflow-hidden group">
      <CardContent className="p-3 relative">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-medium text-slate-500 tracking-tight line-clamp-1 leading-snug">
            {label}
          </span>
          <div
            className={`flex-shrink-0 w-6 h-6 rounded-md ${accentBg} flex items-center justify-center group-hover:scale-105 transition-transform duration-200`}
          >
            <span className={`${accentColor} [&>svg]:w-3.5 [&>svg]:h-3.5`}>{icon}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-base font-bold text-slate-900 tracking-tight leading-tight">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400 my-0.5" />
            ) : (
              value
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[10px]">
            {isUp ? (
              <span className="inline-flex items-center font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100/60">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                +{trend}%
              </span>
            ) : (
              <span className="inline-flex items-center font-semibold text-red-700 bg-red-50 px-1 py-0.2 rounded border border-red-100/60">
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
                {trend}%
              </span>
            )}
            <span className="text-slate-400 truncate">{trendLabel}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

