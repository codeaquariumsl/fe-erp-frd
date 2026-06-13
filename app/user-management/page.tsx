"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { usersApi, rolesApi, permissionsApi, type User, type Role, type Permission } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import ActivityLogsTable from "@/components/activity-logs/activity-logs-table"
import {
  Users,
  Plus,
  Search,
  Loader2,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  Shield,
  Key,
  Settings,
  Crown,
  UserCheck,
  Activity,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { getPermissionsByModule, PERMISSIONS } from "@/lib/permissions"
import { ERPLayout } from "@/components/layouts/erp-layout"
import { useToast } from "@/hooks/use-toast"

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState("users")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all")
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Dialog states
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [isEditUserOpen, setIsEditUserOpen] = useState(false)
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false)
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false)
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [userForm, setUserForm] = useState({
    id: 0,
    username: "",
    email: "",
    fullName: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    roleId: 0,
    status: "Active",
  })

  const [roleForm, setRoleForm] = useState({
    id: 0,
    name: "",
    description: "",
  })

  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [rolePermissions, setRolePermissions] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isActivityLogsOpen, setIsActivityLogsOpen] = useState(false)
  const [isCreatePermissionOpen, setIsCreatePermissionOpen] = useState(false)
  const [isEditPermissionOpen, setIsEditPermissionOpen] = useState(false)
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)

  // Reset password form state
  const [resetPasswordForm, setResetPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  })

  // Permission form state
  const [permissionForm, setPermissionForm] = useState({
    id: "",
    name: "",
    description: "",
    module: "",
    action: "",
  })

  const { token, user: currentUser, hasPermission } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (token) {
      loadData()
    }
  }, [token])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Helper function to unwrap API responses
      const unwrapResponse = (response: any) => {
        // Check if response has data property (wrapped format)
        if (response && typeof response === 'object' && 'data' in response) {
          return response.data
        }
        // Otherwise return as-is (direct format)
        return response
      }

      const [usersResponse, rolesResponse] = await Promise.all([
        usersApi.getAll(),
        rolesApi.getAll()
      ])

      // Handle different response formats
      const usersData = unwrapResponse(usersResponse)
      const rolesData = unwrapResponse(rolesResponse)

      // Extract users array from different possible formats
      const users = Array.isArray(usersData) ? usersData : (usersData as any).users || []
      const roles = Array.isArray(rolesData) ? rolesData : []

      setUsers(users)
      setRoles(roles)

      // Load permissions from backend API
      try {
        const permissionsResponse = await permissionsApi.getAll()
        const permissionsData = unwrapResponse(permissionsResponse)

        // Handle the new API response format: { success: true, data: [...], message: "..." }
        const permissions = Array.isArray(permissionsData) ? permissionsData : []
        setPermissions(permissions)

        console.log('Loaded permissions from API:', permissions.length, 'permissions')
      } catch (err) {
        console.warn('Failed to load permissions from API, using fallback:', err)
        // Fallback to static permissions
        setPermissions(Object.values(PERMISSIONS))
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to load data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    if (userForm.password !== userForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (!userForm.roleId) {
      toast({
        title: "Validation Error",
        description: "Please select a role",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const userData = {
        username: userForm.username,
        password: userForm.password,
        email: userForm.email,
        fullName: userForm.fullName,
        mobile: userForm.mobile,
        status: userForm.status,
        roleId: userForm.roleId,
      }

      await usersApi.create(userData)

      toast({
        title: "Success",
        description: "User created successfully!",
      })
      resetUserForm()
      setIsCreateUserOpen(false)
      await loadData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    try {
      setIsSubmitting(true)

      const userData = {
        username: userForm.username,
        email: userForm.email,
        fullName: userForm.fullName,
        mobile: userForm.mobile,
        status: userForm.status,
        roleId: userForm.roleId,
      }

      await usersApi.update(userForm.id, userData)

      toast({
        title: "Success",
        description: "User updated successfully!",
      })
      resetUserForm()
      setIsEditUserOpen(false)
      await loadData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update user",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!token) return

    try {
      await usersApi.remove(userId)
      toast({
        title: "Success",
        description: "User deleted successfully!",
      })
      await loadData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    try {
      setIsSubmitting(true)

      await rolesApi.create(roleForm)

      toast({
        title: "Success",
        description: "Role created successfully!",
      })
      resetRoleForm()
      setIsCreateRoleOpen(false)
      await loadData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create role",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    try {
      setIsSubmitting(true)

      await rolesApi.update(roleForm.id, roleForm)

      toast({
        title: "Success",
        description: "Role updated successfully!",
      })
      resetRoleForm()
      setIsEditRoleOpen(false)
      await loadData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update role",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteRole = async (roleId: number) => {
    if (!token) return

    const role = roles.find(r => r.id === roleId)
    if (role && ["admin", "manager", "user"].includes(role.name.toLowerCase())) {
      toast({
        title: "Error",
        description: "Cannot delete system roles",
        variant: "destructive",
      })
      return
    }

    try {
      await rolesApi.remove(roleId)
      toast({
        title: "Success",
        description: "Role deleted successfully!",
      })
      await loadData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete role",
        variant: "destructive",
      })
    }
  }

  const openEditUser = (user: User) => {
    setUserForm({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName || "",
      mobile: user.mobile || "",
      password: "",
      confirmPassword: "",
      roleId: user.roleId,
      status: user.status,
    })
    setIsEditUserOpen(true)
  }

  const openEditRole = (role: Role) => {
    setRoleForm({
      id: role.id,
      name: role.name,
      description: role.description,
    })
    setIsEditRoleOpen(true)
  }

  const openPermissionsDialog = async (role: Role) => {
    setSelectedRole(role)

    try {
      const permissionsResponse = await rolesApi.getPermissions(role.id)
      // Handle response unwrapping
      const permissions = permissionsResponse && typeof permissionsResponse === 'object' && 'data' in permissionsResponse
        ? permissionsResponse.data
        : permissionsResponse
      setRolePermissions(Array.isArray(permissions) ? permissions : [])
    } catch (err) {
      // Fallback to empty permissions if API doesn't exist yet
      setRolePermissions([])
    }

    setIsPermissionsOpen(true)
  }

  const openActivityLogs = (user: User) => {
    setSelectedUser(user)
    setIsActivityLogsOpen(true)
  }

  const handleUpdatePermissions = async () => {
    if (!selectedRole || !token) return

    try {
      setIsSubmitting(true)

      await rolesApi.updatePermissions(selectedRole.id, rolePermissions)

      toast({
        title: "Success",
        description: "Permissions updated successfully!",
      })
      setIsPermissionsOpen(false)
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update permissions",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePermission = (permissionId: string) => {
    setRolePermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    )
  }

  const resetUserForm = () => {
    setUserForm({
      id: 0,
      username: "",
      email: "",
      fullName: "",
      mobile: "",
      password: "",
      confirmPassword: "",
      roleId: 0,
      status: "Active",
    })
  }

  const resetRoleForm = () => {
    setRoleForm({
      id: 0,
      name: "",
      description: "",
    })
  }

  const resetPermissionForm = () => {
    setPermissionForm({
      id: "",
      name: "",
      description: "",
      module: "",
      action: "",
    })
  }

  const handleCreatePermission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    try {
      setIsSubmitting(true)

      // Create permission using the new API
      await permissionsApi.create({
        id: permissionForm.id,
        name: permissionForm.name,
        description: permissionForm.description,
        module: permissionForm.module,
        action: permissionForm.action,
      })

      toast({
        title: "Success",
        description: "Permission created successfully!",
      })
      resetPermissionForm()
      setIsCreatePermissionOpen(false)
      await loadData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create permission",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditPermission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !selectedPermission) return

    try {
      setIsSubmitting(true)

      // Update permission using the new API
      await permissionsApi.update(selectedPermission.id, {
        name: permissionForm.name,
        description: permissionForm.description,
        module: permissionForm.module,
        action: permissionForm.action,
      })

      toast({
        title: "Success",
        description: "Permission updated successfully!",
      })
      resetPermissionForm()
      setIsEditPermissionOpen(false)
      setSelectedPermission(null)
      await loadData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update permission",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeletePermission = async (permissionId: string) => {
    if (!token) return

    try {
      await permissionsApi.remove(permissionId)
      toast({
        title: "Success",
        description: "Permission deleted successfully!",
      })
      await loadData()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete permission",
        variant: "destructive",
      })
    }
  }

  const openEditPermission = (permission: Permission) => {
    setSelectedPermission(permission)
    setPermissionForm({
      id: permission.id,
      name: permission.name,
      description: permission.description,
      module: permission.module,
      action: permission.action,
    })
    setIsEditPermissionOpen(true)
  }

  const openResetPassword = (user: User) => {
    setResetPasswordUser(user)
    setResetPasswordForm({
      newPassword: "",
      confirmPassword: "",
    })
    setIsResetPasswordOpen(true)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !resetPasswordUser) return

    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "New passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (resetPasswordForm.newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Use admin password change API (no current password required)
      await usersApi.adminChangePassword(
        resetPasswordUser.id,
        resetPasswordForm.newPassword,
        resetPasswordForm.confirmPassword
      )

      toast({
        title: "Success",
        description: `Password reset successfully for ${resetPasswordUser.username}!`,
      })
      setResetPasswordForm({
        newPassword: "",
        confirmPassword: "",
      })
      setIsResetPasswordOpen(false)
      setResetPasswordUser(null)
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to reset password",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRoleName = (roleId: number) => {
    const role = roles.find(r => r.id === roleId)
    return role?.name || `Role ${roleId}`
  }

  const getStatusBadge = (status: string) => {
    return status === "Active" ? (
      <Badge variant="default" className="bg-green-600">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">
        <AlertCircle className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    )
  }

  const getRoleBadge = (roleName: string) => {
    const isSystemRole = ["admin", "manager", "user"].includes(roleName.toLowerCase())
    return isSystemRole ? (
      <Badge variant="default">
        <Crown className="h-3 w-3 mr-1" />
        System
      </Badge>
    ) : (
      <Badge variant="outline">
        <Settings className="h-3 w-3 mr-1" />
        Custom
      </Badge>
    )
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getRoleName(user.roleId).toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRoleFilter === "all" || user.roleId === Number(selectedRoleFilter);

    return matchesSearch && matchesRole;
  })

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Group permissions by module using API data
  const permissionsByModule = permissions.reduce((acc: Record<string, Permission[]>, permission) => {
    const module = permission.module || 'Other'
    if (!acc[module]) {
      acc[module] = []
    }
    acc[module].push(permission)
    return acc
  }, {})

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!hasPermission("users:view")) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access user management.</p>
        </div>
      </div>
    )
  }

  return (
    <ERPLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            {/* <h1 className="text-3xl font-bold">User Management</h1> */}
            <p className="text-muted-foreground">Manage system users, roles and permissions</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Roles ({roles.length})
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Permissions ({permissions.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Logs
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">


            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Users</CardTitle>
                    <CardDescription>Manage user accounts and their access levels</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Filter by Role:</Label>
                      <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                        <SelectTrigger className="w-48 h-10">
                          <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    {hasPermission("users:create") && (
                      <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add New User
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Create New User</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="username">Username <span className="text-red-500">*</span></Label>
                                <Input
                                  id="username"
                                  value={userForm.username}
                                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                                  required
                                  disabled={isSubmitting}
                                />
                              </div>
                              <div>
                                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                                <Input
                                  id="email"
                                  type="email"
                                  value={userForm.email}
                                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                                  required
                                  disabled={isSubmitting}
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                              <Input
                                id="fullName"
                                value={userForm.fullName}
                                onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                                disabled={isSubmitting}
                              />
                            </div>
                            <div>
                              <Label htmlFor="mobile">Mobile <span className="text-red-500">*</span></Label>
                              <Input
                                id="mobile"
                                value={userForm.mobile}
                                onChange={(e) => setUserForm({ ...userForm, mobile: e.target.value })}
                                disabled={isSubmitting}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
                                <Input
                                  id="password"
                                  type="password"
                                  value={userForm.password}
                                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                  required
                                  disabled={isSubmitting}
                                />
                              </div>
                              <div>
                                <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
                                <Input
                                  id="confirmPassword"
                                  type="password"
                                  value={userForm.confirmPassword}
                                  onChange={(e) => setUserForm({ ...userForm, confirmPassword: e.target.value })}
                                  required
                                  disabled={isSubmitting}
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="role">Role <span className="text-red-500">*</span></Label>
                              <Select
                                value={userForm.roleId.toString()}
                                onValueChange={(value) => setUserForm({ ...userForm, roleId: parseInt(value) })}
                                disabled={isSubmitting}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roles.map((role) => (
                                    <SelectItem key={role.id} value={role.id.toString()}>
                                      {role.name} - {role.description}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Create User
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="font-medium">#{user.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{user.username}</div>
                        </TableCell>
                        <TableCell>{user.fullName || "-"}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getRoleName(user.roleId)}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {(hasPermission("users:edit") || hasPermission("users:delete")) &&
                            currentUser?.id !== user.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {hasPermission("users:edit") && (
                                    <DropdownMenuItem onClick={() => openEditUser(user)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit User
                                    </DropdownMenuItem>
                                  )}
                                  {hasPermission("users:view") && (
                                    <DropdownMenuItem onClick={() => openActivityLogs(user)}>
                                      <Activity className="h-4 w-4 mr-2" />
                                      View Activity
                                    </DropdownMenuItem>
                                  )}
                                  {hasPermission("users:reset-password") && (
                                    <DropdownMenuItem onClick={() => openResetPassword(user)}>
                                      <Key className="h-4 w-4 mr-2" />
                                      Reset Password
                                    </DropdownMenuItem>
                                  )}
                                  {hasPermission("users:delete") && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onSelect={(e) => e.preventDefault()}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete User
                                        </DropdownMenuItem>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="text-red-600">Are you sure?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the user account.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                            onClick={() => handleDeleteUser(user.id)}>
                                            Delete User
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Roles Tab */}
          <TabsContent value="roles" className="space-y-6">

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Roles</CardTitle>
                    <CardDescription>Manage user roles and their permissions</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search roles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    {hasPermission("roles:create") && (
                      <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Role
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Create New Role</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleCreateRole} className="space-y-4">
                            <div>
                              <Label htmlFor="roleName">Role Name</Label>
                              <Input
                                id="roleName"
                                value={roleForm.name}
                                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                                required
                                disabled={isSubmitting}
                                placeholder="Enter role name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="roleDescription">Description</Label>
                              <Textarea
                                id="roleDescription"
                                value={roleForm.description}
                                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                                required
                                disabled={isSubmitting}
                                placeholder="Enter role description"
                              />
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Create Role
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Role Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <div className="font-medium">#{role.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{role.name}</div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate">{role.description}</div>
                        </TableCell>
                        <TableCell>{getRoleBadge(role.name)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(role.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {(hasPermission("roles:edit") || hasPermission("roles:delete") || hasPermission("roles:assign-permissions")) && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {hasPermission("roles:assign-permissions") && (
                                  <DropdownMenuItem onClick={() => openPermissionsDialog(role)}>
                                    <Settings className="h-4 w-4 mr-2" />
                                    Manage Permissions
                                  </DropdownMenuItem>
                                )}
                                {hasPermission("roles:edit") && (
                                  <DropdownMenuItem onClick={() => openEditRole(role)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Role
                                  </DropdownMenuItem>
                                )}
                                {hasPermission("roles:delete") &&
                                  !["admin", "manager", "user"].includes(role.name.toLowerCase()) && (
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleDeleteRole(role.id)}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Role
                                    </DropdownMenuItem>
                                  )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>System Permissions</CardTitle>
                    <CardDescription>Manage system permissions by module - loaded from API</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search permissions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    {hasPermission("permissions:create") && (
                      <Dialog open={isCreatePermissionOpen} onOpenChange={setIsCreatePermissionOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Permission
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Create New Permission</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleCreatePermission} className="space-y-4">
                            <div>
                              <Label htmlFor="permissionId">Permission ID</Label>
                              <Input
                                id="permissionId"
                                value={permissionForm.id}
                                onChange={(e) => setPermissionForm({ ...permissionForm, id: e.target.value })}
                                required
                                disabled={isSubmitting}
                                placeholder="e.g., items:create"
                              />
                            </div>
                            <div>
                              <Label htmlFor="permissionName">Permission Name</Label>
                              <Input
                                id="permissionName"
                                value={permissionForm.name}
                                onChange={(e) => setPermissionForm({ ...permissionForm, name: e.target.value })}
                                required
                                disabled={isSubmitting}
                                placeholder="e.g., Create Items"
                              />
                            </div>
                            <div>
                              <Label htmlFor="permissionDescription">Description</Label>
                              <Textarea
                                id="permissionDescription"
                                value={permissionForm.description}
                                onChange={(e) => setPermissionForm({ ...permissionForm, description: e.target.value })}
                                required
                                disabled={isSubmitting}
                                placeholder="Describe what this permission allows"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="permissionModule">Module</Label>
                                <Input
                                  id="permissionModule"
                                  value={permissionForm.module}
                                  onChange={(e) => setPermissionForm({ ...permissionForm, module: e.target.value })}
                                  required
                                  disabled={isSubmitting}
                                  placeholder="e.g., Item Management"
                                />
                              </div>
                              <div>
                                <Label htmlFor="permissionAction">Action</Label>
                                <Select
                                  value={permissionForm.action}
                                  onValueChange={(value) => setPermissionForm({ ...permissionForm, action: value })}
                                  disabled={isSubmitting}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select action" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="create">Create</SelectItem>
                                    <SelectItem value="view">View</SelectItem>
                                    <SelectItem value="edit">Edit</SelectItem>
                                    <SelectItem value="delete">Delete</SelectItem>
                                    <SelectItem value="manage">Manage</SelectItem>
                                    <SelectItem value="approve">Approve</SelectItem>
                                    <SelectItem value="export">Export</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Create Permission
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(permissionsByModule)
                    .filter(([module, modulePermissions]) =>
                      !searchTerm ||
                      module.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      modulePermissions.some(p =>
                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.action.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                    )
                    .map(([module, modulePermissions]) => {
                      const filteredPermissions = modulePermissions.filter(permission =>
                        !searchTerm ||
                        permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        permission.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        permission.action.toLowerCase().includes(searchTerm.toLowerCase())
                      );

                      if (filteredPermissions.length === 0) return null;

                      return (
                        <div key={module}>
                          <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            {module} ({filteredPermissions.length})
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filteredPermissions.map((permission) => (
                              <Card key={permission.id} className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="font-medium text-sm">{permission.name}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {permission.description}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge variant="outline" className="text-xs">
                                        {permission.action}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs">
                                        {permission.id}
                                      </Badge>
                                    </div>
                                    {permission.createdAt && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Created: {new Date(permission.createdAt).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                  {(hasPermission("permissions:edit") || hasPermission("permissions:delete")) && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {hasPermission("permissions:edit") && (
                                          <DropdownMenuItem onClick={() => openEditPermission(permission)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit Permission
                                          </DropdownMenuItem>
                                        )}
                                        {hasPermission("permissions:delete") && (
                                          <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                              <DropdownMenuItem
                                                className="text-red-600"
                                                onSelect={(e) => e.preventDefault()}
                                              >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete Permission
                                              </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle className="text-red-600">Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  This action cannot be undone. This will permanently delete the permission and remove it from all roles.
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                  className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                                                  onClick={() => handleDeletePermission(permission.id)}>
                                                  Delete Permission
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        )}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                          <Separator className="mt-3" />
                        </div>
                      );
                    })}
                </div>
                {Object.keys(permissionsByModule).length === 0 && (
                  <div className="text-center py-8">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Permissions Found</h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? 'No permissions match your search criteria.' : 'No permissions are currently configured.'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs Tab */}
          <TabsContent value="activity" className="space-y-2">
            <ActivityLogsTable
              showUserInfo={true}
              isUserView={false}
              title="All User Activity Logs"
              description="Monitor all user activities across the system"
            />
          </TabsContent>
        </Tabs>

        {/* Edit User Dialog */}
        <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editUsername">Username</Label>
                  <Input
                    id="editUsername"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="editFullName">Full Name</Label>
                <Input
                  id="editFullName"
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editMobile">Mobile</Label>
                  <Input
                    id="editMobile"
                    value={userForm.mobile}
                    onChange={(e) => setUserForm({ ...userForm, mobile: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="editRole">Role</Label>
                  <Select
                    value={userForm.roleId.toString()}
                    onValueChange={(value) => setUserForm({ ...userForm, roleId: parseInt(value) })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name} - {role.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* <div>
                <Label htmlFor="editStatus">Status</Label>
                <Select
                  value={userForm.status}
                  onValueChange={(value) => setUserForm({ ...userForm, status: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update User
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditRole} className="space-y-4">
              <div>
                <Label htmlFor="editRoleName">Role Name</Label>
                <Input
                  id="editRoleName"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="editRoleDescription">Description</Label>
                <Textarea
                  id="editRoleDescription"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Role
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Role Permissions Dialog */}
        <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
          <DialogContent className="max-w-5xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                Manage Permissions for {selectedRole?.name}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {Object.entries(permissionsByModule).map(([module, modulePermissions]) => (
                  <div key={module}>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      {module}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      {modulePermissions.map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-center space-x-2 p-2 border rounded-lg"
                        >
                          <Checkbox
                            id={permission.id}
                            checked={rolePermissions.includes(permission.id)}
                            onCheckedChange={() => togglePermission(permission.id)}
                          />
                          <div className="flex-1">
                            <Label htmlFor={permission.id} className="text-sm font-medium">
                              {permission.name}
                            </Label>
                            <div className="text-xs text-muted-foreground">
                              {permission.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsPermissionsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdatePermissions} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Permissions
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <p className="text-sm text-muted-foreground">
                Reset password for user: <strong>{resetPasswordUser?.username}</strong>
              </p>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="resetNewPassword">New Password</Label>
                <Input
                  id="resetNewPassword"
                  type="password"
                  value={resetPasswordForm.newPassword}
                  onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, newPassword: e.target.value })}
                  required
                  disabled={isSubmitting}
                  placeholder="Enter new password (min 6 characters)"
                  className={resetPasswordForm.newPassword.length > 0 && resetPasswordForm.newPassword.length < 6 ? "border-red-500" : ""}
                />
                {resetPasswordForm.newPassword.length > 0 && resetPasswordForm.newPassword.length < 6 && (
                  <p className="text-xs text-red-600 mt-1">Password must be at least 6 characters long</p>
                )}
              </div>
              <div>
                <Label htmlFor="resetConfirmPassword">Confirm New Password</Label>
                <Input
                  id="resetConfirmPassword"
                  type="password"
                  value={resetPasswordForm.confirmPassword}
                  onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
                  required
                  disabled={isSubmitting}
                  placeholder="Confirm new password"
                  className={
                    resetPasswordForm.confirmPassword.length > 0 &&
                      resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword
                      ? "border-red-500" : ""
                  }
                />
                {resetPasswordForm.confirmPassword.length > 0 && resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword && (
                  <p className="text-xs text-red-600 mt-1">Passwords do not match</p>
                )}
                {resetPasswordForm.confirmPassword.length > 0 && resetPasswordForm.newPassword === resetPasswordForm.confirmPassword && resetPasswordForm.newPassword.length >= 6 && (
                  <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>
                )}
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-sm text-orange-800">
                  <strong>Admin Action:</strong> As an administrator, you can reset this user's password without requiring their current password.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Key className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Permission Dialog */}
        <Dialog open={isEditPermissionOpen} onOpenChange={setIsEditPermissionOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Permission</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditPermission} className="space-y-4">
              <div>
                <Label htmlFor="editPermissionId">Permission ID</Label>
                <Input
                  id="editPermissionId"
                  value={permissionForm.id}
                  disabled
                  className="bg-gray-50"
                />
                <p className="text-xs text-muted-foreground mt-1">Permission ID cannot be changed</p>
              </div>
              <div>
                <Label htmlFor="editPermissionName">Permission Name</Label>
                <Input
                  id="editPermissionName"
                  value={permissionForm.name}
                  onChange={(e) => setPermissionForm({ ...permissionForm, name: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="editPermissionDescription">Description</Label>
                <Textarea
                  id="editPermissionDescription"
                  value={permissionForm.description}
                  onChange={(e) => setPermissionForm({ ...permissionForm, description: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editPermissionModule">Module</Label>
                  <Input
                    id="editPermissionModule"
                    value={permissionForm.module}
                    onChange={(e) => setPermissionForm({ ...permissionForm, module: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <Label htmlFor="editPermissionAction">Action</Label>
                  <Select
                    value={permissionForm.action}
                    onValueChange={(value) => setPermissionForm({ ...permissionForm, action: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="view">View</SelectItem>
                      <SelectItem value="edit">Edit</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                      <SelectItem value="manage">Manage</SelectItem>
                      <SelectItem value="approve">Approve</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Permission
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* User Activity Logs Dialog */}
        <Dialog open={isActivityLogsOpen} onOpenChange={setIsActivityLogsOpen}>
          <DialogContent className="max-w-7xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity Logs for {selectedUser?.fullName || selectedUser?.username}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[75vh] overflow-y-auto">
              {selectedUser && (
                <ActivityLogsTable
                  userId={selectedUser.id}
                  showUserInfo={false}
                  isUserView={false}
                  title={`Activity for ${selectedUser.fullName || selectedUser.username}`}
                  description={`All activities performed by ${selectedUser.fullName || selectedUser.username}`}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ERPLayout>
  )
}
