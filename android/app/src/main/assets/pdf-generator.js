/**
 * SpendFlow Month-End PDF Statement Generator
 * Uses jsPDF and jsPDF-autotable to produce executive-grade PDF reports.
 */

const PdfGenerator = {
  /**
   * Generates and downloads the Month-End PDF
   * @param {Object} options
   * @param {string} options.monthKey - "YYYY-MM"
   * @param {string} options.monthLabel - "October 2026"
   * @param {Array} options.transactions - List of transactions for this month
   * @param {number} options.totalSpent - Total spent amount
   * @param {number} options.budget - Budget target for this month
   * @param {string} options.currency - Currency symbol (e.g., "₹", "$")
   * @param {string} options.userName - Name to display on statement
   * @param {boolean} options.includeCategories - Whether to include category summary
   * @param {boolean} options.includeLedger - Whether to include full transaction table
   * @param {boolean} options.autoPrint - If true, triggers browser print instead of download
   */
  generateMonthlyReport({
    monthKey,
    monthLabel,
    transactions,
    totalSpent,
    budget,
    currency,
    userName,
    includeCategories = true,
    includeLedger = true,
    autoPrint = false
  }) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('jsPDF library is still loading. Please check your internet connection and try again.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = [16, 185, 129]; // Emerald
    const darkColor = [15, 23, 42];     // Slate 900
    const mutedColor = [100, 116, 139]; // Slate 500
    const lightBg = [248, 250, 252];    // Slate 50

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // --- 1. TOP STATEMENT HEADER ---
    doc.setFillColor(...darkColor);
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Accent line
    doc.setFillColor(...primaryColor);
    doc.rect(0, 28, pageWidth, 2, 'F');

    // Brand Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text('SPENDFLOW FINANCIAL', margin, 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(167, 243, 208); // Light emerald
    doc.text('MONTH-END EXPENSE STATEMENT & AUDIT LEDGER', margin, 19);

    // Right-aligned header metadata
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`STATEMENT PERIOD: ${monthLabel.toUpperCase()}`, pageWidth - margin, 12, { align: 'right' });
    
    const todayStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.setTextColor(148, 163, 184);
    doc.text(`GENERATED ON: ${todayStr}`, pageWidth - margin, 18, { align: 'right' });

    let currentY = 38;

    // --- 2. ACCOUNT & RECIPIENT INFO ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    doc.text('STATEMENT RECIPIENT / ACCOUNT:', margin, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(userName || 'Personal Financial Account', margin, currentY + 5.5);

    currentY += 16;

    // --- 3. EXECUTIVE SUMMARY METRICS BOXES ---
    const boxWidth = (pageWidth - (margin * 2) - 9) / 4;
    const boxHeight = 20;

    const daysInMonth = new Date(parseInt(monthKey.split('-')[0]), parseInt(monthKey.split('-')[1]), 0).getDate();
    const dailyAvg = (totalSpent / (daysInMonth || 30)).toFixed(0);
    const variance = budget - totalSpent;
    const isUnderBudget = variance >= 0;

    const metrics = [
      { label: 'TOTAL EXPENSE', value: `${currency} ${totalSpent.toLocaleString()}`, color: [225, 29, 72] },
      { label: 'MONTHLY BUDGET', value: `${currency} ${budget.toLocaleString()}`, color: darkColor },
      { label: isUnderBudget ? 'NET SAVINGS' : 'OVER BUDGET', value: `${currency} ${Math.abs(variance).toLocaleString()}`, color: isUnderBudget ? primaryColor : [225, 29, 72] },
      { label: 'DAILY AVERAGE', value: `${currency} ${Number(dailyAvg).toLocaleString()}`, color: mutedColor }
    ];

    metrics.forEach((m, idx) => {
      const bx = margin + idx * (boxWidth + 3);
      doc.setFillColor(...lightBg);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(bx, currentY, boxWidth, boxHeight, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...mutedColor);
      doc.text(m.label, bx + 4, currentY + 6);

      doc.setFontSize(11);
      doc.setTextColor(...m.color);
      doc.text(m.value, bx + 4, currentY + 15);
    });

    currentY += boxHeight + 10;

    // --- 4. CATEGORY BREAKDOWN TABLE (Optional) ---
    if (includeCategories && transactions.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...darkColor);
      doc.text('CATEGORY SPENDING SUMMARY', margin, currentY);
      currentY += 3;

      // Group totals by category
      const catTotals = {};
      transactions.forEach(t => {
        catTotals[t.category] = (catTotals[t.category] || 0) + Number(t.amount);
      });

      const catRows = Object.keys(catTotals)
        .sort((a, b) => catTotals[b] - catTotals[a])
        .map(cat => {
          const amt = catTotals[cat];
          const pct = totalSpent > 0 ? ((amt / totalSpent) * 100).toFixed(1) + '%' : '0%';
          return [
            cat,
            `${currency} ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            pct
          ];
        });

      doc.autoTable({
        startY: currentY,
        head: [['Category', 'Amount Spent', '% of Month Total']],
        body: catRows,
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: {
          fillColor: [16, 185, 129],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5
        },
        styles: {
          fontSize: 8,
          cellPadding: 2.2
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 50, halign: 'right' },
          2: { cellWidth: 35, halign: 'right' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });

      currentY = doc.lastAutoTable.finalY + 10;
    }

    // --- 5. ITEMIZED TRANSACTION LEDGER (Optional) ---
    if (includeLedger) {
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...darkColor);
      doc.text(`ITEMIZED TRANSACTION LEDGER (${transactions.length} ITEMS)`, margin, currentY);
      currentY += 3;

      const ledgerRows = transactions
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((t, idx) => [
          (idx + 1).toString(),
          t.date,
          t.note || '—',
          t.category,
          t.payment || 'UPI',
          `${currency} ${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);

      doc.autoTable({
        startY: currentY,
        head: [['#', 'Date', 'Description / Merchant', 'Category', 'Payment Mode', 'Amount']],
        body: ledgerRows.length > 0 ? ledgerRows : [['—', '—', 'No transactions recorded for this period', '—', '—', '—']],
        margin: { left: margin, right: margin },
        theme: 'striped',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.2
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 24 },
          2: { cellWidth: 'auto' },
          3: { cellWidth: 35 },
          4: { cellWidth: 26 },
          5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });

      currentY = doc.lastAutoTable.finalY + 12;
    }

    // --- 6. ADD FOOTER & PAGE NUMBERING TO ALL PAGES ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...mutedColor);
      doc.text('SpendFlow PWA · Month-End Expense Statement · Confidential', margin, pageHeight - 7);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }

    // --- 7. DOWNLOAD OR PRINT ---
    const sanitizedMonth = monthLabel.replace(/[\s,]+/g, '_');
    const filename = `Expense_Statement_${sanitizedMonth}.pdf`;

    if (autoPrint) {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(filename);
    }
  }
};

window.PdfGenerator = PdfGenerator;
