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
    <Card className="hover:shadow-md transition-all duration-300 border-slate-200/60 overflow-hidden group">
      <CardContent className="p-3 relative">
        <div
          className={`absolute right-3 top-3 p-1.5 ${accentBg} rounded-lg group-hover:scale-110 transition-transform duration-300`}
        >
          <span className={accentColor}>{icon}</span>
        </div>

        <div className="space-y-1">
          <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider pr-8 leading-tight">
            {label}
          </h3>

          <div className="text-lg font-bold text-slate-900 leading-none">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              value
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            {isUp ? (
              <span className="text-emerald-600 font-medium flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                +{trend}%
              </span>
            ) : (
              <span className="text-red-600 font-medium flex items-center">
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
                {trend}%
              </span>
            )}
            <span className="text-slate-400">{trendLabel}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
