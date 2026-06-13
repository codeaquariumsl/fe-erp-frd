// Permission definitions for the ERP system
export interface Permission {
  id: string
  name: string
  description: string
  module: string
  action: string
}

export interface RolePermission {
  id: number
  roleId: number
  permissionId: string
  createdAt: string
}

// Define all system permissions based on actual backend API
export const PERMISSIONS: Record<string, Permission> = {
  // Dashboard
  'dashboard:view': {
    id: 'dashboard:view',
    name: 'View Dashboard',
    description: 'Access to main dashboard',
    module: 'Dashboard',
    action: 'view'
  },

  // Category Management
  'categories:view': {
    id: 'categories:view',
    name: 'View Categories',
    description: 'View product categories',
    module: 'Category Management',
    action: 'view'
  },
  'categories:create': {
    id: 'categories:create',
    name: 'Create Categories',
    description: 'Create new product categories',
    module: 'Category Management',
    action: 'create'
  },
  'categories:edit': {
    id: 'categories:edit',
    name: 'Edit Categories',
    description: 'Modify product categories',
    module: 'Category Management',
    action: 'edit'
  },
  'categories:delete': {
    id: 'categories:delete',
    name: 'Delete Categories',
    description: 'Remove product categories',
    module: 'Category Management',
    action: 'delete'
  },

  // Cold Room Management
  'cold-rooms:view': {
    id: 'cold-rooms:view',
    name: 'View Cold Rooms',
    description: 'View cold room information',
    module: 'Cold Room Management',
    action: 'view'
  },
  'cold-rooms:manage': {
    id: 'cold-rooms:manage',
    name: 'Manage Cold Rooms',
    description: 'Manage cold room operations',
    module: 'Cold Room Management',
    action: 'manage'
  },

  // Customer Management
  'customers:view': {
    id: 'customers:view',
    name: 'View Customers',
    description: 'View customer information',
    module: 'Customer Management',
    action: 'view'
  },
  'customers:create': {
    id: 'customers:create',
    name: 'Create Customers',
    description: 'Add new customers',
    module: 'Customer Management',
    action: 'create'
  },
  'customers:edit': {
    id: 'customers:edit',
    name: 'Edit Customers',
    description: 'Modify customer information',
    module: 'Customer Management',
    action: 'edit'
  },
  'customers:delete': {
    id: 'customers:delete',
    name: 'Delete Customers',
    description: 'Remove customers',
    module: 'Customer Management',
    action: 'delete'
  },

  // Delivery Orders
  'delivery-orders:view': {
    id: 'delivery-orders:view',
    name: 'View Delivery Orders',
    description: 'View delivery orders',
    module: 'Delivery Orders',
    action: 'view'
  },
  'delivery-orders:create': {
    id: 'delivery-orders:create',
    name: 'Create Delivery Orders',
    description: 'Create new delivery orders',
    module: 'Delivery Orders',
    action: 'create'
  },
  'delivery-orders:edit': {
    id: 'delivery-orders:edit',
    name: 'Edit Delivery Orders',
    description: 'Modify delivery orders',
    module: 'Delivery Orders',
    action: 'edit'
  },
  'delivery-orders:delete': {
    id: 'delivery-orders:delete',
    name: 'Delete Delivery Orders',
    description: 'Remove delivery orders',
    module: 'Delivery Orders',
    action: 'delete'
  },

  // Driver Management
  'drivers:view': {
    id: 'drivers:view',
    name: 'View Drivers',
    description: 'View driver information',
    module: 'Driver Management',
    action: 'view'
  },
  'drivers:create': {
    id: 'drivers:create',
    name: 'Create Drivers',
    description: 'Add new drivers',
    module: 'Driver Management',
    action: 'create'
  },
  'drivers:edit': {
    id: 'drivers:edit',
    name: 'Edit Drivers',
    description: 'Modify driver information',
    module: 'Driver Management',
    action: 'edit'
  },
  'drivers:delete': {
    id: 'drivers:delete',
    name: 'Delete Drivers',
    description: 'Remove drivers',
    module: 'Driver Management',
    action: 'delete'
  },

  // GRN Management
  'grn:view': {
    id: 'grn:view',
    name: 'View GRN',
    description: 'View goods receipt notes',
    module: 'GRN Management',
    action: 'view'
  },
  'grn:create': {
    id: 'grn:create',
    name: 'Create GRN',
    description: 'Create new goods receipt notes',
    module: 'GRN Management',
    action: 'create'
  },
  'grn:edit': {
    id: 'grn:edit',
    name: 'Edit GRN',
    description: 'Modify goods receipt notes',
    module: 'GRN Management',
    action: 'edit'
  },
  'grn:delete': {
    id: 'grn:delete',
    name: 'Delete GRN',
    description: 'Remove goods receipt notes',
    module: 'GRN Management',
    action: 'delete'
  },

  // Inventory Management
  'inventory:view': {
    id: 'inventory:view',
    name: 'View Inventory',
    description: 'View inventory items and stock levels',
    module: 'Inventory Management',
    action: 'view'
  },
  'inventory:create': {
    id: 'inventory:create',
    name: 'Create Inventory',
    description: 'Add new inventory items',
    module: 'Inventory Management',
    action: 'create'
  },
  'inventory:edit': {
    id: 'inventory:edit',
    name: 'Edit Inventory',
    description: 'Modify inventory items and stock',
    module: 'Inventory Management',
    action: 'edit'
  },
  'inventory:delete': {
    id: 'inventory:delete',
    name: 'Delete Inventory',
    description: 'Remove inventory items',
    module: 'Inventory Management',
    action: 'delete'
  },

  // Invoice Management
  'invoices:view': {
    id: 'invoices:view',
    name: 'View Invoices',
    description: 'View invoices',
    module: 'Invoice Management',
    action: 'view'
  },
  'invoices:create': {
    id: 'invoices:create',
    name: 'Create Invoices',
    description: 'Create new invoices',
    module: 'Invoice Management',
    action: 'create'
  },
  'invoices:edit': {
    id: 'invoices:edit',
    name: 'Edit Invoices',
    description: 'Modify invoices',
    module: 'Invoice Management',
    action: 'edit'
  },
  'invoices:delete': {
    id: 'invoices:delete',
    name: 'Delete Invoices',
    description: 'Remove invoices',
    module: 'Invoice Management',
    action: 'delete'
  },

  // Purchase Orders
  'purchase-orders:view': {
    id: 'purchase-orders:view',
    name: 'View Purchase Orders',
    description: 'View purchase orders',
    module: 'Purchase Orders',
    action: 'view'
  },
  'purchase-orders:create': {
    id: 'purchase-orders:create',
    name: 'Create Purchase Orders',
    description: 'Create new purchase orders',
    module: 'Purchase Orders',
    action: 'create'
  },
  'purchase-orders:edit': {
    id: 'purchase-orders:edit',
    name: 'Edit Purchase Orders',
    description: 'Modify purchase orders',
    module: 'Purchase Orders',
    action: 'edit'
  },
  'purchase-orders:delete': {
    id: 'purchase-orders:delete',
    name: 'Delete Purchase Orders',
    description: 'Remove purchase orders',
    module: 'Purchase Orders',
    action: 'delete'
  },
  'purchase-orders:approve': {
    id: 'purchase-orders:approve',
    name: 'Approve Purchase Orders',
    description: 'Approve purchase orders',
    module: 'Purchase Orders',
    action: 'approve'
  },

  // Reports
  'reports:view': {
    id: 'reports:view',
    name: 'View Reports',
    description: 'Access to various reports',
    module: 'Reports',
    action: 'view'
  },
  'reports:export': {
    id: 'reports:export',
    name: 'Export Reports',
    description: 'Export reports to various formats',
    module: 'Reports',
    action: 'export'
  },

  // Role Management
  'roles:view': {
    id: 'roles:view',
    name: 'View Roles',
    description: 'View user roles and permissions',
    module: 'Role Management',
    action: 'view'
  },
  'roles:create': {
    id: 'roles:create',
    name: 'Create Roles',
    description: 'Create new user roles',
    module: 'Role Management',
    action: 'create'
  },
  'roles:edit': {
    id: 'roles:edit',
    name: 'Edit Roles',
    description: 'Modify user roles and permissions',
    module: 'Role Management',
    action: 'edit'
  },
  'roles:delete': {
    id: 'roles:delete',
    name: 'Delete Roles',
    description: 'Remove user roles',
    module: 'Role Management',
    action: 'delete'
  },
  'roles:assign-permissions': {
    id: 'roles:assign-permissions',
    name: 'Assign Permissions',
    description: 'Assign permissions to roles',
    module: 'Role Management',
    action: 'assign-permissions'
  },

  // Sales Orders
  'sales-orders:view': {
    id: 'sales-orders:view',
    name: 'View Sales Orders',
    description: 'View sales orders',
    module: 'Sales Orders',
    action: 'view'
  },
  'sales-orders:create': {
    id: 'sales-orders:create',
    name: 'Create Sales Orders',
    description: 'Create new sales orders',
    module: 'Sales Orders',
    action: 'create'
  },
  'sales-orders:edit': {
    id: 'sales-orders:edit',
    name: 'Edit Sales Orders',
    description: 'Modify sales orders',
    module: 'Sales Orders',
    action: 'edit'
  },
  'sales-orders:delete': {
    id: 'sales-orders:delete',
    name: 'Delete Sales Orders',
    description: 'Remove sales orders',
    module: 'Sales Orders',
    action: 'delete'
  },
  'sales-orders:approve': {
    id: 'sales-orders:approve',
    name: 'Approve Sales Orders',
    description: 'Approve sales orders',
    module: 'Sales Orders',
    action: 'approve'
  },

  // Stock Management
  'stock:view': {
    id: 'stock:view',
    name: 'View Stock',
    description: 'View stock levels and movements',
    module: 'Stock Management',
    action: 'view'
  },
  'stock:edit': {
    id: 'stock:edit',
    name: 'Edit Stock',
    description: 'Modify stock levels',
    module: 'Stock Management',
    action: 'edit'
  },
  'stock:transfer': {
    id: 'stock:transfer',
    name: 'Transfer Stock',
    description: 'Transfer stock between locations',
    module: 'Stock Management',
    action: 'transfer'
  },

  // Supplier Management
  'suppliers:view': {
    id: 'suppliers:view',
    name: 'View Suppliers',
    description: 'View supplier information',
    module: 'Supplier Management',
    action: 'view'
  },
  'suppliers:create': {
    id: 'suppliers:create',
    name: 'Create Suppliers',
    description: 'Add new suppliers',
    module: 'Supplier Management',
    action: 'create'
  },
  'suppliers:edit': {
    id: 'suppliers:edit',
    name: 'Edit Suppliers',
    description: 'Modify supplier information',
    module: 'Supplier Management',
    action: 'edit'
  },
  'suppliers:delete': {
    id: 'suppliers:delete',
    name: 'Delete Suppliers',
    description: 'Remove suppliers',
    module: 'Supplier Management',
    action: 'delete'
  },

  // User Management
  'users:view': {
    id: 'users:view',
    name: 'View Users',
    description: 'View user accounts and profiles',
    module: 'User Management',
    action: 'view'
  },
  'users:create': {
    id: 'users:create',
    name: 'Create Users',
    description: 'Create new user accounts',
    module: 'User Management',
    action: 'create'
  },
  'users:edit': {
    id: 'users:edit',
    name: 'Edit Users',
    description: 'Modify user accounts and profiles',
    module: 'User Management',
    action: 'edit'
  },
  'users:delete': {
    id: 'users:delete',
    name: 'Delete Users',
    description: 'Remove user accounts',
    module: 'User Management',
    action: 'delete'
  },

  // Vehicle Management
  'vehicles:view': {
    id: 'vehicles:view',
    name: 'View Vehicles',
    description: 'View vehicle information',
    module: 'Vehicle Management',
    action: 'view'
  },
  'vehicles:create': {
    id: 'vehicles:create',
    name: 'Create Vehicles',
    description: 'Add new vehicles',
    module: 'Vehicle Management',
    action: 'create'
  },
  'vehicles:edit': {
    id: 'vehicles:edit',
    name: 'Edit Vehicles',
    description: 'Modify vehicle information',
    module: 'Vehicle Management',
    action: 'edit'
  },
  'vehicles:delete': {
    id: 'vehicles:delete',
    name: 'Delete Vehicles',
    description: 'Remove vehicles',
    module: 'Vehicle Management',
    action: 'delete'
  },

  // Warehouse Management
  'warehouse:view': {
    id: 'warehouse:view',
    name: 'View Warehouse',
    description: 'View warehouse information and locations',
    module: 'Warehouse Management',
    action: 'view'
  },
  'warehouse:manage': {
    id: 'warehouse:manage',
    name: 'Manage Warehouse',
    description: 'Manage warehouse operations',
    module: 'Warehouse Management',
    action: 'manage'
  },

  // Dispatched Orders
  'dispatched-orders:view': {
    id: 'dispatched-orders:view',
    name: 'View Dispatched Orders',
    description: 'View Dispatched Orders information',
    module: 'Dispatched Orders',
    action: 'view'
  },

  // Batch Schedule
  'batch-schedule:view': {
    id: 'batch-schedule:view',
    name: 'View Batch Schedule',
    description: 'Schedule items for batch processing',
    module: 'Batch Schedule',
    action: 'view'
  },

  // Routes Management
  'routes:view': {
    id: 'routes:view',
    name: 'View Routes',
    description: 'View all routes',
    module: 'Routes Management',
    action: 'view'
  },

  'gin:view': {
    id: 'gin:view',
    name: 'View Gin',
    description: 'View all gin',
    module: 'Gin Management',
    action: 'view'
  }
}

