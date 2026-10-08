import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import TopGovBar from "./components/TopGovBar";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/Register";
import NHGRegister from "./pages/NHGRegister";
import Dashboard from "./pages/Dashboard";
import NHGManagement from "./pages/NHGManagement";
import MemberRegister from "./pages/MemberRegister";
import MemberList from "./pages/MemberList";
import AttendanceKiosk from "./pages/AttendanceKiosk";
import LoanManagement from "./pages/LoanManagement";
import MeetingManagement from "./pages/MeetingManagement";
import ThriftPassbook from "./pages/ThriftPassbook";
import ProgrammeManagement from "./pages/ProgrammeManagement";
import CDSNotifications from "./pages/CDSNotifications";
import JobAllocation from "./pages/JobAllocation";
import AuditManagement from "./pages/AuditManagement";
import Unauthorized from "./pages/Unauthorized";
import CommunityLearning from "./pages/CommunityLearning";
import CommunityHub from "./pages/CommunityHub";
import AboutKConnect from "./pages/AboutKConnect";

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  const location = useLocation();
  const isLoginPage = ["/login", "/member-login", "/secretary-login"].includes(location.pathname) || location.pathname.startsWith("/reset-password/");
  const isRegistrationPage = ["/register", "/register-nhg"].includes(location.pathname);
  const showAppChrome = !isLoginPage && !isRegistrationPage;

  return (
    <div className={`d-flex flex-column min-vh-100 ${user && showAppChrome ? "kc-dashboard-shell" : ""}`}>
      {showAppChrome && <TopGovBar />}
      {showAppChrome && <Navbar />}
      <main className="flex-grow-1">
        <Routes>
            {/* Public Entry Routes */}
            <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/member-login" element={<Login accountType="member" />} />
            <Route path="/secretary-login" element={<Login accountType="secretary" />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register-nhg" element={<NHGRegister />} />
            <Route path="/about" element={<AboutKConnect />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Community training videos and learning topics */}
            <Route
              path="/learning"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "secretary", "member", "ads_cds_officer"]}>
                  <CommunityLearning />
                </ProtectedRoute>
              }
            />

            <Route
              path="/community-hub"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "secretary", "member", "ads_officer", "cds_officer", "ads_cds_officer", "bank_officer"]}>
                  <CommunityHub />
                </ProtectedRoute>
              }
            />

            {/* Authenticated Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Super Admin Only: NHG Platform Governance */}
            <Route
              path="/nhg-management"
              element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <NHGManagement />
                </ProtectedRoute>
              }
            />

            {/* Secretary / Super Admin: Member Registration */}
            <Route
              path="/member-register"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "secretary"]}>
                  <MemberRegister />
                </ProtectedRoute>
              }
            />

            {/* Members Directory */}
            <Route
              path="/members"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "secretary", "member", "ads_cds_officer"]}>
                  <MemberList />
                </ProtectedRoute>
              }
            />

            {/* Attendance: Secretary generates QR & manages roll; Member scans meeting QR */}
            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "secretary", "member"]}>
                  <AttendanceKiosk />
                </ProtectedRoute>
              }
            />

            {/* Meetings Management & Records */}
            <Route
              path="/meetings"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "secretary", "member", "ads_cds_officer"]}>
                  <MeetingManagement />
                </ProtectedRoute>
              }
            />

            {/* Thrift Savings & Passbook */}
            <Route
              path="/thrift"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "secretary", "member"]}>
                  <ThriftPassbook />
                </ProtectedRoute>
              }
            />

            {/* Loans Management */}
            <Route
              path="/loans"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "secretary", "member", "ads_officer", "cds_officer", "ads_cds_officer", "bank_officer"]}>
                  <LoanManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/ads"
              element={
                <ProtectedRoute allowedRoles={["ads_officer", "ads_cds_officer"]}>
                  <LoanManagement />
                </ProtectedRoute>
              }
            />

            {/* Community Programmes */}
            <Route
              path="/programmes"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "secretary", "ads_cds_officer"]}>
                  <ProgrammeManagement />
                </ProtectedRoute>
              }
            />

            {/* CDS / ADS Circulars & Notices */}
            <Route
              path="/circulars"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "secretary", "member", "ads_officer", "cds_officer", "ads_cds_officer"]}>
                  <CDSNotifications />
                </ProtectedRoute>
              }
            />

            {/* Job Allocation */}
            <Route
              path="/jobs"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "secretary", "member"]}>
                  <JobAllocation />
                </ProtectedRoute>
              }
            />

            {/* Statutory Audit & Reconciliation */}
            <Route
              path="/audit"
              element={
                <ProtectedRoute allowedRoles={["super_admin", "secretary", "ads_cds_officer"]}>
                  <AuditManagement />
                </ProtectedRoute>
              }
            />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {showAppChrome && <Footer />}
    </div>
  );
}

export default App;
