import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";

import { HomePage } from "./pages/shared/HomePage";
import { DashboardHomePage } from "./pages/shared/DashboardHomePage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterChoicePage } from "./pages/auth/RegisterChoicePage";
import { RegisterRegularPage } from "./pages/auth/RegisterRegularPage";
import { RegisterBusinessPage } from "./pages/auth/RegisterBusinessPage";
import { ActivateAccountPage } from "./pages/auth/ActivateAccountPage";
import { ResetRequestPage } from "./pages/auth/ResetRequestPage";
import { ResetCompletePage } from "./pages/auth/ResetCompletePage";
import { NotFoundPage } from "./pages/shared/NotFoundPage";

import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";

import { RegularProfilePage } from "./pages/regular/RegularProfilePage";
import { RegularJobsPage } from "./pages/regular/RegularJobsPage";
import { BusinessProfilePage } from "./pages/business/BusinessProfilePage";
import { BusinessJobsPage } from "./pages/business/BusinessJobsPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { BrowseBusinessesPage } from "./pages/shared/BrowseBusinessesPage";
import { BusinessDetailPage } from "./pages/shared/BusinessDetailPage";
import { RegularInterestsPage } from "./pages/regular/RegularInterestsPage";
import { BrowsePositionTypesPage } from "./pages/shared/BrowsePositionTypesPage";
import { RegularInvitationsPage } from "./pages/regular/RegularInvitationsPage";
import { RegularQualificationsPage } from "./pages/regular/RegularQualificationsPage";
import { QualificationDetailsPage } from "./pages/shared/QualificationDetailsPage";
import { AdminSystemPage } from "./pages/admin/AdminSystemPage";
import { AdminSearchUsersPage } from "./pages/admin/AdminSearchUsersPage";
import { AdminSearchBusinessesPage } from "./pages/admin/AdminSearchBusinessesPage";
import { AdminManageBusinessPage } from "./pages/admin/AdminManageBusinessPage";
import { AdminManageUserPage } from "./pages/admin/AdminManageUserPage";
import { AdminManageQualifiedUserPage } from "./pages/admin/AdminManageQualifiedUserPage";
import { AdminSearchPositionsPage } from "./pages/admin/AdminSearchPositionsPage";
import { AdminQualificationReviewPage } from "./pages/admin/AdminQualificationReviewPage";
import { AdminSearchQualificationsPage } from "./pages/admin/AdminSearchQualifications";
import { AdminNotificationsPage } from "./pages/admin/AdminNotificationsPage";
import { NegotiationPage } from "./pages/shared/NegotiationPage";
import { NegotiationsPage } from "./pages/shared/NegotiationsPage";
import { NegotiationRedirectPage } from "./pages/shared/NegotiationRedirectPage";
import { BusinessBrowseEmployees } from "./pages/business/BusinessBrowseEmployees";
import { RegularNotificationsPage } from "./pages/regular/RegularNotificationsPage";
import { RegularHistoryPage } from "./pages/regular/RegularHistoryPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/businesses" element={<BrowseBusinessesPage />} />
          <Route path="/businesses/:businessId" element={<BusinessDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterChoicePage />} />
          <Route path="/register/regular" element={<RegisterRegularPage />} />
          <Route path="/register/business" element={<RegisterBusinessPage />} />
          <Route path="/activate" element={<ActivateAccountPage />} />
          <Route path="/auth/resets" element={<ResetRequestPage />} />
          <Route path="/auth/resets/:resetToken" element={<ResetCompletePage />} />

          {/* Authenticated routes — wrapped in DashboardLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>

              {/* Regular user routes */}
              <Route element={<ProtectedRoute allowedRoles={["regular"]} />}>
                <Route path="/regular" element={<DashboardHomePage role="regular" />} />
                <Route path="/regular/profile" element={<RegularProfilePage />} />
                <Route path="/regular/jobs" element={<RegularJobsPage />} />
                <Route path="/regular/interests" element={<RegularInterestsPage title="My Interests" />} />
                <Route path="/regular/qualifications" element={<RegularQualificationsPage/>} />
                <Route path="/regular/qualifications/:qualificationId" element={<QualificationDetailsPage/>} />
                <Route path="/notifications" element={<RegularNotificationsPage />} />
                <Route path="/history" element={<RegularHistoryPage />} />
              </Route>

              {/* Business routes */}
              <Route element={<ProtectedRoute allowedRoles={["business"]} />}>
                <Route path="/business" element={<DashboardHomePage role="business" />} />
                <Route path="/business/profile" element={<BusinessProfilePage />} />
                <Route path="/business/jobs" element={<BusinessJobsPage />} />
                <Route path="/business/employees" element={<BusinessBrowseEmployees />} />
              </Route>

              {/* Admin routes */}
              <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                <Route path="/admin" element={<AdminDashboardPage />} />
                <Route path="/admin/users" element={<AdminSearchUsersPage title="Manage Users" />} />
                <Route path="/admin/businesses" element={<AdminSearchBusinessesPage title="Manage Businesses" />} />
                <Route path="/admin/positions" element={<AdminSearchPositionsPage title="Position Types" />} />
                <Route path="/admin/qualifications" element={<AdminSearchQualificationsPage title="Qualifications Review" />} />
                <Route path="/admin/qualification-users/:userId" element={<AdminManageQualifiedUserPage />} />
                <Route path="/admin/qualifications/:qualificationId" element={<AdminQualificationReviewPage />} />
                <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
                <Route path="/admin/system" element={<AdminSystemPage title="System Configuration" />} />
                <Route path="/admin/users/:userId" element={<AdminManageUserPage title="Manage User" />} />
                <Route path="/admin/businesses/:businessId" element={<AdminManageBusinessPage title="Business Profile"/>} />
              </Route>

              {/* Shared authenticated routes */}
              {/* <Route path="/businesses" element={<BrowseBusinessesPage />} /> */}
              {/* <Route path="/businesses/:businessId" element={<BusinessDetailPage />} /> */}
              <Route path="/positions" element={<BrowsePositionTypesPage title="Position Types" />} />
              <Route path="/invitations" element={<RegularInvitationsPage />} />
              <Route path="/negotiation" element={<NegotiationRedirectPage />} />
              <Route path="/negotiations" element={<NegotiationsPage />} />
              <Route path="/negotiations/:negotiationId" element={<NegotiationPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
