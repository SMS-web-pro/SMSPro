import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/Login'
import { RegisterPage } from '@/pages/auth/Register'
import { DashboardPage } from '@/pages/Dashboard'
import { ContactsPage } from '@/pages/Contacts'
import { CampaignsPage } from '@/pages/Campaigns'
import { NewCampaignPage } from '@/pages/NewCampaign'
import { CampaignDetailPage } from '@/pages/CampaignDetail'
import { AnalyticsPage } from '@/pages/Analytics'
import { SettingsPage } from '@/pages/Settings'
import { InboxPage } from '@/pages/Inbox'
import { AutoReplyPage } from '@/pages/AutoReply'
import { CouponsPage } from '@/pages/Coupons'
import { InvitationsPage } from '@/pages/Invitations'
import { UserGuidePage } from '@/pages/UserGuide'
import { SetupWizardPage } from '@/pages/SetupWizard'
import { useStore } from '@/store/useStore'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Routes publiques */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/setup" element={<SetupWizardPage />} />

          {/* Routes protégées */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/campaigns/new" element={<NewCampaignPage />} />
            <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/auto-reply" element={<AutoReplyPage />} />
            <Route path="/coupons" element={<CouponsPage />} />
            <Route path="/invitations" element={<InvitationsPage />} />
            <Route path="/user-guide" element={<UserGuidePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Redirections */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
