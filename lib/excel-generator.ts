import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export const generateBincardExcel = (data: {
    itemName: string;
    location: string;
    startDate: string;
    endDate: string;
    data: Array<{
        date: string;
        refNo: string;
        description: string;
        inQty: number;
        outQty: number;
        balance: number;
    }>;
}) => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Prepare data for Excel
    const wsData: any[][] = [
        ['BINCARD REPORT'],
        [],
        ['Item Name:', data.itemName],
        ['Location:', data.location],
        ['Period:', `${format(new Date(data.startDate), 'yyyy-MM-dd')} to ${format(new Date(data.endDate), 'yyyy-MM-dd')}`],
        [],
        ['Date', 'Reference No', 'Description', 'IN Qty', 'OUT Qty', 'Balance'],
    ];

    // Add data rows
    data.data.forEach((row) => {
        wsData.push([
            format(new Date(row.date), 'yyyy-MM-dd'),
            row.refNo || '-',
            row.description || '-',
            row.inQty,
            row.outQty,
            row.balance
        ] as any);
    });

    // Create worksheet from array of arrays
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const wscols = [
        { wch: 15 }, // Date
        { wch: 20 }, // Reference No
        { wch: 40 }, // Description
        { wch: 12 }, // IN
        { wch: 12 }, // OUT
        { wch: 12 }, // Balance
    ];
    ws['!cols'] = wscols;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Bincard');

    // Generate filename
    const fileName = `Bincard_${data.itemName.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;

    // Write file
    XLSX.writeFile(wb, fileName);
};

export const generateStockMovementSummaryExcel = (data: {
    filter: {
        startDate: string;
        endDate: string;
    };
    data: Array<{
        itemCode: string;
        itemName: string;
        opening: number;
        inQty: number;
        outQty: number;
        closing: number;
    }>;
}) => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Prepare data for Excel
    const wsData: any[][] = [
        ['STOCK MOVEMENT SUMMARY'],
        [],
        ['Period:', `${format(new Date(data.filter.startDate), 'yyyy-MM-dd')} to ${format(new Date(data.filter.endDate), 'yyyy-MM-dd')}`],
        [],
        ['Item Code', 'Item Name', 'Opening', 'IN', 'OUT', 'Closing'],
    ];

    // Add data rows
    data.data.forEach((row) => {
        wsData.push([
            row.itemCode,
            row.itemName,
            row.opening,
            row.inQty,
            row.outQty,
            row.closing
        ] as any);
    });

    // Create worksheet from array of arrays
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const wscols = [
        { wch: 15 }, // Item Code
        { wch: 40 }, // Item Name
        { wch: 12 }, // Opening
        { wch: 12 }, // IN
        { wch: 12 }, // OUT
        { wch: 12 }, // Closing
    ];
    ws['!cols'] = wscols;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Summary');

    // Generate filename
    const fileName = `StockMovementSummary_${format(new Date(), 'yyyyMMdd')}.xlsx`;

    // Write file
    XLSX.writeFile(wb, fileName);
};

export const generateSalesSummaryExcel = (salesSummary: any) => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    const summary = salesSummary?.summary || salesSummary || {};
    const invoices = salesSummary?.invoices || [];

    // Prepare data for Excel
    const wsData: any[][] = [
        ['SALES SUMMARY REPORT'],
        [],
        ['SUMMARY'],
        ['Total Invoices:', summary.totalInvoices || 0],
        ['Total Value:', summary.totalValue || 0],
        ['Total Items:', summary.totalItems || 0],
        ['Total Quantity:', summary.totalQuantity || 0],
        [],
        ['INVOICE DETAILS'],
        ['Invoice Number', 'Date', 'Customer', 'Status', 'Tax Amount', 'Total Amount'],
    ];

    // Add invoice rows
    invoices.forEach((invoice: any) => {
        wsData.push([
            invoice.invoiceNumber || '-',
            invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'yyyy-MM-dd') : '-',
            invoice.Customer?.name || '-',
            invoice.status || '-',
            invoice.taxAmount || 0,
            invoice.total || 0
        ] as any);
    });

    // Create worksheet from array of arrays
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const wscols = [
        { wch: 20 }, // Invoice Number
        { wch: 15 }, // Date
        { wch: 40 }, // Customer
        { wch: 15 }, // Status
        { wch: 15 }, // Tax Amount
        { wch: 15 }, // Total Amount
    ];
    ws['!cols'] = wscols;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Summary');

    // Generate filename
    const fileName = `SalesSummary_${format(new Date(), 'yyyyMMdd')}.xlsx`;

    // Write file
    XLSX.writeFile(wb, fileName);
};

export const generateDetailedItemMovementsExcel = (data: {
    stats: {
        itemName: string;
        totalMovements: number;
        totalInbound: number;
        totalOutbound: number;
        netMovement: number;
    };
    movements: Array<{
        date: string;
        type: string;
        inOut: string;
        qty: number;
        balance: number;
        reference: string;
        remarks: string;
    }>;
}) => {
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // Prepare data for Excel
    const wsData: any[][] = [
        ['DETAILED ITEM STOCK MOVEMENTS'],
        [],
        ['Item Name:', data.stats.itemName],
        ['Total Movements:', data.stats.totalMovements],
        ['Total Inbound:', data.stats.totalInbound],
        ['Total Outbound:', data.stats.totalOutbound],
        ['Net Movement:', data.stats.netMovement],
        [],
        ['Date', 'Type', 'Direction', 'Quantity', 'Balance', 'Reference', 'Remarks'],
    ];

    // Add movement rows
    data.movements.forEach((row) => {
        wsData.push([
            format(new Date(row.date), 'yyyy-MM-dd HH:mm'),
            row.type || '-',
            row.inOut || '-',
            row.qty,
            row.balance,
            row.reference || '-',
            row.remarks || '-'
        ] as any);
    });

    // Create worksheet from array of arrays
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    const wscols = [
        { wch: 20 }, // Date
        { wch: 20 }, // Type
        { wch: 10 }, // Direction
        { wch: 12 }, // Quantity
        { wch: 12 }, // Balance
        { wch: 25 }, // Reference
        { wch: 40 }, // Remarks
    ];
    ws['!cols'] = wscols;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Item Movements');

    // Generate filename
    const fileName = `ItemMovements_${data.stats.itemName.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;

    // Write file
    XLSX.writeFile(wb, fileName);
};

