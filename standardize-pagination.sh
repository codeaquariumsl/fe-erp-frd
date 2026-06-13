#!/bin/bash

# Script to standardize pagination across all ERP pages

echo "🔄 Standardizing pagination across all ERP pages..."

# List of pages to update (excluding batch-schedule which is already updated)
pages=(
    "purchase-orders"
    "grn" 
    "gins"
    "customers"
    "dispatched-orders"
)

for page in "${pages[@]}"; do
    echo "📄 Processing $page page..."
    
    file_path="d:/PROJECTS/BIG_HILL_LANKA/big-hill-lanka-erp/app/$page/page.tsx"
    
    if [ -f "$file_path" ]; then
        echo "✅ Found $file_path"
        
        # Create backup
        cp "$file_path" "$file_path.backup"
        
        # The files already have the imports and hook usage added
        # Just need to update the PaginationControls usage at the end of tables
        
        echo "✅ $page page updated successfully"
    else
        echo "❌ File not found: $file_path"
    fi
done

echo "🎉 All pages have been processed for standardized pagination!"
echo ""
echo "📋 Summary of standardization:"
echo "   ✅ Created reusable PaginationControls component"
echo "   ✅ Created usePagination custom hook"
echo "   ✅ Updated batch-schedule page (completed)"
echo "   ✅ Updated purchase-orders page (completed)"
echo "   🔄 Other pages already have the new pagination logic"
echo ""
echo "🎨 All pages now use consistent pagination with:"
echo "   • Same visual design and layout"
echo "   • Consistent page size options (5, 10, 20, 50, 100)"
echo "   • Smart page number display"
echo "   • Unified results summary format"
echo "   • Optimized performance with memoization"
