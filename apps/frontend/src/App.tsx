import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AppLayout } from '@/layouts/AppLayout'
import { RegisterPage } from '@/pages/RegisterPage'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LandingPage } from '@/pages/LandingPage'
import { SalesPage } from './pages/SalesPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { DebtorsPage } from './pages/DebtorsPage'
import { StockPage } from './pages/StockPage'
import { TeamPage } from './pages/TeamPage'
import { SavingsPage } from './pages/SavingsPage'
import { MorePage } from './pages/MorePage'
import { CustomersPage } from './pages/CustomersPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { InternalAuthLayout } from './layouts/InternalAuthLayout'
import { InternalLoginPage } from './pages/InternalLoginPage'
import { InternalPortalLayout } from './layouts/InternalPortalLayout'
import { PlatformAdminPage } from './pages/PlatformAdminPage'
import { PlatformDeveloperPage } from './pages/PlatformDeveloperPage'
import { PlatformDeveloperOverviewPage } from './pages/PlatformDeveloperOverviewPage'
import { PlatformDeveloperReliabilityPage } from './pages/PlatformDeveloperReliabilityPage'
import { PlatformDeveloperOperationsPage } from './pages/PlatformDeveloperOperationsPage'
import { PlatformDeveloperAccessPage } from './pages/PlatformDeveloperAccessPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route element={<AuthLayout />}>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/debtors" element={<DebtorsPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/team" element={<TeamPage />} />
        <Route path="/savings" element={<SavingsPage />} />
        <Route path="/more" element={<MorePage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
      </Route>

      <Route element={<InternalAuthLayout />}>
        <Route path="/internal/login" element={<InternalLoginPage />} />
      </Route>

      <Route element={<InternalPortalLayout portal="ADMIN" />}>
        <Route path="/platform/admin" element={<PlatformAdminPage />} />
      </Route>

      <Route element={<InternalPortalLayout portal="DEVELOPER" />}>
        <Route path="/platform/dev" element={<PlatformDeveloperPage />}>
          <Route index element={<Navigate to="/platform/dev/overview" replace />} />
          <Route path="overview" element={<PlatformDeveloperOverviewPage />} />
          <Route path="reliability" element={<PlatformDeveloperReliabilityPage />} />
          <Route path="operations" element={<PlatformDeveloperOperationsPage />} />
          <Route path="access" element={<PlatformDeveloperAccessPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

