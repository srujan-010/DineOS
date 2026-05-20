import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import { motion, AnimatePresence } from 'framer-motion'
import { BellRing, Check, Clock, Play, Maximize, Volume2, VolumeX, History, Cpu, Sparkles, CheckCircle2, X, Flame, ShieldAlert, TrendingUp, ChefHat, MessageSquare, Plus, Send, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const socket = io('/', { autoConnect: false })

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [profileOpen, setProfileOpen] = useState(false)
  
  // Advanced operating system features
  const [chefAssignments, setChefAssignments] = useState({})
  const [kitchenAnnouncements, setKitchenAnnouncements] = useState([
    { id: 1, text: "Masala Dosa batter running low in line 2!", time: "04:15 PM", author: "Gordon" },
    { id: 2, text: "Table 5 requested extra chillies on their Pasta", time: "04:22 PM", author: "Marco" }
  ])
  const [newAnnouncement, setNewAnnouncement] = useState("")
  const [performanceMetricsOpen, setPerformanceMetricsOpen] = useState(false)

  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const newOrders = orders.filter(o => o.status === 'New')

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    let soundInterval;
    if (soundEnabled && newOrders.length > 0) {
      playNotificationSound('new-order')
      soundInterval = setInterval(() => {
        playNotificationSound('new-order')
      }, 4000)
    }
    return () => clearInterval(soundInterval)
  }, [newOrders.length, soundEnabled])

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/orders/kitchen', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setOrders(res.data)
    } catch (error) {
      console.error('Error fetching kitchen orders', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    fetchOrders()
    
    socket.connect()
    socket.emit('join-kitchen')

    socket.on('new-order', (order) => {
      setOrders(prev => {
        if (prev.some(o => o._id === order._id)) return prev;
        return [...prev, order];
      })
      playNotificationSound('new-order')
      addAlert(`Incoming: Table ${order.tableNumber}`)
    })

    socket.on('order-updated', (updatedOrder) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o))
    })

    socket.on('waiter-called', (data) => {
      addAlert(`Table ${data.tableNumber} requested a Waiter`)
      playNotificationSound('alert')
    })

    socket.on('bill-requested', (data) => {
      addAlert(`Table ${data.tableNumber} requested their Bill`)
      playNotificationSound('alert')
    })

    return () => {
      socket.off('new-order')
      socket.off('order-updated')
      socket.off('waiter-called')
      socket.off('bill-requested')
      socket.disconnect()
    }
  }, [navigate])

  const playNotificationSound = (type = 'new-order') => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      
      osc.connect(gain)
      gain.connect(ctx.destination)
      
      if (type === 'new-order') {
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        osc.start()
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15)
        osc.stop(ctx.currentTime + 0.18)
      } else if (type === 'click') {
        osc.frequency.setValueAtTime(1000, ctx.currentTime)
        gain.gain.setValueAtTime(0.04, ctx.currentTime)
        osc.start()
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05)
        osc.stop(ctx.currentTime + 0.05)
      } else {
        osc.frequency.setValueAtTime(500, ctx.currentTime)
        gain.gain.setValueAtTime(0.06, ctx.currentTime)
        osc.start()
        osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.15)
        osc.stop(ctx.currentTime + 0.2)
      }
    } catch (e) {
      console.warn('Audio synthesis failed', e)
    }
  }

  const addAlert = (msg) => {
    const id = Date.now()
    setAlerts(prev => [...prev, { id, msg }])
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id))
    }, 4000)
  }

  const updateStatus = async (orderId, status) => {
    playNotificationSound('click')
    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o))
    try {
      await axios.put(`/api/orders/${orderId}/status`, { status }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
    } catch (error) {
      console.error('Error updating status', error)
      addAlert('Failed to update order status.')
      fetchOrders()
    }
  }

  const handleDragStart = (e, orderId) => {
    e.dataTransfer.setData('orderId', orderId)
  }

  const handleDrop = (e, targetStatus) => {
    const orderId = e.dataTransfer.getData('orderId')
    if (orderId) {
      updateStatus(orderId, targetStatus)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#07090e] text-white flex flex-col items-center justify-center font-sans">
      <Cpu size={32} className="text-gray-600 animate-pulse mb-4" />
      <h2 className="text-sm font-black tracking-widest text-gray-500 uppercase">Fulfillment OS</h2>
    </div>
  )

  const preparingOrders = orders.filter(o => o.status === 'Preparing')
  const readyOrders = orders.filter(o => o.status === 'Ready')
  const completedOrders = orders.filter(o => o.status === 'Served' || o.status === 'Paid')

  const activeOrdersCount = newOrders.length + preparingOrders.length + readyOrders.length
  
  const completedWithTimer = orders.filter(o => o.status === 'Served' || o.status === 'Paid')
  const averagePrepMinutes = completedWithTimer.length > 0 
    ? Math.round(completedWithTimer.reduce((sum, o) => {
        const diff = (new Date(o.updatedAt) - new Date(o.createdAt)) / 60000
        return sum + diff
      }, 0) / completedWithTimer.length) 
    : 8

  const delayedOrdersCount = orders.filter(o => {
    if (o.status === 'Ready' || o.status === 'Served' || o.status === 'Paid') return false
    const elapsed = Math.floor((new Date() - new Date(o.createdAt)) / 60000)
    return elapsed >= 10
  }).length

  const loadStatus = activeOrdersCount > 8 ? 'Critical' : activeOrdersCount > 4 ? 'High Load' : 'Optimal'
  const loadColor = activeOrdersCount > 8 ? 'text-rose-400 bg-rose-500/10 border-rose-500/15' : activeOrdersCount > 4 ? 'text-amber-400 bg-amber-500/10 border-amber-500/15' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15'

  const staffName = localStorage.getItem('name') || 'Staff Member'
  const staffUsername = localStorage.getItem('username') || 'kitchen'
  const staffRole = localStorage.getItem('role') || 'kitchen'
  const initials = staffName.split(' ').map(n => n[0]).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-[#06080c] text-gray-200 p-6 overflow-hidden flex flex-col font-sans relative select-none">
      
      {/* Cinematic layered background depths */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[350px] bg-accent-orange/5 rounded-full filter blur-[160px] pointer-events-none" />
      <div className="absolute bottom-12 left-12 w-[400px] h-[400px] bg-blue-500/[0.04] rounded-full filter blur-[150px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none opacity-40" />

      {/* Floating System Alerts (Toasts) */}
      <div className="fixed top-6 right-6 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {alerts.map(alert => (
            <motion.div 
              key={alert.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0e1220] border border-white/10 text-white px-5 py-3.5 rounded-2xl shadow-[0_15px_30px_rgba(0,0,0,0.3)] flex items-center gap-3 backdrop-blur-md pointer-events-auto text-xs"
            >
              <BellRing size={14} className="text-accent-orange animate-bounce" />
              <span className="font-bold tracking-tight">{alert.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Top Refined Premium Command Center Header */}
      <header className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-6 py-4 px-6 bg-[#0f131f]/75 border border-white/5 rounded-3xl relative z-10 shadow-lg backdrop-blur-md">
        
        {/* Left Badge */}
        <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center shadow-inner">
              <Cpu size={20} className="text-accent-orange animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Fulfillment OS
                <span className="text-[9px] bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded font-black tracking-wider">KDS PRO</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Automated Kitchen Command Console</p>
            </div>
          </div>

          <div className="flex gap-2 items-center text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/15">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Active Sync
          </div>
        </div>

        {/* Center Section: Animated Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full xl:w-auto text-xs py-2 xl:py-0 border-t border-b xl:border-0 border-white/5">
          <div className="bg-[#121626]/40 border border-white/5 p-3 rounded-2xl flex flex-col justify-center min-w-[110px]">
            <span className="text-[8px] uppercase tracking-widest text-gray-500 font-black">Active queue</span>
            <span className="font-black text-white mt-1 text-sm font-mono flex items-center gap-1">
              <Flame size={12} className="text-accent-orange" />
              {activeOrdersCount}
            </span>
          </div>

          <div className="bg-[#121626]/40 border border-white/5 p-3 rounded-2xl flex flex-col justify-center min-w-[110px]">
            <span className="text-[8px] uppercase tracking-widest text-gray-500 font-black">Avg speed</span>
            <span className="font-black text-white mt-1 text-sm font-mono flex items-center gap-1">
              <Clock size={12} className="text-blue-400" />
              {averagePrepMinutes} mins
            </span>
          </div>

          <div className="bg-[#121626]/40 border border-white/5 p-3 rounded-2xl flex flex-col justify-center min-w-[110px]">
            <span className="text-[8px] uppercase tracking-widest text-gray-500 font-black">Delayed status</span>
            <span className={`font-black mt-1 text-sm font-mono flex items-center gap-1 ${delayedOrdersCount > 0 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
              <AlertTriangle size={12} className="text-rose-400" />
              {delayedOrdersCount} cards
            </span>
          </div>

          <div className="bg-[#121626]/40 border border-white/5 p-3 rounded-2xl flex flex-col justify-center min-w-[110px]">
            <span className="text-[8px] uppercase tracking-widest text-gray-500 font-black">Kitchen load</span>
            <span className={`font-black mt-1 text-[10px] tracking-wide uppercase px-2 py-0.5 rounded border ${loadColor}`}>
              {loadStatus}
            </span>
          </div>

          <div className="bg-[#121626]/40 border border-white/5 p-3 rounded-2xl flex flex-col justify-center min-w-[110px] col-span-2 md:col-span-1">
            <span className="text-[8px] uppercase tracking-widest text-gray-500 font-black">Completed</span>
            <span className="font-black text-white mt-1 text-sm font-mono flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-400" />
              {completedOrders.length} served
            </span>
          </div>
        </div>

        {/* Right Section: Clock & Controls */}
        <div className="flex items-center justify-between w-full xl:w-auto gap-4">
          <div className="text-gray-400 font-mono text-sm tracking-widest bg-white/5 px-3.5 py-1.5 rounded-xl border border-white/5">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          <div className="flex gap-2 items-center">
            {/* Metric overlay toggle */}
            <button 
              onClick={() => {
                setPerformanceMetricsOpen(!performanceMetricsOpen)
                playNotificationSound('click')
              }}
              className={`p-2.5 rounded-xl border transition-all ${
                performanceMetricsOpen 
                  ? 'bg-accent-orange/15 text-accent-orange border-accent-orange/20' 
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/5'
              }`}
              title="Workload Balance Metrics"
            >
              <TrendingUp size={16} />
            </button>

            {/* Sound toggle */}
            <button 
              onClick={() => setSoundEnabled(!soundEnabled)} 
              className={`p-2.5 rounded-xl border transition-all ${
                soundEnabled 
                  ? 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/5' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/15'
              }`}
              title="Sound Alerts"
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            <button 
              onClick={toggleFullscreen} 
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-gray-400"
              title="Fullscreen Mode"
            >
              <Maximize size={16} />
            </button>

            {/* Waiter/Chef Dropdown */}
            <div className="relative z-30 ml-2">
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 p-1 rounded-xl transition-all shadow-sm active:scale-95"
              >
                <div className="w-8 h-8 bg-gradient-premium rounded-lg flex items-center justify-center text-white text-xs font-black shadow-md">
                  {initials}
                </div>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-3 w-64 bg-[#0f131f] border border-white/10 rounded-2xl shadow-xl p-4 z-40"
                    >
                      <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-premium rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md">
                          {initials}
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs font-bold text-white leading-tight">{staffName}</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">@{staffUsername}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4 text-[10px] font-bold">
                        <div className="flex justify-between">
                          <span className="text-gray-500 uppercase">Role</span>
                          <span className="text-blue-400 uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/10">{staffRole}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 uppercase">Station</span>
                          <span className="text-gray-300">MAIN-KITCHEN-01</span>
                        </div>
                      </div>

                      <button 
                        onClick={handleLogout}
                        className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold py-2 rounded-xl transition-all text-xs border border-rose-500/15 flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <X size={12} strokeWidth={2.5} />
                        Sign Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Command Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden relative">
        
        {/* ======================================================== */}
        {/* MAIN KANBAN KITCHEN BOARD (9 Columns or Responsive) */}
        {/* ======================================================== */}
        <section className={`h-full overflow-hidden flex flex-col gap-4 transition-all duration-300 ${
          performanceMetricsOpen ? 'lg:col-span-9' : 'lg:col-span-12'
        }`}>
          
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 overflow-hidden h-full">
            
            {/* 1. INCOMING ORDERS COLUMN */}
            <KanbanColumn 
              title="Incoming Orders" 
              count={newOrders.length} 
              color="blue"
              orders={newOrders}
              onAction={(id) => updateStatus(id, 'Preparing')}
              onReject={(id) => updateStatus(id, 'Served')}
              actionText="Accept Cooking"
              actionIcon={Play}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'New')}
              handleDragStart={handleDragStart}
              isFocusedColumn={true}
              chefAssignments={chefAssignments}
              setChefAssignments={setChefAssignments}
              playNotificationSound={playNotificationSound}
            />

            {/* 2. PREPARING QUEUE COLUMN */}
            <KanbanColumn 
              title="Preparing Queue" 
              count={preparingOrders.length} 
              color="orange"
              orders={preparingOrders}
              onAction={(id) => updateStatus(id, 'Ready')}
              actionText="Mark Ready"
              actionIcon={Check}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'Preparing')}
              handleDragStart={handleDragStart}
              chefAssignments={chefAssignments}
              setChefAssignments={setChefAssignments}
              playNotificationSound={playNotificationSound}
            />

            {/* 3. READY TO SERVE COLUMN (Glows!) */}
            <KanbanColumn 
              title="Ready To Serve" 
              count={readyOrders.length} 
              color="green"
              orders={readyOrders}
              onAction={(id) => updateStatus(id, 'Served')}
              actionText="Mark Served"
              actionIcon={Check}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'Ready')}
              handleDragStart={handleDragStart}
              chefAssignments={chefAssignments}
              setChefAssignments={setChefAssignments}
              playNotificationSound={playNotificationSound}
              isReadyColumn={true}
            />

            {/* 4. COMPLETED HISTORY COLUMN */}
            <KanbanColumn 
              title="Completed History" 
              count={completedOrders.length} 
              color="gray"
              orders={completedOrders.slice(-8)} // limit to recent completions
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'Served')}
              handleDragStart={handleDragStart}
              chefAssignments={chefAssignments}
              setChefAssignments={setChefAssignments}
              playNotificationSound={playNotificationSound}
            />

          </div>
        </section>

        {/* ======================================================== */}
        {/* RIGHT SIDEBAR PANEL: AI ANALYST & CHEF COMMUNICATIONS */}
        {/* ======================================================== */}
        {performanceMetricsOpen && (
          <motion.aside 
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="lg:col-span-3 h-full flex flex-col gap-6 overflow-y-auto pr-1"
          >
            
            {/* AI WORKLOAD ANALYST */}
            <div className="bg-[#0f131f]/75 border border-white/5 rounded-3xl p-5 shadow-lg relative overflow-hidden backdrop-blur-md flex flex-col gap-4">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent-orange" />
              
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={13} className="text-accent-orange animate-pulse" />
                  AI Workload Analyst
                </h3>
                <span className="text-[9px] bg-accent-orange/10 text-accent-orange border border-accent-orange/15 px-2 py-0.5 rounded font-bold">LIVE METRICS</span>
              </div>

              <div className="space-y-3.5 text-[11px] font-bold text-gray-400">
                <div className="flex justify-between items-center">
                  <span>Line 1 (Masala Dosa) Load</span>
                  <span className="text-white bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10 text-[9px] uppercase">Medium</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Line 2 (Drinks / Coffee) Load</span>
                  <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/10 text-[9px] uppercase">Optimal</span>
                </div>
                <div className="w-full bg-white/5 h-px" />
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] text-gray-500 font-black uppercase tracking-wider">
                    <span>Prep Time Predictions</span>
                    <span>94% Confidence</span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-relaxed font-medium">
                    High table density detected. AI predicts Masala Dosa speed averages may spike by <strong>1.5m</strong>. Maintain balanced chef assignments!
                  </p>
                </div>
              </div>
            </div>

            {/* KITCHEN BROADCAST BULLETIN CENTER */}
            <div className="bg-[#0f131f]/75 border border-white/5 rounded-3xl p-5 shadow-lg relative overflow-hidden backdrop-blur-md flex-1 flex flex-col">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <MessageSquare size={13} className="text-blue-400" />
                Kitchen Broadcasts
              </h3>

              {/* Chat Log lists */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-[220px] pr-1">
                {kitchenAnnouncements.map(ann => (
                  <div key={ann.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                    <div className="flex justify-between items-center mb-1 text-[9px] font-black uppercase text-gray-500">
                      <span>Chef {ann.author}</span>
                      <span>{ann.time}</span>
                    </div>
                    <p className="text-xs text-gray-300 font-medium leading-relaxed">{ann.text}</p>
                  </div>
                ))}
              </div>

              {/* Chat Input form */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Post announcement..."
                  className="flex-1 bg-white/5 border border-white/5 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:border-accent-orange placeholder-gray-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newAnnouncement.trim()) {
                      const id = Date.now()
                      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      setKitchenAnnouncements(prev => [...prev, { id, text: newAnnouncement, time, author: 'Gordon' }])
                      setNewAnnouncement("")
                      playNotificationSound('click')
                    }
                  }}
                />
                <button 
                  onClick={() => {
                    if (!newAnnouncement.trim()) return
                    const id = Date.now()
                    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    setKitchenAnnouncements(prev => [...prev, { id, text: newAnnouncement, time, author: 'Gordon' }])
                    setNewAnnouncement("")
                    playNotificationSound('click')
                  }}
                  className="bg-accent-orange text-gray-900 p-2.5 rounded-xl transition-all hover:bg-accent-orange/90 active:scale-95"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>

          </motion.aside>
        )}

      </div>
    </div>
  )
}

