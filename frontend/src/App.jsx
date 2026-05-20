import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { QrCode, ChefHat, LayoutDashboard, UserRound } from 'lucide-react'
import CustomerMenu from './pages/CustomerMenu'
import KitchenDashboard from './pages/KitchenDashboard'
import AdminDashboard from './pages/AdminDashboard'
import WaiterDashboard from './pages/WaiterDashboard'
import Login from './pages/Login'

function Home() {
  return (
    <div className="min-h-screen bg-surface-dark relative overflow-hidden flex items-center justify-center">
      {/* Animated Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent-orange/30 rounded-full mix-blend-screen filter blur-[100px] animate-pulse-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent-rose/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse-glow" style={{ animationDelay: '1s' }} />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="glass-dark p-12 md:p-16 rounded-[3rem] z-10 max-w-4xl w-full mx-4 flex flex-col items-center border border-white/5"
      >
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-24 h-24 bg-gradient-premium rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-accent-orange/30 rotate-3 hover:rotate-0 transition-transform"
        >
          <QrCode size={48} className="text-white" />
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-black text-white text-center tracking-tight mb-4">
          Scan. <span className="text-gradient">Order.</span> Enjoy.
        </h1>
        <p className="text-lg md:text-xl text-gray-400 text-center max-w-lg mb-12 font-medium">
          Modern QR-powered café ordering system built for speed, elegance, and scale.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <Link to="/waiter" className="group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 transition-all hover:-translate-y-1 overflow-hidden flex flex-col items-center text-center">
            <div className="absolute inset-0 bg-gradient-premium opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white">
              <UserRound size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Waiter Staff</h3>
            <p className="text-sm text-gray-400">Manage occupied tables, serve orders, and collect payments.</p>
          </Link>

          <Link to="/kitchen" className="group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 transition-all hover:-translate-y-1 overflow-hidden flex flex-col items-center text-center">
            <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors" />
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-blue-400">
              <ChefHat size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Kitchen Dashboard</h3>
            <p className="text-sm text-gray-400">Real-time KDS optimized for high-speed preparation.</p>
          </Link>

          <Link to="/admin" className="group relative bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-6 transition-all hover:-translate-y-1 overflow-hidden flex flex-col items-center text-center">
            <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/10 transition-colors" />
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-purple-400">
              <LayoutDashboard size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Admin Panel</h3>
            <p className="text-sm text-gray-400">Manage menus, tables, and view rich analytics.</p>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/menu" element={<CustomerMenu />} />
      
      <Route 
        path="/kitchen" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'kitchen']}>
            <KitchenDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/admin/*" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/waiter" 
        element={
          <ProtectedRoute allowedRoles={['admin', 'waiter']}>
            <WaiterDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<div className="p-10 text-center text-xl font-bold text-white bg-surface-darker min-h-screen">404 - Page Not Found</div>} />
    </Routes>
  )
}

export default App
