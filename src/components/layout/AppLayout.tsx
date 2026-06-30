import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { Toaster } from '@/components/ui/Toaster'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
