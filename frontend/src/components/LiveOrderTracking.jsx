import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import { Clock, ChefHat, CheckCircle2, ChevronUp, BellRing, Utensils } from 'lucide-react'

const socket = io('/', { autoConnect: false }) 

const STATUS_CONFIG = {
  'New': { 
    color: 'from-blue-500 to-blue-600', 
    text: 'text-blue-500', 
    bg: 'bg-blue-500',
    icon: Clock, 
    message: 'Order received by kitchen' 
  },
  'Preparing': { 
    color: 'from-accent-orange to-yellow-500', 
    text: 'text-accent-orange', 
    bg: 'bg-accent-orange',
    icon: ChefHat, 
    message: 'Chef is crafting your meal' 
  },
  'Ready': { 
    color: 'from-green-500 to-emerald-600', 
    text: 'text-green-500', 
    bg: 'bg-green-500',
    icon: BellRing, 
    message: 'Ready to be served' 
  },
  'Served': { 
    color: 'from-gray-500 to-gray-600', 
    text: 'text-gray-500', 
    bg: 'bg-gray-500',
    icon: Utensils, 
    message: 'Enjoy your delicious meal!' 
  },
  'Paid': { 
    color: 'from-gray-700 to-gray-800', 
    text: 'text-gray-700', 
    bg: 'bg-gray-700',
    icon: CheckCircle2, 
    message: 'Order completed' 
  }
}

export default function LiveOrderTracking({ order, onExpand, compact }) {
  const [currentOrder, setCurrentOrder] = useState(order)
  const [expanded, setExpanded] = useState(!compact)

  useEffect(() => {
    socket.connect()
    socket.emit('join-table', currentOrder.tableNumber)

    socket.on('status-update', (updatedOrder) => {
      if (updatedOrder._id === currentOrder._id) {
        setCurrentOrder(updatedOrder)
      }
    })

    return () => {
      socket.off('status-update')
      socket.disconnect()
    }
  }, [currentOrder.tableNumber, currentOrder._id])

  const status = STATUS_CONFIG[currentOrder.status] || STATUS_CONFIG['New']
  const Icon = status.icon

  if (compact && !expanded) {
    return (
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={() => setExpanded(true)}
        className="fixed bottom-6 left-4 right-4 z-30 bg-surface-dark rounded-[2rem] p-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] border border-white/10 flex justify-between items-center cursor-pointer max-w-md mx-auto hover:bg-surface-darker transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl text-white bg-gradient-to-br ${status.color} shadow-lg relative`}>
            {currentOrder.status === 'Preparing' && (
              <div className="absolute inset-0 bg-white/20 rounded-2xl animate-ping" />
            )}
            <Icon size={20} className="relative z-10" />
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase tracking-wider">{currentOrder.status}</p>
            <p className="text-xs font-medium text-gray-400">{status.message}</p>
          </div>
        </div>
        <ChevronUp size={24} className="text-gray-500" strokeWidth={2.5} />
      </motion.div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        className="fixed inset-0 z-50 bg-surface-light flex flex-col"
      >
        <div className="bg-white p-6 shadow-sm flex items-center justify-between sticky top-0 z-10 rounded-b-[2rem]">
          <h2 className="text-xl font-black text-gray-900">Live Tracking</h2>
          <button onClick={() => compact ? setExpanded(false) : onExpand()} className="text-gray-500 bg-gray-100 p-2 rounded-full hover:bg-gray-200">
            <ChevronUp size={20} className="rotate-180" strokeWidth={3} />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
          {/* Status Indicator */}
          <div className="bg-white rounded-[2rem] p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-50 mb-6 text-center relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${status.color}`} />
            
            <div className="relative inline-block mb-6">
              {currentOrder.status === 'Preparing' && (
                <div className={`absolute inset-0 rounded-full animate-ping opacity-50 ${status.bg}`} />
              )}
              <div className={`w-24 h-24 relative z-10 mx-auto rounded-3xl flex items-center justify-center text-white bg-gradient-to-br ${status.color} shadow-xl shadow-current/20`}>
                <Icon size={48} strokeWidth={1.5} />
              </div>
            </div>
            
            <h3 className={`text-3xl font-black mb-2 ${status.text}`}>{currentOrder.status}</h3>
            <p className="text-gray-500 font-medium">{status.message}</p>
          </div>

          {/* Premium Timeline */}
          <div className="bg-white rounded-[2rem] p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-50 mb-6 relative">
            <div className="absolute left-[47px] top-10 bottom-10 w-0.5 bg-gray-100"></div>
            
            {['New', 'Preparing', 'Ready', 'Served'].map((step, idx) => {
              const isPast = ['New', 'Preparing', 'Ready', 'Served'].indexOf(currentOrder.status) >= idx
              const isCurrent = currentOrder.status === step
              return (
                <div key={step} className="flex items-center gap-6 mb-8 last:mb-0 relative z-10">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold transition-all duration-500
                    ${isPast ? 'bg-gray-900 text-white shadow-lg' : 'bg-white border-2 border-gray-100 text-gray-300'}
                    ${isCurrent ? 'scale-110 shadow-xl' : ''}
                  `}>
                    {isPast ? <CheckCircle2 size={20} /> : idx + 1}
                  </div>
                  <div className={isCurrent ? 'font-black text-gray-900 text-lg' : (isPast ? 'text-gray-600 font-bold' : 'text-gray-400 font-medium')}>
                    {step}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Order Details Mini */}
          <div className="bg-white rounded-[2rem] p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-50">
            <div className="flex justify-between items-center text-sm font-black text-gray-900 mb-4 tracking-wider uppercase opacity-80 border-b border-gray-100 pb-4">
              <span>Order ID</span>
              <span className="text-accent-orange">#{currentOrder._id.substring(currentOrder._id.length - 6).toUpperCase()}</span>
            </div>
            <div className="flex justify-between font-black text-lg text-gray-900 pt-2">
              <span>Total Paid</span>
              <span>₹{currentOrder.totalAmount}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
