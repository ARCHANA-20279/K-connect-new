const Audit = require("../models/Audit");
const Thrift = require("../models/Thrift");
const Loan = require("../models/Loan");
const Attendance = require("../models/Attendance");
const Meeting = require("../models/Meeting");
const Member = require("../models/Member");
const NHG = require("../models/NHG");
const crypto = require("crypto");

// Calculate real-time financial reconciliation
const getReconciledSummary = async (req, res) => {
  try {
    const thriftRecords = await Thrift.find({});
    const loanRecords = await Loan.find({});

    const totalThriftReceipts = thriftRecords.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalLoanDisbursements = loanRecords
      .filter((l) => l.status === "Approved" || l.status === "Completed")
      .reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    const totalLoanRepayments = loanRecords.reduce((sum, l) => sum + (Number(l.repaymentAmount) || 0), 0);

    // Calculated net fund in circulation
    const netCashSurplus = totalThriftReceipts + totalLoanRepayments - totalLoanDisbursements;
    const cashInHand = Math.max(0, Math.round(netCashSurplus * 0.15)); // 15% liquid petty cash
    const bankBalance = Math.max(0, netCashSurplus - cashInHand);

    res.status(200).json({
      financialYear: "2025-2026",
      totalThriftReceipts,
      totalLoanDisbursements,
      totalLoanRepayments,
      cashInHand,
      bankBalance,
      netCashSurplus,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate reconciliation", error: err.message });
  }
};

// Save a formal Audit Statement
const saveAudit = async (req, res) => {
  try {
    const audit = await Audit.create(req.body);
    res.status(201).json({ message: "Audit statement verified and recorded", audit });
  } catch (err) {
    res.status(500).json({ message: "Failed to save audit statement", error: err.message });
  }
};

// Get past Audits
const getAudits = async (req, res) => {
  try {
    const audits = await Audit.find({}).sort({ createdAt: -1 });
    res.status(200).json({ audits });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch audit statements", error: err.message });
  }
};

// Create a dependency-free, printable PDF for CDS ward audits. The SHA-256
// fingerprint covers the report data and is included in the PDF for later comparison.
const pdfText = (value) => String(value ?? "")
  .normalize("NFKD")
  .replace(/[^\x20-\x7E]/g, "")
  .replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const buildPdf = (pages) => {
  const objects = [null];
  const add = (value) => (objects.push(value), objects.length - 1);
  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds = pages.map((content) => {
    const stream = Buffer.from(content, "ascii");
    const streamId = add(Buffer.concat([
      Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "ascii"),
      stream,
      Buffer.from("\nendstream", "ascii"),
    ]));
    return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`);
  });
  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const chunks = [Buffer.from("%PDF-1.4\n%KConnect\n", "ascii")];
  const offsets = [0];
  let offset = chunks[0].length;
  for (let i = 1; i < objects.length; i += 1) {
    const chunk = Buffer.from(`${i} 0 obj\n${objects[i]}\nendobj\n`, "ascii");
    offsets.push(offset); chunks.push(chunk); offset += chunk.length;
  }
  const xrefOffset = offset;
  chunks.push(Buffer.from(`xref\n0 ${objects.length}\n0000000000 65535 f \n${offsets.slice(1).map((item) => `${String(item).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`, "ascii"));
  return Buffer.concat(chunks);
};

const generateCdsAuditReport = async (req, res) => {
  try {
    const { from, to, ward } = req.query;
    const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
    if (!validDate(from) || !validDate(to) || from > to || !ward) {
      return res.status(400).json({ message: "Choose a ward and a valid reporting date range." });
    }
    const nhgs = await NHG.find({ ward: String(ward), status: { $in: ["Active", "Approved"] } }).lean();
    if (!nhgs.length) return res.status(404).json({ message: "No active NHGs were found for this ward." });
    const names = nhgs.map((item) => item.name);
    const ids = nhgs.map((item) => item.nhgId).filter(Boolean);
    const nhgScope = { $or: [{ nhgName: { $in: names } }, ...(ids.length ? [{ nhgId: { $in: ids } }] : [])] };
    const dateStart = new Date(`${from}T00:00:00.000Z`);
    const dateEnd = new Date(`${to}T23:59:59.999Z`);
    const [members, thrifts, attendance, meetings, allLoans] = await Promise.all([
      Member.find({ ward: String(ward), nhgName: { $in: names }, status: "Active" }).select("memberId name nhgName").lean(),
      Thrift.find({ ...nhgScope, date: { $gte: from, $lte: to } }).sort({ date: 1, receiptNumber: 1 }).lean(),
      Attendance.find({ ...nhgScope, date: { $gte: dateStart, $lte: dateEnd } }).sort({ date: 1 }).lean(),
      Meeting.find({ ...nhgScope, date: { $gte: from, $lte: to }, status: "Completed" }).sort({ date: 1 }).lean(),
      Loan.find(nhgScope).sort({ "bankDecision.disbursedAt": 1 }).lean(),
    ]);
    const loans = allLoans.filter((item) => item.bankDecision?.disbursedAt && item.bankDecision.disbursedAt >= dateStart && item.bankDecision.disbursedAt <= dateEnd);
    const repayments = allLoans.flatMap((loan) => (loan.repayments || [])
      .filter((payment) => payment.paymentDate >= dateStart && payment.paymentDate <= dateEnd)
      .map((payment) => ({ ...(payment.toObject ? payment.toObject() : payment), loanId: loan.loanId || "-", memberName: loan.memberName })));
    const totalThrift = thrifts.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalLoans = loans.reduce((sum, item) => sum + Number(item.approvedAmount || item.amount || 0), 0);
    const totalRepayments = repayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const present = attendance.filter((item) => item.status === "Present").length;
    const absent = attendance.filter((item) => item.status === "Absent").length;
    const attendanceRate = attendance.length ? Math.round((present / attendance.length) * 100) : 0;
    const generatedAt = new Date().toISOString();
    const reportId = crypto.randomUUID();
    const reportData = { reportId, ward, from, to, generatedAt, members, thrifts, attendance, meetings, loans, repayments };
    const fingerprint = crypto.createHash("sha256").update(JSON.stringify(reportData)).digest("hex");
    const pages = [];
    let commands;
    let y;
    const beginPage = (title, subtitle = "") => {
      commands = ["0.04 0.36 0.31 rg 0 778 595 64 re f", "1 1 1 rg", `BT /F1 20 Tf 42 808 Td (${pdfText(title)}) Tj ET`, "0.04 0.36 0.31 rg"];
      y = 750;
      if (subtitle) { commands.push(`BT /F1 10 Tf 42 ${y} Td (${pdfText(subtitle)}) Tj ET`); y -= 24; }
      commands.push("0.10 0.17 0.25 rg");
    };
    const addText = (x, atY, value, size = 10, color = "0.10 0.17 0.25") => commands.push(`${color} rg BT /F1 ${size} Tf ${x} ${atY} Td (${pdfText(value)}) Tj ET`);
    const addLine = (yPos) => commands.push(`0.82 0.86 0.88 RG 42 ${yPos} m 553 ${yPos} l S`);
    const finishPage = () => {
      addLine(48);
      addText(42, 32, `K-Connect | Report ${reportId} | Data SHA-256 ${fingerprint}`, 5, "0.35 0.40 0.46");
      pages.push(commands.join("\n"));
    };
    const sectionTitle = (title) => { addText(42, y, title, 13, "0.04 0.36 0.31"); y -= 20; addLine(y); y -= 15; };
    const row = (cells, widths, bold = false) => {
      if (y < 75) { finishPage(); beginPage("K-Connect CDS Audit Report", `Ward ${ward} | ${from} to ${to} | continued`); }
      let x = 44;
      cells.forEach((cell, index) => { addText(x, y, String(cell).slice(0, 34), bold ? 9 : 8); x += widths[index]; });
      y -= 17; addLine(y + 5); y -= 2;
    };
    beginPage("CDS WARD AUDIT REPORT", `Ward ${ward} | Reporting period: ${from} to ${to}`);
    addText(42, y, `Generated for: ${pdfText(req.user.name)}   |   Generated at: ${generatedAt}`, 9); y -= 22;
    addText(42, y, `NHGs included: ${nhgs.map((item) => item.name).join(", ").slice(0, 90)}`, 9); y -= 32;
    sectionTitle("Period summary");
    const cards = [["Active members", members.length], ["Completed meetings", meetings.length], ["Attendance", `${present} present / ${absent} absent (${attendanceRate}%)`], ["Thrift received", `INR ${totalThrift.toFixed(2)}`], ["Loans disbursed", `${loans.length} loans / INR ${totalLoans.toFixed(2)}`], ["Repayments received", `INR ${totalRepayments.toFixed(2)}`]];
    cards.forEach(([label, value]) => { addText(48, y, label, 10); addText(300, y, value, 10, "0.04 0.36 0.31"); y -= 22; });
    y -= 8; sectionTitle("Thrift transactions");
    row(["Date", "Receipt", "Member", "Amount INR", "Mode"], [70, 95, 160, 100, 70], true);
    thrifts.forEach((item) => row([item.date, item.receiptNumber, item.memberName, Number(item.amount || 0).toFixed(2), item.paymentMode] , [70, 95, 160, 100, 70]));
    if (!thrifts.length) { addText(48, y, "No thrift transactions in this period.", 9); y -= 18; }
    y -= 8; sectionTitle("Loan disbursements");
    row(["Disbursed", "Loan ID", "Member", "Amount INR", "Reference"], [80, 90, 130, 95, 100], true);
    loans.forEach((item) => row([new Date(item.bankDecision.disbursedAt).toISOString().slice(0, 10), item.loanId || "-", item.memberName, Number(item.approvedAmount || item.amount || 0).toFixed(2), item.bankDecision.disbursementReference || "-"], [80, 90, 130, 95, 100]));
    if (!loans.length) { addText(48, y, "No loan disbursements in this period.", 9); y -= 18; }
    y -= 8; sectionTitle("Loan repayments");
    row(["Paid date", "Loan ID", "Member", "Amount INR", "Status"], [80, 90, 130, 95, 100], true);
    repayments.forEach((item) => row([new Date(item.paymentDate).toISOString().slice(0, 10), item.loanId, item.memberName, Number(item.amount || 0).toFixed(2), item.status || "Submitted"], [80, 90, 130, 95, 100]));
    if (!repayments.length) { addText(48, y, "No loan repayments recorded in this period.", 9); y -= 18; }
    y -= 8; sectionTitle("Attendance records");
    row(["Date", "Member ID", "Member", "Status", "NHG"], [85, 90, 135, 75, 110], true);
    const memberNames = new Map(members.map((item) => [item.memberId, item.name]));
    attendance.forEach((item) => row([new Date(item.date).toISOString().slice(0, 10), item.memberId, memberNames.get(item.memberId) || "Member", item.status, item.nhgName || ""], [85, 90, 135, 75, 110]));
    if (!attendance.length) { addText(48, y, "No attendance records in this period.", 9); y -= 18; }
    finishPage();
    const pdf = buildPdf(pages);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=K-Connect-Ward-${String(ward).replace(/[^\w-]/g, "_")}-Audit-${from}-to-${to}.pdf`,
      "Content-Length": pdf.length,
      "X-Audit-Report-Id": reportId,
      "X-Audit-Data-SHA256": fingerprint,
    });
    return res.send(pdf);
  } catch (error) {
    console.error("CDS audit report error:", error);
    return res.status(500).json({ message: "Could not generate the audit report." });
  }
};

module.exports = { getReconciledSummary, saveAudit, getAudits, generateCdsAuditReport };
