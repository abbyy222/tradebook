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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

