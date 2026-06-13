"use client"

import React from 'react'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Snowflake, Package, Thermometer } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { type ColdRoom } from "@/lib/api"

interface PalletRack {
    id: number
    code: string
    capacity: number
    availableQty: number
    weight: number
    reservedQty: number
    occupied: number
    coldRoomId: number
}

interface ColdRoomLayoutProps {
    coldRoom: ColdRoom
    racks: PalletRack[]
}

const ColdRoomLayout: React.FC<ColdRoomLayoutProps> = ({ coldRoom, racks }) => {
    // Calculate utilization statistics for racks
    const totalAvailable = racks.reduce((sum, rack) => sum + (rack.availableQty || 0), 0)
    const totalCapacity = racks.reduce((sum, rack) => sum + (rack.capacity || 0), 0)
    const utilizationPercentage = totalCapacity > 0 ? (totalAvailable / totalCapacity) * 100 : 0

    // Calculate rack status counts
    const emptyRacks = racks.filter(r => r.availableQty === 0).length
    const partialRacks = racks.filter(r => r.availableQty > 0 && r.availableQty < r.capacity).length
    const fullRacks = racks.filter(r => r.availableQty >= r.capacity).length

    // Helper function to get rack border
    const getRackBorder = (palletInRack: number) => {
        if (palletInRack === 1) return 'border-l-2 border-l-blue-600'
        if (palletInRack === 8) return 'border-r-2 border-r-blue-600'
        return ''
    }

    // Helper function to get status color based on rack availability
    const getStatusColor = (palletId: string) => {
        const rackCode = `L1-${palletId}`
        const rack = racks.find(r => r.code === rackCode)
        if (!rack) return 'bg-gray-100 border-gray-200 text-gray-400' // Inactive/non-existent

        if (rack.availableQty === 0) return 'bg-green-100 border-green-400 text-green-800 hover:bg-green-200' // Empty
        if (rack.availableQty >= rack.capacity) return 'bg-red-100 border-red-400 text-red-800 hover:bg-red-200' // Full
        return 'bg-yellow-100 border-yellow-400 text-yellow-800 hover:bg-yellow-200' // Partially full
    }

    // Create pallet positions for visualization
    const positions = {
        leftSection: {
            rows: [
                // Cold Room A (1-184)
                Array.from({ length: 48 }, (_, i) => ({
                    palletId: String(i + 1),
                    rackId: Math.floor(i / 8) + 1,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room A'
                })),
                Array.from({ length: 48 }, (_, i) => ({
                    palletId: String(i + 49),
                    rackId: Math.floor(i / 8) + 7,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room A'
                })),
                Array.from({ length: 48 }, (_, i) => ({
                    palletId: String(i + 97),
                    rackId: Math.floor(i / 8) + 13,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room A'
                })),
                Array.from({ length: 40 }, (_, i) => ({
                    palletId: String(i + 145),
                    rackId: Math.floor(i / 8) + 19,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room A'
                })),
                // Cold Room B (185-368)
                Array.from({ length: 48 }, (_, i) => ({
                    palletId: String(i + 185),
                    rackId: Math.floor(i / 8) + 24,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room B'
                })),
                Array.from({ length: 48 }, (_, i) => ({
                    palletId: String(i + 233),
                    rackId: Math.floor(i / 8) + 30,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room B'
                })),
                Array.from({ length: 48 }, (_, i) => ({
                    palletId: String(i + 281),
                    rackId: Math.floor(i / 8) + 36,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room B'
                })),
                Array.from({ length: 40 }, (_, i) => ({
                    palletId: String(i + 329),
                    rackId: Math.floor(i / 8) + 42,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room B'
                })),
                // Cold Room C (369-552)
                Array.from({ length: 48 }, (_, i) => ({
                    palletId: String(i + 369),
                    rackId: Math.floor(i / 8) + 47,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room C'
                })),
                Array.from({ length: 48 }, (_, i) => ({
                    palletId: String(i + 417),
                    rackId: Math.floor(i / 8) + 53,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room C'
                })),
                Array.from({ length: 48 }, (_, i) => ({
                    palletId: String(i + 465),
                    rackId: Math.floor(i / 8) + 59,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room C'
                })),
                Array.from({ length: 40 }, (_, i) => ({
                    palletId: String(i + 513),
                    rackId: Math.floor(i / 8) + 65,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room C'
                })),
                // Cold Room D (553-736)
                Array.from({ length: 48 }, (_, i) => ({
                    palletId: String(i + 553),
                    rackId: Math.floor(i / 8) + 70,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room D'
                })),
                Array.from({ length: 48 }, (_, i) => ({
                    palletId: String(i + 601),
                    rackId: Math.floor(i / 8) + 76,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room D'
                })),
                Array.from({ length: 48 }, (_, i) => ({
                    palletId: String(i + 649),
                    rackId: Math.floor(i / 8) + 82,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room D'
                })),
                Array.from({ length: 40 }, (_, i) => ({
                    palletId: String(i + 697),
                    rackId: Math.floor(i / 8) + 88,
                    palletInRack: (i % 8) + 1,
                    coldRoom: 'Cold Room D'
                })),
            ]
        }
    }

    return (
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                            <Snowflake className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{coldRoom.name}</h3>
                            <p className="text-sm text-gray-600">{coldRoom.Store?.name || "Main Warehouse"}</p>
                            <p className="text-xs text-blue-600">8 Pallets per Rack • {racks.length} Total Racks • {racks.reduce((sum, r) => sum + (r.capacity || 0), 0)} Box Capacities</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Thermometer className="h-5 w-5 text-blue-500" />
                            <div className="text-right">
                                <div className="text-sm text-gray-600">Temperature</div>
                                <div className="text-lg font-bold text-blue-900">{coldRoom.temperature}°C</div>
                            </div>
                        </div>
                        <Badge
                            variant={coldRoom.status === "Optimal" ? "default" : "destructive"}
                            className={coldRoom.status === "Optimal" ? "bg-green-100 text-green-800" : ""}
                        >
                            {coldRoom.status === "Optimal" ? "Optimal" : (coldRoom.status || "Unknown")}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <div className="bg-white rounded-lg p-4 border border-gray-200 overflow-x-auto">
                    {/* Legend */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <div className="w-3 h-3 bg-green-100 rounded-sm"></div>
                                <span>Empty</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <div className="w-3 h-3 bg-yellow-100 rounded-sm"></div>
                                <span>Partially Full</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <div className="w-3 h-3 bg-red-100 rounded-sm"></div>
                                <span>Full</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
                                <span>Inactive</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-gray-600">Utilization:</span>
                            <Progress value={utilizationPercentage} className="w-24 h-2" />
                            <span className="text-sm font-semibold text-blue-600">{utilizationPercentage.toFixed(1)}%</span>
                        </div>
                    </div>

                    <div className="min-w-[1400px]">
                        {/* Left Section */}
                        <div className="space-y-2 mb-6">
                            <div className="text-xs font-bold text-gray-700 mb-2">
                                (
                                {coldRoom.name === 'Cold Room A' ? 'L1-1 to L1-184' :
                                 coldRoom.name === 'Cold Room B' ? 'L1-185 to L1-368' :
                                 coldRoom.name === 'Cold Room C' ? 'L1-369 to L1-552' :
                                 'L1-553 to L1-736'}
                                )
                            </div>
                            {positions.leftSection.rows
                                .filter(row => row[0].coldRoom === coldRoom.name)
                                .map((row, rowIndex) => (
                                <div key={`left-${rowIndex}`} className="flex gap-0.5">
                                    {row.map((pallet) => {
                                        const statusColor = getStatusColor(pallet.palletId)
                                        const rackBorder = getRackBorder(pallet.palletInRack)
                                        const rack = racks.find(r => r.code === `L1-${pallet.palletId}`)

                                        return (
                                            <div
                                                key={pallet.palletId}
                                                className={`
                                                    relative h-6 w-8 border text-[7px] font-mono font-bold
                                                    flex items-center justify-center cursor-pointer
                                                    transition-all duration-200 hover:scale-105 hover:z-10
                                                    ${statusColor}
                                                    ${rackBorder}
                                                    ${pallet.palletInRack === 1 ? 'ml-1' : ''} 
                                                    ${pallet.palletInRack === 8 ? 'mr-1' : ''}
                                                `}
                                                title={`${pallet.coldRoom}
L1-${pallet.palletId} - Position ${pallet.palletInRack}
${rack ? `Available: ${rack.availableQty} of ${rack.capacity} boxes` : 'Inactive'}`}
                                            >
                                                <span className="leading-none">
                                                    {pallet.palletId}
                                                </span>
                                                {rack && rack.reservedQty > 0 && (
                                                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full"></div>
                                                )}
                                                {/* Rack number indicator for first pallet in rack */}
                                                {/* {pallet.palletInRack === 1 && (
                                                    <div className="absolute -top-3 left-0 text-[8px] font-bold text-blue-600 bg-blue-100 px-1 rounded">
                                                        {pallet.palletId}
                                                    </div>
                                                )} */}
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Layout Statistics */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="bg-green-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-green-700">{emptyRacks}</div>
                                <div className="text-xs text-green-600 font-medium">Empty Racks</div>
                            </div>

                            <div className="bg-yellow-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-yellow-700">{partialRacks}</div>
                                <div className="text-xs text-yellow-600 font-medium">Partial Racks</div>
                            </div>

                            <div className="bg-red-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-red-700">{fullRacks}</div>
                                <div className="text-xs text-red-600 font-medium">Full Racks</div>
                            </div>

                            <div className="bg-blue-50 rounded-lg p-3">
                                <div className="text-2xl font-bold text-blue-700">{totalAvailable}</div>
                                <div className="text-xs text-blue-600 font-medium">Total Available</div>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default ColdRoomLayout
