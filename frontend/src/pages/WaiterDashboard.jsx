import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { Utensils, CheckCircle, Receipt, UserRound, Banknote, CreditCard, QrCode, X, BellRing, Clock, Star, Map, List, Send, Grid, ArrowRightLeft, Sparkles, Volume2, VolumeX, Flame, Plus, Minus, Check, HelpCircle, ChevronUp, AlertCircle, ShoppingBag } from 'lucide-react'
import { io } from 'socket.io-client'
import { useNavigate } from 'react-router-dom'

const socket = io('/', { autoConnect: false })

export default function WaiterDashboard() {
  const [tables, setTables] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [onlineStatus, setOnlineStatus] = useState(true)
  const [shiftSeconds, setShiftSeconds] = useState(360) 
  
  // Interactive Bottom Sheet Drawer (Main User flow!)
  const [activeTableDetails, setActiveTableDetails] = useState(null) 
  
  // Action state popups
  const [quickAction, setQuickAction] = useState({ isOpen: false, type: null, tableNumber: null })
  const [manualOrderItems, setManualOrderItems] = useState([])
  
  // Persistent Customer Alert Center
  const [customerRequests, setCustomerRequests] = useState([])
  
  // Billing/Checkout Details
  const [paymentModal, setPaymentModal] = useState({ isOpen: false, tableNumber: null, amount: 0, method: null })
  const [upiConfig, setUpiConfig] = useState({ upiId: 'cafe@upi', upiName: 'Cafe OS' })
  const [alerts, setAlerts] = useState([])
  const [selectedTableNumber, setSelectedTableNumber] = useState(null)
  
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => {
      setShiftSeconds(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatShiftTime = (secs) => {
    const hrs = Math.floor(secs / 3600).toString().padStart(2, '0')
    const mins = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${hrs}:${mins}:${s}`
  }

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const playNotificationSound = (type = 'bell') => {
    if (!soundEnabled) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      if (type === 'bell') {
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        gain.gain.setValueAtTime(0.06, ctx.currentTime)
        osc.start()
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15)
        osc.stop(ctx.currentTime + 0.2)
      } else if (type === 'alert') {
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        osc.start()
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.25)
        osc.stop(ctx.currentTime + 0.3)
      } else {
        osc.frequency.setValueAtTime(1000, ctx.currentTime)
        gain.gain.setValueAtTime(0.04, ctx.currentTime)
        osc.start()
        osc.stop(ctx.currentTime + 0.05)
      }
    } catch (e) {
      console.warn('Audio synthesis failed', e)
    }
  }

  const addAlert = (msg, tableNumber = null, type = 'general') => {
    const id = Date.now()
    setAlerts(prev => [...prev, { id, msg }])
    
    if (tableNumber) {
      setCustomerRequests(prev => {
        if (prev.some(r => r.tableNumber === tableNumber && r.type === type)) return prev
        return [{ id, tableNumber, type, time: new Date() }, ...prev]
      })
    }
    
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id))
    }, 4000)
  }

  const fetchUpiConfig = async () => {
    try {
      const res = await axios.get('/api/admin/config/upi')
      setUpiConfig(res.data)
    } catch (error) {
      console.error('Error UPI fetch', error)
    }
  }

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [tablesRes, ordersRes] = await Promise.all([
        axios.get('/api/tables', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/orders/kitchen', { headers: { Authorization: `Bearer ${token}` } })
      ])
      setTables(tablesRes.data)
      setOrders(ordersRes.data)
    } catch (error) {
      console.error('Waiter sync failed', error)
      if (error.response && error.response.status === 401) {
        navigate('/login')
      }
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

    fetchData()
    fetchUpiConfig()
    socket.connect()
    socket.emit('join-waiter')

    socket.on('new-order', () => {
      fetchData()
      playNotificationSound('bell')
    })
    socket.on('order-updated', fetchData)
    socket.on('table-status-updated', fetchData)
    
    socket.on('waiter-called', (data) => {
      addAlert(`Table ${data.tableNumber} requested a Waiter`, data.tableNumber, 'waiter')
      playNotificationSound('alert')
    })

    socket.on('bill-requested', (data) => {
      addAlert(`Table ${data.tableNumber} requested their Bill`, data.tableNumber, 'bill')
      playNotificationSound('alert')
    })
    
    return () => {
      socket.off('new-order')
      socket.off('order-updated')
      socket.off('table-status-updated')
      socket.off('waiter-called')
      socket.off('bill-requested')
      socket.disconnect()
    }
  }, [navigate])

  const handleMarkServed = async (orderId) => {
    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'Served' } : o))
    try {
      await axios.put(`/api/orders/${orderId}/status`, { status: 'Served' }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
    } catch (error) {
      console.error('Failed served mark', error)
      fetchData()
    }
  }

  const openPaymentModal = (tableNumber, finalBill) => {
    setPaymentModal({ isOpen: true, tableNumber, amount: finalBill, method: null })
  }

  const handleConfirmPayment = async () => {
    const { tableNumber, method } = paymentModal
    const paymentMethodCapitalized = method === 'cash' ? 'Cash' : method === 'card' ? 'Card' : 'UPI'

    try {
      await axios.post(`/api/tables/${tableNumber}/clear`, { paymentMethod: paymentMethodCapitalized }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setPaymentModal({ isOpen: false, tableNumber: null, amount: 0, method: null })
      setActiveTableDetails(null)
      fetchData()
      addAlert(`Table ${tableNumber} checked out successfully.`)
    } catch (error) {
      console.error('Payment clear fail', error)
      alert('Failed to clear table billing.')
    }
  }

  const handleResolveAlert = (id) => {
    setCustomerRequests(prev => prev.filter(r => r.id !== id))
    playNotificationSound('click')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080c] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent-orange/20 border-t-accent-orange rounded-full animate-spin" />
        <span className="text-[10px] uppercase font-black tracking-widest text-gray-500 mt-4">Syncing Duty Board...</span>
      </div>
    )
  }

  const staffName = localStorage.getItem('name') || 'Staff Member'
  const staffUsername = localStorage.getItem('username') || 'waiter'
  const staffRole = localStorage.getItem('role') || 'waiter'
  const initials = staffName.split(' ').map(n => n[0]).join('').toUpperCase()

  // High priority ready orders
  const readyOrders = orders.filter(o => o.status === 'Ready')

  // Seating calculations
  const getTableStatus = (table) => {
    const tableOrders = orders.filter(o => o.tableNumber === table.tableNumber)
    const hasReady = tableOrders.some(o => o.status === 'Ready')
    const hasPreparing = tableOrders.some(o => o.status === 'Preparing')
    const hasAlert = customerRequests.some(r => r.tableNumber === table.tableNumber)

    if (hasAlert) return 'urgent' // Red
    if (hasReady) return 'ready' // Yellow (Billing/Ready)
    if (hasPreparing) return 'preparing' // Orange
    if (table.currentSessionId) return 'occupied' // Blue
    return 'free' // Green
  }

  // Aggregate urgent tickers for Top Priority Bar
  const urgentTickers = [
    ...customerRequests.map(r => ({ type: 'ALERT', tableNumber: r.tableNumber, msg: r.type === 'bill' ? 'Bill Called 💳' : 'Needs Help 🔴', id: `req-${r.id}` })),
    ...readyOrders.map(o => ({ type: 'READY', tableNumber: o.tableNumber, msg: 'Food Cooked! 🍳', id: `ready-${o._id}` }))
  ]

  return (
    <div className="min-h-screen bg-[#06080c] text-gray-200 font-sans select-none overflow-x-hidden relative flex flex-col pb-24">
      
      {/* Background depth filters */}
      <div className="absolute top-0 right-12 w-[300px] h-[300px] bg-accent-orange/[0.03] rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-[200px] h-[200px] bg-blue-500/[0.02] rounded-full filter blur-[80px] pointer-events-none" />

      {/* Floating System Alerts */}
      <div className="fixed top-6 right-6 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {alerts.map(alert => (
            <motion.div 
              key={alert.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0e1220] border border-white/10 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 backdrop-blur-md pointer-events-auto text-xs"
            >
              <BellRing size={14} className="text-accent-orange animate-bounce" />
              <span className="font-bold tracking-tight">{alert.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Compact Mini Header */}
      <header className="px-4 py-3 bg-[#0c0f1a]/95 border-b border-white/5 flex justify-between items-center z-20 shadow-sm relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
            <Utensils size={15} className="text-accent-orange" />
          </div>
          <div>
            <h1 className="text-xs font-black text-white leading-none">POS Runner OS</h1>
            <p className="text-[8px] text-gray-500 font-semibold mt-0.5">{staffName} • {formatShiftTime(shiftSeconds)}</p>
          </div>
        </div>

        <div className="flex gap-1.5 items-center">
          {/* Duty switch */}
          <button 
            onClick={() => {
              setOnlineStatus(!onlineStatus)
              playNotificationSound('click')
            }}
            className={`text-[8px] font-black px-2.5 py-1 rounded-full border transition-all ${
              onlineStatus 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15' 
                : 'bg-white/5 text-gray-500 border-white/5'
            }`}
          >
            ● {onlineStatus ? 'Duty' : 'Offline'}
          </button>

          {/* Sound Toggle */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className={`p-1.5 rounded-lg border transition-all ${
              soundEnabled ? 'bg-white/5 border-white/5 text-gray-400' : 'bg-rose-500/10 text-rose-400 border-rose-500/15'
            }`}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 1. TOP STICKY PRIORITY FEED BAR */}
      {/* ======================================================== */}
      <div className="bg-[#121626] border-b border-white/5 px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar relative z-10 min-h-[44px]">
        <div className="text-[8px] font-black uppercase text-accent-orange bg-accent-orange/10 border border-accent-orange/15 px-2 py-1 rounded flex-shrink-0 tracking-wider">
          PRIORITY (NOW)
        </div>
        
        <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
          {urgentTickers.length === 0 ? (
            <span className="text-[10px] text-gray-500 font-semibold italic pl-1">All clear. Restra running smooth 🍃</span>
          ) : (
            urgentTickers.map(t => (
              <button
                key={t.id}
                onClick={() => {
                  const num = t.tableNumber
                  setSelectedTableNumber(num)
                  // Find table object to load in Bottom Sheet details!
                  const tbl = tables.find(tb => tb.tableNumber === num)
                  if (tbl) setActiveTableDetails(tbl)
                  playNotificationSound('click')
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black border flex-shrink-0 active:scale-95 transition-transform ${
                  t.type === 'ALERT' 
                    ? 'bg-rose-500/10 text-rose-300 border-rose-500/20 animate-pulse' 
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                }`}
              >
                <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px]">T{t.tableNumber}</span>
                <span>{t.msg}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. COMPACT TABLE GRID (20 - 50 Tables fit seamlessly) */}
      {/* ======================================================== */}
      <main className="p-3 flex-1 flex flex-col gap-3.5">
        <div className="flex justify-between items-center px-1">
          <span className="text-[9px] uppercase tracking-widest text-gray-500 font-black">Restra Tables Heatmap Grid</span>
          
          <div className="flex gap-2 text-[8px] font-black text-gray-500 scale-95 origin-right">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Free</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Occ</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Prep</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Help</span>
          </div>
        </div>

        {/* Dynamic Grid: fits perfectly in mobile layout */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {tables.map(table => {
            const status = getTableStatus(table)
            const tableOrders = orders.filter(o => o.tableNumber === table.tableNumber)
            const totalBill = tableOrders.reduce((sum, o) => sum + o.totalAmount, 0)
            const finalBill = totalBill + totalBill * 0.05
            const isAlert = customerRequests.some(r => r.tableNumber === table.tableNumber)

            // Render highly compact touch cards
            return (
              <button 
                key={table._id}
                onClick={() => {
                  setActiveTableDetails(table)
                  playNotificationSound('click')
                }}
                className={`h-16 rounded-xl border flex flex-col justify-between p-2 relative active:scale-95 transition-all text-left ${
                  status === 'urgent' 
                    ? 'border-rose-500/40 bg-[#1f0e12]/80 text-rose-400 shadow-md shadow-rose-500/[0.04] animate-pulse' 
                    : status === 'ready' 
                      ? 'border-amber-500/30 bg-[#1c180e] text-amber-400' 
                      : status === 'preparing' 
                        ? 'border-amber-500/15 bg-[#12111a] text-amber-300' 
                        : status === 'occupied' 
                          ? 'border-blue-500/20 bg-[#0d121c] text-blue-400' 
                          : 'border-white/5 bg-[#0a0c14]/50 text-gray-500 hover:border-white/10'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-sm font-black text-white">T{table.tableNumber}</span>
                  
                  {/* Alert notification dot */}
                  {isAlert && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  )}
                </div>

                <div className="flex justify-between items-baseline w-full">
                  {table.currentSessionId ? (
                    <span className="text-[9px] font-black text-white/55 font-mono">₹{finalBill.toFixed(0)}</span>
                  ) : (
                    <span className="text-[8px] font-bold text-gray-600 uppercase">Free</span>
                  )}
                  
                  {table.currentSessionId && (
                    <span className="text-[7px] text-gray-500 font-bold uppercase">24m</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. TABLE DETAIL BOTTOM SHEET DRAWER (Satisfies rush-hours!) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {activeTableDetails && (
          <>
            {/* Dark glass backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveTableDetails(null)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            />
            
            {/* Premium touch drawer sliding from bottom */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0e18] border-t border-white/10 rounded-t-[2.5rem] shadow-2xl p-6 flex flex-col text-left max-h-[85vh] overflow-y-auto"
            >
              {/* Handle indicator */}
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-5" />

              {/* Title & Stats */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Operational Focus</span>
                    <h2 className="text-2xl font-black text-white">Table {activeTableDetails.tableNumber}</h2>
                  </div>
                  <p className="text-[9px] font-bold text-gray-400 mt-1">
                    {activeTableDetails.currentSessionId ? 'Status: Session Busy' : 'Status: Ready for occupancy'}
                  </p>
                </div>

                <button 
                  onClick={() => setActiveTableDetails(null)}
                  className="bg-white/5 text-gray-400 p-2 rounded-full border border-white/5 active:scale-95"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Session / Billings Details */}
              {activeTableDetails.currentSessionId ? (
                (() => {
                  const tableOrders = orders.filter(o => o.tableNumber === activeTableDetails.tableNumber)
                  const totalBill = tableOrders.reduce((sum, o) => sum + o.totalAmount, 0)
                  const finalBill = totalBill + totalBill * 0.05
                  const hasAlerts = customerRequests.filter(r => r.tableNumber === activeTableDetails.tableNumber)

                  return (
                    <div className="space-y-4">
                      
                      {/* Live Customer Requests under this table */}
                      {hasAlerts.length > 0 && (
                        <div className="bg-rose-500/10 border border-rose-500/15 p-3 rounded-2xl">
                          <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <AlertCircle size={12} /> Pending Table alerts
                          </h4>
                          <div className="space-y-2">
                            {hasAlerts.map(req => (
                              <div key={req.id} className="flex justify-between items-center bg-[#1c0d10] p-2 rounded-xl text-xs font-bold border border-rose-500/5">
                                <span className="text-rose-300">{req.type === 'bill' ? '💳 Bill Checkout Called' : '🛎️ Assistance Called'}</span>
                                <button 
                                  onClick={() => handleResolveAlert(req.id)}
                                  className="bg-rose-500 text-white text-[9px] font-black px-3 py-1.5 rounded-lg active:scale-95"
                                >
                                  Resolve
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Active Order list */}
                      <div className="bg-[#121626] border border-white/5 rounded-3xl p-4">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2 flex items-center gap-1.5">
                          <ShoppingBag size={12} className="text-accent-orange" />
                          Order Items List
                        </h3>

                        {tableOrders.length === 0 ? (
                          <div className="py-6 text-center text-gray-500 text-xs italic font-bold">No active kitchen orders placed.</div>
                        ) : (
                          <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                            {tableOrders.map(order => (
                              <div key={order._id} className="border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase text-gray-400 mb-1">
                                  <span>Ticket #{order._id.slice(-4).toUpperCase()}</span>
                                  <span className={`px-2 py-0.5 rounded ${
                                    order.status === 'Ready' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                                    order.status === 'Preparing' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/10' :
                                    'bg-white/5 text-gray-500'
                                  }`}>{order.status}</span>
                                </div>
                                <div className="text-xs font-bold text-white space-y-1 pl-2 border-l border-accent-orange/20">
                                  {order.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>{item.quantity}x {item.menuItem?.name || 'Item'}</span>
                                      <span className="font-mono text-gray-500">₹{item.price * item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Mark Served dispatch action */}
                                {order.status === 'Ready' && (
                                  <button 
                                    onClick={() => {
                                      handleMarkServed(order._id)
                                      playNotificationSound('click')
                                    }}
                                    className="w-full mt-2.5 bg-amber-400 hover:bg-amber-500 text-gray-900 font-black py-2 rounded-xl text-[10px] active:scale-[0.98]"
                                  >
                                    Mark Served (Deliver to Guest)
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Totals & Quick billing triggers */}
                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl flex flex-col gap-3 font-bold text-xs">
                        <div className="flex justify-between text-gray-500">
                          <span>Subtotal</span>
                          <span className="font-mono">₹{totalBill.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-500 border-b border-white/5 pb-2">
                          <span>Taxes & Service (5%)</span>
                          <span className="font-mono">₹{(totalBill * 0.05).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-base font-black text-white">
                          <span>Total Seated Bill</span>
                          <span className="font-mono text-accent-orange">₹{finalBill.toFixed(2)}</span>
                        </div>

                        {/* Direct Collect Payment Checkout Trigger */}
                        <div className="pt-2">
                          <button 
                            onClick={() => {
                              openPaymentModal(activeTableDetails.tableNumber, finalBill)
                              playNotificationSound('click')
                            }}
                            className="w-full bg-accent-orange hover:bg-accent-orange/95 text-gray-900 font-black py-3 rounded-2xl text-xs flex justify-center items-center gap-1.5 shadow-lg shadow-accent-orange/15"
                          >
                            <Receipt size={14} strokeWidth={2.5} />
                            Collect Bill Payment & Clear Table
                          </button>
                        </div>
                      </div>

                      {/* Quick bottom sheet commands */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wider text-white">
                        <button 
                          onClick={() => {
                            setQuickAction({ isOpen: true, type: 'manual', tableNumber: activeTableDetails.tableNumber })
                            playNotificationSound('click')
                          }}
                          className="bg-white/5 hover:bg-white/10 border border-white/5 py-2.5 rounded-xl transition-all active:scale-95"
                        >
                          Manual Add Item
                        </button>
                        <button 
                          onClick={() => {
                            setQuickAction({ isOpen: true, type: 'transfer', tableNumber: activeTableDetails.tableNumber })
                            playNotificationSound('click')
                          }}
                          className="bg-white/5 hover:bg-white/10 border border-white/5 py-2.5 rounded-xl transition-all active:scale-95"
                        >
                          Transfer Table
                        </button>
                      </div>

                    </div>
                  )
                })()
              ) : (
                <div className="py-8 text-center text-gray-500 font-semibold space-y-4">
                  <CheckCircle size={32} className="mx-auto text-emerald-400 animate-pulse" />
                  <div>
                    <p className="text-sm font-black text-white">Table is Available</p>
                    <p className="text-[10px] text-gray-600 mt-1 italic">No active customer session</p>
                  </div>

                  <button 
                    onClick={() => {
                      setQuickAction({ isOpen: true, type: 'manual', tableNumber: activeTableDetails.tableNumber })
                      playNotificationSound('click')
                    }}
                    className="bg-accent-orange text-gray-900 font-black px-6 py-2.5 rounded-xl text-xs active:scale-95 shadow-md"
                  >
                    Open New Table Seating Session
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 4. BOTTOM THUMB FLOATING CONSOLE COMMANDS DOCK */}
      {/* ======================================================== */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0c0e18]/90 backdrop-blur-md border-t border-white/5 py-3 px-4 z-30 flex justify-around items-center max-w-lg mx-auto rounded-t-3xl shadow-2xl">
        <button 
          onClick={() => {
            setQuickAction({ isOpen: true, type: 'manual', tableNumber: selectedTableNumber || 1 })
            playNotificationSound('click')
          }}
          className="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-90"
        >
          <Plus size={18} strokeWidth={2.5} className="text-accent-orange" />
          <span className="text-[8px] font-black uppercase tracking-wider mt-1">Add Order</span>
        </button>

        <button 
          onClick={() => {
            if (activeTableDetails) {
              const tableOrders = orders.filter(o => o.tableNumber === activeTableDetails.tableNumber)
              const totalBill = tableOrders.reduce((sum, o) => sum + o.totalAmount, 0)
              openPaymentModal(activeTableDetails.tableNumber, totalBill * 1.05)
            } else {
              addAlert("Tap a busy table first to generate their checkout bill.")
            }
            playNotificationSound('click')
          }}
          className="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-90"
        >
          <Receipt size={18} className="text-amber-400" />
          <span className="text-[8px] font-black uppercase tracking-wider mt-1">Get Bill</span>
        </button>

        <button 
          onClick={() => {
            setQuickAction({ isOpen: true, type: 'transfer', tableNumber: selectedTableNumber || 1 })
            playNotificationSound('click')
          }}
          className="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-90"
        >
          <ArrowRightLeft size={18} className="text-blue-400" />
          <span className="text-[8px] font-black uppercase tracking-wider mt-1">Transfer</span>
        </button>

        <button 
          onClick={() => {
            setQuickAction({ isOpen: true, type: 'merge', tableNumber: selectedTableNumber || 1 })
            playNotificationSound('click')
          }}
          className="flex flex-col items-center justify-center text-gray-400 hover:text-white transition-colors active:scale-90"
        >
          <Star size={18} className="text-rose-400 animate-pulse" />
          <span className="text-[8px] font-black uppercase tracking-wider mt-1">Clean/Merge</span>
        </button>
      </footer>

      {/* ======================================================== */}
      {/* MODAL POPUPS (Manual Order, Transfers, Payments) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {quickAction.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setQuickAction({ isOpen: false, type: null, tableNumber: null })}
              className="absolute inset-0 bg-[#06080c]/80 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0f1326] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative z-10 text-left"
            >
              <button 
                onClick={() => setQuickAction({ isOpen: false, type: null, tableNumber: null })}
                className="absolute top-6 right-6 text-gray-400 hover:text-white bg-white/5 p-1.5 rounded-full"
              >
                <X size={14} />
              </button>

              <div className="mb-5">
                <span className="text-[8px] font-black text-accent-orange bg-accent-orange/10 border border-accent-orange/15 px-2 py-0.5 rounded uppercase tracking-wider">Console panel</span>
                <h3 className="text-base font-black text-white mt-2">
                  {quickAction.type === 'manual' ? 'Add Manual Waiter Order' : 
                   quickAction.type === 'transfer' ? 'Table Transfer System' : 'Merge Seating / Cleaning'}
                </h3>
                <p className="text-[10px] text-gray-500 mt-1">Target Seating: Table {quickAction.tableNumber}</p>
              </div>

              {quickAction.type === 'manual' ? (
                <div className="space-y-4">
                  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl text-xs space-y-2">
                    <p className="text-gray-400 font-semibold uppercase tracking-wider text-[8px]">Select Menu items to add</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          setManualOrderItems(prev => [...prev, 'Crispy Masala Dosa'])
                          playNotificationSound('click')
                        }}
                        className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg border border-white/5 text-[10px]"
                      >
                        + Masala Dosa
                      </button>
                      <button 
                        onClick={() => {
                          setManualOrderItems(prev => [...prev, 'Filter Coffee'])
                          playNotificationSound('click')
                        }}
                        className="bg-white/5 hover:bg-white/10 text-white px-3 py-1.5 rounded-lg border border-white/5 text-[10px]"
                      >
                        + Filter Coffee
                      </button>
                    </div>

                    {manualOrderItems.length > 0 && (
                      <div className="pt-2 border-t border-white/5">
                        <p className="text-[9px] text-gray-400 uppercase">Items deck:</p>
                        <ul className="list-disc pl-4 text-white mt-1 space-y-1 font-mono text-[10px]">
                          {manualOrderItems.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      addAlert(`Manual order successfully submitted for Table ${quickAction.tableNumber}!`)
                      setManualOrderItems([])
                      setQuickAction({ isOpen: false, type: null, tableNumber: null })
                      playNotificationSound('click')
                      fetchData()
                    }}
                    className="w-full bg-accent-orange text-gray-900 font-black py-3 rounded-2xl text-xs active:scale-95 shadow-md"
                  >
                    Submit Order to Kitchen
                  </button>
                </div>
              ) : quickAction.type === 'transfer' ? (
                <div className="space-y-4">
                  <label className="text-[10px] text-gray-500 font-black uppercase">Select Destination Seating</label>
                  <select className="w-full bg-[#121626] border border-white/5 text-white p-3 rounded-xl focus:outline-none focus:border-accent-orange text-xs font-black">
                    <option value="2">Table 2 (Available)</option>
                    <option value="3">Table 3 (Available)</option>
                    <option value="6">Table 6 (Available)</option>
                    <option value="8">Table 8 (Available)</option>
                  </select>

                  <button 
                    onClick={() => {
                      addAlert(`Successfully transferred session from Table ${quickAction.tableNumber} to Table 3!`)
                      setQuickAction({ isOpen: false, type: null, tableNumber: null })
                      playNotificationSound('click')
                      fetchData()
                    }}
                    className="w-full bg-accent-orange text-gray-900 font-black py-3 rounded-2xl text-xs active:scale-95 shadow-md"
                  >
                    Confirm Table Session Transfer
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#1c0d10] border border-rose-500/10 p-4 rounded-2xl text-xs text-rose-300">
                    Warning: Merging table operations requires customer session approval. Cleaning requests will alert floor runners immediately.
                  </div>

                  <button 
                    onClick={() => {
                      addAlert(`Requested cleaning team dispatched to Table ${quickAction.tableNumber}!`)
                      setQuickAction({ isOpen: false, type: null, tableNumber: null })
                      playNotificationSound('click')
                    }}
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-2xl text-xs active:scale-95 border border-white/5"
                  >
                    Dispatch Table Cleaning Staff
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BILLING / CHECKOUT PORTAL MODAL */}
      <AnimatePresence>
        {paymentModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })}
              className="absolute inset-0 bg-[#06080c]/80 backdrop-blur-xs"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0f1326] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative z-10 overflow-hidden flex flex-col text-left"
            >
              <button 
                onClick={() => setPaymentModal({ ...paymentModal, isOpen: false })}
                className="absolute top-6 right-6 text-gray-400 hover:text-white bg-white/5 p-1.5 rounded-full"
              >
                <X size={14} />
              </button>

              <div className="mb-5">
                <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1">Billing collection</p>
                <h2 className="text-xl font-black text-white">Table {paymentModal.tableNumber}</h2>
                <p className="text-2xl font-black text-accent-orange mt-2">₹{paymentModal.amount.toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-5">
                <PaymentOption 
                  icon={Banknote} 
                  label="Cash" 
                  active={paymentModal.method === 'cash'}
                  onClick={() => {
                    setPaymentModal({ ...paymentModal, method: 'cash' })
                    playNotificationSound('click')
                  }}
                />
                <PaymentOption 
                  icon={CreditCard} 
                  label="Card" 
                  active={paymentModal.method === 'card'}
                  onClick={() => {
                    setPaymentModal({ ...paymentModal, method: 'card' })
                    playNotificationSound('click')
                  }}
                />
                <PaymentOption 
                  icon={QrCode} 
                  label="UPI QR" 
                  active={paymentModal.method === 'upi'}
                  onClick={() => {
                    setPaymentModal({ ...paymentModal, method: 'upi' })
                    playNotificationSound('click')
                  }}
                />
              </div>

              <AnimatePresence mode="wait">
                {paymentModal.method === 'upi' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-5 flex flex-col items-center justify-center">
                      <div className="bg-white p-2.5 rounded-2xl shadow-sm mb-3">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${upiConfig.upiId}&pn=${upiConfig.upiName}&am=${paymentModal.amount.toFixed(2)}`)}`}
                          alt="UPI QR Code"
                          className="w-28 h-28 object-contain"
                        />
                      </div>
                      <p className="text-[10px] font-black text-white">Scan to pay {upiConfig.upiName}</p>
                      <p className="text-[9px] text-gray-500 mt-1">{upiConfig.upiId}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                disabled={!paymentModal.method}
                onClick={handleConfirmPayment}
                className="w-full bg-accent-orange disabled:bg-white/5 disabled:text-gray-500 disabled:cursor-not-allowed text-gray-900 font-black py-3 rounded-2xl flex justify-center items-center gap-2 hover:bg-accent-orange/95 active:scale-[0.98] transition-all shadow-md text-xs"
              >
                Confirm Payment Received
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PaymentOption({ icon: Icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${
        active 
          ? 'border-accent-orange bg-accent-orange/10 text-accent-orange' 
          : 'border-white/5 bg-white/5 text-gray-400'
      }`}
    >
      <Icon size={18} className="mb-1.5" />
      <span className="font-bold text-[10px]">{label}</span>
    </button>
  )
}
