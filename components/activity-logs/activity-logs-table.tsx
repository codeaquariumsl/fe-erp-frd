"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  User,
  Clock,
  Globe,
  Monitor,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  Calendar,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { activityLogsApi } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface ActivityLog {
  id: number
  userId: number
  action: string
  resource: string
  resourceId?: number
  method: string
  endpoint: string
  ipAddress: string
  userAgent: string
  requestBody?: any
  responseStatus: number
  duration: number
  sessionId: string
  metadata?: any
  createdAt: string
  user?: {
    id: number
    username: string
    fullName?: string
    email: string
  }
}

interface ActivityLogsTableProps {
  userId?: number
  showUserInfo?: boolean
  isUserView?: boolean
  title?: string
  description?: string
}

export default function ActivityLogsTable({
  userId,
  showUserInfo = true,
  isUserView = false,
  title = "User Activity Logs",
  description = "Track user actions and system interactions"
}: ActivityLogsTableProps) {
  const { token, hasPermission } = useAuth()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filters
  const [filters, setFilters] = useState({
    action: "",
    resource: "",
    startDate: "",
    endDate: "",
    searchTerm: "",
  })

  // Sorting
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC")

  useEffect(() => {
    if (token) {
      loadActivityLogs()
    }
  }, [token, userId, currentPage, pageSize, filters, sortBy, sortOrder])

  const loadActivityLogs = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = {
        ...filters,
        userId,
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sortBy,
        sortOrder,
      }

      // Remove empty params
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== "" && value !== undefined)
      )

      let response: any
      if (isUserView) {
        // User can only view their own activity
        response = await activityLogsApi.getMyActivity(cleanParams)
      } else if (userId) {
        // Admin viewing specific user's activity
        response = await activityLogsApi.getUserActivity(userId, cleanParams)
      } else {
        // Admin viewing all activity
        response = await activityLogsApi.getAll(cleanParams)
      }

      // Handle response format
      const data = (response as any)?.data || response
      if (Array.isArray(data)) {
        setLogs(data)
        setTotal((response as any)?.total || data.length)
      } else {
        setLogs((data as any)?.logs || [])
        setTotal((data as any)?.total || 0)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activity logs")
      setLogs([])
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC")
    } else {
      setSortBy(column)
      setSortOrder("DESC")
    }
    setCurrentPage(1)
  }

  const resetFilters = () => {
    setFilters({
      action: "",
      resource: "",
      startDate: "",
      endDate: "",
      searchTerm: "",
    })
    setCurrentPage(1)
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: "bg-green-600",
      READ: "bg-blue-600",
      UPDATE: "bg-yellow-600",
      DELETE: "bg-red-600",
      LOGIN: "bg-purple-600",
    }
    return (
      <Badge className={colors[action] || "bg-gray-600"}>
        {action}
      </Badge>
    )
  }

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return <Badge variant="default" className="bg-green-600">Success</Badge>
    } else if (status >= 400 && status < 500) {
      return <Badge variant="destructive">Client Error</Badge>
    } else if (status >= 500) {
      return <Badge variant="destructive">Server Error</Badge>
    }
    return <Badge variant="secondary">{status}</Badge>
  }

  const formatDuration = (duration: number) => {
    if (duration < 1000) {
      return `${duration}ms`
    }
    return `${(duration / 1000).toFixed(2)}s`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }

  const formatUserAgent = (userAgent: string) => {
    // Simple user agent parsing
    if (userAgent.includes("Chrome")) return "Chrome"
    if (userAgent.includes("Firefox")) return "Firefox"
    if (userAgent.includes("Safari")) return "Safari"
    if (userAgent.includes("Edge")) return "Edge"
    return "Unknown"
  }

  const totalPages = Math.ceil(total / pageSize)

  if (!hasPermission("users:view") && !isUserView) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to view activity logs.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button onClick={loadActivityLogs} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="action-filter">Action</Label>
            <Select value={filters.action} onValueChange={(value) => handleFilterChange("action", value)}>
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                {/* <SelectItem value="">All Actions</SelectItem> */}
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="READ">Read</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="resource-filter">Resource</Label>
            <Input
              id="resource-filter"
              placeholder="Filter by resource..."
              value={filters.resource}
              onChange={(e) => handleFilterChange("resource", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
              className="w-64"
            />
            <Button onClick={resetFilters} variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Label>Show:</Label>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Activity Logs Table */}
        <div className="border rounded-md">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort("createdAt")}
                  >
                    Time
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                {showUserInfo && (
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 font-semibold"
                      onClick={() => handleSort("userId")}
                    >
                      User
                      <ArrowUpDown className="ml-2 h-3 w-3" />
                    </Button>
                  </TableHead>
                )}
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort("action")}
                  >
                    Action
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Device</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={showUserInfo ? 9 : 8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={showUserInfo ? 9 : 8} className="text-center py-8">
                    <div className="text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p>No activity logs found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <div className="text-sm">
                          <div>{formatDate(log.createdAt).date}</div>
                          <div className="text-muted-foreground text-xs">
                            {formatDate(log.createdAt).time}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {showUserInfo && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <div className="text-sm">
                            <div className="font-medium">
                              {log.user?.fullName || log.user?.username || `User ${log.userId}`}
                            </div>
                            {log.user?.email && (
                              <div className="text-muted-foreground text-xs">{log.user.email}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{log.resource}</div>
                        {log.resourceId && (
                          <div className="text-muted-foreground text-xs">ID: {log.resourceId}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.method}
                      </Badge>
                      <div className="text-muted-foreground text-xs">{log.endpoint}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.responseStatus)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDuration(log.duration)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        {log.ipAddress}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Monitor className="h-3 w-3 text-muted-foreground" />
                        {formatUserAgent(log.userAgent)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, total)} of {total} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
