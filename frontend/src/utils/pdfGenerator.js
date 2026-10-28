import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { NABH_STANDARD_CRITERIA } from './scoring';

/**
 * Sanitizes text for jsPDF built-in fonts (Helvetica) which only support WinAnsi / ASCII.
 * Replaces mathematical symbols and typographer's punctuation with clean ASCII equivalents
 * so characters like ≥ and ≤ do not turn into "e or "d in the PDF.
 */
function cleanPdfText(val) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/≥/g, '>= ')
    .replace(/≤/g, '<= ')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, '-')
    .replace(/…/g, '...')
    .replace(/[\u00A0]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Generates a 100% REAL vector PDF (NOT a screenshot/canvas image)
 * using jsPDF and jspdf-autotable for the NABH Final Audit Report.
 */
export function generateNABHFinalReportPDF(metrics) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Helper for adding footer on all pages
  const addFooter = (currentPage, totalPages) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(
      'Prescura Medical Systems - NABH Accreditation MOM.7 Prescription Audit Format (6th Edition)',
      margin,
      pageHeight - 7
    );
    doc.text(
      `Page ${currentPage} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  };

  /* ─────────────────────────────────────────────────────────────
     PAGE 1: NABH AUDIT OVERVIEW & SCORING / METHODOLOGY
     ───────────────────────────────────────────────────────────── */
  // Top Header Banner
  doc.setFillColor(2, 132, 199); // Sky blue #0284c7
  doc.rect(margin, 12, pageWidth - (margin * 2), 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('NATIONAL ACCREDITATION BOARD FOR HOSPITALS & HEALTHCARE PROVIDERS (NABH)', pageWidth / 2, 19, { align: 'center' });
  doc.setFontSize(14);
  doc.text('PRESCRIPTION AUDIT FINAL REPORT', pageWidth / 2, 28, { align: 'center' });

  // Preamble Text
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const preamble = "For a tertiary care teaching hospital attached to a medical college, NABH (6th Edition, 2025) expects periodic audit of medication orders/prescriptions to ensure safe, rational, complete and legally compliant prescribing under the Management of Medication (MOM) chapter. Audit findings should be analyzed, corrective actions implemented, and re-audits conducted.";
  const splitPreamble = doc.splitTextToSize(preamble, pageWidth - (margin * 2));
  doc.text(splitPreamble, margin, 40);

  // Table 1: Audit Information & Methodology Table
  autoTable(doc, {
    startY: 50,
    head: [['1. AUDIT INFORMATION & METHODOLOGY', 'DETAILS', 'AUDIT PARAMETER', 'BENCHMARK / VALUE']],
    body: [
      ['Department:', cleanPdfText(metrics.meta.department), 'Audit Month / Period:', cleanPdfText(metrics.meta.month)],
      ['Audit Setting:', cleanPdfText(metrics.meta.setting), 'NABH Sample Benchmark:', cleanPdfText(metrics.meta.sampleRequirement)],
      ['Total Audited Prescriptions:', `${metrics.meta.totalAudited} Prescriptions`, 'Sample Adequacy Status:', metrics.meta.isSampleAdequate ? 'Target Met (Compliant)' : 'Under Target'],
      ['Audit Frequency:', 'Monthly Departmental & Quarterly Hospital-wide', 'Sampling Method:', 'Systematic Random Sampling']
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 40 },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 45 },
      3: { cellWidth: 47 }
    },
    margin: { left: margin, right: margin }
  });

  // Table 2: NABH Scoring System & Grading Table
  const pct = (cnt) => metrics.meta.totalAudited > 0 ? Math.round((cnt / metrics.meta.totalAudited) * 1000) / 10 : 0;

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 7,
    head: [
      [{ content: '2. NABH SCORING SYSTEM & COMPLIANCE GRADING SCALE', colSpan: 5, styles: { fillColor: [2, 132, 199] } }],
      ['Score Range', 'NABH Interpretation', 'Accreditation Meaning', 'Prescription Count', 'Distribution (%)']
    ],
    body: [
      ['>= 95%', 'Excellent', 'Full compliance with statutory & rational medication standards', metrics.scoring.gradeCounts.excellent, `${pct(metrics.scoring.gradeCounts.excellent)}%`],
      ['90% - 94%', 'Good', 'Acceptable compliance; isolated non-critical documentation gaps', metrics.scoring.gradeCounts.good, `${pct(metrics.scoring.gradeCounts.good)}%`],
      ['80% - 89%', 'Needs Improvement', 'Gaps identified; targeted training and circular required', metrics.scoring.gradeCounts.needsImprovement, `${pct(metrics.scoring.gradeCounts.needsImprovement)}%`],
      ['< 80%', 'Non-compliant', 'Significant safety failure; mandatory re-education & re-audit required', metrics.scoring.gradeCounts.nonCompliant, `${pct(metrics.scoring.gradeCounts.nonCompliant)}%`],
      [
        { content: 'Department Overall Compliance Score:', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], fontSize: 9 } },
        { content: `${metrics.scoring.overallCompliance}% (${metrics.scoring.overallGrade})`, styles: { fontStyle: 'bold', textColor: metrics.scoring.overallGrade === 'Excellent' || metrics.scoring.overallGrade === 'Good' ? [5, 150, 105] : [220, 38, 38], fontSize: 10 } },
        { content: `${metrics.meta.totalAudited} Audited`, styles: { fontStyle: 'bold', halign: 'center' } },
        { content: '100%', styles: { fontStyle: 'bold', halign: 'center' } }
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28 },
      1: { fontStyle: 'bold', cellWidth: 34 },
      2: { cellWidth: 70 },
      3: { halign: 'center', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 24 }
    },
    margin: { left: margin, right: margin }
  });

  // Table 3: Suggested Audit Report Format Table (Section Indicators)
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 7,
    head: [
      [{ content: '3. SUGGESTED AUDIT REPORT FORMAT (SECTION INDICATORS)', colSpan: 5, styles: { fillColor: [15, 23, 42] } }],
      ['Sr No', 'NABH Indicator Section', 'Total "Yes"', 'Applicable Parameters', 'Compliance (%)']
    ],
    body: [
      ...metrics.sectionCompliance.map((sec, idx) => [
        idx + 1,
        sec.name,
        sec.totalYes,
        sec.totalApplicable,
        `${sec.compliance}%`
      ]),
      [
        { content: '-', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: 'Overall Compliance', styles: { fontStyle: 'bold' } },
        { content: metrics.sectionCompliance.reduce((s, i) => s + i.totalYes, 0), styles: { halign: 'center', fontStyle: 'bold' } },
        { content: metrics.sectionCompliance.reduce((s, i) => s + i.totalApplicable, 0), styles: { halign: 'center', fontStyle: 'bold' } },
        { content: `${metrics.scoring.overallCompliance}% (${metrics.scoring.overallGrade})`, styles: { halign: 'center', fontStyle: 'bold', textColor: [2, 132, 199] } }
      ]
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 16 },
      1: { fontStyle: 'bold', cellWidth: 80 },
      2: { halign: 'center', cellWidth: 28 },
      3: { halign: 'center', cellWidth: 32 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 26 }
    },
    didParseCell: (data) => {
      if (data.cell && Array.isArray(data.cell.text)) {
        data.cell.text = data.cell.text.map(t => cleanPdfText(t));
      }
    },
    margin: { left: margin, right: margin }
  });

  /* ─────────────────────────────────────────────────────────────
     PAGE 2: KEY QUALITY INDICATORS & NON-CONFORMITIES
     ───────────────────────────────────────────────────────────── */
  doc.addPage();

  // Sub Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Key Quality Indicators & Deficiency Log (NABH MOM)', margin, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Department: ${cleanPdfText(metrics.meta.department)} - Month: ${cleanPdfText(metrics.meta.month)} - Total Prescriptions: ${metrics.meta.totalAudited}`, margin, 23);

  // Table 4: Key Quality Indicators (1 to 10)
  autoTable(doc, {
    startY: 27,
    head: [
      [{ content: '4. KEY QUALITY INDICATORS TO REPORT (10 NABH MOM BENCHMARKS)', colSpan: 5, styles: { fillColor: [15, 23, 42] } }],
      ['Sr', 'Quality Indicator', 'NABH Target', 'Actual Value (%)', 'Quality Status']
    ],
    body: metrics.keyQualityIndicators.map(qi => [
      qi.id,
      cleanPdfText(qi.name),
      cleanPdfText(qi.target),
      `${qi.actual}%`,
      qi.status
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { fontStyle: 'bold', cellWidth: 95 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 25 }
    },
    didParseCell: (data) => {
      if (data.cell && Array.isArray(data.cell.text)) {
        data.cell.text = data.cell.text.map(t => cleanPdfText(t));
      }
      if (data.section === 'body' && data.column.index === 4) {
        if (data.cell.raw === 'Compliant') {
          data.cell.styles.textColor = [5, 150, 105]; // Green
        } else if (data.cell.raw === 'Critical') {
          data.cell.styles.textColor = [220, 38, 38]; // Red
        } else {
          data.cell.styles.textColor = [217, 119, 6]; // Amber
        }
      }
    },
    margin: { left: margin, right: margin }
  });

  // Table 5: Non-Conformities Observed Table
  const ncRows = metrics.nonConformities.length > 0 
    ? metrics.nonConformities.slice(0, 7).map((nc, idx) => [
        idx + 1,
        cleanPdfText(nc.id),
        cleanPdfText(nc.question),
        cleanPdfText(nc.sectionName),
        `${nc.noCount} failures`,
        `${nc.failureRate}%`
      ])
    : [['-', '-', 'No non-conformities identified across evaluated prescriptions.', '-', '0', '0.0%']];

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [
      [{ content: '5. NON-CONFORMITIES OBSERVED (DEFICIENCY LOG)', colSpan: 6, styles: { fillColor: [220, 38, 38] } }],
      ['Sr', 'Code', 'Parameter Deficiency Description', 'Section', 'Failures', 'Failure Rate']
    ],
    body: ncRows,
    theme: 'grid',
    headStyles: {
      fillColor: [220, 38, 38],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 16 },
      2: { fontStyle: 'bold', cellWidth: 74 },
      3: { cellWidth: 40 },
      4: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 20 },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 20 }
    },
    didParseCell: (data) => {
      if (data.cell && Array.isArray(data.cell.text)) {
        data.cell.text = data.cell.text.map(t => cleanPdfText(t));
      }
    },
    margin: { left: margin, right: margin }
  });

  /* ─────────────────────────────────────────────────────────────
     PAGE 3: CORRECTIVE ACTIONS (CAPA) & TEAM SIGN-OFF
     ───────────────────────────────────────────────────────────── */
  doc.addPage();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Corrective Actions (CAPA) & Verification Sign-Off', margin, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Pharmacy & Therapeutics Committee (PTC) Continuous Quality Improvement Activities', margin, 23);

  // Table 6: Corrective & Preventive Actions (CAPA) Table
  autoTable(doc, {
    startY: 27,
    head: [
      [{ content: '6. CORRECTIVE ACTIONS (CAPA - NABH CONTINUOUS IMPROVEMENT)', colSpan: 5, styles: { fillColor: [5, 150, 105] } }],
      ['Sr', 'Core Corrective Action', 'Implementation Description', 'Responsible Owner', 'Status / Timeline']
    ],
    body: metrics.correctiveActions.map(ca => [
      ca.id,
      cleanPdfText(ca.action),
      cleanPdfText(ca.description),
      cleanPdfText(ca.owner || 'Quality Committee'),
      cleanPdfText(ca.status)
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [5, 150, 105],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { fontStyle: 'bold', cellWidth: 45 },
      2: { cellWidth: 70 },
      3: { fontStyle: 'bold', cellWidth: 30 },
      4: { halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105], cellWidth: 25 }
    },
    didParseCell: (data) => {
      if (data.cell && Array.isArray(data.cell.text)) {
        data.cell.text = data.cell.text.map(t => cleanPdfText(t));
      }
    },
    margin: { left: margin, right: margin }
  });

  // Table 7: Audit Team Sign-Off Table
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [
      [{ content: '7. NABH AUDIT TEAM VERIFICATION & FINAL SIGN-OFF', colSpan: 5, styles: { fillColor: [51, 65, 85] } }],
      ['Sr', 'Audit Team Member Role', 'Designated Professional', 'Audit Status', 'Signature & Date']
    ],
    body: metrics.auditTeam.map((t, idx) => [
      idx + 1,
      cleanPdfText(t.role),
      cleanPdfText(t.name || t.title),
      'Verified & Approved',
      '___________________'
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { fontStyle: 'bold', cellWidth: 50 },
      2: { cellWidth: 50 },
      3: { halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105], cellWidth: 35 },
      4: { halign: 'center', textColor: [100, 116, 139], cellWidth: 35 }
    },
    didParseCell: (data) => {
      if (data.cell && Array.isArray(data.cell.text)) {
        data.cell.text = data.cell.text.map(t => cleanPdfText(t));
      }
    },
    margin: { left: margin, right: margin }
  });

  /* ─────────────────────────────────────────────────────────────
     PAGE 4+: DETAILED PRESCRIPTION AUDIT REGISTRY TABLE
     ───────────────────────────────────────────────────────────── */
  doc.addPage();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Detailed Prescription Audit Registry', margin, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Evaluation of All ${metrics.audits.length} Prescriptions Audited with Parameter Compliance & Grades`, margin, 23);

  // Table 8: Prescription Registry Table
  const registryRows = metrics.audits.map((a, idx) => {
    const pData = a.prescriptionData || a.extractedData || {};
    const patient = pData.patientName?.value || pData.patientName || 'Patient';
    const doctor = pData.doctorName?.value || pData.doctorName || 'Doctor';
    const s = a.scoreInfo;
    const dateStr = a.finalizedAt?._seconds 
      ? new Date(a.finalizedAt._seconds * 1000).toLocaleDateString()
      : new Date().toLocaleDateString();

    return [
      idx + 1,
      cleanPdfText(a.id || a.auditId),
      dateStr,
      cleanPdfText(patient),
      cleanPdfText(doctor),
      `${s.yesCount}/${s.totalApplicable}`,
      `${s.complianceScore}%`,
      cleanPdfText(s.grade)
    ];
  });

  autoTable(doc, {
    startY: 27,
    head: [
      [{ content: '8. DETAILED PRESCRIPTION REGISTRY (N = ' + metrics.audits.length + ')', colSpan: 8, styles: { fillColor: [2, 132, 199] } }],
      ['Sr', 'Audit ID', 'Date', 'Patient Name', 'Prescribing Doctor', 'Criteria Yes', 'Compliance (%)', 'NABH Grade']
    ],
    body: registryRows,
    theme: 'grid',
    headStyles: {
      fillColor: [2, 132, 199],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold', cellWidth: 32 },
      2: { cellWidth: 18 },
      3: { fontStyle: 'bold', cellWidth: 36 },
      4: { cellWidth: 34 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', fontStyle: 'bold', cellWidth: 17 },
      7: { halign: 'center', fontStyle: 'bold', cellWidth: 17 }
    },
    didParseCell: (data) => {
      if (data.cell && Array.isArray(data.cell.text)) {
        data.cell.text = data.cell.text.map(t => cleanPdfText(t));
      }
      if (data.section === 'body' && data.column.index === 7) {
        if (data.cell.raw === 'Excellent') data.cell.styles.textColor = [5, 150, 105];
        else if (data.cell.raw === 'Good') data.cell.styles.textColor = [2, 132, 199];
        else if (data.cell.raw === 'Needs Improvement') data.cell.styles.textColor = [217, 119, 6];
        else data.cell.styles.textColor = [220, 38, 38];
      }
    },
    margin: { left: margin, right: margin }
  });

  // Add footers with page numbers to all pages
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // Save the pure vector PDF file directly to user
  const filename = `NABH_Prescription_Audit_Report_${metrics.meta.department}_${metrics.meta.month.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Generates an official vector PDF for an Individual Prescription Clinical Audit
 */
export function generateIndividualAuditPDF(auditId, extractedData, auditResults, classification, liveScore) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const addFooter = (currentPage, totalPages) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setDrawColor(203, 213, 225);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(
      'Prescura Medical Systems - MOM.7 Prescription Audit Format',
      margin,
      pageHeight - 7
    );
    doc.text(
      `Page ${currentPage} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  };

  // Header Banner
  doc.setFillColor(2, 132, 199);
  doc.rect(margin, 12, pageWidth - (margin * 2), 20, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NATIONAL ACCREDITATION BOARD FOR HOSPITALS & HEALTHCARE PROVIDERS (NABH)', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(13);
  doc.text('PRESCRIPTION CLINICAL AUDIT REPORT', pageWidth / 2, 26, { align: 'center' });

  // 1. Case Information Table
  const patient = cleanPdfText(extractedData?.patientName?.value || extractedData?.patientName || 'Patient');
  const doctor = cleanPdfText(extractedData?.doctorName?.value || extractedData?.doctorName || 'Doctor');
  const dept = cleanPdfText(extractedData?.department?.value || extractedData?.department || 'Medicine');

  autoTable(doc, {
    startY: 37,
    head: [[{ content: '1. PRESCRIPTION CASE INFORMATION', colSpan: 4, styles: { fillColor: [15, 23, 42] } }]],
    body: [
      ['Audit ID:', cleanPdfText(auditId), 'Evaluation Date:', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })],
      ['Patient Name:', patient, 'Prescribing Physician:', doctor],
      ['Department / Unit:', dept, 'Classification Status:', cleanPdfText(classification?.status || 'PENDING')]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.2, lineColor: [203, 213, 225], lineWidth: 0.2 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 40 },
      1: { fontStyle: 'bold', cellWidth: 50 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 45 },
      3: { fontStyle: 'bold', cellWidth: 47 }
    },
    didParseCell: (data) => {
      if (data.cell && Array.isArray(data.cell.text)) {
        data.cell.text = data.cell.text.map(t => cleanPdfText(t));
      }
    },
    margin: { left: margin, right: margin }
  });

  // 2. Scoring & Classification Table
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 5,
    head: [[{ content: '2. NABH SCORING & QUALITY INTERPRETATION', colSpan: 4, styles: { fillColor: [2, 132, 199] } }]],
    body: [
      ['Compliance Score (%):', `${liveScore.complianceScore}% (${liveScore.yesCount} of ${liveScore.totalApplicable} Yes)`, 'NABH Grade:', cleanPdfText(liveScore.grade)],
      ['Rationality Status:', cleanPdfText(classification?.status || 'PENDING'), 'Evaluation Reasoning:', cleanPdfText(classification?.reason || 'Evaluated against NABH 34 critical parameters.')]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.2, lineColor: [203, 213, 225], lineWidth: 0.2 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 40 },
      1: { fontStyle: 'bold', textColor: [2, 132, 199], cellWidth: 50 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 40 },
      3: { fontStyle: 'bold', cellWidth: 52 }
    },
    didParseCell: (data) => {
      if (data.cell && Array.isArray(data.cell.text)) {
        data.cell.text = data.cell.text.map(t => cleanPdfText(t));
      }
    },
    margin: { left: margin, right: margin }
  });

  // 3. NABH 34 Parameters Checklist Tables
  const sections = ['A', 'B', 'C', 'D', 'E', 'F'];
  let currentY = doc.lastAutoTable.finalY + 6;

  sections.forEach((sec) => {
    const secItems = Object.values(auditResults).filter(r => r.section === sec);
    if (secItems.length === 0) return;

    autoTable(doc, {
      startY: currentY,
      head: [
        [{ content: cleanPdfText(secItems[0].sectionName), colSpan: 3, styles: { fillColor: [51, 65, 85] } }],
        ['Parameter', 'Evaluation', 'AI Extracted Evidence / Observation']
      ],
      body: secItems.map(item => [
        `${item.criterionId}. ${cleanPdfText(item.question)}`,
        cleanPdfText(item.finalAnswer || item.aiAnswer || 'NO'),
        cleanPdfText(item.evidence || 'N/A')
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [51, 65, 85],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        lineColor: [203, 213, 225],
        lineWidth: 0.2
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
        2: { cellWidth: 80 }
      },
      didParseCell: (data) => {
        if (data.cell && Array.isArray(data.cell.text)) {
          data.cell.text = data.cell.text.map(t => cleanPdfText(t));
        }
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'YES') {
            data.cell.styles.textColor = [5, 150, 105];
          } else {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
      },
      margin: { left: margin, right: margin }
    });

    currentY = doc.lastAutoTable.finalY + 5;
  });

  // Add footers with page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  doc.save(`NABH_Prescription_Audit_${auditId}.pdf`);
}
