"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Edit, Trash2, Users } from "lucide-react"
import { driversApi, type Driver } from "@/lib/api"

// Export for master data usage
export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    username: "",
    email: "",
    status: "Active",
  })

  useEffect(() => {
    loadDrivers()
  }, [])

  const loadDrivers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await driversApi.getAll<Driver>()
      setDrivers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drivers")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsSubmitting(true)
      setError(null)
      if (editingDriver) {
        await driversApi.update(editingDriver.id, formData)
      } else {
        await driversApi.create(formData)
      }
      setFormData({ name: "", mobile: "", username: "", email: "", status: "Active" })
      setIsDialogOpen(false)
      setEditingDriver(null)
      await loadDrivers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save driver")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver)
    setFormData({
      name: driver.name,
      mobile: driver.mobile,
      username: driver.username,
      email: driver.email,
      status: driver.status,
    })
    setIsDialogOpen(true)
  }

  const handleDeleteDriver = async (driverId: number) => {
    if (!confirm("Are you sure you want to delete this driver?")) return
    try {
      await driversApi.remove(driverId)
      await loadDrivers()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete driver")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Users className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Drivers Management</h1>
          <p className="text-muted-foreground">Manage all drivers in the system</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingDriver(null)
                setFormData({ name: "", mobile: "", username: "", email: "", status: "Active" })
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingDriver ? "Edit Driver" : "Add New Driver"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateDriver} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isSubmitting}
                    placeholder="Enter driver name"
                  />
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    required
                    disabled={isSubmitting}
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={isSubmitting}
                    placeholder="Enter email"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Input
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="Active/Inactive"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingDriver ? "Update Driver" : "Create Driver"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* Summary Cards - Compact Style */}
      <div className="grid gap-2 md:grid-cols-4">
        <Card className="h-20 flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
            <CardTitle className="text-xs font-medium">Total Drivers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="py-1 px-3">
            <div className="text-lg font-bold">{drivers.length}</div>
            <p className="text-xs text-muted-foreground leading-tight">All drivers</p>
          </CardContent>
        </Card>
        <Card className="h-20 flex flex-col justify-center">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3">
            <CardTitle className="text-xs font-medium">Active Drivers</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="py-1 px-3">
            <div className="text-lg font-bold">{drivers.filter(d => d.status === "Active").length}</div>
            <p className="text-xs text-muted-foreground leading-tight">Currently active</p>
          </CardContent>
        </Card>
      </div>
      {/* Drivers List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Input
                placeholder="Search drivers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drivers
                .filter((d) =>
                  d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  d.mobile.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  d.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  d.email.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell>{driver.name}</TableCell>
                    <TableCell>{driver.mobile}</TableCell>
                    <TableCell>{driver.username}</TableCell>
                    <TableCell>{driver.email}</TableCell>
                    <TableCell>{driver.status}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleEditDriver(driver)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteDriver(driver.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