// Get permissions by module
export function getPermissionsByModule(): Record<string, Permission[]> {
  const modules: Record<string, Permission[]> = {}

  Object.values(PERMISSIONS).forEach((permission) => {
    if (!modules[permission.module]) {
      modules[permission.module] = []
    }
    modules[permission.module].push(permission)
  })

  return modules
}

// Get all permission IDs
export function getAllPermissionIds(): string[] {
  return Object.keys(PERMISSIONS)
}

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS = {
  admin: getAllPermissionIds(),
  manager: [
    'dashboard:view',
    'inventory:view', 'inventory:create', 'inventory:edit',
    'cold-storage:view', 'cold-storage:manage',
    'purchase-orders:view', 'purchase-orders:create', 'purchase-orders:edit', 'purchase-orders:approve',
    'grn:view', 'grn:create', 'grn:edit',
    'customers:view', 'customers:create', 'customers:edit',
    'sales:view', 'sales:create', 'sales:edit',
    'delivery:view', 'delivery:create', 'delivery:edit', 'delivery:track',
    'invoices:view', 'invoices:create', 'invoices:edit',
    'reports:view', 'reports:export',
    'master-data:view', 'master-data:create', 'master-data:edit',
    'users:view',
    'roles:view',
  ],
  user: [
    'dashboard:view'
  ],
}