function KanbanColumn({ 
  title, 
  count, 
  color, 
  orders, 
  onAction, 
  onReject, 
  actionText, 
  actionIcon, 
  onDragOver, 
  onDrop, 
  handleDragStart, 
  isFocusedColumn,
  chefAssignments,
  setChefAssignments,
  playNotificationSound,
  isReadyColumn
}) {
  
  return (
    <div 
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`rounded-3xl p-4 flex flex-col h-full border transition-all duration-200 ${
        isReadyColumn
          ? 'bg-[#101e19]/60 border-emerald-500/20 shadow-lg shadow-emerald-500/[0.02]'
          : isFocusedColumn 
            ? 'bg-[#101524]/60 border-blue-500/10 shadow-lg shadow-blue-500/[0.02]' 
            : 'bg-[#0f131f]/45 border-white/5'
      }`}
    >
      <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-white/5">
        <h2 className="text-xs font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${
            color === 'blue' ? 'bg-blue-500' :
            color === 'orange' ? 'bg-amber-500' :
            color === 'green' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'
          }`} />
          {title}
        </h2>
        <span className="text-[10px] font-black text-gray-400 bg-white/5 px-2.5 py-0.5 rounded-lg border border-white/5 font-mono">
          {count}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3.5 no-scrollbar pb-4 pr-0.5">
        <AnimatePresence initial={false}>
          {orders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              className="h-full flex flex-col items-center justify-center text-center py-20 gap-2.5"
            >
              <CheckCircle2 size={24} className="text-gray-500" />
              <div>
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">No active orders</h4>
                <p className="text-[9px] text-gray-500 mt-1 italic">Kitchen Running Smoothly 🍃</p>
              </div>
            </motion.div>
          ) : (
            orders.map(order => (
              <OrderCard 
                key={order._id} 
                order={order} 
                onAction={onAction ? () => onAction(order._id) : null} 
                onReject={onReject ? () => onReject(order._id) : null}
                actionText={actionText} 
                actionIcon={actionIcon} 
                colorTheme={color}
                onDragStart={(e) => handleDragStart(e, order._id)}
                chefAssignments={chefAssignments}
                setChefAssignments={setChefAssignments}
                playNotificationSound={playNotificationSound}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function OrderCard({ 
  order, 
  onAction, 
  onReject, 
  actionText, 
  actionIcon: Icon, 
  colorTheme, 
  onDragStart,
  chefAssignments,
  setChefAssignments,
  playNotificationSound
}) {
  const [elapsed, setElapsed] = useState(Math.floor((new Date() - new Date(order.createdAt)) / 60000))
  const [chefOpen, setChefOpen] = useState(false)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((new Date() - new Date(order.createdAt)) / 60000))
    }, 60000)
    return () => clearInterval(timer)
  }, [order.createdAt])

  // Advanced Urgency Timer Color System
  const isCritical = order.status !== 'Ready' && order.status !== 'Served' && order.status !== 'Paid' && elapsed >= 12
  const isUrgent = order.status !== 'Ready' && order.status !== 'Served' && order.status !== 'Paid' && elapsed >= 10 && elapsed < 12
  const isWarning = order.status !== 'Ready' && order.status !== 'Served' && order.status !== 'Paid' && elapsed >= 5 && elapsed < 10

  const cardBorder = isCritical
    ? 'border-rose-500/40 bg-[#1e0e12]/90 shadow-lg shadow-rose-500/[0.04]'
    : isUrgent 
      ? 'border-rose-500/20 bg-[#160d10]' 
      : isWarning 
        ? 'border-amber-500/20 bg-[#16120d]' 
        : colorTheme === 'green' 
          ? 'border-emerald-500/20 bg-[#0d1612]/90 shadow-md shadow-emerald-500/[0.02]'
          : 'border-white/5 bg-[#0f131f]/60'

  const chefNames = ['Chef Gordon', 'Chef Marco', 'Chef Thomas', 'Chef Alice']
  const assignedChef = chefAssignments[order._id] || chefNames[order.tableNumber % chefNames.length]

  const complexityRating = order.items.reduce((sum, item) => sum + (item.quantity * 2), 0)
  const aiLoadText = complexityRating > 6 ? 'High complexity' : 'Optimal complexity'
  const aiLoadColor = complexityRating > 6 ? 'text-amber-400 bg-amber-500/10 border-amber-500/10' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/10'

  return (
    <motion.div 
      layout
      draggable
      onDragStart={onDragStart}
      initial={{ opacity: 0, scale: 0.98, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -10 }}
      className={`rounded-3xl p-5 border flex flex-col relative overflow-hidden group cursor-grab active:cursor-grabbing hover:border-white/10 hover:shadow-md transition-all duration-200 ${cardBorder}`}
    >
      {/* Top Details Panel */}
      <div className="flex justify-between items-start mb-4 pb-3 border-b border-white/5">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Table</span>
            <span className="text-3xl font-black text-white leading-none tracking-tight">T{order.tableNumber}</span>
          </div>
          <p className="text-[9px] text-gray-600 font-mono mt-1">ID: #{order._id.slice(-4).toUpperCase()}</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Urgency Badge */}
          <span className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl border ${
            isCritical ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse' :
            isUrgent ? 'bg-rose-500/10 text-rose-400 border-rose-500/15' : 
            isWarning ? 'bg-amber-500/10 text-amber-400 border-amber-500/15' : 
            'bg-white/5 text-gray-400 border-white/5'
          }`}>
            <Clock size={11} className={isCritical ? 'animate-spin' : ''} />
            {elapsed} mins
          </span>

          <span className="text-[9px] bg-white/5 border border-white/5 text-gray-500 px-2 py-0.5 rounded font-black">
            {complexityRating > 6 ? 'PRIORITY' : 'NORMAL'}
          </span>
        </div>
      </div>
      
      {/* Middle Items Card deck */}
      <div className="flex-1 mb-4 space-y-2.5">
        {order.items.map((item, idx) => (
          <div key={idx} className="flex gap-2.5 items-center text-xs">
            <span className="text-[10px] font-black text-white bg-white/5 w-6 h-6 flex items-center justify-center rounded-lg border border-white/5">
              {item.quantity}x
            </span>
            <div className="flex-1">
              <p className="font-black text-gray-200 leading-tight">{item.menuItem?.name || 'Menu Item'}</p>
            </div>
            {/* Dietary symbol dot */}
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.menuItem?.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`} />
          </div>
        ))}
      </div>

      {/* Advanced Chef SelectorDropdown */}
      <div className="flex justify-between items-center mb-4 border-t border-white/5 pt-3 text-[10px] font-bold text-gray-500 relative">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => {
              setChefOpen(!chefOpen)
              playNotificationSound('click')
            }}
            className="flex items-center gap-1.5 hover:text-white bg-white/5 border border-white/5 px-2.5 py-1 rounded-xl transition-all active:scale-95 text-[10px] font-bold text-gray-400"
          >
            <ChefHat size={12} className="text-accent-orange" />
            <span>{assignedChef}</span>
          </button>

          {chefOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setChefOpen(false)} />
              <div className="absolute left-0 bottom-8 z-50 bg-[#0f131f] border border-white/10 p-2 rounded-2xl shadow-xl w-36 space-y-1 text-left flex flex-col">
                {chefNames.map((name, i) => (
                  <button 
                    key={i}
                    onClick={() => {
                      setChefAssignments(prev => ({ ...prev, [order._id]: name }))
                      setChefOpen(false)
                      playNotificationSound('click')
                    }}
                    className="p-2 hover:bg-white/5 rounded-xl transition-all text-xs font-bold text-gray-300 hover:text-white text-left"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* AI Load Factor */}
        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border tracking-wider leading-none ${aiLoadColor}`}>
          {aiLoadText}
        </span>
      </div>
      
      {/* Progress slider bar & Action button */}
      {order.status !== 'Served' && order.status !== 'Paid' && (onAction || onReject) && (
        <div className="space-y-3">
          {order.status !== 'New' && (
            <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-300 ${
                order.status === 'Preparing' ? 'w-2/4 bg-amber-400' : 'w-3/4 bg-emerald-400'
              }`} />
            </div>
          )}

          {order.status === 'New' ? (
            <div className="flex gap-2">
              <button 
                onClick={onReject}
                className="flex-1 py-2.5 rounded-2xl font-black text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/15 transition-all text-xs active:scale-[0.98]"
              >
                Reject
              </button>
              <button 
                onClick={onAction}
                className="flex-1 py-2.5 rounded-2xl font-black text-gray-900 bg-blue-400 hover:bg-blue-500 transition-all text-xs active:scale-[0.98] shadow-md shadow-blue-500/10"
              >
                Accept Order
              </button>
            </div>
          ) : (
            onAction && (
              <button 
                onClick={onAction}
                className={`w-full py-2.5 rounded-2xl font-black text-gray-900 flex justify-center items-center gap-1.5 transition-all text-xs active:scale-[0.98] ${
                  colorTheme === 'orange' ? 'bg-amber-400 hover:bg-amber-500 shadow-md shadow-amber-500/10' :
                  'bg-emerald-400 hover:bg-emerald-500 shadow-md shadow-emerald-500/10'
                }`}
              >
                <Icon size={12} strokeWidth={2.5} />
                {actionText}
              </button>
            )
          )}
        </div>
      )}

      {/* Completed Checkmark Indicator for History column */}
      {(order.status === 'Served' || order.status === 'Paid') && (
        <div className="border-t border-white/5 pt-2.5 flex justify-between items-center text-[10px] text-gray-500 font-bold">
          <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 size={12} /> Ticket Served</span>
          <span className="font-mono">Ready to clear</span>
        </div>
      )}
    </motion.div>
  )
}
