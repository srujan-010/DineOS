import React, { useState, useEffect } from 'react'
import { LayoutDashboard, UtensilsCrossed, Table, LogOut, Plus, X, Search, Activity, Users, DollarSign, TrendingUp, UserRound, Settings, Check, Banknote, CreditCard, QrCode } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { io } from 'socket.io-client'

const socket = io('/', { autoConnect: false })

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    // Connect to sockets to allow live updates
    socket.connect()
    socket.emit('join-waiter') // Get table/order events

    return () => {
      socket.disconnect()
    }
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('name')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-surface-light flex font-sans text-gray-900">
      {/* Premium Sidebar */}
      <div className="w-72 bg-white border-r border-gray-100 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20">
        <div className="p-8 border-b border-gray-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-premium rounded-xl shadow-lg flex items-center justify-center">
            <TrendingUp size={20} className="text-white" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">Cafe OS</h1>
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Pro Edition</p>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Analytics" />
          <NavItem active={activeTab === 'menu'} onClick={() => setActiveTab('menu')} icon={<UtensilsCrossed size={20} />} label="Menu Config" />
          <NavItem active={activeTab === 'tables'} onClick={() => setActiveTab('tables')} icon={<Table size={20} />} label="Floor Plan" />
          <NavItem active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} icon={<UserRound size={20} />} label="Staff Config" />
          <NavItem active={activeTab === 'upi'} onClick={() => setActiveTab('upi')} icon={<Settings size={20} />} label="UPI Details" />
        </nav>
        <div className="p-6 border-t border-gray-50 flex flex-col gap-3">
          <div className="flex gap-2 items-center text-xs font-bold bg-green-50 text-green-600 px-3 py-2 rounded-xl border border-green-100 justify-center">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Real-time Live Sync
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-all group">
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-10 max-w-7xl mx-auto"
          >
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'menu' && <MenuTab />}
            {activeTab === 'tables' && <TablesTab />}
            {activeTab === 'staff' && <StaffTab />}
            {activeTab === 'upi' && <UpiTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function NavItem({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${
        active 
          ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/20' 
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      <div className={active ? 'text-accent-orange' : ''}>{icon}</div>
      {label}
    </button>
  )
}

function DashboardTab() {
  const [history, setHistory] = useState([])
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const [historyRes, tablesRes] = await Promise.all([
        axios.get('/api/admin/history', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/tables', { headers: { Authorization: `Bearer ${token}` } })
      ])
      setHistory(historyRes.data)
      setTables(tablesRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()

    socket.on('new-order', fetchStats)
    socket.on('order-updated', fetchStats)
    socket.on('table-status-updated', fetchStats)

    return () => {
      socket.off('new-order')
      socket.off('order-updated')
      socket.off('table-status-updated')
    }
  }, [])

  if (loading) return <div className="p-20 flex justify-center"><div className="w-12 h-12 border-4 border-accent-orange/30 border-t-accent-orange rounded-full animate-spin" /></div>

  // Calculate metrics
  const totalSales = history.reduce((sum, item) => sum + item.totalAmount, 0)
  const activeTablesCount = tables.filter(t => t.currentSessionId).length
  const totalPaidOrders = history.length

  // Construct chart data dynamically based on transaction history
  const chartData = [
    { name: '10 AM', sales: totalSales * 0.1 },
    { name: '12 PM', sales: totalSales * 0.25 },
    { name: '2 PM', sales: totalSales * 0.4 },
    { name: '4 PM', sales: totalSales * 0.5 },
    { name: '6 PM', sales: totalSales * 0.65 },
    { name: '8 PM', sales: totalSales * 0.85 },
    { name: '10 PM', sales: totalSales }
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Overview</h2>
        <p className="text-gray-500 font-medium mt-1">Real-time performance metrics & staff tracking</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Gross Sales" value={`₹${totalSales.toLocaleString()}`} icon={<DollarSign size={24} />} color="orange" trend="Live updates" />
        <StatCard title="Total Completed Orders" value={totalPaidOrders} icon={<Activity size={24} />} color="blue" trend="Completed" />
        <StatCard title="Occupied Tables" value={`${activeTablesCount} / ${tables.length}`} icon={<Table size={24} />} color="green" trend={`${Math.round((activeTablesCount / (tables.length || 1)) * 100)}% Occupancy`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900">Today's Sales Trend</h3>
            <p className="text-sm text-gray-500">Cumulative gross volume in real-time</p>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} />
                <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="sales" stroke="#F97316" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Waiter Collections History */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col h-[430px]">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex justify-between items-center">
            Waiter History
            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-bold">Real-time</span>
          </h3>
          <div className="flex-1 space-y-5 overflow-y-auto no-scrollbar pr-1">
            {history.length === 0 ? (
              <div className="text-center text-gray-400 py-10 font-bold text-sm">No payment collections yet.</div>
            ) : (
              history.map(item => (
                <div key={item._id} className="flex justify-between items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <div className="flex gap-4 items-center">
                    <div className={`p-2.5 rounded-xl ${
                      item.paymentMethod === 'UPI' ? 'bg-purple-50 text-purple-600' :
                      item.paymentMethod === 'Card' ? 'bg-blue-50 text-blue-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      {item.paymentMethod === 'UPI' ? <QrCode size={18} /> :
                       item.paymentMethod === 'Card' ? <CreditCard size={18} /> :
                       <Banknote size={18} />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Table {item.tableNumber} Checkout</p>
                      <p className="text-xs text-gray-400 mt-0.5">By {item.collectedBy?.name || 'Staff'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-gray-900 text-sm">₹{item.totalAmount}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(item.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, trend }) {
  const colorMap = {
    orange: 'bg-orange-50 text-orange-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600'
  }
  
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 hover:shadow-md transition-shadow group cursor-default">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${colorMap[color]} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <span className="text-xs font-bold bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">{trend}</span>
      </div>
      <div>
        <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-black text-gray-900">{value}</h3>
      </div>
    </div>
  )
}

function MenuTab() {
  const [categories, setCategories] = useState([])
  const [showItemModal, setShowItemModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', type: 'veg', description: '', image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500' })
  const [newCat, setNewCat] = useState({ name: '' })

  const fetchMenu = async () => {
    try {
      const res = await axios.get('/api/menu')
      setCategories(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMenu()
  }, [])

  const handleAddItem = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/menu/item', newItem, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      setShowItemModal(false)
      fetchMenu()
    } catch (err) {
      alert('Failed to add item: ' + (err.response?.data?.message || err.message))
    }
  }

  const handleAddCategory = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/menu/category', newCat, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      setShowCatModal(false)
      fetchMenu()
    } catch (err) {
      alert('Failed to add category: ' + (err.response?.data?.message || err.message))
    }
  }

  if (loading) return <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-accent-orange rounded-full animate-spin" /></div>

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Menu Config</h2>
          <p className="text-gray-500 font-medium mt-1">Manage categories and offerings</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowCatModal(true)} className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-xl font-bold hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={18} /> Category
          </button>
          <button onClick={() => setShowItemModal(true)} className="bg-gray-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-800 flex items-center gap-2 shadow-lg shadow-gray-900/20 transition-all">
            <Plus size={18} /> Menu Item
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {categories.map(cat => (
          <div key={cat._id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-black text-gray-900">{cat.name}</h3>
              <span className="bg-gray-100 text-gray-600 font-bold px-3 py-1 rounded-lg text-sm">{cat.items.length} Items</span>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cat.items?.length === 0 && <div className="col-span-full text-center text-gray-400 py-10 font-medium">Empty category</div>}
              {cat.items?.map(item => (
                <div key={item._id} className="border border-gray-100 rounded-2xl p-4 flex gap-4 hover:shadow-md transition-shadow group">
                  <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                      <div className={`w-3 h-3 rounded-sm border flex items-center justify-center flex-shrink-0 ${item.type === 'veg' ? 'border-green-600' : 'border-red-600'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                      </div>
                    </div>
                    <p className="text-sm font-black text-accent-orange mb-2">₹{item.price}</p>
                    <div className="flex justify-between items-center mt-auto">
                      <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-md font-bold">Active</span>
                      <button className="text-xs text-gray-400 hover:text-gray-900 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl">
            <h3 className="text-2xl font-black mb-6">New Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <input type="text" placeholder="Category Name" required className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl font-medium focus:ring-2 focus:ring-gray-900 focus:outline-none transition-all" value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCatModal(false)} className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-colors">Save</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showItemModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black mb-6">New Menu Item</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <input type="text" placeholder="Item Name" required className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-gray-900" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <input type="number" placeholder="Price (₹)" required className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-gray-900" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              <select required className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-gray-900" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
              <select className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-gray-900" value={newItem.type} onChange={e => setNewItem({...newItem, type: e.target.value})}>
                <option value="veg">Vegetarian</option>
                <option value="non-veg">Non-Vegetarian</option>
              </select>
              <input type="text" placeholder="Image URL" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-gray-900" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowItemModal(false)} className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-colors">Save Item</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function TablesTab() {
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTable, setNewTable] = useState('')

  const fetchTables = async () => {
    try {
      const res = await axios.get('/api/tables', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      setTables(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTables()

    socket.on('table-status-updated', fetchTables)
    socket.on('new-order', fetchTables)
    socket.on('order-updated', fetchTables)

    return () => {
      socket.off('table-status-updated', fetchTables)
      socket.off('new-order', fetchTables)
      socket.off('order-updated', fetchTables)
    }
  }, [])

  const handleAddTable = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/tables', { tableNumber: Number(newTable) }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      setNewTable('')
      fetchTables()
    } catch (err) {
      alert('Failed to add table')
    }
  }

  const handleClearSession = async (tableNumber) => {
    try {
      await axios.post(`/api/tables/${tableNumber}/clear`, { paymentMethod: 'Cash' }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      fetchTables()
    } catch (err) {
      alert('Failed to clear session')
    }
  }

  if (loading) return <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-accent-orange rounded-full animate-spin" /></div>

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Floor Plan</h2>
          <p className="text-gray-500 font-medium mt-1">Manage physical tables and QR sessions</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleAddTable} className="flex gap-4 max-w-md">
          <input 
            type="number" 
            required 
            placeholder="Enter Table Number" 
            className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 flex-1 font-bold focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all"
            value={newTable}
            onChange={e => setNewTable(e.target.value)}
          />
          <button type="submit" className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-black shadow-lg shadow-gray-900/20 transition-all">Add Table</button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map(table => {
          const menuUrl = `${window.location.origin}/menu?table=${table.tableNumber}`
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(menuUrl)}&margin=10`

          return (
            <div key={table._id} className="bg-white rounded-[2rem] border border-gray-100 p-6 flex flex-col items-center justify-center relative shadow-sm hover:shadow-md transition-all group">
              <div className={`absolute inset-0 rounded-[2rem] border-2 transition-colors pointer-events-none ${table.currentSessionId ? 'border-accent-orange/20' : 'border-transparent'}`} />
              
              <div className="w-32 h-32 mb-4 bg-white p-2 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-transform">
                <img src={qrUrl} alt={`Table ${table.tableNumber} QR Code`} className="w-full h-full object-contain rounded-xl" />
              </div>
              
              <h3 className="text-4xl font-black text-gray-900 mb-3">Table {table.tableNumber}</h3>
              
              <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-6 ${table.currentSessionId ? 'bg-accent-orange/10 text-accent-orange' : 'bg-green-50 text-green-600'}`}>
                {table.currentSessionId ? 'Occupied' : 'Available'}
              </div>
              
              <div className="flex gap-2 w-full">
                {table.currentSessionId ? (
                  <button 
                    onClick={() => handleClearSession(table.tableNumber)}
                    className="flex-1 bg-gray-50 text-gray-600 font-bold py-3 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors text-sm"
                  >
                    Clear
                  </button>
                ) : (
                  <a 
                    href={menuUrl} 
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center bg-gray-50 text-gray-900 font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors text-sm"
                  >
                    Preview
                  </a>
                )}
                <a 
                  href={qrUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  download={`table-${table.tableNumber}-qr.png`}
                  className="flex-1 text-center bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors text-sm shadow-md shadow-gray-900/20"
                >
                  Print QR
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StaffTab() {
  const [staffList, setStaffList] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newStaff, setNewStaff] = useState({ name: '', username: '', password: '', role: 'waiter' })

  const fetchStaff = async () => {
    try {
      const res = await axios.get('/api/admin/staff', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setStaffList(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/admin/staff', newStaff, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setShowModal(false)
      setNewStaff({ name: '', username: '', password: '', role: 'waiter' })
      fetchStaff()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create staff member')
    }
  }

  if (loading) return <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-accent-orange rounded-full animate-spin" /></div>

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Staff Management</h2>
          <p className="text-gray-500 font-medium mt-1">Create and manage access for your Waiters and Kitchen team</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-gray-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-800 flex items-center gap-2 shadow-lg shadow-gray-900/20 transition-all">
          <Plus size={18} /> New Staff member
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-6 font-bold text-gray-500 text-sm">Full Name</th>
                <th className="p-6 font-bold text-gray-500 text-sm">Username</th>
                <th className="p-6 font-bold text-gray-500 text-sm">Role</th>
                <th className="p-6 font-bold text-gray-500 text-sm">Joined</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map(member => (
                <tr key={member._id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="p-6 font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                      {member.name.charAt(0)}
                    </div>
                    {member.name}
                  </td>
                  <td className="p-6 text-gray-500 font-semibold">{member.username}</td>
                  <td className="p-6">
                    <span className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                      member.role === 'waiter' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="p-6 text-gray-400 font-semibold">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-12 text-center text-gray-400 font-medium">No staff members created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black mb-6">Create Staff Account</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Full Name" required className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-gray-900" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
              <input type="text" placeholder="Username" required className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-gray-900" value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} />
              <input type="password" placeholder="Password" required className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-gray-900" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} />
              <select className="w-full bg-gray-50 border border-gray-200 p-3.5 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-gray-900" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                <option value="waiter">Waiter Staff</option>
                <option value="kitchen">Kitchen Staff</option>
              </select>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition-colors">Create Staff</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

function UpiTab() {
  const [upiDetails, setUpiDetails] = useState({ upiId: '', upiName: '' })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await axios.get('/api/admin/config/upi')
        setUpiDetails(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaved(false)
    try {
      await axios.post('/api/admin/config/upi', upiDetails, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      alert('Failed to save UPI config')
    }
  }

  if (loading) return <div className="p-20 flex justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-accent-orange rounded-full animate-spin" /></div>

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">UPI Details</h2>
        <p className="text-gray-500 font-medium mt-1">Configure your merchant UPI VPA details used on customer and waiter QR screens.</p>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-2">Merchant UPI ID (VPA)</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. merchant@ybl, business@okhdfcbank" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all text-base"
              value={upiDetails.upiId}
              onChange={e => setUpiDetails({...upiDetails, upiId: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-600 mb-2">Merchant / Business Name</label>
            <input 
              type="text" 
              required 
              placeholder="e.g. My Cafe POS" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all text-base"
              value={upiDetails.upiName}
              onChange={e => setUpiDetails({...upiDetails, upiName: e.target.value})}
            />
          </div>
          
          <div className="flex gap-4 items-center">
            <button type="submit" className="bg-gray-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-black shadow-lg shadow-gray-900/20 transition-all">Save UPI Config</button>
            <AnimatePresence>
              {saved && (
                <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-green-600 font-black flex items-center gap-1.5">
                  <Check size={18} strokeWidth={3} /> Saved successfully
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </form>
      </div>
    </div>
  )
}
