import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

// Manual table drawing helpers
type TableCell = string | number;
type TableRow = TableCell[];

const drawTable = (
  doc: jsPDF,
  startX: number,
  startY: number,
  headers: TableRow,
  rows: TableRow[],
  columnWidths: number[],
  options?: { headerColor?: [number, number, number]; rowHeight?: number; fontSize?: number; alignments?: ('left' | 'center' | 'right')[] }
) => {
  const headerColor = options?.headerColor || [41, 128, 185];
  const rowHeight = options?.rowHeight || 10;
  const fontSize = options?.fontSize || 10;
  const alignments = options?.alignments || [];
  let y = startY;
  const pageHeight = doc.internal.pageSize.height;

  const drawHeaders = (currentY: number) => {
    doc.setFontSize(fontSize);
    let x = startX;
    doc.setFillColor(...headerColor);
    const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    doc.rect(startX, currentY, totalWidth, rowHeight, 'F');
    doc.setTextColor(255, 255, 255);
    headers.forEach((header, i) => {
      let textX = x + 2;
      let align: any = 'left';
      if (alignments[i] === 'right') {
        textX = x + columnWidths[i] - 2;
        align = 'right';
      } else if (alignments[i] === 'center') {
        textX = x + columnWidths[i] / 2;
        align = 'center';
      }
      doc.text(String(header), textX, currentY + rowHeight / 2, { baseline: 'middle', align });
      x += columnWidths[i];
    });
    return currentY + rowHeight;
  };

  y = drawHeaders(y);

  // Draw rows
  doc.setTextColor(44, 62, 80);
  rows.forEach(row => {
    if (y + rowHeight > pageHeight - 20) {
      doc.addPage();
      y = drawHeaders(20);
      doc.setTextColor(44, 62, 80);
    }
    let x = startX;
    doc.setFontSize(fontSize);
    row.forEach((cell, i) => {
      doc.rect(x, y, columnWidths[i], rowHeight);
      let textX = x + 2;
      let align: any = 'left';
      if (alignments[i] === 'right') {
        textX = x + columnWidths[i] - 2;
        align = 'right';
      } else if (alignments[i] === 'center') {
        textX = x + columnWidths[i] / 2;
        align = 'center';
      }
      doc.text(String(cell), textX, y + rowHeight / 2 + 1, { baseline: 'middle', align });
      x += columnWidths[i];
    });
    y += rowHeight;
  });
  return y;
};

// Common PDF styling
const PDF_STYLES = {
  fontSize: {
    title: 18,
    subtitle: 14,
    header: 12,
    normal: 10
  },
  margin: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20
  }
};

// Helper function to add header to PDF
const addHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  doc.setFontSize(PDF_STYLES.fontSize.title);
  doc.setTextColor(41, 128, 185); // Blue for header
  doc.text(title, PDF_STYLES.margin.left, PDF_STYLES.margin.top);

  if (subtitle) {
    doc.setFontSize(PDF_STYLES.fontSize.subtitle);
    doc.setTextColor(44, 62, 80); // Dark gray for text
    doc.text(subtitle, PDF_STYLES.margin.left, PDF_STYLES.margin.top + 10);
    return PDF_STYLES.margin.top + 20; // Return next Y position
  }
  return PDF_STYLES.margin.top + 15;
};

// Helper function to add metadata
const addMetadata = (doc: jsPDF, data: { [key: string]: string }) => {
  doc.setFontSize(PDF_STYLES.fontSize.normal);
  doc.setTextColor(44, 62, 80); // Dark gray for text

  let yPos = PDF_STYLES.margin.top + 30;
  Object.entries(data).forEach(([key, value]) => {
    doc.text(`${key}: ${value}`, PDF_STYLES.margin.left, yPos);
    yPos += 7;
  });
  return yPos + 10;
};

// Generate Stock Summary PDF
export const generateStockSummaryPDF = (stockSummary: any[]) => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, 'Stock Summary Report', `Generated on ${format(new Date(), 'PPP')}`);

  // Table data
  const headers = ['Item', 'Total Qty', 'Total Weight', 'Stores'];
  const rows = stockSummary.map(item => [
    `${item.Item?.color || ''} ${item.Item?.name || ''} ${item.Item?.country || ''} ${item.Item?.weight ? `(${item.Item.weight}kg)` : ''}`.trim(),
    item.totalQty || 0,
    item.totalWeight ? `${item.totalWeight} kg` : '0 kg',
    item.storeCount || 0
  ]);
  const columnWidths = [70, 30, 40, 30];

  drawTable(doc, PDF_STYLES.margin.left, yPos, headers, rows, columnWidths, {
    headerColor: [41, 128, 185],
    rowHeight: 10,
    fontSize: PDF_STYLES.fontSize.normal
  });

  doc.save('stock-summary.pdf');
};

// Generate Stock Movement Report PDF (Store Movements)
export const generateStockMovementPDF = (storeMovements: any[]) => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, 'Stock Movement Report', `Generated on ${format(new Date(), 'PPP')}`);

  const firstMovement = storeMovements?.[0] || {};
  const storeInfo = firstMovement.storeInfo || {};

  // Add summary section
  yPos = addMetadata(doc, {
    'Store': firstMovement.Store?.name || 'All Stores',
    'Total Inbound': (storeInfo.totalInbound || 0).toString(),
    'Total Outbound': (storeInfo.totalOutbound || 0).toString(),
    'Net Movement': (storeInfo.netMovement || 0).toString(),
    'Unique Items': (storeInfo.uniqueItems || 0).toString()
  });

  // Add movement history table
  const movementHeaders = ['Date & Time', 'Item', 'Type', 'Direction', 'Quantity', 'Weight', 'Remarks'];
  const movementRows = (firstMovement.movements || []).map((movement: any) => [
    format(new Date(movement.date || new Date()), 'Pp'),
    movement.Stock?.Item ? `${movement.Stock.Item.color || ''} ${movement.Stock.Item.name || ''}`.trim() : '-',
    movement.documentType || '-',
    movement.inOut || '-',
    movement.qty || 0,
    movement.weight ? `${movement.weight} kg` : '-',
    movement.remark || '-'
  ]);
  const movementColumnWidths = [35, 35, 25, 25, 20, 25, 35];

  drawTable(doc, PDF_STYLES.margin.left, yPos, movementHeaders, movementRows, movementColumnWidths, {
    headerColor: [41, 128, 185],
    rowHeight: 10,
    fontSize: PDF_STYLES.fontSize.normal
  });

  doc.save('stock-movements.pdf');
};

// Generate Stock Movement Summary PDF
export const generateStockMovementSummaryPDF = (data: {
  filter: { startDate: string; endDate: string; categoryId: number };
  data: Array<{
    itemCode: string;
    itemName: string;
    opening: number;
    inQty: number;
    outQty: number;
    closing: number;
  }>;
}) => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, 'Stock Movement Summary', `Period: ${format(new Date(data.filter.startDate), 'yyyy-MM-dd')} to ${format(new Date(data.filter.endDate), 'yyyy-MM-dd')}`);

  const headers = ['Item Code', 'Item Name', 'Opening', 'IN', 'OUT', 'Closing'];
  const rows = data.data.map(item => [
    item.itemCode,
    item.itemName,
    item.opening,
    item.inQty,
    item.outQty,
    item.closing
  ]);
  const columnWidths = [30, 60, 25, 25, 25, 25];

  drawTable(doc, PDF_STYLES.margin.left, yPos, headers, rows, columnWidths, {
    headerColor: [41, 128, 185],
    rowHeight: 10,
    fontSize: PDF_STYLES.fontSize.normal
  });

  doc.save(`stock-movement-summary-${data.filter.startDate}-to-${data.filter.endDate}.pdf`);
};

