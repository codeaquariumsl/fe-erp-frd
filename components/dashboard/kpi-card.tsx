"use client"

import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, ArrowUpRight, ArrowDownRight, Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface KpiCardProps {
  label: string
  value: string | number
  trend?: number
  trendLabel?: ReactNode
  icon: ReactNode
  accentBg: string
  accentColor: string
  loading?: boolean
  onClick?: () => void
  className?: string
  infoTooltip?: ReactNode
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
  onClick,
  className = "",
  infoTooltip,
}: KpiCardProps) {
  const isUp = (trend ?? 0) >= 0

  return (
    <Card
      onClick={onClick}
      className={`border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm transition-all duration-200 overflow-hidden group ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-300/90 active:scale-[0.99]' : ''} ${className}`}
    >
      <CardContent className="p-3 relative">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[11px] font-medium text-slate-500 tracking-tight truncate leading-snug">
              {label}
            </span>
            {infoTooltip && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => e.stopPropagation()}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none p-0.5 rounded-full hover:bg-slate-100 flex-shrink-0 cursor-help inline-flex items-center justify-center"
                    >
                      <Info className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="start"
                    className="max-w-xs text-xs p-3 bg-slate-900 text-white border-slate-800 shadow-xl rounded-lg z-50 pointer-events-auto"
                  >
                    {infoTooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
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
            {trend !== undefined && (
              isUp ? (
                <span className="inline-flex items-center font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-100/60">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  +{trend}%
                </span>
              ) : (
                <span className="inline-flex items-center font-semibold text-red-700 bg-red-50 px-1 py-0.2 rounded border border-red-100/60">
                  <ArrowDownRight className="h-3 w-3 mr-0.5" />
                  {trend}%
                </span>
              )
            )}
            {trendLabel && (
              typeof trendLabel === 'string' ? (
                <span className="text-slate-400 truncate" title={trendLabel}>{trendLabel}</span>
              ) : (
                trendLabel
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

