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
  },

  // Item Management
  'items:view': { id: 'items:view', name: 'View Items', description: 'View items list', module: 'Item Management', action: 'view' },
  'items:create': { id: 'items:create', name: 'Create Items', description: 'Create new items', module: 'Item Management', action: 'create' },
  'items:edit': { id: 'items:edit', name: 'Edit Items', description: 'Modify items', module: 'Item Management', action: 'edit' },
  'items:delete': { id: 'items:delete', name: 'Delete Items', description: 'Remove items', module: 'Item Management', action: 'delete' },

  // Batch Management
  'batches:view': { id: 'batches:view', name: 'View Batches', description: 'View batches', module: 'Batch Management', action: 'view' },
  'batches:create': { id: 'batches:create', name: 'Create Batches', description: 'Create new batches', module: 'Batch Management', action: 'create' },
  'batches:edit': { id: 'batches:edit', name: 'Edit Batches', description: 'Modify batches', module: 'Batch Management', action: 'edit' },
  'batches:delete': { id: 'batches:delete', name: 'Delete Batches', description: 'Remove batches', module: 'Batch Management', action: 'delete' },

  // Supplier Returns
  'supplier-returns:view': { id: 'supplier-returns:view', name: 'View Supplier Returns', description: 'View supplier returns', module: 'Supplier Returns', action: 'view' },
  'supplier-returns:create': { id: 'supplier-returns:create', name: 'Create Supplier Returns', description: 'Create supplier returns', module: 'Supplier Returns', action: 'create' },
  'supplier-returns:edit': { id: 'supplier-returns:edit', name: 'Edit Supplier Returns', description: 'Modify supplier returns', module: 'Supplier Returns', action: 'edit' },
  'supplier-returns:delete': { id: 'supplier-returns:delete', name: 'Delete Supplier Returns', description: 'Remove supplier returns', module: 'Supplier Returns', action: 'delete' },

  // Supplier Payments
  'supplier-payments:view': { id: 'supplier-payments:view', name: 'View Supplier Payments', description: 'View supplier payments', module: 'Supplier Payments', action: 'view' },
  'supplier-payments:create': { id: 'supplier-payments:create', name: 'Create Supplier Payments', description: 'Create supplier payments', module: 'Supplier Payments', action: 'create' },
  'supplier-payments:edit': { id: 'supplier-payments:edit', name: 'Edit Supplier Payments', description: 'Modify supplier payments', module: 'Supplier Payments', action: 'edit' },
  'supplier-payments:delete': { id: 'supplier-payments:delete', name: 'Delete Supplier Payments', description: 'Remove supplier payments', module: 'Supplier Payments', action: 'delete' },

  // Good Request Notes
  'good-request-notes:view': { id: 'good-request-notes:view', name: 'View Good Request Notes', description: 'View good request notes', module: 'Stock & Inventory', action: 'view' },
  'good-request-notes:create': { id: 'good-request-notes:create', name: 'Create Good Request Notes', description: 'Create good request notes', module: 'Stock & Inventory', action: 'create' },
  'good-request-notes:edit': { id: 'good-request-notes:edit', name: 'Edit Good Request Notes', description: 'Modify good request notes', module: 'Stock & Inventory', action: 'edit' },
  'good-request-notes:delete': { id: 'good-request-notes:delete', name: 'Delete Good Request Notes', description: 'Remove good request notes', module: 'Stock & Inventory', action: 'delete' },

  // Issue Notes
  'issue-notes:view': { id: 'issue-notes:view', name: 'View Issue Notes', description: 'View issue notes', module: 'Stock & Inventory', action: 'view' },
  'issue-notes:create': { id: 'issue-notes:create', name: 'Create Issue Notes', description: 'Create issue notes', module: 'Stock & Inventory', action: 'create' },
  'issue-notes:edit': { id: 'issue-notes:edit', name: 'Edit Issue Notes', description: 'Modify issue notes', module: 'Stock & Inventory', action: 'edit' },
  'issue-notes:delete': { id: 'issue-notes:delete', name: 'Delete Issue Notes', description: 'Remove issue notes', module: 'Stock & Inventory', action: 'delete' },

  // Transfer In Notes
  'transfer-in-notes:view': { id: 'transfer-in-notes:view', name: 'View Transfer In Notes', description: 'View transfer in notes', module: 'Stock & Inventory', action: 'view' },
  'transfer-in-notes:create': { id: 'transfer-in-notes:create', name: 'Create Transfer In Notes', description: 'Create transfer in notes', module: 'Stock & Inventory', action: 'create' },
  'transfer-in-notes:edit': { id: 'transfer-in-notes:edit', name: 'Edit Transfer In Notes', description: 'Modify transfer in notes', module: 'Stock & Inventory', action: 'edit' },
  'transfer-in-notes:delete': { id: 'transfer-in-notes:delete', name: 'Delete Transfer In Notes', description: 'Remove transfer in notes', module: 'Stock & Inventory', action: 'delete' },

  // Stock Adjustment
  'stock-adjustment:view': { id: 'stock-adjustment:view', name: 'View Stock Adjustments', description: 'View stock adjustments', module: 'Stock & Inventory', action: 'view' },
  'stock-adjustment:create': { id: 'stock-adjustment:create', name: 'Create Stock Adjustments', description: 'Create stock adjustments', module: 'Stock & Inventory', action: 'create' },
  'stock-adjustment:edit': { id: 'stock-adjustment:edit', name: 'Edit Stock Adjustments', description: 'Modify stock adjustments', module: 'Stock & Inventory', action: 'edit' },
  'stock-adjustment:delete': { id: 'stock-adjustment:delete', name: 'Delete Stock Adjustments', description: 'Remove stock adjustments', module: 'Stock & Inventory', action: 'delete' },

  // Stock Reconciliation
  'stock-reconciliation:view': { id: 'stock-reconciliation:view', name: 'View Stock Reconciliations', description: 'View stock reconciliations', module: 'Stock & Inventory', action: 'view' },
  'stock-reconciliation:create': { id: 'stock-reconciliation:create', name: 'Create Stock Reconciliations', description: 'Create stock reconciliations', module: 'Stock & Inventory', action: 'create' },
  'stock-reconciliation:edit': { id: 'stock-reconciliation:edit', name: 'Edit Stock Reconciliations', description: 'Modify stock reconciliations', module: 'Stock & Inventory', action: 'edit' },
  'stock-reconciliation:delete': { id: 'stock-reconciliation:delete', name: 'Delete Stock Reconciliations', description: 'Remove stock reconciliations', module: 'Stock & Inventory', action: 'delete' },

  // Receipts Management
  'receipts:view': { id: 'receipts:view', name: 'View Receipts', description: 'View receipts', module: 'Receipt Management', action: 'view' },
  'receipts:create': { id: 'receipts:create', name: 'Create Receipts', description: 'Create new receipts', module: 'Receipt Management', action: 'create' },
  'receipts:edit': { id: 'receipts:edit', name: 'Edit Receipts', description: 'Modify receipts', module: 'Receipt Management', action: 'edit' },
  'receipts:delete': { id: 'receipts:delete', name: 'Delete Receipts', description: 'Remove receipts', module: 'Receipt Management', action: 'delete' },

  // Credit Notes
  'credit-notes:view': { id: 'credit-notes:view', name: 'View Credit Notes', description: 'View credit notes', module: 'Credit Notes', action: 'view' },
  'credit-notes:create': { id: 'credit-notes:create', name: 'Create Credit Notes', description: 'Create new credit notes', module: 'Credit Notes', action: 'create' },
  'credit-notes:edit': { id: 'credit-notes:edit', name: 'Edit Credit Notes', description: 'Modify credit notes', module: 'Credit Notes', action: 'edit' },
  'credit-notes:delete': { id: 'credit-notes:delete', name: 'Delete Credit Notes', description: 'Remove credit notes', module: 'Credit Notes', action: 'delete' },

  // Customer Returns
  'customer-returns:view': { id: 'customer-returns:view', name: 'View Customer Returns', description: 'View customer returns', module: 'Customer Returns', action: 'view' },
  'customer-returns:create': { id: 'customer-returns:create', name: 'Create Customer Returns', description: 'Create new customer returns', module: 'Customer Returns', action: 'create' },
  'customer-returns:edit': { id: 'customer-returns:edit', name: 'Edit Customer Returns', description: 'Modify customer returns', module: 'Customer Returns', action: 'edit' },
  'customer-returns:delete': { id: 'customer-returns:delete', name: 'Delete Customer Returns', description: 'Remove customer returns', module: 'Customer Returns', action: 'delete' },

  // Customer Item Codes
  'customer-item-codes:view': { id: 'customer-item-codes:view', name: 'View Customer Item Codes', description: 'View customer item codes', module: 'Customer Item Codes', action: 'view' },
  'customer-item-codes:create': { id: 'customer-item-codes:create', name: 'Create Customer Item Codes', description: 'Create new customer item codes', module: 'Customer Item Codes', action: 'create' },
  'customer-item-codes:edit': { id: 'customer-item-codes:edit', name: 'Edit Customer Item Codes', description: 'Modify customer item codes', module: 'Customer Item Codes', action: 'edit' },
  'customer-item-codes:delete': { id: 'customer-item-codes:delete', name: 'Delete Customer Item Codes', description: 'Remove customer item codes', module: 'Customer Item Codes', action: 'delete' },

  // Finance & Accounting
  'accounting:view': { id: 'accounting:view', name: 'View Accounting & Finance', description: 'View financial entries and accounts', module: 'Accounting & Finance', action: 'view' },
  'accounting:manage': { id: 'accounting:manage', name: 'Manage Accounting & Finance', description: 'Manage accounting transactions and posting rules', module: 'Accounting & Finance', action: 'manage' },

  // Bank Deposits
  'bank-deposits:view': { id: 'bank-deposits:view', name: 'View Bank Deposits', description: 'View bank deposits', module: 'Bank Deposits', action: 'view' },
  'bank-deposits:create': { id: 'bank-deposits:create', name: 'Create Bank Deposits', description: 'Create new bank deposits', module: 'Bank Deposits', action: 'create' },
  'bank-deposits:edit': { id: 'bank-deposits:edit', name: 'Edit Bank Deposits', description: 'Modify bank deposits', module: 'Bank Deposits', action: 'edit' },
  'bank-deposits:delete': { id: 'bank-deposits:delete', name: 'Delete Bank Deposits', description: 'Remove bank deposits', module: 'Bank Deposits', action: 'delete' },

  // Reports - Stock & Inventory
  'reports-stock-inventory:view': { id: 'reports-stock-inventory:view', name: 'View Stock Inventory Reports Header', description: 'View stock inventory reports section', module: 'Reports - Stock & Inventory', action: 'view' },
  'reports-stock-reports:view': { id: 'reports-stock-reports:view', name: 'View Stock Reports', description: 'View detailed stock reports', module: 'Reports - Stock & Inventory', action: 'view' },
  'reports-stock-movements:view': { id: 'reports-stock-movements:view', name: 'View Stock Movements', description: 'View stock movements report', module: 'Reports - Stock & Inventory', action: 'view' },
  'reports-stock-enhanced-movements:view': { id: 'reports-stock-enhanced-movements:view', name: 'View Enhanced Movements', description: 'View enhanced stock movements report', module: 'Reports - Stock & Inventory', action: 'view' },
  'reports-stock-gin-reports:view': { id: 'reports-stock-gin-reports:view', name: 'View GIN Reports', description: 'View goods issue note reports', module: 'Reports - Stock & Inventory', action: 'view' },
  'reports-stock-inventory-valuation:view': { id: 'reports-stock-inventory-valuation:view', name: 'View Inventory Valuation', description: 'View inventory valuation report', module: 'Reports - Stock & Inventory', action: 'view' },

  // Reports - Sales & Distribution
  'reports-sales-distribution:view': { id: 'reports-sales-distribution:view', name: 'View Sales & Distribution Reports Header', description: 'View sales & distribution reports section', module: 'Reports - Sales & Distribution', action: 'view' },
  'reports-sales-general:view': { id: 'reports-sales-general:view', name: 'View General Sales Report', description: 'View general sales summary report', module: 'Reports - Sales & Distribution', action: 'view' },
  'reports-sales-item-wise:view': { id: 'reports-sales-item-wise:view', name: 'View Item-wise Sales Report', description: 'View item-wise sales report', module: 'Reports - Sales & Distribution', action: 'view' },
  'reports-sales-by-item:view': { id: 'reports-sales-by-item:view', name: 'View Sales by Item', description: 'View sales breakdown by item', module: 'Reports - Sales & Distribution', action: 'view' },
  'reports-sales-by-customer:view': { id: 'reports-sales-by-customer:view', name: 'View Sales by Customer', description: 'View sales breakdown by customer', module: 'Reports - Sales & Distribution', action: 'view' },
  'reports-sales-customer-item:view': { id: 'reports-sales-customer-item:view', name: 'View Customer Item Sales', description: 'View customer item report', module: 'Reports - Sales & Distribution', action: 'view' },
  'reports-sales-rep-wise:view': { id: 'reports-sales-rep-wise:view', name: 'View Rep-wise Sales', description: 'View sales representative report', module: 'Reports - Sales & Distribution', action: 'view' },

  // Reports - Procurement & Purchasing
  'reports-procurement-purchasing:view': { id: 'reports-procurement-purchasing:view', name: 'View Procurement & Purchasing Header', description: 'View procurement reports section', module: 'Reports - Procurement & Purchasing', action: 'view' },
  'reports-purchasing-grn-reports:view': { id: 'reports-purchasing-grn-reports:view', name: 'View Purchasing GRN Reports', description: 'View purchasing GRN report', module: 'Reports - Procurement & Purchasing', action: 'view' },
  'reports-purchasing-item-wise:view': { id: 'reports-purchasing-item-wise:view', name: 'View Item-wise Purchasing', description: 'View item-wise purchasing report', module: 'Reports - Procurement & Purchasing', action: 'view' },
  'reports-purchasing-supplier-wise:view': { id: 'reports-purchasing-supplier-wise:view', name: 'View Supplier-wise PO Reports', description: 'View supplier-wise purchase order report', module: 'Reports - Procurement & Purchasing', action: 'view' },

  // Reports - Finance & Commission
  'reports-finance-commission:view': { id: 'reports-finance-commission:view', name: 'View Finance & Commission Header', description: 'View finance & commission section', module: 'Reports - Finance & Commission', action: 'view' },
  'reports-expenses:view': { id: 'reports-expenses:view', name: 'View Expenses Report', description: 'View expenses report', module: 'Reports - Finance & Commission', action: 'view' },
  'reports-salesperson-commission:view': { id: 'reports-salesperson-commission:view', name: 'View Salesperson Commission', description: 'View salesperson commission report', module: 'Reports - Finance & Commission', action: 'view' },

  // System Configuration - Units
  'units:view': { id: 'units:view', name: 'View Units', description: 'View measurement units', module: 'System Configuration', action: 'view' },
  'units:create': { id: 'units:create', name: 'Create Units', description: 'Create measurement units', module: 'System Configuration', action: 'create' },
  'units:edit': { id: 'units:edit', name: 'Edit Units', description: 'Modify measurement units', module: 'System Configuration', action: 'edit' },
  'units:delete': { id: 'units:delete', name: 'Delete Units', description: 'Remove measurement units', module: 'System Configuration', action: 'delete' },

  // System Configuration - Return Types
  'return-types:view': { id: 'return-types:view', name: 'View Return Types', description: 'View return types', module: 'System Configuration', action: 'view' },
  'return-types:create': { id: 'return-types:create', name: 'Create Return Types', description: 'Create return types', module: 'System Configuration', action: 'create' },
  'return-types:edit': { id: 'return-types:edit', name: 'Edit Return Types', description: 'Modify return types', module: 'System Configuration', action: 'edit' },
  'return-types:delete': { id: 'return-types:delete', name: 'Delete Return Types', description: 'Remove return types', module: 'System Configuration', action: 'delete' }
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