// Generate Sales Report PDF
export const generateSalesReportPDF = (salesSummary: any, salesDetails: any[]) => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, 'Sales Report', `Generated on ${format(new Date(), 'PPP')}`);

  const summary = salesSummary?.summary || salesSummary || {};

  // Add summary section
  yPos = addMetadata(doc, {
    'Total Value': `LKR ${summary.totalValue?.toLocaleString() || '0'}`,
    'Total Invoices': (summary.totalInvoices || summary.totalOrders || '0').toString(),
    'Total Items': (summary.totalItems || '0').toString(),
    'Total Quantity': (summary.totalQuantity || '0').toString()
  });

  // Add sales details table
  const salesHeaders = ['Invoice Number', 'Date', 'Customer', 'Tax Amount', 'Total Amount', 'Status'];
  const invoices = salesSummary?.invoices || salesDetails || [];

  const salesRows = invoices.map((invoice: any) => [
    invoice.invoiceNumber || invoice.orderNumber || '-',
    invoice.invoiceDate || invoice.orderDate ? format(new Date(invoice.invoiceDate || invoice.orderDate), 'PP') : '-',
    invoice.Customer?.name || invoice.customerName || '-',
    invoice.taxAmount ? `LKR ${invoice.taxAmount.toLocaleString()}` : 'LKR 0',
    (invoice.total || invoice.totalAmount) ? `LKR ${(invoice.total || invoice.totalAmount).toLocaleString()}` : 'LKR 0',
    invoice.status || '-'
  ]);
  const salesColumnWidths = [35, 30, 45, 30, 35, 25];

  drawTable(doc, PDF_STYLES.margin.left, yPos, salesHeaders, salesRows, salesColumnWidths, {
    headerColor: [41, 128, 185],
    rowHeight: 10,
    fontSize: PDF_STYLES.fontSize.normal
  });

  doc.save('sales-report.pdf');
};

// Generate GRN Report PDF
export const generateGRNReportPDF = (grnSummary: any[]) => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, 'Goods Receipt Note Report', `Generated on ${format(new Date(), 'PPP')}`);

  // Add table
  const grnHeaders = ['GRN Number', 'Date', 'Supplier', 'Store', 'Status', 'Total Value'];
  const grnRows = grnSummary.map((grn: any) => [
    grn.grnNumber || '-',
    grn.grnDate ? format(new Date(grn.grnDate), 'PP') : '-',
    grn.Supplier?.name || '-',
    grn.Store?.name || '-',
    grn.status || '-',
    grn.totalValue ? `LKR ${grn.totalValue.toLocaleString()}` : 'LKR 0'
  ]);
  const grnColumnWidths = [30, 30, 40, 40, 30, 40];

  drawTable(doc, PDF_STYLES.margin.left, yPos, grnHeaders, grnRows, grnColumnWidths, {
    headerColor: [41, 128, 185],
    rowHeight: 10,
    fontSize: PDF_STYLES.fontSize.normal
  });

  doc.save('grn-report.pdf');
};

// Generate GIN Report PDF
export const generateGINReportPDF = (ginSummary: any[]) => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, 'Goods Issue Note Report', `Generated on ${format(new Date(), 'PPP')}`);

  // Add table
  const ginHeaders = ['GIN Number', 'Date', 'Issue Store', 'Transfer Store', 'Status', 'Items'];
  const ginRows = ginSummary.map((gin: any) => [
    gin.ginNumber || '-',
    gin.ginDate ? format(new Date(gin.ginDate), 'PP') : '-',
    gin.IssueStore?.name || '-',
    gin.TransferStore?.name || '-',
    gin.status || '-',
    gin.GINItems?.length || 0
  ]);
  const ginColumnWidths = [30, 30, 40, 40, 30, 30];

  drawTable(doc, PDF_STYLES.margin.left, yPos, ginHeaders, ginRows, ginColumnWidths, {
    headerColor: [41, 128, 185],
    rowHeight: 10,
    fontSize: PDF_STYLES.fontSize.normal
  });

  doc.save('gin-report.pdf');
};

// Generate Dashboard Report PDF
export const generateDashboardPDF = async (dashboardRef: HTMLDivElement) => {
  try {
    // Capture the dashboard content as an image
    const canvas = await html2canvas(dashboardRef, {
      scale: 2,
      logging: false,
      useCORS: true
    });

    const imageData = canvas.toDataURL('image/png');

    // Create PDF with captured image
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    doc.addImage(imageData, 'PNG', 0, 0, canvas.width, canvas.height);
    doc.save('dashboard-report.pdf');
  } catch (error) {
    console.error('Error generating dashboard PDF:', error);
    throw error;
  }
};