export const generateSalesPersonSalesExcel = (data: {
    salesPersonStats: {
        salesPersonName: string;
        totalInvoices: number;
        totalValue: number;
        totalQuantity: number;
        averageInvoiceValue: number;
        itemFrequency: Record<string, { totalQuantity: number; totalRevenue: number; count: number }>;
        customerFrequency: Record<string, { count: number; totalValue: number }>;
        monthlyBreakdown: Record<string, { count: number; value: number; quantity: number }>;
    };
    invoices: Array<{
        invoiceNumber: string;
        invoiceDate: string;
        Customer: { name: string };
        InvoiceItems: any[];
        total: number;
        status: string;
    }>;
}) => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData: any[][] = [
        ['SALES BY SALES PERSON REPORT'],
        [],
        ['Sales Person:', data.salesPersonStats.salesPersonName],
        ['Total Invoices:', data.salesPersonStats.totalInvoices],
        ['Total Value:', data.salesPersonStats.totalValue],
        ['Total Quantity:', data.salesPersonStats.totalQuantity],
        ['Average Invoice Value:', data.salesPersonStats.averageInvoiceValue],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: Top Items Sold
    const itemsData: any[][] = [
        ['TOP ITEMS SOLD'],
        [],
        ['Item', 'Total Quantity', 'Total Revenue', 'Invoices'],
    ];
    Object.entries(data.salesPersonStats.itemFrequency || {}).forEach(([item, stats]) => {
        itemsData.push([
            item,
            stats.totalQuantity,
            stats.totalRevenue,
            stats.count
        ] as any);
    });
    const wsItems = XLSX.utils.aoa_to_sheet(itemsData);
    wsItems['!cols'] = [{ wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsItems, 'Top Items');

    // Sheet 3: Customer Breakdown
    const customersData: any[][] = [
        ['CUSTOMER BREAKDOWN'],
        [],
        ['Customer', 'Invoices', 'Total Value'],
    ];
    Object.entries(data.salesPersonStats.customerFrequency || {}).forEach(([customer, stats]) => {
        customersData.push([
            customer,
            stats.count,
            stats.totalValue
        ] as any);
    });
    const wsCustomers = XLSX.utils.aoa_to_sheet(customersData);
    wsCustomers['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'Customers');

    // Sheet 4: Monthly Breakdown
    const monthlyData: any[][] = [
        ['MONTHLY SUMMARY'],
        [],
        ['Month', 'Invoices', 'Quantity', 'Value'],
    ];
    Object.entries(data.salesPersonStats.monthlyBreakdown || {}).forEach(([month, stats]) => {
        monthlyData.push([
            month,
            stats.count,
            stats.quantity,
            stats.value
        ] as any);
    });
    const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyData);
    wsMonthly['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly');

    // Sheet 5: Invoice History
    const invoicesData: any[][] = [
        ['INVOICE HISTORY'],
        [],
        ['Invoice Number', 'Date', 'Customer', 'Items', 'Amount', 'Status'],
    ];
    data.invoices.forEach((invoice) => {
        invoicesData.push([
            invoice.invoiceNumber,
            format(new Date(invoice.invoiceDate), 'yyyy-MM-dd'),
            invoice.Customer?.name || '-',
            (invoice.InvoiceItems?.length || 0),
            invoice.total,
            invoice.status
        ] as any);
    });
    const wsInvoices = XLSX.utils.aoa_to_sheet(invoicesData);
    wsInvoices['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsInvoices, 'Invoices');

    // Sheet 6: Invoice Items Detail
    const itemsDetailData: any[][] = [
        ['INVOICE ITEMS DETAIL'],
        [],
        ['Invoice #', 'Date', 'Customer', 'Item Code', 'Item Name', 'Category', 'Qty', 'Price', 'Discount %', 'Discounted Amount', 'Total'],
    ];
    data.invoices.forEach((invoice) => {
        invoice.InvoiceItems?.forEach((item: any) => {
            itemsDetailData.push([
                invoice.invoiceNumber,
                format(new Date(invoice.invoiceDate), 'yyyy-MM-dd'),
                invoice.Customer?.name || '-',
                item.code || '-',
                item.Item?.name || '-',
                item.Item?.Category?.name || '-',
                Number(item.qty || 0),
                Number(item.price || 0),
                Number(item.discount || 0),
                Number(item.discountedAmount || 0),
                Number(item.total || 0)
            ] as any);
        });
    });
    const wsItemsDetail = XLSX.utils.aoa_to_sheet(itemsDetailData);
    wsItemsDetail['!cols'] = [
        { wch: 20 }, // Invoice #
        { wch: 12 }, // Date
        { wch: 30 }, // Customer
        { wch: 15 }, // Item Code
        { wch: 40 }, // Item Name
        { wch: 20 }, // Category
        { wch: 10 }, // Qty
        { wch: 12 }, // Price
        { wch: 12 }, // Discount %
        { wch: 15 }, // Discounted Amount
        { wch: 15 }, // Total
    ];
    XLSX.utils.book_append_sheet(wb, wsItemsDetail, 'Invoice Items Detail');

    // Generate filename
    const fileName = `SalesPerson_${data.salesPersonStats.salesPersonName.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;

    // Write file
    XLSX.writeFile(wb, fileName);
};

export const generateGeneralSalesReportExcel = (data: {
    summary: { totalSales: number; totalOutstanding: number; totalOverDue: number };
    details: Array<{
        invoiceNumber: string;
        invoiceDate: string;
        dueDate: string;
        customerName: string;
        location: string;
        salesRep: string;
        invValue: number;
        paidAmount: number;
        returnedAmount: number;
        outstanding: number;
        overDueValue: number;
    }>;
}) => {
    const wb = XLSX.utils.book_new();
    const wsData: any[][] = [
        ['GENERAL SALES REPORT'],
        [],
        ['SUMMARY'],
        ['Total Sales:', data.summary.totalSales],
        ['Total Outstanding:', data.summary.totalOutstanding],
        ['Total Overdue:', data.summary.totalOverDue],
        [],
        ['DETAILED INVOICE LIST'],
        ['Invoice Number', 'Date', 'Due Date', 'Customer', 'Location', 'Sales Rep', 'Inv Value', 'Paid Amount', 'Returned Amount', 'Outstanding', 'Overdue Value'],
    ];

    data.details.forEach((row) => {
        wsData.push([
            row.invoiceNumber || '-',
            row.invoiceDate ? format(new Date(row.invoiceDate), 'yyyy-MM-dd') : '-',
            row.dueDate ? format(new Date(row.dueDate), 'yyyy-MM-dd') : '-',
            row.customerName || '-',
            row.location || '-',
            row.salesRep || '-',
            row.invValue,
            row.paidAmount || 0,
            row.returnedAmount,
            row.outstanding,
            row.overDueValue
        ] as any);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 40 }, { wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'General Sales');
    const fileName = `GeneralSales_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

export const generateRepWiseSalesReportExcel = (data: Array<{
    salesRepName: string;
    totalSales: number;
    totalOutstanding: number;
    totalOverDue: number;
    invoices: any[];
}>) => {
    const wb = XLSX.utils.book_new();

    // Performance Summary Sheet
    const summaryData: any[][] = [
        ['REP WISE SALES PERFORMANCE'],
        [],
        ['Sales Representative', 'Invoices', 'Total Sales', 'Outstanding', 'Overdue'],
    ];
    data.forEach((rep) => {
        summaryData.push([
            rep.salesRepName,
            rep.invoices.length,
            rep.totalSales,
            rep.totalOutstanding,
            rep.totalOverDue
        ] as any);
    });
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Performance Summary');

    // Detailed Invoices Sheet
    const detailsData: any[][] = [
        ['DETAILED INVOICES BY REP'],
        [],
        ['Sales Rep', 'Customer', 'Date', 'Inv Value', 'Outstanding', 'Overdue'],
    ];
    data.forEach((rep) => {
        rep.invoices.forEach((inv) => {
            detailsData.push([
                rep.salesRepName,
                inv.customerName,
                format(new Date(inv.invoiceDate), 'yyyy-MM-dd'),
                inv.invValue,
                inv.outstanding,
                inv.overDueValue
            ] as any);
        });
    });
    const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
    wsDetails['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Invoice Details');

    const fileName = `RepWiseSales_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

export const generateExpensesReportExcel = (data: {
    summary: { totalExpenses?: number };
    details: Array<{
        paymentDate: string;
        categoryName: string;
        description: string;
        amount: number;
        status: string;
    }>;
}) => {
    const wb = XLSX.utils.book_new();
    const total = data.summary.totalExpenses ?? data.details.reduce((acc, item) => acc + item.amount, 0);

    const wsData: any[][] = [
        ['EXPENSES REPORT'],
        [],
        ['Total Expenses:', total],
        [],
        ['Date', 'Category', 'Description', 'Amount', 'Status'],
    ];

    data.details.forEach((row) => {
        wsData.push([
            format(new Date(row.paymentDate), 'yyyy-MM-dd'),
            row.categoryName || '-',
            row.description || '-',
            row.amount,
            row.status || '-'
        ] as any);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
        { wch: 15 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    const fileName = `ExpensesReport_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
};


export const generateSalesByItemExcel = (data: {
    itemStats: {
        itemName: string;
        totalQuantitySold: number;
        totalRevenue: number;
        averagePrice: number;
        totalInvoices: number;
        customerFrequency: Record<string, { count: number; totalQuantity: number; totalSpent: number }>;
        monthlyBreakdown: Record<string, { count: number; quantity: number; revenue: number }>;
    };
    sales: Array<{
        id: number;
        Invoice: { invoiceNumber: string; invoiceDate: string; Customer: { name: string } };
        qty: number;
        price: number;
        total: number;
    }>;
}) => {
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData: any[][] = [
        ['SALES BY ITEM DETAILS REPORT'],
        [],
        ['Item Name:', data.itemStats.itemName],
        ['Total Quantity Sold:', data.itemStats.totalQuantitySold],
        ['Total Revenue:', data.itemStats.totalRevenue],
        ['Average Price:', data.itemStats.averagePrice],
        ['Total Invoices:', data.itemStats.totalInvoices],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Customer Breakdown Sheet
    const customersData: any[][] = [
        ['SALES BY CUSTOMER'],
        [],
        ['Customer', 'Quantity', 'Total Spent'],
    ];
    Object.entries(data.itemStats.customerFrequency).forEach(([customer, stats]) => {
        customersData.push([customer, stats.totalQuantity, stats.totalSpent]);
    });
    const wsCustomers = XLSX.utils.aoa_to_sheet(customersData);
    wsCustomers['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsCustomers, 'By Customer');

    // Monthly Breakdown Sheet
    const monthlyData: any[][] = [
        ['MONTHLY BREAKDOWN'],
        [],
        ['Month', 'Quantity', 'Revenue'],
    ];
    Object.entries(data.itemStats.monthlyBreakdown).forEach(([month, stats]) => {
        monthlyData.push([month, stats.quantity, stats.revenue]);
    });
    const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyData);
    wsMonthly['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly');

    // Sales History Sheet
    const historyData: any[][] = [
        ['SALES HISTORY'],
        [],
        ['Invoice Number', 'Date', 'Customer', 'Quantity', 'Price', 'Total'],
    ];
    data.sales.forEach((sale) => {
        historyData.push([
            sale.Invoice.invoiceNumber,
            format(new Date(sale.Invoice.invoiceDate), 'yyyy-MM-dd'),
            sale.Invoice.Customer?.name || 'N/A',
            sale.qty,
            sale.price,
            sale.total
        ] as any);
    });
    const wsHistory = XLSX.utils.aoa_to_sheet(historyData);
    wsHistory['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsHistory, 'Sales History');

    // Filename
    const fileName = `SalesByItem_${data.itemStats.itemName.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

export const generateRepWiseSalesOrdersReportExcel = (data: Array<{
    salesRepName: string;
    totalSales: number;
    orderCount: number;
    orders: any[];
}>) => {
    const wb = XLSX.utils.book_new();

    // Performance Summary Sheet
    const summaryData: any[][] = [
        ['REP WISE SALES ORDER PERFORMANCE'],
        [],
        ['Sales Representative', 'Sales Orders', 'Total Value'],
    ];
    data.forEach((rep) => {
        summaryData.push([
            rep.salesRepName,
            rep.orderCount,
            rep.totalSales
        ] as any);
    });
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Performance Summary');

    // Detailed Orders Sheet
    const detailsData: any[][] = [
        ['DETAILED SALES ORDERS BY REP'],
        [],
        ['Sales Rep', 'Order Number', 'Customer', 'Date', 'Delivery Date', 'Value', 'Status'],
    ];
    data.forEach((rep) => {
        rep.orders.forEach((order) => {
            detailsData.push([
                rep.salesRepName,
                order.orderNumber,
                order.customerName,
                order.orderDate ? format(new Date(order.orderDate), 'yyyy-MM-dd') : '-',
                order.deliveryDate ? format(new Date(order.deliveryDate), 'yyyy-MM-dd') : '-',
                order.totalAmount,
                order.status
            ] as any);
        });
    });
    const wsDetails = XLSX.utils.aoa_to_sheet(detailsData);
    wsDetails['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Order Details');

    const fileName = `RepWiseSalesOrders_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

export const generateTopSellingItemsExcel = (topItems: any[], startDate?: Date, endDate?: Date) => {
    const wb = XLSX.utils.book_new();

    const wsData: any[][] = [
        ['ITEM WISE SALES (TOP SELLING ITEMS) REPORT'],
        [],
        ['Period:', `${startDate ? format(startDate, 'yyyy-MM-dd') : 'All Time'} to ${endDate ? format(endDate, 'yyyy-MM-dd') : 'All Time'}`],
        [],
        ['Item Code', 'Item Name', 'Category', 'Invoices Count', 'Qty Sold', 'Average Price', 'Total Revenue'],
    ];

    topItems.forEach((item) => {
        wsData.push([
            item.Item?.sku || '-',
            item.Item?.name || 'Unknown Item',
            item.Item?.Category?.name || '-',
            item.totalInvoices || 0,
            item.totalQuantitySold || 0,
            item.averagePrice || 0,
            item.totalRevenue || 0
        ] as any);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const wscols = [
        { wch: 15 }, // Item Code
        { wch: 40 }, // Item Name
        { wch: 20 }, // Category
        { wch: 15 }, // Invoices Count
        { wch: 15 }, // Qty Sold
        { wch: 15 }, // Average Price
        { wch: 15 }, // Total Revenue
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'Top Selling Items');

    const fileName = `TopSellingItems_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

export const generateItemWisePurchasingExcel = (purchases: any[], startDate?: Date, endDate?: Date) => {
    const wb = XLSX.utils.book_new();

    const wsData: any[][] = [
        ['ITEM WISE PURCHASING REPORT'],
        [],
        ['Period:', `${startDate ? format(startDate, 'yyyy-MM-dd') : 'All Time'} to ${endDate ? format(endDate, 'yyyy-MM-dd') : 'All Time'}`],
        [],
        ['Item Code', 'Item Name', 'Category', 'GRNs Count', 'Qty Purchased', 'Weight Purchased (kg)', 'Average Cost Price', 'Total Cost'],
    ];

    purchases.forEach((item) => {
        wsData.push([
            item.Item?.sku || '-',
            item.Item?.name || 'Unknown Item',
            item.Item?.Category?.name || '-',
            item.totalGrns || 0,
            item.totalQuantityPurchased || 0,
            item.weightPurchased || 0,
            item.averageCostPrice || 0,
            item.totalCost || 0
        ] as any);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const wscols = [
        { wch: 15 }, // Item Code
        { wch: 40 }, // Item Name
        { wch: 20 }, // Category
        { wch: 12 }, // GRNs Count
        { wch: 15 }, // Qty Purchased
        { wch: 20 }, // Weight Purchased
        { wch: 18 }, // Average Cost Price
        { wch: 18 }, // Total Cost
    ];
    ws['!cols'] = wscols;

    XLSX.utils.book_append_sheet(wb, ws, 'Item Purchases');

    const fileName = `ItemWisePurchasing_${format(new Date(), 'yyyyMMdd')}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

export const generateSupplierWisePOExcel = (data: any, startDate?: Date, endDate?: Date) => {
    const wb = XLSX.utils.book_new();
    const periodStr = `${startDate ? format(startDate, 'yyyy-MM-dd') : 'All Time'} to ${endDate ? format(endDate, 'yyyy-MM-dd') : 'All Time'}`;

    if (Array.isArray(data)) {
        // Summary list of all suppliers
        const wsData: any[][] = [
            ['SUPPLIER WISE PURCHASE ORDER SUMMARY REPORT'],
            [],
            ['Period:', periodStr],
            [],
            ['Supplier Name', 'Email', 'Phone', 'PO Count', 'Total Amount (LKR)', 'Pending Orders', 'Approved Orders', 'Completed Orders'],
        ];

        data.forEach((s) => {
            wsData.push([
                s.supplierName,
                s.email || '-',
                s.phone || '-',
                s.poCount || 0,
                s.totalAmount || 0,
                s.pendingCount || 0,
                s.approvedCount || 0,
                s.completedCount || 0
            ] as any);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [
            { wch: 35 }, // Supplier Name
            { wch: 25 }, // Email
            { wch: 15 }, // Phone
            { wch: 10 }, // PO Count
            { wch: 20 }, // Total Amount
            { wch: 15 }, // Pending
            { wch: 15 }, // Approved
            { wch: 15 }, // Completed
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Suppliers Summary');

        const fileName = `SupplierWisePOSummary_${format(new Date(), 'yyyyMMdd')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    } else if (data && data.supplierStats) {
        // Detailed supplier report
        const stats = data.supplierStats;
        const purchaseOrders = data.purchaseOrders || [];

        // Sheet 1: Stats & Overview
        const summaryData: any[][] = [
            ['SUPPLIER PURCHASE ORDER ANALYSIS'],
            [],
            ['Supplier:', stats.supplierName],
            ['Period:', periodStr],
            [],
            ['Metrics', 'Value'],
            ['Total Orders:', stats.totalOrders],
            ['Total Spend (LKR):', stats.totalAmount],
            ['Average Order Value (LKR):', stats.totalOrders > 0 ? stats.totalAmount / stats.totalOrders : 0],
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Overview');

        // Sheet 2: PO History
        const poHistoryData: any[][] = [
            ['PURCHASE ORDERS HISTORY'],
            [],
            ['Order Number', 'Date', 'Delivery Date', 'Status', 'Currency', 'Amount (LKR)'],
        ];
        purchaseOrders.forEach((po: any) => {
            poHistoryData.push([
                po.orderNumber,
                po.orderDate ? format(new Date(po.orderDate), 'yyyy-MM-dd') : '-',
                po.deliveryDate ? format(new Date(po.deliveryDate), 'yyyy-MM-dd') : '-',
                po.status,
                po.currency,
                po.totalAmount
            ] as any);
        });
        const wsHistory = XLSX.utils.aoa_to_sheet(poHistoryData);
        wsHistory['!cols'] = [
            { wch: 20 }, // Order Number
            { wch: 15 }, // Date
            { wch: 15 }, // Delivery Date
            { wch: 12 }, // Status
            { wch: 10 }, // Currency
            { wch: 18 }, // Amount
        ];
        XLSX.utils.book_append_sheet(wb, wsHistory, 'Order History');

        // Sheet 3: Item Frequency Breakdown
        const itemFreqData: any[][] = [
            ['ITEMS ORDERED BREAKDOWN'],
            [],
            ['Item Name', 'Quantity Ordered', 'Total Spent (LKR)', 'Orders Count'],
        ];
        Object.entries(stats.itemFrequency || {}).forEach(([itemName, itemStats]: [string, any]) => {
            itemFreqData.push([
                itemName,
                itemStats.qty,
                itemStats.amount,
                itemStats.orders
            ]);
        });
        const wsItemFreq = XLSX.utils.aoa_to_sheet(itemFreqData);
        wsItemFreq['!cols'] = [
            { wch: 40 }, // Item Name
            { wch: 18 }, // Qty
            { wch: 20 }, // Spent
            { wch: 12 }, // Orders
        ];
        XLSX.utils.book_append_sheet(wb, wsItemFreq, 'Item Breakdown');

        const fileName = `SupplierPOAnalysis_${stats.supplierName.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }
};

export const generateFreeIssueExcel = (
    items: any[],
    startDate?: Date,
    endDate?: Date
) => {
    const wb = XLSX.utils.book_new();
    const periodStr = `${startDate ? format(startDate, 'yyyy-MM-dd') : 'All Time'} to ${endDate ? format(endDate, 'yyyy-MM-dd') : 'Present'}`;

    const wsData: any[][] = [
        ['FREE ISSUE ITEMS REPORT'],
        ['Generated On:', format(new Date(), 'yyyy-MM-dd HH:mm')],
        ['Period:', periodStr],
        [],
        ['Invoice Date', 'Invoice No', 'Customer', 'Sales Rep', 'Item Code', 'Item Name', 'Billed Qty', 'Free Qty', 'Unit Price (LKR)', 'Free Value (LKR)'],
    ];

    let totalFreeQty = 0;
    let totalFreeValue = 0;

    items.forEach((row) => {
        const fQty = Number(row.freeQty || 0);
        const fVal = Number(row.totalFreeValue || 0);
        totalFreeQty += fQty;
        totalFreeValue += fVal;
        wsData.push([
            row.invoiceDate ? format(new Date(row.invoiceDate), 'yyyy-MM-dd') : '-',
            row.invoiceNumber || '-',
            row.customerName || '-',
            row.salesPersonName || '-',
            row.itemCode || '-',
            row.itemName || '-',
            row.billedQty || 0,
            fQty,
            row.price || 0,
            fVal,
        ]);
    });

    wsData.push([]);
    wsData.push(['Total', '', '', '', '', '', '', totalFreeQty, '', totalFreeValue]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
        { wch: 12 },
        { wch: 18 },
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
        { wch: 15 },
        { wch: 18 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Free Issue Report');
    XLSX.writeFile(wb, `Free_Issue_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};

export const generateCustomerOutstandingReportExcel = (data: {
    summary: {
        totalCustomers: number;
        totalInvoiced: number;
        totalPaid: number;
        totalOutstanding: number;
        totalOverdue: number;
    };
    data: Array<{
        customerCode: string;
        customerName: string;
        contactNumber: string;
        salesPerson: string;
        totalInvoiced: number;
        totalPaid: number;
        adjustments: number;
        outstanding: number;
        overdue: number;
        lastPaymentDate?: string;
        status: string;
    }>;
}) => {
    const wb = XLSX.utils.book_new();

    const wsData: any[][] = [
        ['CUSTOMER OUTSTANDING REPORT'],
        ['Generated At:', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
        [],
        ['SUMMARY TOTALS'],
        ['Total Customers', data.summary?.totalCustomers || 0],
        ['Total Invoiced', data.summary?.totalInvoiced || 0],
        ['Total Paid', data.summary?.totalPaid || 0],
        ['Total Outstanding', data.summary?.totalOutstanding || 0],
        ['Total Overdue', data.summary?.totalOverdue || 0],
        [],
        ['Customer Code', 'Customer Name', 'Contact', 'Sales Person', 'Total Invoiced', 'Total Paid', 'Adjustments', 'Outstanding', 'Overdue', 'Last Payment', 'Status']
    ];

    (data.data || []).forEach(row => {
        wsData.push([
            row.customerCode || '-',
            row.customerName || '-',
            row.contactNumber || '-',
            row.salesPerson || '-',
            row.totalInvoiced || 0,
            row.totalPaid || 0,
            row.adjustments || 0,
            row.outstanding || 0,
            row.overdue || 0,
            row.lastPaymentDate || '-',
            row.status || '-'
        ]);
    });

    wsData.push([]);
    wsData.push([
        'Grand Total', '', '', '',
        data.summary?.totalInvoiced || 0,
        data.summary?.totalPaid || 0,
        '',
        data.summary?.totalOutstanding || 0,
        data.summary?.totalOverdue || 0,
        '', ''
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
        { wch: 15 },
        { wch: 30 },
        { wch: 16 },
        { wch: 22 },
        { wch: 16 },
        { wch: 16 },
        { wch: 14 },
        { wch: 18 },
        { wch: 16 },
        { wch: 15 },
        { wch: 14 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Customer Outstanding');
    XLSX.writeFile(wb, `Customer_Outstanding_Report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
};

export const generateInvoiceListExcel = (
    invoices: any[],
    options?: {
        filterSummary?: {
            search?: string;
            status?: string;
            paymentStatus?: string;
            customerName?: string;
            salesPersonName?: string;
            dateFrom?: string;
            dateTo?: string;
        };
        scope?: string;
    }
) => {
    const wb = XLSX.utils.book_new();

    const getPaymentStatusText = (inv: any) => {
        if (inv.status === "Cancelled") return "Cancelled";
        const total = Number(inv.totalAmount ?? inv.total ?? 0);
        const settled = Number(inv.paidAmount ?? 0) + Number(inv.setoffAmount ?? 0);
        const due = total - settled;
        if (total > 0 && due <= 0.01) return "Paid";
        if (settled > 0.01) return "Partially Paid";
        return "Unpaid";
    };

    const filterParts: string[] = [];
    if (options?.filterSummary?.search) filterParts.push(`Search: "${options.filterSummary.search}"`);
    if (options?.filterSummary?.status && options.filterSummary.status !== "all") filterParts.push(`Status: ${options.filterSummary.status}`);
    if (options?.filterSummary?.paymentStatus && options.filterSummary.paymentStatus !== "all") filterParts.push(`Payment: ${options.filterSummary.paymentStatus}`);
    if (options?.filterSummary?.customerName) filterParts.push(`Customer: ${options.filterSummary.customerName}`);
    if (options?.filterSummary?.salesPersonName) filterParts.push(`Sales Person: ${options.filterSummary.salesPersonName}`);
    if (options?.filterSummary?.dateFrom) filterParts.push(`From: ${options.filterSummary.dateFrom}`);
    if (options?.filterSummary?.dateTo) filterParts.push(`To: ${options.filterSummary.dateTo}`);

    // Sheet 1: Invoices Summary
    const summaryData: any[][] = [
        ['INVOICE LIST REPORT'],
        ['Generated Date:', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
        ['Export Scope:', options?.scope || 'All Filtered Invoices'],
        ['Total Invoices:', invoices.length],
        ...(filterParts.length > 0 ? [['Active Filters:', filterParts.join(' | ')]] : []),
        [],
        [
            'Invoice #',
            'Type',
            'Date',
            'Customer Name',
            'Contact',
            'Order Type',
            'Sales Order #',
            'Delivery Order #',
            'Sales Person',
            'Subtotal (LKR)',
            'Tax Amount (LKR)',
            'Total Amount (LKR)',
            'Paid Amount (LKR)',
            'Setoff Amount (LKR)',
            'Balance Due (LKR)',
            'Payment Status',
            'DO Status',
            'Invoice Status',
            'Cancellation Reason',
        ]
    ];

    let totalSubtotal = 0;
    let totalTax = 0;
    let totalAmount = 0;
    let totalPaid = 0;
    let totalSetoff = 0;
    let totalBalanceDue = 0;

    invoices.forEach((inv) => {
        const subtotal = Number(inv.subTotal ?? 0);
        const taxAmount = Number(inv.taxAmount ?? 0);
        const invTotal = Number(inv.totalAmount ?? inv.total ?? 0);
        const paid = Number(inv.paidAmount ?? 0);
        const setoff = Number(inv.setoffAmount ?? 0);
        const balanceDue = Math.max(0, invTotal - (paid + setoff));

        totalSubtotal += subtotal;
        totalTax += taxAmount;
        totalAmount += invTotal;
        totalPaid += paid;
        totalSetoff += setoff;
        totalBalanceDue += balanceDue;

        const dateStr = inv.invoiceDate
            ? (typeof inv.invoiceDate === 'string' ? inv.invoiceDate.substring(0, 10) : format(new Date(inv.invoiceDate), 'yyyy-MM-dd'))
            : '-';

        const customerName = inv.customer?.name || inv.Customer?.name || '-';
        const contact = inv.customer?.contactNumber || inv.Customer?.contactNumber || '-';
        const isDelivery = inv.SalesOrder?.isDelivery ? 'Delivery' : 'Pickup';
        const soNumber = inv.SalesOrder?.orderNumber || (inv.salesOrderId ? String(inv.salesOrderId) : '-');
        const doNumber = inv.DeliveryOrder?.doNumber || (inv.deliveryOrderId ? String(inv.deliveryOrderId) : '-');
        const salesPerson = inv.SalesPerson?.fullName || inv.SalesPerson?.username || '-';
        const doStatus = inv.DeliveryOrder?.status || 'Pending';
        const status = inv.status || 'Pending';

        summaryData.push([
            inv.invoiceNumber || '-',
            inv.isTaxInvoice ? 'Tax Invoice' : 'Regular',
            dateStr,
            customerName,
            contact,
            isDelivery,
            soNumber,
            doNumber,
            salesPerson,
            subtotal,
            taxAmount,
            invTotal,
            paid,
            setoff,
            balanceDue,
            getPaymentStatusText(inv),
            doStatus,
            status,
            inv.cancelReason || '-'
        ]);
    });

    summaryData.push([]);
    summaryData.push([
        'Grand Total',
        '',
        '',
        `Invoices Count: ${invoices.length}`,
        '',
        '',
        '',
        '',
        '',
        Number(totalSubtotal.toFixed(2)),
        Number(totalTax.toFixed(2)),
        Number(totalAmount.toFixed(2)),
        Number(totalPaid.toFixed(2)),
        Number(totalSetoff.toFixed(2)),
        Number(totalBalanceDue.toFixed(2)),
        '',
        '',
        '',
        ''
    ]);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [
        { wch: 18 }, // Invoice #
        { wch: 15 }, // Type
        { wch: 14 }, // Date
        { wch: 32 }, // Customer Name
        { wch: 16 }, // Contact
        { wch: 14 }, // Order Type
        { wch: 18 }, // Sales Order #
        { wch: 18 }, // Delivery Order #
        { wch: 22 }, // Sales Person
        { wch: 16 }, // Subtotal
        { wch: 16 }, // Tax Amount
        { wch: 18 }, // Total Amount
        { wch: 16 }, // Paid Amount
        { wch: 16 }, // Setoff Amount
        { wch: 16 }, // Balance Due
        { wch: 16 }, // Payment Status
        { wch: 14 }, // DO Status
        { wch: 14 }, // Invoice Status
        { wch: 25 }, // Cancellation Reason
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Invoices Summary');

    // Sheet 2: Invoice Items Detail
    const itemsData: any[][] = [
        ['INVOICE ITEMS DETAIL'],
        ['Generated Date:', format(new Date(), 'yyyy-MM-dd HH:mm:ss')],
        [],
        [
            'Invoice #',
            'Date',
            'Customer Name',
            'Invoice Status',
            'Payment Status',
            'Item Code',
            'Item Name',
            'Unit',
            'Quantity',
            'Free Qty',
            'Unit Price (LKR)',
            'Discount %',
            'Discounted Amount (LKR)',
            'Tax Item?',
            'Tax Amount (LKR)',
            'Line Total (LKR)'
        ]
    ];

    let totalItemQty = 0;
    let totalFreeQty = 0;
    let totalItemLineTotal = 0;

    invoices.forEach((inv) => {
        const dateStr = inv.invoiceDate
            ? (typeof inv.invoiceDate === 'string' ? inv.invoiceDate.substring(0, 10) : format(new Date(inv.invoiceDate), 'yyyy-MM-dd'))
            : '-';
        const customerName = inv.customer?.name || inv.Customer?.name || '-';
        const invStatus = inv.status || 'Pending';
        const payStatus = getPaymentStatusText(inv);

        const itemsList = inv.items || inv.InvoiceItems || [];

        if (Array.isArray(itemsList) && itemsList.length > 0) {
            itemsList.forEach((it: any) => {
                const qty = Number(it.qty ?? 0);
                const freeQty = Number(it.freeQty ?? it.freeIssueQty ?? 0);
                const price = Number(it.price ?? 0);
                const discount = Number(it.discount ?? 0);
                const discountedAmount = Number(it.discountedAmount ?? (price * (1 - discount / 100)));
                const taxAmount = Number(it.taxAmount ?? 0);
                const lineTotal = Number(it.total ?? (qty * discountedAmount));

                totalItemQty += qty;
                totalFreeQty += freeQty;
                totalItemLineTotal += lineTotal;

                itemsData.push([
                    inv.invoiceNumber || '-',
                    dateStr,
                    customerName,
                    invStatus,
                    payStatus,
                    it.code || it.item?.barcode || it.item?.sku || it.Item?.barcode || it.Item?.sku || '-',
                    it.item?.name || it.Item?.name || it.itemName || '-',
                    it.item?.unit || it.Item?.unit || '-',
                    qty,
                    freeQty,
                    price,
                    discount,
                    Number(discountedAmount.toFixed(2)),
                    it.isTaxItem ? 'Yes' : 'No',
                    taxAmount,
                    Number(lineTotal.toFixed(2))
                ]);
            });
        } else {
            itemsData.push([
                inv.invoiceNumber || '-',
                dateStr,
                customerName,
                invStatus,
                payStatus,
                '-',
                'No line items',
                '-',
                0,
                0,
                0,
                0,
                0,
                '-',
                0,
                0
            ]);
        }
    });

    itemsData.push([]);
    itemsData.push([
        'Grand Total',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        Number(totalItemQty.toFixed(2)),
        Number(totalFreeQty.toFixed(2)),
        '',
        '',
        '',
        '',
        '',
        Number(totalItemLineTotal.toFixed(2))
    ]);

    const wsItems = XLSX.utils.aoa_to_sheet(itemsData);
    wsItems['!cols'] = [
        { wch: 18 }, // Invoice #
        { wch: 14 }, // Date
        { wch: 30 }, // Customer Name
        { wch: 14 }, // Invoice Status
        { wch: 16 }, // Payment Status
        { wch: 16 }, // Item Code
        { wch: 36 }, // Item Name
        { wch: 10 }, // Unit
        { wch: 12 }, // Quantity
        { wch: 12 }, // Free Qty
        { wch: 16 }, // Unit Price
        { wch: 12 }, // Discount %
        { wch: 22 }, // Discounted Amount
        { wch: 12 }, // Tax Item?
        { wch: 16 }, // Tax Amount
        { wch: 18 }, // Line Total
    ];
    XLSX.utils.book_append_sheet(wb, wsItems, 'Item Details');

    const filterTag = [
        options?.filterSummary?.status && options.filterSummary.status !== 'all' ? options.filterSummary.status : null,
        options?.filterSummary?.paymentStatus && options.filterSummary.paymentStatus !== 'all' ? options.filterSummary.paymentStatus : null,
    ].filter(Boolean).join('_');

    const fileName = `Invoices_${filterTag ? filterTag + '_' : ''}${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);
};


