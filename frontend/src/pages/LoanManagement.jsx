import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { io } from "socket.io-client";
import "../portal.css";

const LoanManagement = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isMl = i18n.language === "ml";
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();
  const isSecretary = ["secretary", "nhg_secretary"].includes(role);
  const isMember = role === "member";
  const isAdsOfficer = ["ads_officer", "ads_cds_officer"].includes(role);
  const isCdsOfficer = ["cds_officer", "ads_cds_officer"].includes(role);
  const isMainAdmin = ["main_admin", "super_admin", "superadmin"].includes(role);
  const isBankOfficer = role === "bank_officer";
  const canViewRegister = isSecretary || isAdsOfficer || isCdsOfficer || isMainAdmin || isBankOfficer;
  const isAdsWorkspace = location.pathname === "/ads" && isAdsOfficer;

  const [loans, setLoans] = useState([]);
  const [adsNotifications, setAdsNotifications] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [repaymentAmounts, setRepaymentAmounts] = useState({});
  const [paymentModal, setPaymentModal] = useState({ show: false, loan: null, dueDate: "", paymentDate: new Date().toISOString().slice(0, 10), amount: "", receiptReference: "" });
  const [reviewModal, setReviewModal] = useState({ show: false, loan: null, stage: "ADS", reference: "", remarks: "" });
  const [bankModal, setBankModal] = useState({ show: false, loan: null, decision: "Disbursed", reference: "", approvedAmount: "", interestRate: "", paymentScheduleReference: "", remarks: "" });
  const [showBankOfficerModal, setShowBankOfficerModal] = useState(false);
  const [bankOfficerForm, setBankOfficerForm] = useState({ name: "", email: "", password: "" });

  // Active Tab: 'myLoans' (default for members), 'apply', 'register' (default for secretary)
  const [activeTab, setActiveTab] = useState(canViewRegister ? "register" : "myLoans");
  // Auth is restored asynchronously. Re-select the correct role tab once the
  // role is known so staff never land in the member application form.
  useEffect(() => {
    setActiveTab(canViewRegister ? "register" : "myLoans");
  }, [canViewRegister]);
  const [selectedMemberId, setSelectedMemberId] = useState(user?.memberId || "");
  const [memberThriftAmount, setMemberThriftAmount] = useState(null);
  const [memberCreditScore, setMemberCreditScore] = useState(null);
  const [maximumLoanAmount, setMaximumLoanAmount] = useState(null);
  const [expandedVoteLoanId, setExpandedVoteLoanId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    memberId: user?.memberId || "",
    memberName: user?.name || "",
    loanType: "Emergency Micro-Credit",
    amount: "5000",
    purpose: "",
  });

  // Modal States
  const [sanctionModal, setSanctionModal] = useState({
    show: false,
    loan: null,
    memberThriftAmount: null,
    thriftLoading: false,
    thriftError: "",
    approvedAmount: "",
    interestRate: 4,
    installmentsCount: 10,
    remarks: "",
  });

  const [rejectModal, setRejectModal] = useState({
    show: false,
    loan: null,
    rejectionReason: "",
  });

  const [slipModal, setSlipModal] = useState({
    show: false,
    loan: null,
  });

  // Load Loans & Members
  const fetchData = async () => {
    try {
      setLoading(true);
      const [loansRes, membersRes] = await Promise.all([
        api.get(isAdsWorkspace ? "/loans?scope=ads" : "/loans"),
        (isSecretary || isMainAdmin) ? api.get("/members") : Promise.resolve({ data: { members: [] } }),
      ]);

      const loanList = Array.isArray(loansRes.data) ? loansRes.data : [];
      setLoans(loanList);
      if (isAdsWorkspace || isBankOfficer) {
        try {
          const notificationRes = await api.get("/notifications?type=LOAN");
          setAdsNotifications(notificationRes.data.notifications || []);
        } catch (notificationError) {
          console.error("Failed to fetch ADS loan notifications:", notificationError);
        }
      }

      const memberList = (membersRes.data.members || []).filter((m) => m.status === "Active");
      setMembers(memberList);

      // Auto-resolve Member ID if user is member
      if (isMember) {
        let matchedId = user?.memberId;
        if (!matchedId && memberList.length > 0) {
          const matched = memberList.find(
            (m) =>
              (m.email && user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
              (m.phone && user?.phone && m.phone === user.phone) ||
              (m.name && user?.name && m.name.toLowerCase() === user.name.toLowerCase())
          );
          if (matched) matchedId = matched.memberId;
        }

        if (matchedId && !selectedMemberId) {
          setSelectedMemberId(matchedId);
          setFormData((prev) => ({
            ...prev,
            memberId: matchedId,
            memberName:
              user?.name ||
              memberList.find((m) => m.memberId === matchedId)?.name ||
              prev.memberName,
          }));
        }
        if (matchedId) {
          try {
            const [thriftRes, scoreRes] = await Promise.all([
              api.get(`/thrift/passbook/${matchedId}`),
              api.get("/loans/credit-score/me"),
            ]);
            setMemberThriftAmount(Number(thriftRes.data.totalSaved) || 0);
            setMemberCreditScore(scoreRes.data.creditScore);
            setMaximumLoanAmount(Number(scoreRes.data.maximumLoanAmount) || 0);
            setFormData((prev) => Number(prev.amount) > Number(scoreRes.data.maximumLoanAmount)
              ? { ...prev, amount: Number(scoreRes.data.maximumLoanAmount) > 0 ? String(scoreRes.data.maximumLoanAmount) : "" }
              : prev);
          } catch (thriftError) {
            console.error("Failed to load member thrift for loan eligibility:", thriftError);
            setMemberThriftAmount(0);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch loan data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auth is restored asynchronously. Reload when the role becomes available so
    // an ADS account requests the ADS-scoped queue instead of a stale generic one.
    if (user?.token) fetchData();
  }, [user?.token, isAdsWorkspace, isSecretary, isMainAdmin, isMember]);

  useEffect(() => {
    if (!isSecretary) return undefined;
    const refreshQueue = async () => {
      try {
        const response = await api.get("/loans");
        if (Array.isArray(response.data)) setLoans(response.data);
      } catch (error) {
        console.error("Failed to refresh NHG loan queue:", error);
      }
    };
    const refreshTimer = window.setInterval(refreshQueue, 15000);
    return () => window.clearInterval(refreshTimer);
  }, [isSecretary]);

  useEffect(() => {
    if (!isMember) return undefined;
    let storedUser;
    try { storedUser = JSON.parse(sessionStorage.getItem("kconnect_user") || "null"); } catch { storedUser = null; }
    if (!storedUser?.token) return undefined;
    const socket = io("http://localhost:5000", { auth: { token: storedUser.token }, transports: ["websocket", "polling"] });
    socket.on("loan:vote-request", fetchData);
    socket.on("loan:vote-update", fetchData);
    return () => socket.disconnect();
  }, [isMember]);

  const castPeerVote = async (loan, decision) => {
    try {
      await api.post(`/loans/${loan._id}/peer-vote`, { decision });
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.message || (isMl ? "വോട്ട് രേഖപ്പെടുത്താനായില്ല." : "Could not record your vote."));
    }
  };

  useEffect(() => {
    if (!isAdsWorkspace) return undefined;
    const refreshTimer = window.setInterval(async () => {
      try {
        const [notificationRes, loansRes] = await Promise.all([
          api.get("/notifications?type=LOAN"),
          api.get("/loans?scope=ads"),
        ]);
        setAdsNotifications(notificationRes.data.notifications || []);
        setLoans(Array.isArray(loansRes.data) ? loansRes.data : []);
      } catch (notificationError) {
        console.error("Failed to refresh ADS loan notifications:", notificationError);
      }
    }, 20000);
    return () => window.clearInterval(refreshTimer);
  }, [isAdsWorkspace]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleMemberSelectForForm = (mId) => {
    const member = members.find((m) => m.memberId === mId);
    setFormData({
      ...formData,
      memberId: mId,
      memberName: member ? member.name : formData.memberName,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/loans", {
        ...formData,
        amount: Number(formData.amount),
      });

      alert(
        isMl
          ? "വായ്പ അപേക്ഷ വിജയകരമായി സമർപ്പിച്ചു! യോഗത്തിൽ സെക്രട്ടറി പരിശോധിക്കുന്നതാണ്."
          : "Loan application submitted successfully! It will be reviewed by the Secretary."
      );

      setSelectedMemberId(formData.memberId);
      setActiveTab("myLoans");
      fetchData();
    } catch (error) {
      console.error("Loan submission error:", error);
      alert(error.response?.data?.message || "Failed to submit loan application");
    }
  };

  // Pre-fill form when user wants to re-apply
  const handleReapply = (loan) => {
    setFormData({
      memberId: loan.memberId,
      memberName: loan.memberName,
      loanType: loan.loanType,
      amount: String(loan.amount),
      purpose: loan.purpose,
    });
    setActiveTab("apply");
  };

  // Open Sanction Modal
  const openSanctionModal = async (loan) => {
    setSanctionModal({
      show: true,
      loan,
      memberThriftAmount: null,
      thriftLoading: true,
      thriftError: "",
      eligible: false,
      meetingResolution: "",
      remarks: "",
    });
    try {
      const thriftRes = await api.get(`/thrift/passbook/${loan.memberId}`);
      setSanctionModal((current) => current.loan?._id === loan._id
        ? { ...current, memberThriftAmount: Number(thriftRes.data.totalSaved) || 0, thriftLoading: false }
        : current);
    } catch (error) {
      setSanctionModal((current) => current.loan?._id === loan._id
        ? { ...current, thriftLoading: false, thriftError: error.response?.data?.message || "Could not load this member's thrift total." }
        : current);
    }
  };

  // Submit Sanction
  const handleConfirmSanction = async (e) => {
    e.preventDefault();
    if (!sanctionModal.loan) return;
    if (sanctionModal.memberThriftAmount === null || Number(sanctionModal.loan.amount) > sanctionModal.memberThriftAmount) {
      alert(isMl ? "അപേക്ഷ തുക അംഗത്തിന്റെ രേഖപ്പെടുത്തിയ ത്രിഫ്റ്റ് തുകയേക്കാൾ കൂടുതലാണ്." : "The requested loan is greater than the member's recorded thrift total.");
      return;
    }
    try {
      await api.post(`/loans/${sanctionModal.loan._id}/secretary-review`, {
        eligible: sanctionModal.eligible,
        meetingResolution: sanctionModal.meetingResolution,
        remarks: sanctionModal.remarks,
      });

      alert(isMl ? "അർഹതയും യോഗ തീരുമാനവും രേഖപ്പെടുത്തി; ADS പരിശോധനയ്ക്ക് അയച്ചു." : "Eligibility and meeting resolution recorded; forwarded to ADS.");
      setSanctionModal({ show: false, loan: null, eligible: false, meetingResolution: "", remarks: "" });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to sanction loan");
    }
  };

  // Open Reject Modal
  const openRejectModal = (loan) => {
    setRejectModal({
      show: true,
      loan,
      rejectionReason: "",
    });
  };

  // Submit Reject
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectModal.loan) return;
    try {
      await api.post(`/loans/${rejectModal.loan._id}/reject`, {
        reason: rejectModal.rejectionReason,
      });

      alert("Loan application marked as rejected with reason noted.");
      setRejectModal({ show: false, loan: null, rejectionReason: "" });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to update status");
    }
  };

  const openReviewModal = (loan, stage) => setReviewModal({ show: true, loan, stage, reference: "", remarks: "" });

  const submitStageReview = async (e) => {
    e.preventDefault();
    if (!reviewModal.loan) return;
    try {
      const endpoint = reviewModal.stage === "ADS" ? "ads-review" : "cds-review";
      await api.post(`/loans/${reviewModal.loan._id}/${endpoint}`, { reference: reviewModal.reference, remarks: reviewModal.remarks });
      setReviewModal({ show: false, loan: null, stage: "ADS", reference: "", remarks: "" });
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to record review");
    }
  };

  const openBankModal = (loan, decision = "Approved") => setBankModal({ show: true, loan, decision, reference: "", approvedAmount: String(loan.approvedAmount || loan.amount), interestRate: String(loan.interestRate ?? ""), paymentScheduleReference: loan.bankDecision?.paymentScheduleReference || "", remarks: "" });

  const recordBankDecision = async (e) => {
    e.preventDefault();
    if (!bankModal.loan) return;
    try {
      await api.post(`/loans/${bankModal.loan._id}/bank-decision`, {
        decision: bankModal.decision,
        reference: bankModal.reference,
        approvedAmount: Number(bankModal.approvedAmount),
        interestRate: Number(bankModal.interestRate),
        paymentScheduleReference: bankModal.paymentScheduleReference,
        remarks: bankModal.remarks,
      });
      setBankModal({ show: false, loan: null, decision: "Disbursed", reference: "", approvedAmount: "", interestRate: "", paymentScheduleReference: "", remarks: "" });
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to record bank decision");
    }
  };

  const createDemoBankOfficer = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/demo-bank-officers", bankOfficerForm);
      setShowBankOfficerModal(false);
      setBankOfficerForm({ name: "", email: "", password: "" });
      alert(data.message || "Demo Bank Officer account created.");
    } catch (error) {
      alert(error.response?.data?.message || "Could not create the demo Bank Officer account.");
    }
  };

  const openPaymentModal = (loan) => setPaymentModal({ show: true, loan, dueDate: "", paymentDate: new Date().toISOString().slice(0, 10), amount: "", receiptReference: "" });

  const submitMemberPayment = async (e) => {
    e.preventDefault();
    if (!paymentModal.loan) return;
    try {
      await api.post(`/loans/${paymentModal.loan._id}/repayments`, {
        amount: Number(paymentModal.amount), paymentDate: paymentModal.paymentDate,
        dueDate: paymentModal.dueDate || undefined, receiptReference: paymentModal.receiptReference,
      });
      setPaymentModal({ show: false, loan: null, dueDate: "", paymentDate: new Date().toISOString().slice(0, 10), amount: "", receiptReference: "" });
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to submit EMI payment");
    }
  };

  const verifyMemberPayment = async (loan, repayment, decision) => {
    try {
      let dueDate;
      if (decision === "Verify") {
        dueDate = window.prompt(isMl ? "ബാങ്ക് ഷെഡ്യൂളിലെ യഥാർത്ഥ ഇ.എം.ഐ അവസാന തീയതി നൽകുക (YYYY-MM-DD)" : "Confirm the EMI due date from the bank schedule (YYYY-MM-DD)", repayment.dueDate ? new Date(repayment.dueDate).toISOString().slice(0, 10) : "");
        if (dueDate === null) return;
        if (dueDate && Number.isNaN(new Date(dueDate).getTime())) return alert(isMl ? "ശരിയായ തീയതി നൽകുക." : "Enter a valid due date.");
      }
      await api.put(`/loans/${loan._id}/repayments/${repayment._id}/verify`, { decision, dueDate });
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to verify EMI payment");
    }
  };

  // Secretary Add Repayment
  const addRepayment = async (id) => {
    const amount = Number(repaymentAmounts[id]);
    if (!amount || amount <= 0) {
      alert("Please enter a valid repayment amount");
      return;
    }

    try {
      await api.post(`/loans/${id}/repayments`, { amount, paymentDate: new Date().toISOString(), receiptReference: "Secretary recorded cash receipt" });
      alert(isMl ? "തിരിച്ചടവ് രേഖപ്പെടുത്തി." : "Repayment recorded.");
      setRepaymentAmounts({
        ...repaymentAmounts,
        [id]: "",
      });
      fetchData();
    } catch (error) {
      console.error("Repayment error:", error);
      alert(error.response?.data?.message || "Failed to add repayment");
    }
  };

  // Compute Metrics
  const totalSanctioned = loans
    .filter((l) => ["Repayment", "Approved", "Completed"].includes(l.status))
    .reduce((sum, l) => sum + (Number(l.approvedAmount || l.amount) || 0), 0);

  const totalRepaid = loans.reduce((sum, l) => sum + (Number(l.repaymentAmount) || 0), 0);
  const pendingCount = loans.filter((l) => !["Rejected", "Completed", "Repayment", "Approved"].includes(l.status)).length;
  const statusLabel = (status) => {
    if (!isMl) return ({ "NHG Voting": "NHG member vote", Pending: "Secretary review", "ADS Review": "ADS review", "CDS Review": "CDS review", "Bank Review": "Demo bank review", "Bank Approved": "Demo bank approved · awaiting simulated disbursement", Repayment: "Repayment", Approved: "Legacy approved", Rejected: "Rejected", Completed: "Completed" })[status] || status;
    return ({ "NHG Voting": "അയൽക്കൂട്ട അംഗങ്ങളുടെ വോട്ട്", Pending: "സെക്രട്ടറി പരിശോധന", "ADS Review": "എ.ഡി.എസ് പരിശോധന", "CDS Review": "സി.ഡി.എസ് പരിശോധന", "Bank Review": "ഡെമോ ബാങ്ക് പരിശോധന", "Bank Approved": "ഡെമോ ബാങ്ക് അംഗീകരിച്ചു · സിമുലേറ്റഡ് വിതരണം കാത്തിരിക്കുന്നു", Repayment: "തിരിച്ചടവ്", Approved: "അംഗീകരിച്ചു", Rejected: "നിരസിച്ചു", Completed: "പൂർത്തിയായി" })[status] || status;
  };
  const workflowStep = (loan) => {
    const byStatus = { "NHG Voting": 1, Pending: 2, "ADS Review": 3, "CDS Review": 4, "Bank Review": 5, "Bank Approved": 5, Repayment: 6, Approved: 6, Completed: 7 };
    if (loan.status !== "Rejected") return byStatus[loan.status] ?? 0;
    const lastStage = loan.workflowHistory?.[loan.workflowHistory.length - 1]?.stage;
    return ({ Member: 0, "NHG Peer Vote": 1, "NHG Secretary": 2, ADS: 3, CDS: 4, Bank: 5, "Repayment verification": 6 })[lastStage] ?? 1;
  };
  const memberApplications = loans
    .filter((loan) => loan.memberId && loan.memberId.toLowerCase() === String(selectedMemberId || "").toLowerCase())
    .sort((a, b) => new Date(b.applicationDate || b.createdAt || 0) - new Date(a.applicationDate || a.createdAt || 0));
  const rejectionStageLabel = (loan) => {
    const stage = loan.workflowHistory?.[loan.workflowHistory.length - 1]?.stage;
    const labels = isMl
      ? { "NHG Secretary": "എൻ.എച്ച്.ജി സെക്രട്ടറി", ADS: "എ.ഡി.എസ്", CDS: "സി.ഡി.എസ്", Bank: "ഡെമോ ബാങ്ക്", "Repayment verification": "തിരിച്ചടവ് പരിശോധന" }
      : { "NHG Secretary": "NHG Secretary", ADS: "ADS", CDS: "CDS", Bank: "Demo Bank", "Repayment verification": "Repayment reviewer" };
    return labels[stage] || (isMl ? "പരിശോധനാ സമിതി" : "Review committee");
  };
  const rejectionStageForStatus = (status) => ({
    Pending: isMl ? "എൻ.എച്ച്.ജി സെക്രട്ടറി" : "NHG Secretary",
    "ADS Review": "ADS",
    "CDS Review": "CDS",
    "Bank Review": isMl ? "ഡെമോ ബാങ്ക്" : "Demo Bank",
  })[status] || (isMl ? "പരിശോധനാ സമിതി" : "Review committee");
  // The compact overview has six stages (it combines NHG voting and
  // Secretary review), so give it its own zero-based progress mapping.
  const overviewWorkflowStep = (loan) => {
    if (loan.status === "Rejected") {
      const lastStage = loan.workflowHistory?.[loan.workflowHistory.length - 1]?.stage;
      return ({ Member: 0, "NHG Peer Vote": 1, "NHG Secretary": 1, ADS: 2, CDS: 3, Bank: 4, "Repayment verification": 5 })[lastStage] ?? 1;
    }
    return ({ "NHG Voting": 1, Pending: 1, "ADS Review": 2, "CDS Review": 3, "Bank Review": 4, "Bank Approved": 4, Repayment: 5, Approved: 5, Completed: 6 })[loan.status] ?? 0;
  };
  const overviewStageClass = (index) => {
    if (index === 0) return "border-success bg-success-subtle text-success-emphasis";
    const application = memberApplications[0];
    if (!application) return "border-secondary-subtle bg-light text-secondary";
    const step = overviewWorkflowStep(application);
    const rejectedAtStage = application.status === "Rejected" && step === index;
    if (rejectedAtStage) return "border-danger bg-danger-subtle text-danger";
    const activeAtStage = !["Rejected", "Completed"].includes(application.status) && step === index;
    if (activeAtStage) return "border-warning bg-warning-subtle text-dark";
    return step > index ? "border-success bg-success-subtle text-success-emphasis" : "border-secondary-subtle bg-light text-secondary";
  };

  // Filtered loans for Member View
  const memberLoans = selectedMemberId
    ? loans.filter((l) => (l.memberId && l.memberId.toLowerCase() === selectedMemberId.toLowerCase()) || (isMember && l.status === "NHG Voting" && l.peerApproval?.eligibleVoterIds?.includes(selectedMemberId)))
    : [];
  const adsPendingLoans = loans.filter((loan) => loan.status === "ADS Review");
  const bankPendingLoans = loans.filter((loan) => loan.status === "Bank Review");
  const activeBankNotifications = adsNotifications.filter((notification) =>
    !notification.relatedLoan || bankPendingLoans.some((loan) => loan._id === notification.relatedLoan)
  );
  const activeAdsNotifications = adsNotifications.filter((notification) =>
    !notification.relatedLoan || adsPendingLoans.some((loan) => loan._id === notification.relatedLoan)
  );
  const registerLoans = isAdsWorkspace ? adsPendingLoans : isBankOfficer ? loans.filter((loan) => ["Bank Review", "Bank Approved"].includes(loan.status)) : loans;

  return (
    <div className="portal-page-container">
      <div className="container">
        {/* HERO BANNER */}
        <div className="portal-hero-banner d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div>
            <span className="portal-hero-tag">Module 5 • {t("govtTagline")}</span>
            <h1 className="portal-hero-title">{isBankOfficer ? (isMl ? "ഡെമോ ബാങ്ക് വായ്പ പരിശോധന" : "Demo Bank Loan Review") : isAdsWorkspace ? (isMl ? "എ.ഡി.എസ് വായ്പ പരിശോധന" : "ADS Loan Verification Desk") : t("loansHeroTitle")}</h1>
            <p className="portal-hero-subtitle">{isBankOfficer ? (isMl ? "സി.ഡി.എസ് കൈമാറിയ അപേക്ഷകളിൽ ബാങ്കിന്റെ മാതൃകാ തീരുമാനം രേഖപ്പെടുത്തുക." : "Record a simulated bank decision for applications forwarded by CDS.") : isAdsWorkspace ? (isMl ? "സെക്രട്ടറി പരിശോധന പൂർത്തിയാക്കിയ വായ്പകൾ പരിശോധിച്ച് അംഗീകരിക്കുകയോ കാരണം രേഖപ്പെടുത്തി നിരസിക്കുകയോ ചെയ്യുക." : "Verify secretary-reviewed loan applications, then approve or reject with a recorded reason.") : t("loansHeroSubtitle")}</p>
          </div>
          <div>
            {canViewRegister ? (
              <span className="badge bg-white text-dark px-3 py-2 shadow-sm border fw-bold">
                {isBankOfficer ? (isMl ? "ഡെമോ ബാങ്ക് ഉദ്യോഗസ്ഥൻ" : "Demo Bank Officer") : isAdsWorkspace ? (isMl ? "എ.ഡി.എസ് പരിശോധന വിഭാഗം" : "ADS review queue") : isSecretary ? t("secretaryOnlyBadge") : isMainAdmin ? (isMl ? "കേന്ദ്ര ഭരണ അവലോകനം" : "Central review desk") : (isMl ? "വായ്പ പരിശോധന വിഭാഗം" : "Loan review desk")}
              </span>
            ) : isMember ? (
              <span className="badge bg-light text-primary px-3 py-2 shadow-sm border">
                {t("memberViewBadge")}
              </span>
            ) : (
              <Link to="/login" className="btn btn-light fw-bold px-3 py-2 shadow-sm">
                🔒 {t("login")}
              </Link>
            )}
          </div>
        </div>

        {isBankOfficer && <div className="alert alert-warning border-warning shadow-sm" role="note">
          <strong>{isMl ? "ഡെമോ ബാങ്ക് പരിശോധന:" : "Demo bank review:"}</strong> {isMl ? "ഇത് ഒരു പ്രോജക്ട് സിമുലേഷനാണ്. യഥാർത്ഥ ബാങ്ക് കണക്ഷനോ പണമിടപാടോ നടക്കുന്നില്ല." : "This is a project simulation. It does not connect to a real bank or move money."}
        </div>}
        {isBankOfficer && <section className="portal-card p-3 p-lg-4 mb-4" aria-live="polite">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div><h2 className="h5 fw-bold mb-1">🔔 {isMl ? "ഡെമോ ബാങ്ക് പരിശോധനാ അറിയിപ്പുകൾ" : "Demo bank review alerts"}</h2><p className="small text-muted mb-0">{isMl ? "സി.ഡി.എസ് കൈമാറിയ അപേക്ഷകളാണ് ഇവിടെ വരുന്നത്." : "Applications forwarded by CDS appear here for a simulated review."}</p></div>
            <span className={`badge ${bankPendingLoans.length ? "text-bg-warning" : "text-bg-success"}`}>{bankPendingLoans.length} {isMl ? "പരിശോധന കാത്തിരിക്കുന്നു" : "awaiting demo bank review"}</span>
          </div>
          {bankPendingLoans.length ? <div className="d-flex flex-column gap-2">{bankPendingLoans.map((loan) => {
            const alert = activeBankNotifications.find((notification) => notification.relatedLoan === loan._id);
            return <div key={loan._id} className="alert alert-info d-flex flex-wrap align-items-center justify-content-between gap-2 py-2 mb-0"><div><strong className="d-block">{alert?.title || `${loan.memberName} · ${loan.loanId}`}</strong><span className="small">{alert?.message || (isMl ? "സി.ഡി.എസ് പരിശോധന പൂർത്തിയായി; ഡെമോ ബാങ്ക് തീരുമാനം രേഖപ്പെടുത്തുക." : "CDS review is complete; record the demo bank decision in the queue below.")}</span></div><a className="btn btn-sm btn-outline-primary flex-shrink-0" href="#bank-review-queue">{isMl ? "അപേക്ഷ പരിശോധിക്കുക" : "Review application"}</a></div>;
          })}</div> : <div className="alert alert-success py-2 mb-0">{isMl ? "ബാങ്ക് ഡെമോ പരിശോധനയ്ക്കായി അപേക്ഷകളില്ല." : "No applications are waiting for demo bank review."}</div>}
        </section>}
        {isMainAdmin && <div className="alert alert-primary d-flex flex-wrap align-items-center justify-content-between gap-2 shadow-sm">
          <span>{isMl ? "ഡെമോ ബാങ്ക് ഉദ്യോഗസ്ഥന്റെ ലോഗിൻ സൃഷ്ടിച്ച് ബാങ്ക് ഘട്ടം പരീക്ഷിക്കുക." : "Create a Demo Bank Officer login to try the bank stage. No public bank registration is enabled."}</span>
          <button className="btn btn-sm btn-primary" type="button" onClick={() => setShowBankOfficerModal(true)}>🏦 {isMl ? "ഡെമോ ബാങ്ക് അക്കൗണ്ട് സൃഷ്ടിക്കുക" : "Create Demo Bank Officer"}</button>
        </div>}

        {isAdsWorkspace && <section className="portal-card p-3 p-lg-4 mb-4" aria-live="polite">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
              <h2 className="h5 fw-bold mb-1">🔔 {isMl ? "എ.ഡി.എസ് അറിയിപ്പുകളും പരിശോധനയും" : "ADS loan alerts and verification"}</h2>
              <p className="small text-muted mb-0">{isMl ? "സെക്രട്ടറി അയച്ച വായ്പകൾ ഇവിടെ കാണാം. പരിശോധിച്ച് തീരുമാനമെടുക്കുക." : "Secretary-reviewed applications appear here for ADS verification and decision."}</p>
            </div>
            <span className={`badge ${adsPendingLoans.length ? "text-bg-warning" : "text-bg-success"}`}>
              {adsPendingLoans.length} {isMl ? "പരിശോധന കാത്തിരിക്കുന്നു" : "awaiting ADS review"}
            </span>
          </div>
          {activeAdsNotifications.length > 0 ? <div className="d-flex flex-column gap-2 mb-3">
            {activeAdsNotifications.map((notification) => <div key={notification._id} className="alert alert-info d-flex flex-wrap align-items-center justify-content-between gap-2 py-2 mb-0">
              <div><strong className="d-block">{notification.title}</strong><span className="small">{notification.message}</span></div>
              <a className="btn btn-sm btn-outline-primary flex-shrink-0" href="#ads-review-queue">{isMl ? "അപേക്ഷ പരിശോധിക്കുക" : "Review application"}</a>
            </div>)}
          </div> : <div className={`alert ${adsPendingLoans.length ? "alert-warning" : "alert-success"} py-2 mb-3`}>
            {adsPendingLoans.length ? (isMl ? "എ.ഡി.എസ് പരിശോധന കാത്തിരിക്കുന്ന വായ്പകൾ താഴെയുള്ള പട്ടികയിൽ ഉണ്ട്." : "Loan applications are waiting in the ADS review queue below.") : (isMl ? "ഇപ്പോൾ പരിശോധനയ്ക്കായി വായ്പകളില്ല." : "No loan applications are waiting for ADS review.")}
          </div>}
          <a className="btn btn-primary btn-sm" href="#ads-review-queue">{isMl ? "📋 പരിശോധനാ പട്ടികയിലേക്ക്" : "📋 Open ADS review queue"}</a>
        </section>}

        {isMember && <section className="portal-card mb-4 p-3 p-lg-4">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
            <div><h2 className="h5 fw-bold mb-1">{isMl ? "വായ്പയുടെ പരിശോധനാ ക്രമം" : "Loan review and repayment path"}</h2><p className="small text-muted mb-0">{isMl ? "ഓരോ ഘട്ടവും തീയതിയും റഫറൻസും സഹിതം രേഖപ്പെടുത്തും." : "Each hand-off is recorded with its date and reference."}{memberApplications[0]?.loanId ? ` · ${isMl ? "ഏറ്റവും പുതിയ അപേക്ഷ" : "Most recent application"}: ${memberApplications[0].loanId}` : ""}</p></div>
            <span className="badge text-bg-light border">{isMl ? "അപേക്ഷ മുതൽ ഇ.എം.ഐ വരെ" : "Application to EMI"}</span>
          </div>
          <div className="row g-2 text-center">
            {(isMl ? [["👤", "അംഗം", "അപേക്ഷ"], ["🤝", "എൻ.എച്ച്.ജി സെക്രട്ടറി", "അർഹത + യോഗ തീരുമാനം"], ["🏘️", "എ.ഡി.എസ്", "പരിശോധിച്ച് അംഗീകരിക്കുന്നു"], ["🏛️", "സി.ഡി.എസ്", "പരിശോധിച്ച് ബാങ്കിലേക്ക്"], ["🏦", "ബാങ്ക്", "തീരുമാനവും വിതരണവും"], ["₹", "അംഗം", "ഇ.എം.ഐ തിരിച്ചടവ്"]] : [["👤", "Member", "Apply"], ["🤝", "NHG Secretary", "Eligibility + resolution"], ["🏘️", "ADS", "Verify and approve"], ["🏛️", "CDS", "Verify and forward"], ["🏦", "Bank", "Decision and disbursement"], ["₹", "Member", "Repay EMI"]]).map(([icon, title, detail], index) => <div className="col-6 col-md-4 col-xl-2" key={title}><div className={`h-100 p-2 border rounded-3 ${overviewStageClass(index)}`}><div className="fs-4">{icon}</div><strong className="small d-block">{index + 1}. {title}</strong><span className="small">{detail}</span></div></div>)}
          </div>
          <div className="alert alert-info small mt-3 mb-0">{isMl ? "സമയത്ത് അടച്ച ഗഡുക്കൾ 5% സബ്‌സിഡി പരിശോധനയ്ക്ക് സ്ഥാനാർഥിയായി രേഖപ്പെടുത്തും. യഥാർത്ഥ യോഗ്യതയും തുകയും ബാധകമായ പദ്ധതി ചട്ടങ്ങളും ബാങ്കിന്റെ സ്ഥിരീകരണവും അനുസരിച്ചായിരിക്കും; K-Connect സബ്‌സിഡി സ്വമേധയാ ക്രെഡിറ്റ് ചെയ്യില്ല." : "On-time installments are flagged as potential candidates for a 5% subsidy review. Actual eligibility and amount depend on the applicable scheme and bank confirmation; K-Connect does not credit a subsidy automatically."}</div>
        </section>}

        {/* KPI METRIC CARDS */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="portal-kpi-card">
              <div className="portal-kpi-icon kpi-amber">💰</div>
              <div>
                <div className="portal-kpi-val text-warning text-dark">
                  ₹{totalSanctioned.toLocaleString()}
                </div>
                <div className="portal-kpi-lbl">{t("kpiActiveLoans")}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="portal-kpi-card">
              <div className="portal-kpi-icon kpi-emerald">✅</div>
              <div>
                <div className="portal-kpi-val text-success">
                  ₹{totalRepaid.toLocaleString()}
                </div>
                <div className="portal-kpi-lbl">{t("totalRepaid")}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="portal-kpi-card">
              <div className="portal-kpi-icon kpi-blue">⏳</div>
              <div>
                <div className="portal-kpi-val">{pendingCount}</div>
                <div className="portal-kpi-lbl">{t("pendingApproval")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="d-flex gap-2 mb-4 flex-wrap">
          {isMember && <button
            className={`btn btn-sm fw-bold px-3 py-2 ${
              activeTab === "myLoans" ? "btn-primary shadow-sm" : "btn-light border"
            }`}
            onClick={() => setActiveTab("myLoans")}
          >
            🔍 {t("myLoansTab") || "My Applications & Status"}
            {selectedMemberId && memberLoans.length > 0 && (
              <span className="badge bg-white text-primary ms-2">{memberLoans.length}</span>
            )}
          </button>}

          {isMember && <button
            className={`btn btn-sm fw-bold px-3 py-2 ${
              activeTab === "apply" ? "btn-primary shadow-sm" : "btn-light border"
            }`}
            onClick={() => setActiveTab("apply")}
          >
            📝 {t("applyLoanTab") || "Apply for Loan"}
          </button>}

          {canViewRegister && <button
            className={`btn btn-sm fw-bold px-3 py-2 ${
              activeTab === "register" ? "btn-primary shadow-sm" : "btn-light border"
            }`}
            onClick={() => setActiveTab("register")}
          >
            📋 {t("masterRegisterTab") || "NHG Loan Register"} ({loans.length})
          </button>}
        </div>

        {isMember && loans.some((loan) => loan.status !== "Pending") && (
          <div className="alert alert-info border-0 shadow-sm" role="status">
            <strong>{isMl ? "വായ്പ പുതുക്കൽ:" : "Loan update:"}</strong> {isMl ? "നിങ്ങളുടെ അപേക്ഷയുടെ നിലവിലെ ഘട്ടവും തീരുമാനങ്ങളും താഴെ കാണാം." : "Your application stage, decisions, and repayment details are shown below."}
          </div>
        )}

        {/* TAB 1: MEMBER LOAN STATUS & POST-APPROVAL LIFECYCLE */}
        {activeTab === "myLoans" && (
          <div className="portal-card mb-4">
            <div className="portal-card-header d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <div>
                <h5 className="portal-card-title">
                  👤 {isMl ? "എന്റെ വായ്പ അപേക്ഷകളും നിലയും" : "My Loan Applications & Status Tracker"}
                </h5>
                <small className="text-muted">
                  {isMl
                    ? "നിങ്ങളുടെ വായ്പ അപേക്ഷകളുടെ നില (അംഗീകരിച്ചവ / നിരസിച്ചവ), തിരിച്ചടവ് പുരോഗതി, അടുത്ത നടപടികൾ."
                    : "Real-time tracker for your micro-loan applications, approval/rejection details, and post-sanction steps."}
                </small>
              </div>

              {/* MEMBER SELECTOR */}
              {isSecretary && <div className="d-flex align-items-center gap-2">
                <span className="small text-muted fw-semibold">Member Profile:</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: "240px" }}
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                >
                  <option value="">-- Choose Member Profile --</option>
                  {members.map((m) => (
                    <option key={m._id} value={m.memberId}>
                      {m.name} ({m.memberId})
                    </option>
                  ))}
                </select>
              </div>}
            </div>

            {loading ? (
              <div className="text-center py-5">{t("loading")}</div>
            ) : !selectedMemberId ? (
              <div className="text-center py-5 text-muted">
                <span className="fs-1 d-block mb-2">👤</span>
                <p className="fw-semibold mb-1">Please select your Member Profile above to view your loan applications.</p>
                <small>Logged in members will automatically see their active and previous loan applications.</small>
              </div>
            ) : memberLoans.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <span className="fs-1 d-block mb-2">📄</span>
                <h6 className="fw-bold text-dark">No Loan Applications Found</h6>
                <p className="small mb-3">
                  You have not submitted any micro-credit requests under member ID <strong>{selectedMemberId}</strong>.
                </p>
                <button className="btn btn-sm btn-primary fw-semibold px-4" onClick={() => setActiveTab("apply")}>
                  ➕ {t("applyLoanBtn")}
                </button>
              </div>
            ) : (
              <div className="d-flex flex-column gap-4">
                {memberLoans.map((loan) => {
                  const approvedPrincipal = loan.approvedAmount || loan.amount;
                  const repaid = loan.repaymentAmount || 0;
                  const remaining =
                    loan.remainingAmount !== undefined
                      ? loan.remainingAmount
                      : Math.max(0, approvedPrincipal - repaid);
                  const progressPct =
                    approvedPrincipal > 0 ? Math.min(100, Math.round((repaid / approvedPrincipal) * 100)) : 0;
                  const estWeeklyEmi = Math.ceil(approvedPrincipal / (loan.installmentsCount || 10));
                  const completedWorkflowStep = workflowStep(loan);

                  return (
                    <div
                      key={loan._id}
                      className="card border shadow-sm"
                      style={{
                        borderRadius: "16px",
                        overflow: "hidden",
                        borderColor:
                          ["Approved", "Bank Approved"].includes(loan.status)
                            ? "#10b981"
                            : loan.status === "Rejected"
                            ? "#ef4444"
                            : loan.status === "Completed"
                            ? "#3b82f6"
                            : "#f59e0b",
                      }}
                    >
                      {/* CARD HEADER */}
                      <div
                        className="card-header py-3 px-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2"
                        style={{
                          background:
                            ["Approved", "Bank Approved"].includes(loan.status)
                              ? "#ecfdf5"
                              : loan.status === "Rejected"
                              ? "#fef2f2"
                              : loan.status === "Completed"
                              ? "#eff6ff"
                              : "#fffbeb",
                        }}
                      >
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge bg-dark">{loan.loanType}</span>
                            <span className="small text-muted">
                              Applied on: {new Date(loan.applicationDate || loan.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h5 className="fw-bolder text-dark mb-0">
                            Requested Amount: ₹{Number(loan.amount).toLocaleString()}
                          </h5>
                          <small className="text-muted">Purpose: {loan.purpose}</small>
                        </div>

                        <div>
                          <span
                            className={`badge px-3 py-2 rounded-pill fs-6 ${
                              ["Approved", "Bank Approved"].includes(loan.status)
                                ? "bg-success"
                                : loan.status === "Rejected"
                                ? "bg-danger"
                                : loan.status === "Completed"
                                ? "bg-primary"
                                : "bg-warning text-dark"
                            }`}
                          >
                            {loan.status === "Rejected" ? `✕ ${statusLabel(loan.status)}` : loan.status === "Completed" ? `🎉 ${statusLabel(loan.status)}` : ["Repayment", "Approved", "Bank Approved"].includes(loan.status) ? `✓ ${statusLabel(loan.status)}` : `⏳ ${statusLabel(loan.status)}`}
                          </span>
                        </div>
                      </div>

                      {/* CARD BODY: STATE-BY-STATE GUIDANCE */}
                      <div className="card-body p-4">
                        <div className="rounded-3 border bg-white p-3 mb-4">
                          <div className="d-flex flex-wrap justify-content-between gap-2 align-items-center mb-2">
                            <strong>{isMl ? "അപേക്ഷയുടെ പുരോഗതി" : "Application journey"}</strong>
                            <span className="badge text-bg-primary">{statusLabel(loan.status)}</span>
                          </div>
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            {(isMl ? ["അംഗം", "അയൽക്കൂട്ട വോട്ട്", "എൻ.എച്ച്.ജി സെക്രട്ടറി", "എ.ഡി.എസ്", "സി.ഡി.എസ്", "ബാങ്ക്", "ഇ.എം.ഐ"] : ["Member", "NHG vote", "NHG Secretary", "ADS", "CDS", "Bank", "EMI"]).map((stage, index) => (
                              <span
                                key={stage}
                                className={`badge rounded-pill ${loan.status === "Rejected" && index === completedWorkflowStep ? "text-bg-danger" : index < completedWorkflowStep ? "text-bg-success" : loan.status !== "Rejected" && index === completedWorkflowStep ? "text-bg-warning" : "text-bg-light border text-secondary"}`}
                                aria-label={`${stage}: ${loan.status === "Rejected" && index === completedWorkflowStep ? (isMl ? "നിരസിച്ചു" : "Rejected") : index < completedWorkflowStep ? (isMl ? "പൂർത്തിയായി" : "Completed") : loan.status !== "Rejected" && index === completedWorkflowStep ? (isMl ? "നടന്നുകൊണ്ടിരിക്കുന്നു" : "In progress") : (isMl ? "തുടങ്ങിയിട്ടില്ല" : "Not started")}`}
                              >
                                {loan.status === "Rejected" && index === completedWorkflowStep ? "✕ " : index < completedWorkflowStep ? "✓ " : loan.status !== "Rejected" && index === completedWorkflowStep ? "● " : ""}{index + 1}. {stage}
                              </span>
                            ))}
                          </div>
                          {loan.secretaryReview?.meetingResolution && <p className="small text-secondary mb-2">{isMl ? "യോഗ തീരുമാന റഫറൻസ്:" : "Meeting resolution:"} {loan.secretaryReview.meetingResolution}</p>}
                          {loan.workflowHistory?.length > 0 && <div className="small text-secondary d-flex flex-column gap-1">
                            {loan.workflowHistory.slice(-5).map((entry, index) => <div key={`${entry.at}-${index}`}>• {entry.stage}: {entry.decision}{entry.reference ? ` (${entry.reference})` : ""} — {entry.actor}</div>)}
                          </div>}
                        </div>
                        {loan.peerApproval?.eligibleVoterIds?.length > 0 && <div className={`alert ${loan.status === "NHG Voting" ? "alert-info" : "alert-light border"} d-flex flex-column gap-2`}>
                          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                          <div>
                            <strong>{isMl ? "അയൽക്കൂട്ടത്തിന്റെ അംഗീകാരം" : "NHG peer approval"}</strong>
                            <div className="small">{isMl ? `${loan.peerApproval.votes?.filter((vote) => vote.decision === "Approve").length || 0}/${loan.peerApproval.requiredApprovals} അംഗീകാരങ്ങൾ · ${loan.peerApproval.votes?.length || 0}/${loan.peerApproval.eligibleVoterIds.length} വോട്ടുകൾ` : `${loan.peerApproval.votes?.filter((vote) => vote.decision === "Approve").length || 0}/${loan.peerApproval.requiredApprovals} approvals · ${loan.peerApproval.votes?.length || 0}/${loan.peerApproval.eligibleVoterIds.length} votes`}</div>
                            {isMember && loan.memberId !== selectedMemberId && <div className="small text-muted">{isMl ? `${loan.memberName} സമർപ്പിച്ച അപേക്ഷ` : `Requested by ${loan.memberName}`}</div>}
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary align-self-start"
                            aria-expanded={expandedVoteLoanId === loan._id}
                            onClick={() => setExpandedVoteLoanId((current) => current === loan._id ? null : loan._id)}
                          >
                            {expandedVoteLoanId === loan._id
                              ? (isMl ? "വോട്ടർമാരെ മറയ്ക്കുക" : "Hide voters")
                              : (isMl ? `വോട്ട് ചെയ്തവർ (${loan.peerApproval.votes?.length || 0})` : `View voters (${loan.peerApproval.votes?.length || 0})`)}
                          </button>
                          {isMember && loan.status === "NHG Voting" && loan.memberId !== selectedMemberId && loan.peerApproval.eligibleVoterIds.includes(selectedMemberId) && !loan.peerApproval.votes?.some((vote) => vote.memberId === selectedMemberId) && <div className="d-flex gap-2">
                            <button className="btn btn-sm btn-success" onClick={() => castPeerVote(loan, "Approve")}>{isMl ? "അംഗീകരിക്കുക" : "Approve"}</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => castPeerVote(loan, "Reject")}>{isMl ? "നിരസിക്കുക" : "Reject"}</button>
                          </div>}
                          {loan.peerApproval.votes?.some((vote) => vote.memberId === selectedMemberId) && <span className="badge text-bg-secondary">{isMl ? "നിങ്ങളുടെ വോട്ട് രേഖപ്പെടുത്തി" : "Your vote recorded"}</span>}
                          </div>
                          {expandedVoteLoanId === loan._id && (
                            <div className="rounded-2 border bg-white p-2" aria-live="polite">
                              <strong className="small d-block mb-2">{isMl ? "വോട്ട് രേഖപ്പെടുത്തിയ അംഗങ്ങൾ" : "Members who voted"}</strong>
                              {loan.peerApproval.votes?.length ? (
                                <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
                                  {loan.peerApproval.votes.map((vote) => (
                                    <li key={vote.memberId} className="d-flex justify-content-between align-items-center gap-2 small">
                                      <span>{vote.memberName || vote.memberId} <span className="text-muted">({vote.memberId})</span></span>
                                      <span className={`badge ${vote.decision === "Approve" ? "text-bg-success" : "text-bg-danger"}`}>
                                        {vote.decision === "Approve" ? (isMl ? "അംഗീകരിച്ചു" : "Approved") : (isMl ? "നിരസിച്ചു" : "Rejected")}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="small text-muted">{isMl ? "ഇതുവരെ ആരും വോട്ട് ചെയ്തിട്ടില്ല." : "No members have voted yet."}</span>
                              )}
                            </div>
                          )}
                        </div>}
                        {loan.status === "Bank Review" && <div className="alert alert-warning border-warning" role="status"><strong>{isMl ? "സി.ഡി.എസ് പരിശോധന പൂർത്തിയായി" : "CDS review complete"}</strong> {isMl ? "നിങ്ങളുടെ അപേക്ഷ ഡെമോ ബാങ്ക് തീരുമാനത്തിനായി അയച്ചു." : "Your application has been forwarded for a demo bank decision."}</div>}
                        {loan.status === "Bank Approved" && <div className="alert alert-success border-success" role="status"><strong>{isMl ? "ഡെമോ ബാങ്ക് വായ്പ അംഗീകരിച്ചു" : "Demo bank approval recorded"}</strong> {isMl ? `₹${Number(loan.approvedAmount).toLocaleString()} അംഗീകരിച്ചു. ഡെമോ വിതരണം രേഖപ്പെടുത്തുന്നതുവരെ ഇ.എം.ഐ ആരംഭിക്കില്ല. യഥാർത്ഥ പണമിടപാട് നടന്നിട്ടില്ല.` : `₹${Number(loan.approvedAmount).toLocaleString()} was approved. EMI starts only after the demo disbursement is recorded. No real funds were transferred.`}{loan.bankDecision?.reference ? <span className="d-block small mt-1">{isMl ? "ഡെമോ റഫറൻസ്:" : "Demo reference:"} {loan.bankDecision.reference}</span> : null}</div>}
                        {isMember && loan.status === "Bank Approved" && <div className="alert alert-info d-flex flex-wrap align-items-center justify-content-between gap-2" role="status">
                          <span>{isMl ? "ഇ.എം.ഐ തിരിച്ചടവ് തുടങ്ങാൻ ബാങ്ക് ഉദ്യോഗസ്ഥൻ വിതരണം രേഖപ്പെടുത്തണം. അതിന് ശേഷം പേയ്മെന്റ് ഓപ്ഷൻ ലഭിക്കും." : "The bank officer must record disbursement before EMI repayment can start. The payment option will appear after that."}</span>
                          <button className="btn btn-success btn-sm" type="button" disabled>{isMl ? "വിതരണത്തിന് ശേഷം ഇ.എം.ഐ അടയ്ക്കുക" : "EMI payment available after disbursement"}</button>
                        </div>}
                        {/* CASE 1: PENDING APPROVAL */}
                        {loan.status === "Pending" && (
                          <div>
                            <div className="alert alert-warning border-warning d-flex align-items-start gap-3 mb-4">
                              <span className="fs-3">⏳</span>
                              <div>
                                <strong className="d-block text-dark">
                                  {isMl ? "അപേക്ഷ പരിശോധനയിലാണ്" : "Application Under Verification"}
                                </strong>
                                <p className="small mb-0 text-secondary">
                                  {isMl
                                    ? "നിങ്ങളുടെ വായ്പ അപേക്ഷ അയൽക്കൂട്ട സെക്രട്ടറിയുടെയും അംഗങ്ങളുടെയും പരിശോധനയ്ക്കായി വച്ചിരിക്കുന്നു. അടുത്ത പ്രതിവാര യോഗത്തിൽ സമ്പാദ്യ ചരിത്രവും അർഹതയും പരിശോധിച്ച് തീരുമാനമെടുക്കും."
                                    : "Your application has been received and queued for review. The Secretary will verify your thrift savings history and loan eligibility during the upcoming weekly Ayalkoottam meeting."}
                                </p>
                              </div>
                            </div>

                            {/* 3-STEP TRACKER */}
                            <div className="p-3 bg-light rounded-3 border mb-3">
                              <h6 className="fw-bold text-dark small text-uppercase mb-3">
                                📌 Application Progress
                              </h6>
                              <div className="row g-2 text-center">
                                <div className="col-4">
                                  <div className="p-2 rounded bg-success text-white small fw-bold">
                                    ✓ 1. Submitted
                                  </div>
                                </div>
                                <div className="col-4">
                                  <div className="p-2 rounded bg-warning text-dark small fw-bold">
                                    ⏳ 2. NHG Review
                                  </div>
                                </div>
                                <div className="col-4">
                                  <div className="p-2 rounded bg-secondary text-white small fw-bold opacity-50">
                                    3. Sanction & Cash
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CASE 2: REJECTED */}
                        {loan.status === "Rejected" && (
                          <div>
                            {/* REJECTION REASON BANNER */}
                            <div className="alert alert-danger border-danger p-3 mb-4">
                              <div className="d-flex align-items-center gap-2 mb-2">
                                <span className="fs-4">✕</span>
                                <strong className="fs-6 text-danger">
                                  {isMl ? `${rejectionStageLabel(loan)} അപേക്ഷ നിരസിച്ചു` : `Application rejected by ${rejectionStageLabel(loan)}`}
                                </strong>
                              </div>
                              <div className="bg-white p-3 rounded-3 border border-danger border-opacity-25 mb-2">
                                <small className="text-muted d-block fw-bold text-uppercase" style={{ fontSize: "11px" }}>
                                  {isMl ? `${rejectionStageLabel(loan)} നൽകിയ കാരണം` : `Specific reason from ${rejectionStageLabel(loan)}`}:
                                </small>
                                <span className="text-dark fw-semibold">
                                  {loan.rejectionReason ||
                                    loan.remarks ||
                                    "Did not meet NHG eligibility criteria at this time (e.g., minimum 3 months thrift savings history or active overdue loan)."}
                                </span>
                              </div>
                            </div>

                            {/* WHAT TO DO NEXT BOX FOR REJECTED LOAN */}
                            <div className="p-3 bg-light rounded-3 border border-secondary border-opacity-25 mb-3">
                              <h6 className="fw-bold text-dark d-flex align-items-center gap-2 mb-2">
                                <span>💡</span>
                                <span>{t("whatToDoNext") || "What You Need To Do Next"}:</span>
                              </h6>
                              <ul className="small text-secondary mb-3 ps-3 lh-base">
                                <li className="mb-2">
                                  <strong>1. Understand the criteria:</strong> Kudumbashree guidelines require
                                  consistent weekly meeting attendance and an uninterrupted thrift savings record.
                                </li>
                                <li className="mb-2">
                                  <strong>2. Discuss with Secretary:</strong> Attend the next weekly Ayalkoottam
                                  gathering to clarify the notes above with the Secretary and Chairperson.
                                </li>
                                <li>
                                  <strong>3. Re-apply when eligible:</strong> Once required criteria or documents are
                                  fulfilled, you can re-apply directly.
                                </li>
                              </ul>

          {isSecretary && <button
                                className="btn btn-sm btn-outline-danger fw-semibold d-inline-flex align-items-center gap-2"
                                onClick={() => handleReapply(loan)}
                              >
                                <span>🔄</span>
                                <span>{t("reapplyLoanBtn") || "Re-apply with Updated Details"}</span>
          </button>}
                            </div>
                          </div>
                        )}

                        {/* CASE 3: APPROVED / SANCTIONED (ACTIVE LOAN) */}
                        {["Repayment", "Approved"].includes(loan.status) && (
                          <div>
                            {/* APPROVAL FINANCIAL METRICS GRID */}
                            <div className="row g-3 mb-4">
                              <div className="col-md-3 col-6">
                                <div className="p-3 bg-light rounded-3 border">
                                  <small className="text-muted d-block" style={{ fontSize: "11px" }}>
                                    Sanctioned Principal
                                  </small>
                                  <strong className="fs-5 text-dark">
                                    ₹{Number(approvedPrincipal).toLocaleString()}
                                  </strong>
                                </div>
                              </div>

                              <div className="col-md-3 col-6">
                                <div className="p-3 bg-light rounded-3 border">
                                  <small className="text-muted d-block" style={{ fontSize: "11px" }}>
                                    Subsidized Interest
                                  </small>
                                  <strong className="fs-5 text-primary">
                                    {loan.interestRate || 4}% p.a.
                                  </strong>
                                </div>
                              </div>

                              <div className="col-md-3 col-6">
                                <div className="p-3 bg-light rounded-3 border">
                                  <small className="text-muted d-block" style={{ fontSize: "11px" }}>
                                    Total Repaid So Far
                                  </small>
                                  <strong className="fs-5 text-success">
                                    ₹{Number(repaid).toLocaleString()}
                                  </strong>
                                </div>
                              </div>

                              <div className="col-md-3 col-6">
                                <div className="p-3 bg-light rounded-3 border">
                                  <small className="text-muted d-block" style={{ fontSize: "11px" }}>
                                    Remaining Balance
                                  </small>
                                  <strong className="fs-5 text-danger">
                                    ₹{Number(remaining).toLocaleString()}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            {loan.status === "Repayment" && isMember && (
                              <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
                                <button className="btn btn-success fw-semibold" type="button" onClick={() => openPaymentModal(loan)}>
                                  💳 {isMl ? "ഇ.എം.ഐ പേയ്‌മെന്റ് റഫറൻസ് സമർപ്പിക്കുക" : "Submit EMI payment reference"}
                                </button>
                                <small className="text-muted">{isMl ? "പണമടച്ച ശേഷം റഫറൻസ് നൽകുക; ബാങ്ക് ഷെഡ്യൂളുമായി പരിശോധിച്ച് സെക്രട്ടറി സ്ഥിരീകരിച്ചാൽ ബാലൻസ് പുതുക്കും." : "Submit after paying; your NHG Secretary checks the receipt and due date against the bank schedule before updating the balance."}</small>
                              </div>
                            )}
                            {!!loan.repayments?.length && <div className="table-responsive mb-3"><table className="table table-sm align-middle"><thead><tr><th>{isMl ? "തീയതി" : "Date"}</th><th>{isMl ? "തുക" : "Amount"}</th><th>{isMl ? "റഫറൻസ്" : "Reference"}</th><th>{isMl ? "നില" : "Status"}</th><th>{isMl ? "സബ്‌സിഡി പരിശോധന" : "Subsidy review"}</th></tr></thead><tbody>{loan.repayments.map((payment) => <tr key={payment._id}><td>{new Date(payment.paymentDate).toLocaleDateString()}</td><td>₹{Number(payment.amount).toLocaleString()}</td><td>{payment.receiptReference || "—"}</td><td><span className={`badge ${payment.status === "Verified" ? "text-bg-success" : payment.status === "Rejected" ? "text-bg-danger" : "text-bg-warning"}`}>{payment.status}</span></td><td className="small">{payment.onTime === true ? (isMl ? "സമയത്ത് അടച്ചു; ബാങ്ക് യോഗ്യത പരിശോധിക്കണം" : "On-time candidate; bank eligibility must be confirmed") : payment.onTime === false ? (isMl ? "വൈകി" : "Late"): (isMl ? "പരിശോധന കാത്തിരിക്കുന്നു" : "Awaiting verification")}</td></tr>)}</tbody></table></div>}

                            {/* REPAYMENT PROGRESS BAR */}
                            <div className="mb-4">
                              <div className="d-flex justify-content-between small fw-bold mb-1">
                                <span>{t("repaymentProgress") || "Repayment Progress"}:</span>
                                <span>
                                  {progressPct}% Repaid (₹{repaid.toLocaleString()} of ₹{approvedPrincipal.toLocaleString()})
                                </span>
                              </div>
                              <div className="progress" style={{ height: "10px", borderRadius: "10px" }}>
                                <div
                                  className="progress-bar bg-success"
                                  role="progressbar"
                                  style={{ width: `${progressPct}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* WHAT TO DO NEXT GUIDE BOX (POST-APPROVAL) */}
                            <div
                              className="p-4 rounded-3 mb-3"
                              style={{
                                background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)",
                                border: "1px solid #bbf7d0",
                              }}
                            >
                              <div className="d-flex align-items-center gap-2 mb-3">
                                <span className="fs-4">🌟</span>
                                <h6 className="fw-bolder text-dark mb-0">
                                  {isMl
                                    ? "വായ്പ അനുവദിച്ചു: നിങ്ങൾ ഇനി ചെയ്യേണ്ട കാര്യങ്ങൾ (അടുത്ത നടപടികൾ)"
                                    : "Loan Approved: What You Need To Do Next"}
                                </h6>
                              </div>

                              <div className="row g-3">
                                <div className="col-md-6">
                                  <div className="d-flex align-items-start gap-2 bg-white p-3 rounded-3 shadow-sm h-100 border">
                                    <span className="badge bg-success rounded-circle p-2 fs-6">1</span>
                                    <div>
                                      <strong className="d-block small text-dark">
                                        {isMl ? "തുക കൈപ്പറ്റുക (Disbursement)" : "Collect Sanctioned Funds"}
                                      </strong>
                                      <p className="small text-muted mb-0 lh-sm">
                                        {isMl
                                          ? `അടുത്ത പ്രതിവാര യോഗത്തിൽ പങ്കെടുത്ത് NHG ലോൺ രജിസ്റ്ററിൽ ഒപ്പിട്ട് ₹${approvedPrincipal.toLocaleString()} കൈപ്പറ്റുക.`
                                          : `Attend the upcoming weekly meeting. Sign the NHG register to receive ₹${approvedPrincipal.toLocaleString()} via cash or direct bank transfer.`}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="col-md-6">
                                  <div className="d-flex align-items-start gap-2 bg-white p-3 rounded-3 shadow-sm h-100 border">
                                    <span className="badge bg-primary rounded-circle p-2 fs-6">2</span>
                                    <div>
                                      <strong className="d-block small text-dark">
                                        {isMl ? "പ്രതിവാര ഗഡു അടയ്ക്കുക (Weekly EMI)" : "Pay Weekly Installment"}
                                      </strong>
                                      <p className="small text-muted mb-0 lh-sm">
                                        {isMl
                                          ? `ഓരോ യോഗത്തിലും ഏകദേശം ₹${estWeeklyEmi} ഗഡു സെക്രട്ടറിയെ ഏൽപ്പിക്കുക. ഡിജിറ്റൽ എൻട്രി രേഖപ്പെടുത്തും.`
                                          : `Bring your weekly installment (approx. ₹${estWeeklyEmi}/wk) to every meeting. The Secretary records it digitally.`}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="col-md-6">
                                  <div className="d-flex align-items-start gap-2 bg-white p-3 rounded-3 shadow-sm h-100 border">
                                    <span className="badge bg-warning text-dark rounded-circle p-2 fs-6">3</span>
                                    <div>
                                      <strong className="d-block small text-dark">
                                        {isMl ? "തത്സമയ പോർട്ടൽ പരിശോധന" : "Track Real-Time Updates"}
                                      </strong>
                                      <p className="small text-muted mb-0 lh-sm">
                                        {isMl
                                          ? "യോഗത്തിന് ശേഷം ഈ പോർട്ടലിൽ ലോഗിൻ ചെയ്ത് ബാക്കി തുക കുറഞ്ഞുവെന്ന് പരിശോധിക്കുക."
                                          : "Log in here after each meeting to confirm your payment was credited and balance reduced."}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="col-md-6">
                                  <div className="d-flex align-items-start gap-2 bg-white p-3 rounded-3 shadow-sm h-100 border">
                                    <span className="badge bg-info text-dark rounded-circle p-2 fs-6">4</span>
                                    <div>
                                      <strong className="d-block small text-dark">
                                        {isMl ? "രസീതും എൻ.ഒ.സിയും" : "Sanction Slip & Receipts"}
                                      </strong>
                                      <p className="small text-muted mb-0 lh-sm">
                                        {isMl
                                          ? "താഴെയുള്ള ബട്ടൺ വഴി വായ്പ അനുമതി രസീത് ഡൗൺലോഡ് ചെയ്തു സൂക്ഷിക്കാം."
                                          : "Download and print your official Kudumbashree loan sanction voucher below."}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 pt-2 text-end">
                                <button
                                  className="btn btn-sm btn-dark fw-semibold d-inline-flex align-items-center gap-1 shadow-sm"
                                  onClick={() => setSlipModal({ show: true, loan })}
                                >
                                  <span>🖨️</span>
                                  <span>{t("printSanctionSlip") || "Print Loan Sanction Slip"}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* CASE 4: COMPLETED (FULLY REPAID) */}
                        {loan.status === "Completed" && (
                          <div className="p-3 bg-light rounded-3 border">
                            <div className="d-flex align-items-center gap-3">
                              <span className="fs-1">🎉</span>
                              <div>
                                <h6 className="fw-bold text-success mb-1">
                                  {isMl ? "വായ്പ പൂർണ്ണമായി തിരിച്ചടച്ചു!" : "Loan Successfully Settled!"}
                                </h6>
                                <p className="small text-muted mb-0">
                                  Principal of ₹{approvedPrincipal.toLocaleString()} has been fully repaid.
                                  Official No-Objection status issued by Kudumbashree Ward 15 NHG.
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 text-end">
                              <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => setSlipModal({ show: true, loan })}
                              >
                                🖨️ View Settlement Certificate
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: APPLY FOR LOAN FORM */}
        {activeTab === "apply" && (
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="portal-card">
                <div className="portal-card-header">
                  <h5 className="portal-card-title">📝 {t("applyLoanBtn")}</h5>
                  <small className="text-muted">
                    Submit your micro-credit request for Kudumbashree Ayalkoottam review
                  </small>
                </div>

                <form onSubmit={handleSubmit} className="p-3">
                  {isMember && maximumLoanAmount !== null && maximumLoanAmount <= 0 && (
                    <div className="alert alert-warning small" role="status">
                      Your current maximum request is ₹0 because no eligible thrift savings are recorded yet. Ask your NHG Secretary to record your savings, check them in <Link to="/thrift" className="alert-link">My Passbook</Link>, then return here and refresh the page. Submit stays disabled until an eligible amount is available.
                    </div>
                  )}
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">{t("memberIdLabel")} *</label>
                      <input
                        type="text"
                        name="memberId"
                        className="form-control"
                        placeholder="e.g. KC00001"
                        value={formData.memberId}
                        onChange={handleChange}
                        readOnly={isMember}
                        required
                      />
                      {!isMember && members.length > 0 && (
                        <div className="mt-1">
                          <small className="text-muted me-1">Quick pick:</small>
                          <select
                            className="form-select form-select-sm d-inline-block w-auto"
                            value={formData.memberId}
                            onChange={(e) => handleMemberSelectForForm(e.target.value)}
                          >
                            <option value="">-- Choose Member --</option>
                            {members.map((m) => (
                              <option key={m._id} value={m.memberId}>
                                {m.name} ({m.memberId})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">{t("memberNameLabel")} *</label>
                      <input
                        type="text"
                        name="memberName"
                        className="form-control"
                        placeholder="e.g. Archana M"
                        value={formData.memberName}
                        onChange={handleChange}
                        readOnly={isMember}
                        required
                      />
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">{t("loanTypeLabel")} *</label>
                      <select
                        name="loanType"
                        className="form-select"
                        value={formData.loanType}
                        onChange={handleChange}
                        required
                      >
                        <option value="Emergency Micro-Credit">Emergency Micro-Credit (ആവശ്യ വായ്പ)</option>
                        <option value="Micro-Enterprise / Farming">Micro-Enterprise / Farming (കൃഷി/സംരംഭം)</option>
                        <option value="Higher Education / Schooling">Education / Schooling (വിദ്യാഭ്യാസം)</option>
                        <option value="Home Repair / Sanitation">Home Repair / Sanitation (ഭവന നവീകരണം)</option>
                        <option value="Community Welfare">Community Welfare Purpose (സാമൂഹിക ആവശ്യങ്ങൾ)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">{t("loanAmountLabel")} *</label>
                      <input
                        type="number"
                        name="amount"
                        className="form-control"
                        placeholder="Enter amount in ₹"
                        min="1"
                        step="1"
                        max={isMember && maximumLoanAmount !== null ? maximumLoanAmount : undefined}
                        value={formData.amount}
                        onChange={handleChange}
                        required
                      />
                      <small className="text-muted d-block" style={{ fontSize: "11px" }}>
                        {isMember
                          ? memberThriftAmount === null
                            ? "Loading your recorded thrift total…"
                            : `Trust score: ${memberCreditScore?.score ?? "—"}/100 (${memberCreditScore?.tier || "calculating"}) · Attendance ${memberCreditScore?.attendancePercent ?? "—"}% · Thrift consistency ${memberCreditScore?.thriftConsistencyPercent ?? "—"}% · On-time repayments ${memberCreditScore?.onTimeRepaymentPercent ?? "—"}%. Maximum request: ₹${Number(maximumLoanAmount || 0).toLocaleString()} from recorded thrift of ₹${memberThriftAmount.toLocaleString()}.`
                          : "The requested amount must not exceed the member's recorded thrift total."}
                      </small>
                      {isMember && maximumLoanAmount !== null && Number(formData.amount) > maximumLoanAmount && (
                        <small className="text-danger d-block mt-1">Requested amount exceeds your current trust-score limit.</small>
                      )}
                      <small className="text-muted d-block mt-1" style={{ fontSize: "11px" }}>
                        Final eligibility is also subject to NHG, ADS/CDS, and applicable bank scheme review.
                      </small>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold small">{t("purposeLabel")} *</label>
                    <textarea
                      name="purpose"
                      className="form-control"
                      rows="3"
                      placeholder="Explain in detail the purpose of this loan and how you plan to repay..."
                      value={formData.purpose}
                      onChange={handleChange}
                      required
                    ></textarea>
                  </div>

                  <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary fw-semibold px-4 py-2" disabled={isMember && (maximumLoanAmount === null || Number(formData.amount) > maximumLoanAmount)}>
                      ✓ {t("submit")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-light border px-3"
                      onClick={() => setActiveTab("myLoans")}
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MASTER LOAN REGISTER (FOR SECRETARY SANCTIONING & REPAYMENT) */}
        {activeTab === "register" && (
          <div className="portal-card" id={isAdsWorkspace ? "ads-review-queue" : isBankOfficer ? "bank-review-queue" : undefined}>
            <div className="portal-card-header d-flex justify-content-between align-items-center">
              <div>
                <h5 className="portal-card-title">📋 {isAdsWorkspace ? (isMl ? "എ.ഡി.എസ് പരിശോധനാ പട്ടിക" : "ADS Verification Queue") : t("masterRegisterTab") || "NHG Master Loan Register"}</h5>
                <small className="text-muted">
                  {isBankOfficer ? (isMl ? "സി.ഡി.എസ് കൈമാറിയ അപേക്ഷകൾ മാത്രം. എല്ലാ തീരുമാനങ്ങളും ഡെമോ രേഖകളാണ്." : "Applications forwarded by CDS only. All bank decisions recorded here are demo entries.") : isAdsWorkspace ? (isMl ? "സെക്രട്ടറി അംഗീകരിച്ച് എ.ഡി.എസ് പരിശോധനയ്ക്ക് അയച്ച വായ്പകൾ മാത്രം." : "Only applications sent to ADS after NHG Secretary verification are listed here.") : isMl ? "NHG പരിശോധന, ADS/CDS ശുപാർശകൾ, ബാങ്ക് തീരുമാനങ്ങൾ, സ്ഥിരീകരിച്ച ഇ.എം.ഐ രേഖകൾ." : "NHG reviews, ADS/CDS decisions, bank updates, and verified EMI receipts."}
                </small>
              </div>
              <span className="badge bg-light text-dark border">
                {registerLoans.length} {isAdsWorkspace ? (isMl ? "പരിശോധന കാത്തിരിക്കുന്നു" : "Awaiting ADS") : "Total Applications"}
              </span>
            </div>

            {loading ? (
              <div className="text-center py-5">{t("loading")}</div>
            ) : registerLoans.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <p>{isAdsWorkspace ? (isMl ? "പരിശോധനയ്ക്കായി അപേക്ഷകളില്ല." : "No loan applications are waiting for ADS verification.") : "No loan records found in the database."}</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="portal-table table">
                  <thead>
                    <tr>
                      <th>{t("name")}</th>
                      <th>{t("loanTypeLabel")}</th>
                      <th>Requested</th>
                      <th>Sanctioned</th>
                      <th>{t("outstandingBalance")}</th>
                      <th>{t("status")}</th>
                      <th>{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registerLoans.map((loan) => (
                      <tr key={loan._id}>
                        <td>
                          <strong>{loan.memberName}</strong>
                          <br />
                          <small className="text-muted">{loan.memberId}</small>
                        </td>
                        <td>
                          <span className="badge bg-light text-dark border">{loan.loanType}</span>
                        </td>
                        <td className="fw-semibold">₹{Number(loan.amount).toLocaleString()}</td>
                        <td className="fw-bold text-dark">
                          ₹{Number(loan.approvedAmount || 0).toLocaleString()}
                        </td>
                        <td className="text-danger fw-bold">
                          ₹{Number(loan.remainingAmount || 0).toLocaleString()}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              loan.status === "Approved"
                                ? "bg-success"
                                : loan.status === "Rejected"
                                ? "bg-danger"
                                : loan.status === "Completed"
                                ? "bg-primary"
                                : "bg-warning text-dark"
                            }`}
                          >
                            {statusLabel(loan.status)}
                          </span>
                        </td>

                        {/* SECRETARY ACTIONS */}
                        <td>
                          {loan.status === "Pending" && isSecretary && <div className="d-flex gap-1 mb-1">
                            <button className="btn btn-sm btn-outline-success" onClick={() => openSanctionModal(loan)}>{isMl ? "✓ പരിശോധിക്കുക" : "✓ Verify"}</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => openRejectModal(loan)}>✕ {isMl ? "നിരസിക്കുക" : "Reject"}</button>
                          </div>}

                          {loan.status === "ADS Review" && isAdsOfficer && <div className="d-flex gap-1 mb-1">
                            <button className="btn btn-sm btn-outline-success" onClick={() => openReviewModal(loan, "ADS")}>✓ {isMl ? "എ.ഡി.എസ് അംഗീകാരം" : "ADS approve"}</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => openRejectModal(loan)}>✕ {isMl ? "നിരസിക്കുക" : "Reject"}</button>
                          </div>}

                          {loan.status === "CDS Review" && isCdsOfficer && <div className="d-flex gap-1 mb-1">
                            <button className="btn btn-sm btn-outline-success" onClick={() => openReviewModal(loan, "CDS")}>✓ {isMl ? "ബാങ്കിലേക്ക് അയയ്ക്കുക" : "Verify & forward"}</button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => openRejectModal(loan)}>✕ {isMl ? "നിരസിക്കുക" : "Reject"}</button>
                          </div>}

                          {loan.status === "Bank Review" && (isMainAdmin || isBankOfficer) && <button className="btn btn-sm btn-primary mb-1" onClick={() => openBankModal(loan, "Approved")}>{isMl ? "🏦 ഡെമോ ബാങ്ക് തീരുമാനം രേഖപ്പെടുത്തുക" : "🏦 Record demo bank decision"}</button>}
                          {loan.status === "Bank Approved" && (isMainAdmin || isBankOfficer) && <button className="btn btn-sm btn-success mb-1" onClick={() => openBankModal(loan, "Disbursed")}>{isMl ? "💸 ഡെമോ വിതരണം രേഖപ്പെടുത്തുക" : "💸 Record demo disbursement"}</button>}

                          {(["Repayment", "Approved"].includes(loan.status)) && isSecretary && (
                            <div style={{ minWidth: "150px" }}>
                              <input
                                type="number"
                                className="form-control form-control-sm mb-1"
                                placeholder="Cash EMI (₹)"
                                min="1"
                                max={loan.remainingAmount}
                                value={repaymentAmounts[loan._id] || ""}
                                onChange={(e) => setRepaymentAmounts({ ...repaymentAmounts, [loan._id]: e.target.value })}
                              />
                              <button className="btn btn-sm btn-success w-100" onClick={() => addRepayment(loan._id)}>{isMl ? "തിരിച്ചടവ് രേഖപ്പെടുത്തുക" : "Record collected EMI"}</button>
                            </div>
                          )}

                          {loan.repayments?.filter((payment) => payment.status === "Submitted").map((payment) => (
                            <div className="border rounded p-2 small mt-2" key={payment._id}>
                              <div>{loan.memberName} • ₹{payment.amount} • {payment.receiptReference || "No reference"}</div>
                              <div>{payment.dueDate ? `Due ${new Date(payment.dueDate).toLocaleDateString()} · ` : ""}{new Date(payment.paymentDate).toLocaleDateString()}</div>
                              {isSecretary && <div className="d-flex gap-1 mt-1"><button className="btn btn-sm btn-success" onClick={() => verifyMemberPayment(loan, payment, "Verify")}>{isMl ? "സ്ഥിരീകരിക്കുക" : "Verify receipt"}</button><button className="btn btn-sm btn-outline-danger" onClick={() => verifyMemberPayment(loan, payment, "Reject")}>{isMl ? "നിരസിക്കുക" : "Reject"}</button></div>}
                            </div>
                          ))}

                          {!["Pending", "ADS Review", "CDS Review", "Bank Review", "Repayment", "Approved", "Rejected", "Completed"].includes(loan.status) && (
                            <span className="badge bg-light text-muted border small">{statusLabel(loan.status)}</span>
                          )}

                          {/* Legacy Approved loans remain payable while existing records transition. */}
                          {loan.status === "Approved" && !isSecretary && (
                            <span className="badge bg-success-subtle text-success border">{t("approvedStatus")}</span>
                          )}

                          {loan.status === "Rejected" && (
                            <span className="text-muted small" title={loan.rejectionReason}>
                              {loan.rejectionReason ? `Reason: ${loan.rejectionReason.slice(0, 20)}...` : "—"}
                            </span>
                          )}

                          {loan.status === "Completed" && (
                            <span className="badge bg-primary-subtle text-primary border">✓ {t("closedStatus")}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showBankOfficerModal && isMainAdmin && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header bg-primary text-white">
              <h5 className="custom-modal-title text-white">🏦 Create Demo Bank Officer</h5>
              <button type="button" className="btn-close btn-close-white" onClick={() => setShowBankOfficerModal(false)} />
            </div>
            <form onSubmit={createDemoBankOfficer}>
              <div className="custom-modal-body">
                <div className="alert alert-warning small">Demo access is limited to applications at the Bank Review stage. It is not a real bank account.</div>
                <label className="form-label fw-semibold">Officer name *</label>
                <input className="form-control mb-3" value={bankOfficerForm.name} onChange={(e) => setBankOfficerForm({ ...bankOfficerForm, name: e.target.value })} required />
                <label className="form-label fw-semibold">Sign-in email *</label>
                <input type="email" className="form-control mb-3" value={bankOfficerForm.email} onChange={(e) => setBankOfficerForm({ ...bankOfficerForm, email: e.target.value })} required />
                <label className="form-label fw-semibold">Temporary password (at least 6 characters) *</label>
                <input type="password" className="form-control" minLength="6" autoComplete="new-password" value={bankOfficerForm.password} onChange={(e) => setBankOfficerForm({ ...bankOfficerForm, password: e.target.value })} required />
                <small className="text-muted d-block mt-2">Share the sign-in details only with your intended demo user.</small>
              </div>
              <div className="custom-modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBankOfficerModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create demo account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: SECRETARY APPROVAL & SANCTION MODAL */}
      {sanctionModal.show && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header bg-success text-white">
              <h5 className="custom-modal-title text-white">✓ NHG eligibility and meeting review</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setSanctionModal({ ...sanctionModal, show: false })}
              ></button>
            </div>
            <form onSubmit={handleConfirmSanction}>
              <div className="custom-modal-body">
                <p className="small text-muted mb-3">
                  Review for <strong>{sanctionModal.loan?.memberName}</strong> ({sanctionModal.loan?.memberId}). Requested: <strong>₹{sanctionModal.loan?.amount}</strong>. The NHG Secretary records the eligibility check and meeting resolution before forwarding to ADS.
                </p>

                <div className={`alert ${sanctionModal.thriftError || (sanctionModal.memberThriftAmount !== null && Number(sanctionModal.loan?.amount) > sanctionModal.memberThriftAmount) ? "alert-danger" : "alert-success"} py-2`} role="status">
                  {sanctionModal.thriftLoading
                    ? "Checking recorded thrift total…"
                    : sanctionModal.thriftError
                    ? sanctionModal.thriftError
                    : <>Recorded member thrift: <strong>₹{Number(sanctionModal.memberThriftAmount || 0).toLocaleString()}</strong>. Requested loan must not exceed this amount under the K-Connect demo rule.</>}
                </div>
                {sanctionModal.memberThriftAmount !== null && Number(sanctionModal.loan?.amount) > sanctionModal.memberThriftAmount && (
                  <div className="small text-danger mb-3">This request exceeds the member's recorded thrift and cannot be forwarded for sanction.</div>
                )}

                <div className="form-group-item mb-3">
                  <label className="form-label fw-semibold">NHG meeting resolution / minutes reference *</label>
                  <input className="form-control" value={sanctionModal.meetingResolution} onChange={(e) => setSanctionModal({ ...sanctionModal, meetingResolution: e.target.value })} placeholder="Meeting no. and resolution" required />
                </div>

                <div className="form-check border rounded p-3 ps-5 mb-3">
                  <input className="form-check-input" type="checkbox" id="eligibilityChecked" checked={sanctionModal.eligible} onChange={(e) => setSanctionModal({ ...sanctionModal, eligible: e.target.checked })} required disabled={sanctionModal.thriftLoading || Boolean(sanctionModal.thriftError) || sanctionModal.memberThriftAmount === null || Number(sanctionModal.loan?.amount) > sanctionModal.memberThriftAmount} />
                  <label className="form-check-label" htmlFor="eligibilityChecked">I checked the member's eligibility and the NHG meeting resolution.</label>
                </div>

                <div className="form-group-item mb-2">
                  <label className="form-label fw-semibold">Secretary remarks</label>
                  <textarea className="form-control" rows="2" value={sanctionModal.remarks} onChange={(e) => setSanctionModal({ ...sanctionModal, remarks: e.target.value })} />
                </div>
              </div>

              <div className="custom-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSanctionModal({ ...sanctionModal, show: false })}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-success fw-bold px-3" disabled={sanctionModal.thriftLoading || Boolean(sanctionModal.thriftError) || sanctionModal.memberThriftAmount === null || Number(sanctionModal.loan?.amount) > sanctionModal.memberThriftAmount}>
                  ✓ Verify & forward to ADS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewModal.show && reviewModal.loan && (
        <div className="custom-modal-backdrop"><div className="custom-modal-card">
          <div className="custom-modal-header bg-primary text-white"><h5 className="custom-modal-title text-white">{reviewModal.stage} review</h5><button type="button" className="btn-close btn-close-white" onClick={() => setReviewModal({ ...reviewModal, show: false })} /></div>
          <form onSubmit={submitStageReview}><div className="custom-modal-body">
            <p>{reviewModal.loan.memberName} • {reviewModal.loan.loanId} • ₹{Number(reviewModal.loan.amount).toLocaleString()}</p>
            {reviewModal.stage === "CDS" && <p className="small text-muted">NHG resolution: {reviewModal.loan.secretaryReview?.meetingResolution || "Not recorded"}</p>}
            <label className="form-label fw-semibold">{reviewModal.stage} meeting / review reference *</label>
            <input className="form-control mb-3" value={reviewModal.reference} onChange={(e) => setReviewModal({ ...reviewModal, reference: e.target.value })} required />
            <label className="form-label fw-semibold">Remarks</label><textarea className="form-control" rows="2" value={reviewModal.remarks} onChange={(e) => setReviewModal({ ...reviewModal, remarks: e.target.value })} />
          </div><div className="custom-modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setReviewModal({ ...reviewModal, show: false })}>Cancel</button><button type="submit" className="btn btn-primary">{reviewModal.stage === "ADS" ? "Approve & send to CDS" : "Verify & forward to Bank"}</button></div></form>
        </div></div>
      )}

      {bankModal.show && bankModal.loan && (
        <div className="custom-modal-backdrop"><div className="custom-modal-card">
          <div className="custom-modal-header bg-dark text-white"><h5 className="custom-modal-title text-white">{bankModal.decision === "Disbursed" ? "Record demo bank disbursement" : "Record demo bank decision"}</h5><button type="button" className="btn-close btn-close-white" onClick={() => setBankModal({ ...bankModal, show: false })} /></div>
          <form onSubmit={recordBankDecision}><div className="custom-modal-body">
            <div className="alert alert-warning small"><strong>Project simulation:</strong> This records a demo decision only. K-Connect does not contact a real bank or transfer funds.</div>
            <p>{bankModal.loan.memberName} • {bankModal.loan.loanId} • requested ₹{Number(bankModal.loan.amount).toLocaleString()}</p>
            {bankModal.loan.status === "Bank Review" ? <><label className="form-label fw-semibold">Demo bank decision *</label>
            <select className="form-select mb-3" value={bankModal.decision} onChange={(e) => setBankModal({ ...bankModal, decision: e.target.value })}><option value="Approved">Approve in demo; awaiting simulated disbursement</option><option value="Declined">Decline in demo</option></select></> : <div className="alert alert-success small">Demo approval recorded for ₹{Number(bankModal.loan.approvedAmount).toLocaleString()} at {bankModal.loan.interestRate}% p.a. Record the simulated disbursement.</div>}
            <label className="form-label fw-semibold">{bankModal.decision === "Disbursed" ? "Demo disbursement reference *" : "Demo decision reference *"}</label><input className="form-control mb-3" value={bankModal.reference} onChange={(e) => setBankModal({ ...bankModal, reference: e.target.value })} required />
            {bankModal.decision === "Approved" && <>
              <div className="row g-2"><div className="col-sm-6"><label className="form-label fw-semibold">Amount approved (₹) *</label><input className="form-control" type="number" min="1" value={bankModal.approvedAmount} onChange={(e) => setBankModal({ ...bankModal, approvedAmount: e.target.value })} required /></div><div className="col-sm-6"><label className="form-label fw-semibold">Bank interest rate (% p.a.) *</label><input className="form-control" type="number" min="0" step="0.01" value={bankModal.interestRate} onChange={(e) => setBankModal({ ...bankModal, interestRate: e.target.value })} required /></div></div>
              <label className="form-label fw-semibold mt-3">Bank repayment schedule reference</label><input className="form-control mb-3" value={bankModal.paymentScheduleReference} onChange={(e) => setBankModal({ ...bankModal, paymentScheduleReference: e.target.value })} />
            </>}
            <label className="form-label fw-semibold">{bankModal.decision === "Declined" ? "Specific reason for rejection *" : "Remarks"}</label><textarea className="form-control" rows="2" value={bankModal.remarks} onChange={(e) => setBankModal({ ...bankModal, remarks: e.target.value })} required={bankModal.decision === "Declined"} placeholder={bankModal.decision === "Declined" ? "Explain why the application is declined; the member will see this." : "Optional notes"} />
          </div><div className="custom-modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setBankModal({ ...bankModal, show: false })}>Cancel</button><button type="submit" className="btn btn-dark">{bankModal.decision === "Disbursed" ? "Save demo disbursement" : "Save demo bank decision"}</button></div></form>
        </div></div>
      )}

      {paymentModal.show && paymentModal.loan && (
        <div className="custom-modal-backdrop"><div className="custom-modal-card">
          <div className="custom-modal-header bg-success text-white"><h5 className="custom-modal-title text-white">{isMl ? "ഇ.എം.ഐ പേയ്‌മെന്റ് രേഖ" : "Submit EMI payment"}</h5><button type="button" className="btn-close btn-close-white" onClick={() => setPaymentModal({ ...paymentModal, show: false })} /></div>
          <form onSubmit={submitMemberPayment}><div className="custom-modal-body">
            <p className="small text-muted">{isMl ? "പണം ബാങ്ക് / എൻ.എച്ച്.ജി മാർഗം അടച്ച ശേഷം റഫറൻസ് സമർപ്പിക്കുക. സെക്രട്ടറി സ്ഥിരീകരിക്കും." : "Submit the receipt after paying through the bank or NHG. The Secretary verifies it before the loan balance changes."}</p>
            <label className="form-label fw-semibold">{isMl ? "അടച്ച തുക (₹)" : "Amount paid (₹)"} *</label><input className="form-control mb-3" type="number" min="1" max={paymentModal.loan.remainingAmount} value={paymentModal.amount} onChange={(e) => setPaymentModal({ ...paymentModal, amount: e.target.value })} required />
            <div className="row g-2"><div className="col-sm-6"><label className="form-label fw-semibold">{isMl ? "പേയ്മെന്റ് തീയതി" : "Payment date"} *</label><input className="form-control" type="date" value={paymentModal.paymentDate} onChange={(e) => setPaymentModal({ ...paymentModal, paymentDate: e.target.value })} required /></div><div className="col-sm-6"><label className="form-label fw-semibold">{isMl ? "ഇ.എം.ഐ അവസാന തീയതി" : "EMI due date"}</label><input className="form-control" type="date" value={paymentModal.dueDate} onChange={(e) => setPaymentModal({ ...paymentModal, dueDate: e.target.value })} /></div></div>
            <label className="form-label fw-semibold mt-3">{isMl ? "ബാങ്ക് / രസീത് റഫറൻസ്" : "Bank / receipt reference"} *</label><input className="form-control" value={paymentModal.receiptReference} onChange={(e) => setPaymentModal({ ...paymentModal, receiptReference: e.target.value })} required />
          </div><div className="custom-modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setPaymentModal({ ...paymentModal, show: false })}>{t("cancel")}</button><button type="submit" className="btn btn-success">{isMl ? "സ്ഥിരീകരണത്തിന് സമർപ്പിക്കുക" : "Submit for verification"}</button></div></form>
        </div></div>
      )}

      {/* MODAL 2: SECRETARY REJECTION MODAL */}
      {rejectModal.show && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card">
            <div className="custom-modal-header bg-danger text-white">
              <h5 className="custom-modal-title text-white">✕ Reject Loan Application · {rejectionStageForStatus(rejectModal.loan?.status)}</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setRejectModal({ ...rejectModal, show: false })}
              ></button>
            </div>
            <form onSubmit={handleConfirmReject}>
              <div className="custom-modal-body">
                <p className="small text-muted mb-3">
                  Applicant: <strong>{rejectModal.loan?.memberName}</strong> ({rejectModal.loan?.memberId}). This decision and your reason will be shown in the member’s loan progress.
                </p>

                <div className="form-group-item mb-3">
                  <label className="form-group-label">Specific reason from {rejectionStageForStatus(rejectModal.loan?.status)} *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={rejectModal.rejectionReason}
                    onChange={(e) => setRejectModal({ ...rejectModal, rejectionReason: e.target.value })}
                    minLength={5}
                    placeholder="Explain the reason clearly for the member."
                    required
                  ></textarea>
                </div>
              </div>

              <div className="custom-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRejectModal({ ...rejectModal, show: false })}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger fw-bold px-3">
                  ✕ Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: OFFICIAL SANCTION SLIP PRINT MODAL */}
      {slipModal.show && slipModal.loan && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card" style={{ maxWidth: "600px" }}>
            <div className="custom-modal-header bg-dark text-white">
              <h5 className="custom-modal-title text-white">🖨️ Kudumbashree Loan Voucher</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setSlipModal({ show: false, loan: null })}
              ></button>
            </div>

            <div className="custom-modal-body p-4 bg-white">
              <div className="border border-2 border-dark p-4 rounded-3 text-dark">
                <div className="text-center border-bottom pb-3 mb-3">
                  <span className="fs-3 d-block">🏛️</span>
                  <h5 className="fw-bolder mb-0 text-uppercase">Kudumbashree Mission Kerala</h5>
                  <small className="text-muted d-block">
                    Ward 15 Ayalkoottam Community Micro-Credit Sanction Order
                  </small>
                </div>

                <div className="row g-2 small mb-3">
                  <div className="col-6">
                    <span className="text-muted d-block">Member Name:</span>
                    <strong>{slipModal.loan.memberName}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block">Member ID:</span>
                    <strong>{slipModal.loan.memberId}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block">Loan Category:</span>
                    <strong>{slipModal.loan.loanType}</strong>
                  </div>
                  <div className="col-6">
                    <span className="text-muted d-block">Sanction Date:</span>
                    <strong>
                      {slipModal.loan.sanctionDate
                        ? new Date(slipModal.loan.sanctionDate).toLocaleDateString()
                        : new Date(slipModal.loan.updatedAt).toLocaleDateString()}
                    </strong>
                  </div>
                </div>

                <div className="p-3 bg-light rounded-3 mb-3 border">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Sanctioned Principal:</span>
                    <strong className="fs-5">
                      ₹{Number(slipModal.loan.approvedAmount || slipModal.loan.amount).toLocaleString()}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Subsidized Interest Rate:</span>
                    <strong>{slipModal.loan.interestRate || 4}% p.a.</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Repaid Amount:</span>
                    <strong className="text-success">
                      ₹{Number(slipModal.loan.repaymentAmount || 0).toLocaleString()}
                    </strong>
                  </div>
                  <div className="d-flex justify-content-between border-top pt-1 mt-1">
                    <span>Outstanding Balance:</span>
                    <strong className="text-danger">
                      ₹{Number(slipModal.loan.remainingAmount || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>

                <div className="row mt-4 pt-3 text-center border-top">
                  <div className="col-6">
                    <small className="text-muted d-block mb-4">Member Signature</small>
                    <span className="border-top px-3">____________________</span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block mb-4">Secretary Signature & Stamp</small>
                    <span className="border-top px-3">____________________</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="custom-modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSlipModal({ show: false, loan: null })}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary fw-bold"
                onClick={() => window.print()}
              >
                🖨️ Print Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanManagement;