// Generate Analytics Report PDF
// Generate Bincard Report PDF with modern design
export const generateBincardPDF = (binCardReport: any) => {
  // Create PDF with modern A4 format
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'A4'
  });

  // Add a subtle background color
  doc.setFillColor(249, 250, 251); // Light gray background
  doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F');

  // Add a modern header with accent bar
  doc.setFillColor(41, 128, 185);
  doc.rect(0, 0, doc.internal.pageSize.width, 10, 'F');

  let yPos = addHeader(doc, 'Bincard Report', `Generated on ${format(new Date(), 'PPP')}`);

  // Calculate summary values
  const totalIn = binCardReport.data.reduce((sum: number, record: any) => sum + (record.inQty || 0), 0);
  const totalOut = binCardReport.data.reduce((sum: number, record: any) => sum + (record.outQty || 0), 0);
  const netMovement = totalIn - totalOut;

  // Add enhanced metadata section with summary cards
  const metadataLeft = {
    'Item': binCardReport.itemName || '-',
    'Location': binCardReport.location || '-'
  };

  const metadataRight = {
    'Period': `${format(new Date(binCardReport.startDate), 'PP')} - ${format(new Date(binCardReport.endDate), 'PP')}`,
    'Opening Balance': binCardReport.data[0]?.balance.toString() || '0'
  };

  // Draw metadata in two columns
  doc.setFontSize(PDF_STYLES.fontSize.normal);
  doc.setTextColor(44, 62, 80);

  let leftY = yPos + 10;
  Object.entries(metadataLeft).forEach(([key, value]) => {
    doc.text(`${key}: ${value}`, PDF_STYLES.margin.left, leftY);
    leftY += 7;
  });

  let rightY = yPos + 10;
  Object.entries(metadataRight).forEach(([key, value]) => {
    doc.text(`${key}: ${value}`, doc.internal.pageSize.width / 2 + 10, rightY);
    rightY += 7;
  });

  yPos = Math.max(leftY, rightY) + 10;

  // Add summary boxes
  const boxWidth = (doc.internal.pageSize.width - 40) / 3;
  const boxHeight = 20;
  const startX = PDF_STYLES.margin.left;

  // Summary boxes background
  doc.setFillColor(236, 240, 241); // Light blue-gray
  doc.roundedRect(startX, yPos, boxWidth - 5, boxHeight, 3, 3, 'F');
  doc.roundedRect(startX + boxWidth, yPos, boxWidth - 5, boxHeight, 3, 3, 'F');
  doc.roundedRect(startX + (boxWidth * 2), yPos, boxWidth - 5, boxHeight, 3, 3, 'F');

  // Summary boxes content
  doc.setFontSize(PDF_STYLES.fontSize.normal);
  doc.setTextColor(44, 62, 80);

  // Total IN
  doc.text('Total IN', startX + 5, yPos + 7);
  doc.setFontSize(PDF_STYLES.fontSize.header);
  doc.text(totalIn.toLocaleString(), startX + 5, yPos + 16);

  // Total OUT
  doc.setFontSize(PDF_STYLES.fontSize.normal);
  doc.text('Total OUT', startX + boxWidth + 5, yPos + 7);
  doc.setFontSize(PDF_STYLES.fontSize.header);
  doc.text(totalOut.toLocaleString(), startX + boxWidth + 5, yPos + 16);

  // Net Movement
  doc.setFontSize(PDF_STYLES.fontSize.normal);
  doc.text('Net Movement', startX + (boxWidth * 2) + 5, yPos + 7);
  doc.setFontSize(PDF_STYLES.fontSize.header);

  // Set color based on net movement (green for positive, red for negative)
  if (netMovement >= 0) {
    doc.setTextColor(46, 204, 113); // Green
  } else {
    doc.setTextColor(231, 76, 60); // Red
  }
  doc.text(netMovement.toLocaleString(), startX + (boxWidth * 2) + 5, yPos + 16);

  yPos += boxHeight + 15;

  // Reset text color for table
  doc.setTextColor(44, 62, 80);

  // Add movement history table with modern styling
  const headers = ['Date', 'Reference No', 'Description', 'IN', 'OUT', 'Balance'];
  const rows = binCardReport.data.map((record: any) => [
    format(new Date(record.date), 'PP'),
    record.refNo || '-',
    record.description || '-',
    record.inQty.toLocaleString(),
    record.outQty.toLocaleString(),
    record.balance.toLocaleString()
  ]);
  const columnWidths = [30, 35, 45, 20, 20, 20];

  // Draw table with alternating row colors
  drawTable(doc, PDF_STYLES.margin.left, yPos, headers, rows, columnWidths, {
    headerColor: [41, 128, 185],
    rowHeight: 10, // Slightly taller rows for better readability
    fontSize: PDF_STYLES.fontSize.normal
  });

  // Add footer with page number
  doc.setFontSize(8);
  doc.setTextColor(127, 140, 141);
  doc.text(
    `Page 1`, // Simplified since jsPDF doesn't expose page count directly
    doc.internal.pageSize.width / 2,
    doc.internal.pageSize.height - 10,
    { align: 'center' }
  );

  doc.save(`bincard-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const generateAnalyticsPDF = (inventoryValuation: any[]) => {
  const doc = new jsPDF();
  let yPos = addHeader(doc, 'Inventory Valuation Report', `Generated on ${format(new Date(), 'PPP')}`);

  // Calculate totals
  const totals = inventoryValuation.reduce((acc: { totalQty: number; totalValue: number }, item: any) => ({
    totalQty: acc.totalQty + (item.totalQty || 0),
    totalValue: acc.totalValue + (item.totalValue || 0)
  }), { totalQty: 0, totalValue: 0 });

  // Add summary section
  yPos = addMetadata(doc, {
    'Total Items': inventoryValuation.length.toString(),
    'Total Quantity': totals.totalQty.toString(),
    'Total Value': `LKR ${totals.totalValue.toLocaleString()}`
  });

  // Add table
  const analyticsHeaders = ['Item', 'Total Qty', 'Avg Cost Price', 'Total Value'];
  const analyticsRows = inventoryValuation.map((item: any) => [
    item.itemName || '-',
    item.totalQty || 0,
    item.avgCostPrice ? `LKR ${item.avgCostPrice.toLocaleString()}` : 'LKR 0',
    item.totalValue ? `LKR ${item.totalValue.toLocaleString()}` : 'LKR 0'
  ]);
  const analyticsColumnWidths = [60, 30, 40, 40];

  drawTable(doc, PDF_STYLES.margin.left, yPos, analyticsHeaders, analyticsRows, analyticsColumnWidths, {
    headerColor: [41, 128, 185],
    rowHeight: 10,
    fontSize: PDF_STYLES.fontSize.normal
  });

  doc.save('inventory-valuation.pdf');
};

// Generate Receipt PDF
export const generateReceiptPDF = (receipt: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'A4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;

  // Helper: Right align text
  const rightText = (text: string, y: number, x: number = pageWidth - margin) => {
    doc.text(text, x, y, { align: "right" });
  };

  // 1. Header Section
  let yPos = 20;

  // Logo - Code Aqua ERP
  try {
    doc.addImage("/assets/bighill_logo.png", "PNG", margin, yPos - 10, 40, 35);
  } catch (e) {
    console.error("Failed to add logo to PDF:", e);
    doc.setTextColor(76, 175, 80);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Code Aqua", margin, yPos + 10);
  }

  // Company Details
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  const companyX = margin + 50;
  doc.text("Code Aqua ERP Solutions", companyX, yPos);

  yPos += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("4th Floor, Forbes & Walkers Building,", companyX, yPos);
  yPos += 4;
  doc.text("38/46 Nawam Mawatha,", companyX, yPos);
  yPos += 4;
  doc.text("Colombo 00200", companyX, yPos);
  yPos += 4;
  doc.text("VAT: 102861841 7000", companyX, yPos);
  yPos += 4;
  doc.text("Contact: 072 796 6966", companyX, yPos);

  // Title (Right)
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  rightText("OFFICIAL RECEIPT", yPos - 12);

  yPos += 15;

  // 2. Customer Info
  const boxTop = yPos;

  doc.setFillColor(240, 245, 250);
  doc.rect(margin, yPos, 85, 6, 'F');

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("RECEIVED FROM", margin + 2, yPos + 4);

  yPos += 10;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const customer = receipt.customer || {};
  const customerName = customer.name || receipt.customerName || "-";
  const customerAddress = customer.address || "-";
  const customerContact = customer.contactNumber || "-";

  doc.text(customerName, margin, yPos);
  yPos += 5;
  const addressLines = doc.splitTextToSize(String(customerAddress), 80);
  doc.text(addressLines, margin, yPos);
  yPos += (addressLines.length * 4);
  doc.text(String(customerContact), margin, yPos);

  yPos = Math.max(yPos, boxTop + 25) + 5;

  // 3. Info Strip
  doc.setFillColor(235, 240, 245);
  doc.rect(margin, yPos, pageWidth - (margin * 2), 12, 'F');

  const infoHeaders = ["RECEIPT NO.", "DATE", "TOTAL PAID", "STATUS"];
  const startX = margin + 5;
  const gap = (pageWidth - (margin * 2)) / 4;

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);

  infoHeaders.forEach((h, i) => {
    doc.text(h, startX + (i * gap), yPos + 4);
  });

  // Values
  const infoValues = [
    receipt.receiptNo || "-",
    receipt.receiptDate ? format(new Date(receipt.receiptDate), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy"),
    `LKR ${receipt.totalPaid?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}`,
    "COMPLETED"
  ];

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  infoValues.forEach((v, i) => {
    doc.text(String(v), startX + (i * gap), yPos + 9);
  });

  yPos += 20;

  // 4. Invoices Table
  if (receipt.invoices && receipt.invoices.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICES PAID", margin, yPos);
    yPos += 5;

    doc.setFillColor(240, 245, 250);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');

    const invCols = [
      { label: "INVOICE #", x: margin + 5, align: "left" },
      { label: "INVOICE TOTAL", x: margin + 60, align: "right" },
      { label: "PAID AMOUNT", x: margin + 110, align: "right" },
      { label: "BALANCE", x: pageWidth - margin - 5, align: "right" },
    ];

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    invCols.forEach(c => {
      doc.text(c.label, c.x, yPos + 5, { align: c.align as any });
    });

    yPos += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    receipt.invoices.forEach((inv: any) => {
      const invNo = inv.invoice?.invoiceNumber || `Invoice ${inv.invoiceId}`;
      const invTotal = inv.invoiceAmount || 0;
      const paidAmt = inv.paidAmount || 0;
      const balance = inv.balanceAmount || 0;

      doc.text(invNo, invCols[0].x, yPos);
      doc.text(invTotal.toLocaleString('en-US', { minimumFractionDigits: 2 }), invCols[1].x, yPos, { align: "right" });
      doc.text(paidAmt.toLocaleString('en-US', { minimumFractionDigits: 2 }), invCols[2].x, yPos, { align: "right" });
      doc.text(balance.toLocaleString('en-US', { minimumFractionDigits: 2 }), invCols[3].x, yPos, { align: "right" });

      yPos += 7;
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
    });
    yPos += 5;
  }

  // 5. Payment Details
  if (receipt.payments && receipt.payments.length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT METHODS", margin, yPos);
    yPos += 5;

    doc.setFillColor(240, 245, 250);
    doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');

    const payCols = [
      { label: "METHOD", x: margin + 5, align: "left" },
      { label: "REFERENCE", x: margin + 60, align: "left" },
      { label: "BANK / DETAILS", x: margin + 110, align: "left" },
      { label: "AMOUNT", x: pageWidth - margin - 5, align: "right" },
    ];

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    payCols.forEach(c => {
      doc.text(c.label, c.x, yPos + 5, { align: c.align as any });
    });

    yPos += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    receipt.payments.forEach((p: any) => {
      const type = p.PaymentType?.paymentTypeName || p.paymentTypeName || "N/A";
      const reference = p.referenceNo || p.reference || "-";
      let details = p.bankName || "-";
      if (p.bankBranchName) details += ` (${p.bankBranchName})`;
      if (p.chequeNo) details = `Chq: ${p.chequeNo}`;

      const amount = p.paymentAmount || p.amount || 0;

      doc.text(type, payCols[0].x, yPos);
      doc.text(reference, payCols[1].x, yPos);
      doc.text(details, payCols[2].x, yPos);
      doc.text(amount.toLocaleString('en-US', { minimumFractionDigits: 2 }), payCols[3].x, yPos, { align: "right" });

      yPos += 7;
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }
    });
    yPos += 5;
  }

  // 6. Summary and Notes Footer
  const footerY = Math.max(yPos, pageHeight - 80);

  // Notes (Left side)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("PAYMENT NOTES", margin, footerY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  if (receipt.remarks) {
    const remarksLines = doc.splitTextToSize(String(receipt.remarks), 100);
    doc.text(remarksLines, margin, footerY + 5);
  } else {
    doc.text("Payment received with thanks.", margin, footerY + 5);
  }

  // Total Box (Right side)
  const summaryX = pageWidth - margin - 80;
  const valueX = pageWidth - margin - 5;

  doc.setFillColor(235, 240, 245);
  doc.rect(summaryX - 5, footerY, 80 + 5, 15, 'F');

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL RECEIVED", summaryX, footerY + 10);
  rightText(`LKR ${receipt.totalPaid?.toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}`, footerY + 10, valueX);

  // Footer Branding
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont("helvetica", "normal");
  doc.text(
    `This is a computer-generated receipt. Generated on ${format(new Date(), 'PPP p')}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  );

  doc.save(`Receipt-${receipt.receiptNo || 'Draft'}.pdf`);
};

