import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion } from 'framer-motion'
import { KeyRound, User, Lock, QrCode } from 'lucide-react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post('/api/admin/login', { username, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('role', res.data.role)
      localStorage.setItem('name', res.data.name)
      localStorage.setItem('username', res.data.username)
      
      if (res.data.role === 'admin') {
        navigate('/admin')
      } else if (res.data.role === 'waiter') {
        navigate('/waiter')
      } else if (res.data.role === 'kitchen') {
        navigate('/kitchen')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-darker relative overflow-hidden flex items-center justify-center font-sans">
      {/* Background glowing effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent-orange/10 rounded-full mix-blend-screen filter blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-accent-rose/10 rounded-full mix-blend-screen filter blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="glass-dark p-8 md:p-12 rounded-[2.5rem] w-full max-w-md mx-4 border border-white/5 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-gradient-premium rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-accent-orange/20">
            <KeyRound size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Staff Portal</h1>
          <p className="text-sm text-gray-500 font-bold tracking-widest uppercase mt-2">Access Cafe OS</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-accent-rose/10 border border-accent-rose/20 text-accent-rose text-sm p-4 rounded-xl mb-6 font-bold text-center"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Username</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                className="w-full bg-white/5 border border-white/5 focus:border-accent-orange/30 text-white rounded-xl py-3.5 pl-12 pr-4 font-bold placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent-orange/20 transition-all text-base"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="password" 
                className="w-full bg-white/5 border border-white/5 focus:border-accent-orange/30 text-white rounded-xl py-3.5 pl-12 pr-4 font-bold placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-accent-orange/20 transition-all text-base"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-premium hover:brightness-110 active:scale-[0.98] disabled:bg-gray-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-accent-orange/20 flex items-center justify-center gap-2 text-base mt-8"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
