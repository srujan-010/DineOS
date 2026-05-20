import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import useMenuStore from '../store/useMenuStore'
import useCartStore from '../store/useCartStore'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, Search, BellRing, ReceiptText, ChevronRight, Sparkles } from 'lucide-react'
import MenuItemCard from '../components/MenuItemCard'
import CartBottomSheet from '../components/CartBottomSheet'
import LiveOrderTracking from '../components/LiveOrderTracking'

export default function CustomerMenu() {
  const [searchParams] = useSearchParams()
  const tableNumber = searchParams.get('table')
  const { categories, fetchMenu, isLoading } = useMenuStore()
  const { setTableSession, cart, getTotal } = useCartStore()
  
  const [activeCategory, setActiveCategory] = useState('')
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [activeOrder, setActiveOrder] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchMenu()
    initSession()
  }, [])

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0]._id)
    }
  }, [categories])

  const initSession = async () => {
    if (!tableNumber) return;
    try {
      const res = await axios.post(`/api/tables/${tableNumber}/session`)
      setTableSession(tableNumber, res.data.sessionId)
      
      const ordersRes = await axios.get(`/api/orders/table/${tableNumber}?sessionId=${res.data.sessionId}`)
      if (ordersRes.data.length > 0) {
        setActiveOrder(ordersRes.data[0]) 
      }
    } catch (error) {
      console.error('Error initializing session', error)
    }
  }

  const handleCallWaiter = () => {
    alert('Waiter called to Table ' + tableNumber)
  }

  if (!tableNumber) return <div className="p-8 text-center font-bold text-xl text-gray-400">Invalid Table Number</div>
  
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light">
      <div className="w-12 h-12 border-4 border-accent-orange/30 border-t-accent-orange rounded-full animate-spin" />
    </div>
  )

  const filteredCategories = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  })).filter(cat => cat.items.length > 0)

  // AI Recommended Items (mocking this by taking the first 3 items across the menu)
  const recommendedItems = categories.flatMap(c => c.items).slice(0, 3)

  return (
    <div className="pb-32 bg-surface-light min-h-screen relative font-sans selection:bg-accent-orange/20">
      
      {/* Premium Glass Header */}
      <header className="sticky top-0 z-20 glass rounded-b-[2rem] px-6 pt-8 pb-6 shadow-sm border-b-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-accent-orange mb-1">Dine-in Experience</p>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              Table {tableNumber}
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </h1>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCallWaiter} className="p-3 bg-white/50 hover:bg-white rounded-2xl text-gray-700 shadow-sm transition-all hover:scale-105 border border-gray-100">
              <BellRing size={22} strokeWidth={2.5} />
            </button>
            <button className="p-3 bg-white/50 hover:bg-white rounded-2xl text-gray-700 shadow-sm transition-all hover:scale-105 border border-gray-100">
              <ReceiptText size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-gray-400 group-focus-within:text-accent-orange transition-colors" size={20} />
          </div>
          <input 
            type="text" 
            placeholder="What are you craving?" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/80 backdrop-blur-md rounded-2xl py-4 pl-12 pr-4 text-[15px] font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-orange/50 shadow-sm border border-gray-100 transition-shadow"
          />
        </div>
      </header>

      {/* AI Recommendations Carousel (Only show if no search term) */}
      {!searchTerm && recommendedItems.length > 0 && (
        <div className="px-6 py-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-accent-orange" size={20} />
            <h2 className="text-xl font-black text-gray-900">AI Recommended</h2>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-6 px-6">
            {recommendedItems.map(item => (
              <div key={`rec-${item._id}`} className="min-w-[240px] bg-white rounded-3xl p-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-50 flex flex-col gap-3">
                <img src={item.image} alt={item.name} className="w-full h-32 object-cover rounded-2xl" />
                <div className="px-1">
                  <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-bold text-accent-orange">₹{item.price}</span>
                    <button 
                      onClick={() => {
                        const existing = cart.find(c => c._id === item._id)
                        if (!existing) useCartStore.getState().addToCart(item)
                      }}
                      className="bg-gray-100 hover:bg-accent-orange hover:text-white transition-colors text-gray-900 text-xs font-bold px-3 py-1.5 rounded-lg"
                    >
                      ADD
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories Horizontal Scroll */}
      <div className="sticky top-[152px] z-10 glass rounded-b-2xl py-3 shadow-sm">
        <div className="flex overflow-x-auto no-scrollbar gap-2 px-6">
          {filteredCategories.map(cat => (
            <button 
              key={cat._id}
              onClick={() => {
                setActiveCategory(cat._id)
                document.getElementById(`category-${cat._id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              }}
              className="relative whitespace-nowrap px-5 py-2.5 rounded-2xl text-[15px] font-bold transition-colors"
            >
              {activeCategory === cat._id && (
                <motion.div
                  layoutId="activeCategory"
                  className="absolute inset-0 bg-gray-900 rounded-2xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className={`relative z-10 ${activeCategory === cat._id ? 'text-white' : 'text-gray-500'}`}>
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="p-6 space-y-12">
        {filteredCategories.map(cat => (
          <div key={cat._id} id={`category-${cat._id}`} className="scroll-mt-[220px]">
            <h2 className="text-2xl font-black mb-6 text-gray-900 flex items-baseline gap-3">
              {cat.name} 
              <span className="text-sm font-bold text-gray-300 bg-white px-2 py-0.5 rounded-lg border border-gray-100">{cat.items.length}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {cat.items.map(item => (
                <MenuItemCard key={item._id} item={item} />
              ))}
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 font-medium">No items found matching "{searchTerm}"</p>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-40 max-w-md mx-auto"
          >
            <button 
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-gradient-premium text-white rounded-[2rem] p-4 shadow-[0_10px_40px_-10px_rgba(249,115,22,0.6)] flex justify-between items-center hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                  <ShoppingBag size={24} strokeWidth={2.5} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/80 mb-0.5">{cart.reduce((acc, item) => acc + item.quantity, 0)} Items Added</p>
                  <p className="font-black text-xl">₹{getTotal()}</p>
                </div>
              </div>
              <div className="font-black flex items-center gap-1 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                View Cart <ChevronRight size={20} />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Order Tracking Mini-Banner */}
      {activeOrder && !isCartOpen && (
        <LiveOrderTracking order={activeOrder} onExpand={() => {}} compact />
      )}

      {/* Cart Bottom Sheet */}
      <AnimatePresence>
        {isCartOpen && (
          <CartBottomSheet 
            onClose={() => setIsCartOpen(false)} 
            onOrderPlaced={(order) => {
              setActiveOrder(order)
              setIsCartOpen(false)
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}