// Helper to convert number to words (Simple version for LKR)
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    let res = '';
    if (n >= 100) {
      res += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      res += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      res += teens[n - 10] + ' ';
      return res;
    }
    if (n > 0) {
      res += ones[n] + ' ';
    }
    return res;
  };

  if (num === 0) return 'Zero';

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num % 1) * 100);

  let result = '';

  const billion = Math.floor(integerPart / 1000000000);
  const million = Math.floor((integerPart % 1000000000) / 1000000);
  const thousand = Math.floor((integerPart % 1000000) / 1000);
  const remainder = integerPart % 1000;

  if (billion > 0) result += convertLessThanThousand(billion) + 'Billion ';
  if (million > 0) result += convertLessThanThousand(million) + 'Million ';
  if (thousand > 0) result += convertLessThanThousand(thousand) + 'Thousand ';
  if (remainder > 0) result += convertLessThanThousand(remainder);

  result = result.trim() + ' Rupees ONLY';
  if (decimalPart > 0) {
    result = result.replace(' ONLY', '') + ' and ' + convertLessThanThousand(decimalPart).trim() + ' Cents ONLY';
  }

  return result.toUpperCase();
};

// Generate Bill Payment Voucher PDF (Supports BillPayments and OnePayments)
export const generatePaymentVoucherPDF = (payment: any) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'A4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  const isOnePayment = !!(payment.lines || payment.Lines);
  const totalAmount = parseFloat((payment.amount || payment.totalAmount || payment.totalPaymentAmount || '0').toString());

  let yPos = 30;

  // 1. Header (Centered)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("CODE AQUA ERP PVT LTD", pageWidth / 2, yPos, { align: "center" });

  yPos += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("4th Floor, Forbes & Walkers Building, 38/46 Nawam Mawatha, Colombo 00200", pageWidth / 2, yPos, { align: "center" });

  yPos += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PAYMENT VOUCHER", pageWidth / 2, yPos, { align: "center" });

  yPos += 15;

  // 2. Summary Info (Left)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // For One-Time Payment, use description as the destination/header
  const supplierName = isOnePayment
    ? (payment.description || "ONE-TIME PAYMENT")
    : (payment.Supplier?.name || "-");

  doc.text(`${isOnePayment ? "Description" : "Supplier Name"}: ${supplierName}`, margin, yPos);

  yPos += 6;
  const methods = payment.PaymentMethods || payment.paymentMethods || payment.Payments || payment.Details || [];
  // Manage multiple payment methods for display
  const paymentTypesStr = methods.map((m: any) => {
    const type = m.paymentMethod || m.PaymentType?.paymentTypeName || "Other";
    const account = m.LedgerAccount?.name || m.ledgerAccount?.name || "Other";
    const amt = parseFloat((m.amount || '0').toString()).toLocaleString('en-US', { minimumFractionDigits: 2 });
    return `${type} - ${account} - ${amt}`;
  }).join(", ");

  doc.text(`Payment Type: ${paymentTypesStr}`, margin, yPos);

  if (isOnePayment) {
    yPos += 6;
    doc.text(`Reference Number: ${payment.referenceNumber}`, margin, yPos);
  }

  yPos += 10;

  // 3. Main Data Table
  const tableHeaders = ["Date", "Ref / Inv No", "Memo", "Payment"];
  const colWidths = [30, 40, 65, 35];

  // Draw Header
  doc.setFont("helvetica", "bold");
  let xPos = margin;
  tableHeaders.forEach((h, i) => {
    doc.rect(xPos, yPos, colWidths[i], 8);
    doc.text(h, xPos + colWidths[i] / 2, yPos + 5, { align: "center" });
    xPos += colWidths[i];
  });

  yPos += 8;
  doc.setFont("helvetica", "normal");

  // Draw Rows
  const listItems = isOnePayment
    ? (payment.Lines || payment.lines || []).filter((l: any) => l.lineType === 'Debit') // Show debit lines as expenses/purchases
    : (payment.Entries || []);

  const maxRows = Math.max(listItems.length, 5);

  for (let i = 0; i < maxRows; i++) {
    const item = listItems[i];
    xPos = margin;

    // Column Rects
    doc.rect(xPos, yPos, colWidths[0], 8);
    doc.rect(xPos + colWidths[0], yPos, colWidths[1], 8);
    doc.rect(xPos + colWidths[0] + colWidths[1], yPos, colWidths[2], 8);
    doc.rect(xPos + colWidths[0] + colWidths[1] + colWidths[2], yPos, colWidths[3], 8);

    if (item) {
      let date = "-";
      let refNo = "-";
      let memo = "-";
      let amtStr = "0.00";

      if (isOnePayment) {
        date = payment.paymentDate ? format(new Date(payment.paymentDate), "dd/MM/yyyy") : "-";
        refNo = payment.paymentNumber || "-";
        memo = (item.description || item.LedgerAccount?.name || item.ledgerAccount?.name || "");
        amtStr = parseFloat((item.amount || '0').toString()).toLocaleString('en-US', { minimumFractionDigits: 2 });
      } else {
        date = item.BillEntry?.billDate ? format(new Date(item.BillEntry.billDate), "dd/MM/yyyy") : "-";
        refNo = item.BillEntry?.billNumber || "-";
        memo = (item.description || item.BillEntry?.description || "") + " " + (item.BillEntry?.supplierInvoiceNumber || "");
        amtStr = parseFloat((item.amount || '0').toString()).toLocaleString('en-US', { minimumFractionDigits: 2 });
      }

      doc.text(date, xPos + colWidths[0] / 2, yPos + 5, { align: "center" });
      doc.text(refNo, xPos + colWidths[0] + colWidths[1] / 2, yPos + 5, { align: "center" });

      const truncatedMemo = memo.length > 35 ? memo.substring(0, 32) + "..." : memo;
      doc.text(truncatedMemo, xPos + colWidths[0] + colWidths[1] + 2, yPos + 5);

      doc.text(amtStr, xPos + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] - 2, yPos + 5, { align: "right" });
    }

    yPos += 8;
    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = 30;
    }
  }

  // Table Footer
  const amountWords = numberToWords(totalAmount);

  // Amount in Word Row
  xPos = margin;
  doc.setFont("helvetica", "bold");
  doc.rect(xPos, yPos, colWidths[0] + colWidths[1], 12);
  doc.text("Amount in Word", xPos + 2, yPos + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const wrappedWords = doc.splitTextToSize(amountWords, colWidths[0] + colWidths[1] - 4);
  doc.text(wrappedWords, xPos + 2, yPos + 9);

  // Total Row
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.rect(xPos + colWidths[0] + colWidths[1], yPos, colWidths[2], 12);
  doc.text("Total", xPos + colWidths[0] + colWidths[1] + 2, yPos + 7);

  doc.rect(xPos + colWidths[0] + colWidths[1] + colWidths[2], yPos, colWidths[3], 12);
  doc.text(totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }), pageWidth - margin - 2, yPos + 7, { align: "right" });

  yPos += 30;

  // 4. Signatures Section
  const sigWidth = 45;
  const sigGap = (contentWidth - (sigWidth * 3)) / 2;

  // Row 1
  let sigX = margin;
  const sigLabels = ["Prepared By", "Checked By", "Authorized by"];

  sigLabels.forEach((label) => {
    const approvedBy = isOnePayment ? (payment.approvedByUsername || "-") : (payment.ApprovedByUser?.fullName || "-");
    const sigValues2 = [payment.Creator?.fullName || payment.createdByUsername || "-", "", ""];
    doc.setFont("helvetica", "normal");
    doc.text("..................................", sigX + sigWidth / 2, yPos, { align: "center" });
    if (label === "Prepared By") doc.text(sigValues2[0], sigX + sigWidth / 2, yPos - 2, { align: "center" });
    doc.text(label, sigX + sigWidth / 2, yPos + 5, { align: "center" });
    sigX += sigWidth + sigGap;
  });

  yPos += 25;

  // Row 2
  sigX = margin;
  const sigLabels2 = ["Name", "NIC No", "Signature"];

  sigLabels2.forEach((label, i) => {
    doc.setFont("helvetica", "normal");
    doc.text("..................................", sigX + sigWidth / 2, yPos, { align: "center" });
    doc.text(label, sigX + sigWidth / 2, yPos + 5, { align: "center" });
    sigX += sigWidth + sigGap;
  });

  doc.save(`Voucher-${payment.paymentNumber || 'Draft'}.pdf`);
};

// =================== CHEQUE PRINT ===================

export interface ChequePrintData {
  payee: string;           // Name on the cheque
  amount: number;          // Numeric amount
  chequeDate: string;      // Date on cheque (ISO string or similar)
  chequeNo?: string;       // Cheque number
  bankName?: string;       // Drawee bank name
  bankBranch?: string;     // Bank branch
  referenceNo?: string;    // Payment reference
  documentNo?: string;     // Source document number (receipt/payment number)
  documentType?: string;   // "Receipt" | "Bill Payment" | "One-Time Payment" | "Supplier Payment"
  preparedBy?: string;
}

/**
 * Generate a cheque print PDF using ANSI business cheque standard size:
 * 8.5" × 3.5" (215.9 mm × 88.9 mm)
 * This matches standard business cheque stock used by banks in most regions.
 */
export const generateChequePDF = (data: ChequePrintData) => {
  // ANSI Business Cheque: 8.5" × 3.5"  →  215.9 mm × 88.9 mm
  const W = 215.9;
  const H = 88.9;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [H, W]   // jsPDF landscape: [height, width]
  });

  // After landscape swap, page is W wide × H tall
  const pageW = doc.internal.pageSize.width;  // 215.9
  const pageH = doc.internal.pageSize.height; // 88.9

  // Layout constants (no outer margin — cheque fills the page)
  const mL = 6;   // left margin
  const mR = 6;   // right margin
  const mT = 5;   // top margin
  const mB = 8;   // bottom margin (MICR area)

  // ── BACKGROUND ──────────────────────────────────────────────────────────────
  // Very subtle cream tint
  doc.setFillColor(253, 252, 248);
  doc.rect(0, 0, pageW, pageH, 'F');

  // ── TOP BORDER LINE ─────────────────────────────────────────────────────────
  doc.setDrawColor(30, 60, 120);
  doc.setLineWidth(0.8);
  doc.line(mL, mT, pageW - mR, mT);

  // ── COMPANY NAME (top-left) ─────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 60, 120);
  doc.text('CODE AQUA ERP (PVT) LTD', mL, mT + 6);

  // Address / tagline (optional)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('No. 1, Galle Road, Colombo 03, Sri Lanka', mL, mT + 11);

  // ── BANK INFO (top-center) ──────────────────────────────────────────────────
  const bankDisplay = [
    data.bankName || '',
    data.bankBranch ? `(${data.bankBranch})` : ''
  ].filter(Boolean).join(' ');

  if (bankDisplay) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(bankDisplay, pageW / 2, mT + 6, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text('Drawee Bank', pageW / 2, mT + 11, { align: 'center' });
  }

  // ── CHEQUE NUMBER (top-right) ────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 60, 120);
  doc.text(`No. ${data.chequeNo || '____________'}`, pageW - mR, mT + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('CHEQUE', pageW - mR, mT + 11, { align: 'right' });

  // ── SEPARATOR LINE ───────────────────────────────────────────────────────────
  doc.setDrawColor(200, 210, 230);
  doc.setLineWidth(0.3);
  doc.line(mL, mT + 14, pageW - mR, mT + 14);

  // ── DATE (top-right, below cheque no) ────────────────────────────────────────
  const dateY = mT + 20;
  const labelColor: [number, number, number] = [120, 120, 120];
  const valueColor: [number, number, number] = [20, 20, 20];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...labelColor);
  doc.text('Date:', pageW - mR - 60, dateY);

  const chequeDate = data.chequeDate
    ? (() => { try { return format(new Date(data.chequeDate), 'dd / MM / yyyy'); } catch { return data.chequeDate; } })()
    : '____ / ____ / ________';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...valueColor);
  doc.text(chequeDate, pageW - mR - 48, dateY);

  // Underline for date
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.25);
  doc.line(pageW - mR - 49, dateY + 1, pageW - mR, dateY + 1);

  // ── PAY TO LINE ──────────────────────────────────────────────────────────────
  const payY = dateY + 11;
  const amtBoxW = 52;
  const amtBoxX = pageW - mR - amtBoxW;
  const payLineEnd = amtBoxX - 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...labelColor);
  doc.text('Pay to the order of:', mL, payY);

  // Payee name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...valueColor);
  const payeeMaxWidth = payLineEnd - mL - 42;
  const payeeText = data.payee || '___________________________________';
  const payeeLines = doc.splitTextToSize(payeeText, payeeMaxWidth);
  doc.text(payeeLines, mL + 42, payY);

  // Payee underline
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.25);
  doc.line(mL + 41, payY + 1, payLineEnd, payY + 1);
  if (payeeLines.length > 1) {
    doc.line(mL, payY + 6, payLineEnd, payY + 6);
  }

  // "or Bearer" right of payee
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text('or Bearer', payLineEnd - 1, payY + 5, { align: 'right' });

  // ── AMOUNT BOX (right side) ──────────────────────────────────────────────────
  const amtBoxY = mT + 16;
  const amtBoxH = 26;

  doc.setDrawColor(30, 60, 120);
  doc.setLineWidth(0.5);
  doc.setFillColor(245, 248, 255);
  doc.roundedRect(amtBoxX, amtBoxY, amtBoxW, amtBoxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(80, 100, 160);
  doc.text('LKR', amtBoxX + 3, amtBoxY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 40, 90);
  const amountStr = (data.amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  doc.text(amountStr, amtBoxX + amtBoxW - 3, amtBoxY + 19, { align: 'right' });

  // ── AMOUNT IN WORDS ───────────────────────────────────────────────────────────
  const wordsY = payY + 13;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...labelColor);
  doc.text('Sri Lanka Rupees:', mL, wordsY);

  const amountWords = numberToWords(data.amount || 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...valueColor);
  const wordsMaxW = payLineEnd - mL - 38;
  const wordsLines = doc.splitTextToSize(`${amountWords}  ****`, wordsMaxW);
  doc.text(wordsLines, mL + 38, wordsY);

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.25);
  wordsLines.forEach((_: string, i: number) => {
    doc.line(mL + 37, wordsY + 1.5 + i * 5.5, payLineEnd, wordsY + 1.5 + i * 5.5);
  });

  // ── SIGNATURE LINE ────────────────────────────────────────────────────────────
  const sigY = pageH - mB - 13;
  const sigLineStart = pageW - mR - 70;
  const sigLineEnd   = pageW - mR;

  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.4);
  doc.line(sigLineStart, sigY, sigLineEnd, sigY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...labelColor);
  doc.text('Authorized Signature', (sigLineStart + sigLineEnd) / 2, sigY + 4, { align: 'center' });

  // ── REFERENCE / MEMO (bottom-left) ───────────────────────────────────────────
  const refY = sigY + 1;
  const refParts: string[] = [];
  if (data.documentType) refParts.push(data.documentType);
  if (data.documentNo)   refParts.push(`Ref: ${data.documentNo}`);
  if (data.referenceNo)  refParts.push(`Chq Ref: ${data.referenceNo}`);
  if (data.preparedBy)   refParts.push(`Prepared by: ${data.preparedBy}`);

  if (refParts.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(130, 130, 130);
    doc.text(refParts.join('   |   '), mL, refY);
  }

  // ── BOTTOM BORDER ─────────────────────────────────────────────────────────────
  doc.setDrawColor(30, 60, 120);
  doc.setLineWidth(0.5);
  doc.line(mL, pageH - mB - 5, pageW - mR, pageH - mB - 5);

  // ── MICR-STYLE STRIP ─────────────────────────────────────────────────────────
  // Positioned at the very bottom — matches physical MICR print zone (0.625" from bottom)
  const micrY = pageH - mB + 1;
  doc.setFillColor(245, 245, 245);
  doc.rect(0, micrY, pageW, mB - 1, 'F');

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  const chequeNoMICR = data.chequeNo?.replace(/\D/g, '').padStart(6, '0') || '000000';
  const micrText = `⑆ ${chequeNoMICR} ⑆   ⑆ 0000 ⑆   ⑆ 000000000 ⑆`;
  doc.text(micrText, pageW / 2, micrY + 4, { align: 'center' });

  // ── SAVE ─────────────────────────────────────────────────────────────────────
  const safeDocNo = (data.documentNo || data.chequeNo || 'cheque').replace(/[^a-zA-Z0-9-_]/g, '_');
  doc.save(`Cheque-${safeDocNo}.pdf`);
};

export const generateSalesByItemPDF = (itemSales: any) => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const margin = 15;
  const contentW = pageW - margin * 2;
  const itemStats = itemSales.itemStats;
  const fmtCur = (n: number) => `LKR ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  // ── PAGE 1: Header + KPI + Customer + Monthly ──────────────────────────
  let y = margin;

  // Company branding bar
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageW, 32, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Code Aqua ERP Solutions', margin, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('4th Floor, Forbes & Walkers Building, 38/46 Nawam Mawatha, Colombo 00200', margin, 21);

  // Report title (right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ITEM DETAIL SUMMARY', pageW - margin, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Generated: ${format(new Date(), 'PPP')}`, pageW - margin, 21, { align: 'right' });

  y = 40;

  // Item name banner
  doc.setFillColor(240, 245, 252);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 95);
  doc.text(`Item: ${itemStats.itemName}`, margin + 6, y + 9);
  y += 22;

  // ── KPI Summary Cards (4 boxes) ────────────────────────────────────────
  const boxW = (contentW - 9) / 4;
  const boxH = 22;
  const kpis = [
    { label: 'Total Qty Sold', value: (itemStats.totalQuantitySold || 0).toLocaleString(), color: [59, 130, 246] as [number, number, number] },
    { label: 'Total Revenue', value: fmtCur(itemStats.totalRevenue), color: [16, 185, 129] as [number, number, number] },
    { label: 'Average Price', value: fmtCur(itemStats.averagePrice), color: [245, 158, 11] as [number, number, number] },
    { label: 'Total Invoices', value: (itemStats.totalInvoices || 0).toString(), color: [139, 92, 246] as [number, number, number] },
  ];
  kpis.forEach((kpi, i) => {
    const bx = margin + i * (boxW + 3);
    // Card background
    doc.setFillColor(250, 250, 255);
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, boxW, boxH, 1.5, 1.5, 'FD');
    // Color accent bar
    doc.setFillColor(...kpi.color);
    doc.rect(bx, y, 3, boxH, 'F');
    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(kpi.label, bx + 7, y + 8);
    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(kpi.value, bx + 7, y + 17);
  });
  y += boxH + 10;

  // ── Top Customers Section ──────────────────────────────────────────────
  const customers = Object.entries(itemStats.customerFrequency || {})
    .sort((a: any, b: any) => b[1].totalQuantity - a[1].totalQuantity)
    .slice(0, 10);
  const monthly = Object.entries(itemStats.monthlyBreakdown || {})
    .sort(([a]: any, [b]: any) => b.localeCompare(a));

  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 95);
  doc.text('TOP CUSTOMERS', margin, y);
  y += 6;

  if (customers.length > 0) {
    const custHeaders = ['Customer', 'Qty Bought', 'Total Spent'];
    const custRows = customers.map(([name, stats]: [string, any]) => [
      name.length > 35 ? name.substring(0, 32) + '...' : name,
      (stats.totalQuantity || 0).toString(),
      fmtCur(stats.totalSpent)
    ]);
    const custWidths = [75, 30, 40];
    y = drawTable(doc, margin, y, custHeaders, custRows, custWidths, {
      headerColor: [41, 128, 185],
      rowHeight: 8,
      fontSize: 8,
      alignments: ['left', 'center', 'right']
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('No customer data available.', margin, y + 4);
    y += 12;
  }
  y += 8;

  // ── Monthly Breakdown Section ──────────────────────────────────────────
  if (y > pageH - 60) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 58, 95);
  doc.text('MONTHLY BREAKDOWN', margin, y);
  y += 6;

  if (monthly.length > 0) {
    const monthHeaders = ['Month', 'Qty Sold', 'Revenue'];
    const monthRows = monthly.map(([month, stats]: [string, any]) => [
      month,
      (stats.quantity || 0).toString(),
      fmtCur(stats.revenue)
    ]);
    const monthWidths = [50, 30, 45];
    y = drawTable(doc, margin, y, monthHeaders, monthRows, monthWidths, {
      headerColor: [16, 185, 129],
      rowHeight: 8,
      fontSize: 8,
      alignments: ['left', 'center', 'right']
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('No monthly data available.', margin, y + 4);
    y += 12;
  }

  // ── Sales History (new page, landscape-style full width) ───────────────
  doc.addPage();
  y = 15;

  // Section header bar
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageW, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text(`SALES HISTORY — ${itemStats.itemName}`, margin, 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${(itemSales.sales || []).length} records`, pageW - margin, 8, { align: 'right' });
  y = 18;

  const historyHeaders = ['Date', 'Invoice #', 'Customer', 'Qty', 'Price', 'Disc %', 'Total'];
  const historyRows = (itemSales.sales || []).map((sale: any) => [
    sale.Invoice?.invoiceDate ? format(new Date(sale.Invoice.invoiceDate), 'dd/MM/yyyy') : '-',
    sale.Invoice?.invoiceNumber || '-',
    (sale.Invoice?.Customer?.name || '-').substring(0, 30),
    (sale.qty || 0).toString(),
    fmtCur(sale.price),
    sale.discount > 0 ? `${sale.discount}%` : '-',
    fmtCur(sale.total)
  ]);
  const historyWidths = [22, 28, 52, 16, 24, 14, 24];
  const historyAligns: ('left'|'center'|'right')[] = ['left', 'left', 'left', 'right', 'right', 'center', 'right'];

  y = drawTable(doc, margin, y, historyHeaders, historyRows, historyWidths, {
    headerColor: [41, 128, 185],
    rowHeight: 8,
    fontSize: 8,
    alignments: historyAligns
  });

  // Footer on last page
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('This is a system-generated report. Code Aqua ERP Solutions.', pageW / 2, pageH - 8, { align: 'center' });

  doc.save(`Item-Summary-${itemStats.itemName.replace(/[^a-z0-9]/gi, '_')}-${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateTopSellingItemsPDF = (topItems: any[], startDate?: Date, endDate?: Date) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  let yPos = addHeader(doc, 'Top Selling Items Report', `Generated on ${format(new Date(), 'PPP')}`);

  yPos = addMetadata(doc, {
    'Period': `${startDate ? format(startDate, 'yyyy-MM-dd') : 'All Time'} to ${endDate ? format(endDate, 'yyyy-MM-dd') : 'All Time'}`,
    'Total Items Found': topItems.length.toString()
  });

  const headers = ['Item Code', 'Item Name', 'Category', 'Invoices', 'Qty Sold', 'Avg Price', 'Revenue'];
  const rows = topItems.map((item: any) => [
    item.Item?.sku || '-',
    item.Item?.name || 'Unknown Item',
    item.Item?.Category?.name || '-',
    (item.totalInvoices || 0).toString(),
    (item.totalQuantitySold || 0).toString(),
    `LKR ${(item.averagePrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    `LKR ${(item.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
  ]);

  const columnWidths = [30, 70, 45, 25, 25, 30, 32];
  const alignments: ('left'|'center'|'right')[] = ['left', 'left', 'left', 'center', 'right', 'right', 'right'];

  drawTable(doc, PDF_STYLES.margin.left, yPos, headers, rows, columnWidths, {
    headerColor: [41, 128, 185],
    rowHeight: 10,
    fontSize: PDF_STYLES.fontSize.normal,
    alignments
  });

  doc.save(`top-selling-items-${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateItemWisePurchasingPDF = (purchases: any[], startDate?: Date, endDate?: Date) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  let yPos = addHeader(doc, 'Item-Wise Purchasing Report', `Generated on ${format(new Date(), 'PPP')}`);

  yPos = addMetadata(doc, {
    'Period': `${startDate ? format(startDate, 'yyyy-MM-dd') : 'All Time'} to ${endDate ? format(endDate, 'yyyy-MM-dd') : 'All Time'}`,
    'Total Items Purchased': purchases.length.toString()
  });

  const headers = ['Item Code', 'Item Name', 'Category', 'GRNs', 'Qty Purchased', 'Weight (kg)', 'Avg Cost', 'Total Cost'];
  const rows = purchases.map((item: any) => [
    item.Item?.sku || '-',
    item.Item?.name || 'Unknown Item',
    item.Item?.Category?.name || '-',
    (item.totalGrns || 0).toString(),
    (item.totalQuantityPurchased || 0).toLocaleString(),
    (item.weightPurchased || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
    `LKR ${(item.averageCostPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `LKR ${(item.totalCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  ]);

  const columnWidths = [30, 65, 40, 20, 25, 25, 30, 32];
  const alignments: ('left'|'center'|'right')[] = ['left', 'left', 'left', 'center', 'right', 'right', 'right', 'right'];

  drawTable(doc, PDF_STYLES.margin.left, yPos, headers, rows, columnWidths, {
    headerColor: [41, 128, 185],
    rowHeight: 10,
    fontSize: PDF_STYLES.fontSize.normal,
    alignments
  });

  doc.save(`item-wise-purchasing-${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const generateSupplierWisePOPDF = (data: any, startDate?: Date, endDate?: Date) => {
  const pageW = 210; // A4 portrait width in mm
  const pageH = 297; // A4 portrait height in mm
  const margin = 15;
  const contentW = pageW - margin * 2;
  const periodStr = `${startDate ? format(startDate, 'yyyy-MM-dd') : 'All Time'} to ${endDate ? format(endDate, 'yyyy-MM-dd') : 'All Time'}`;

  if (Array.isArray(data)) {
    // Summary report for all suppliers (Portrait)
    const doc = new jsPDF();
    let yPos = addHeader(doc, 'Supplier-Wise Purchase Orders Summary', `Generated on ${format(new Date(), 'PPP')}`);

    yPos = addMetadata(doc, {
      'Period': periodStr,
      'Total Suppliers': data.length.toString()
    });

    const headers = ['Supplier Name', 'Email', 'Phone', 'POs', 'Total Amount'];
    const rows = data.map((s: any) => [
      s.supplierName,
      s.email || '-',
      s.phone || '-',
      (s.poCount || 0).toString(),
      `LKR ${(s.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]);

    const columnWidths = [50, 45, 30, 15, 40];
    const alignments: ('left'|'center'|'right')[] = ['left', 'left', 'left', 'center', 'right'];

    drawTable(doc, PDF_STYLES.margin.left, yPos, headers, rows, columnWidths, {
      headerColor: [41, 128, 185],
      rowHeight: 9,
      fontSize: 8,
      alignments
    });

    doc.save(`supplier-wise-po-summary-${format(new Date(), 'yyyyMMdd')}.pdf`);
  } else if (data && data.supplierStats) {
    // Detailed analysis for one supplier (Portrait)
    const doc = new jsPDF();
    const stats = data.supplierStats;
    const purchaseOrders = data.purchaseOrders || [];
    const fmtCur = (n: number) => `LKR ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

    let y = margin;

    // Header bar
    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageW, 32, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('Code Aqua ERP Solutions', margin, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Supplier Purchase Order Report', margin, 21);

    // Title / Timestamp
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('SUPPLIER PO ANALYSIS', pageW - margin, 14, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Generated: ${format(new Date(), 'PPP')}`, pageW - margin, 21, { align: 'right' });

    y = 40;

    // Supplier Info
    doc.setFillColor(240, 245, 252);
    doc.roundedRect(margin, y, contentW, 14, 2, 2, 'F');
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin, y + 14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 58, 95);
    doc.text(`Supplier: ${stats.supplierName}`, margin + 6, y + 9);
    y += 22;

    // KPI Blocks (3 boxes)
    const boxW = (contentW - 6) / 3;
    const boxH = 22;
    const kpis = [
      { label: 'Total Orders', value: (stats.totalOrders || 0).toString(), color: [59, 130, 246] as [number, number, number] },
      { label: 'Total Amount', value: fmtCur(stats.totalAmount), color: [16, 185, 129] as [number, number, number] },
      { label: 'Average PO Value', value: fmtCur(stats.totalOrders > 0 ? stats.totalAmount / stats.totalOrders : 0), color: [245, 158, 11] as [number, number, number] }
    ];
    kpis.forEach((kpi, i) => {
      const bx = margin + i * (boxW + 3);
      doc.setFillColor(250, 250, 255);
      doc.setDrawColor(220, 225, 235);
      doc.setLineWidth(0.3);
      doc.roundedRect(bx, y, boxW, boxH, 1.5, 1.5, 'FD');
      doc.setFillColor(...kpi.color);
      doc.rect(bx, y, 3, boxH, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(kpi.label, bx + 7, y + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text(kpi.value, bx + 7, y + 17);
    });
    y += boxH + 10;

    // Items Breakdown Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 58, 95);
    doc.text('ITEMS ORDERED BREAKDOWN', margin, y);
    y += 6;

    const itemFreq = Object.entries(stats.itemFrequency || {});
    if (itemFreq.length > 0) {
      const itemHeaders = ['Item Name', 'Qty Ordered', 'Total Spent'];
      const itemRows = itemFreq.map(([name, s]: [string, any]) => [
        name.length > 40 ? name.substring(0, 37) + '...' : name,
        (s.qty || 0).toLocaleString(),
        fmtCur(s.amount)
      ]);
      y = drawTable(doc, margin, y, itemHeaders, itemRows, [100, 30, 45], {
        headerColor: [16, 185, 129],
        rowHeight: 8,
        fontSize: 8,
        alignments: ['left', 'center', 'right']
      });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text('No item purchase details available.', margin, y + 4);
      y += 12;
    }

    // New Page: PO History
    doc.addPage();
    y = 15;

    doc.setFillColor(30, 58, 95);
    doc.rect(0, 0, pageW, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`PURCHASE ORDER HISTORY — ${stats.supplierName}`, margin, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${purchaseOrders.length} records`, pageW - margin, 8, { align: 'right' });
    y = 18;

    const poHeaders = ['Order #', 'Order Date', 'Delivery Date', 'Status', 'Amount'];
    const poRows = purchaseOrders.map((po: any) => [
      po.orderNumber,
      po.orderDate ? format(new Date(po.orderDate), 'dd/MM/yyyy') : '-',
      po.deliveryDate ? format(new Date(po.deliveryDate), 'dd/MM/yyyy') : '-',
      po.status,
      fmtCur(po.totalAmount)
    ]);
    const poWidths = [40, 35, 35, 30, 40];
    const poAligns: ('left'|'center'|'right')[] = ['left', 'left', 'left', 'center', 'right'];

    y = drawTable(doc, margin, y, poHeaders, poRows, poWidths, {
      headerColor: [41, 128, 185],
      rowHeight: 8,
      fontSize: 8,
      alignments: poAligns
    });

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('This is a system-generated report. Code Aqua ERP Solutions.', pageW / 2, pageH - 8, { align: 'center' });

    doc.save(`Supplier-PO-Analysis-${stats.supplierName.replace(/[^a-z0-9]/gi, '_')}-${format(new Date(), 'yyyyMMdd')}.pdf`);
  }
};
