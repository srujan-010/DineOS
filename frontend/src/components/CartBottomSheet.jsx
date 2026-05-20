import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Receipt, CheckCircle, Minus, Plus } from 'lucide-react'
import useCartStore from '../store/useCartStore'
import axios from 'axios'

export default function CartBottomSheet({ onClose, onOrderPlaced }) {
  const { cart, tableNumber, sessionId, getTotal, clearCart, addToCart, removeFromCart } = useCartStore()
  const [isPlacing, setIsPlacing] = useState(false)

  const handlePlaceOrder = async () => {
    setIsPlacing(true)
    try {
      const orderData = {
        tableNumber,
        sessionId,
        items: cart.map(item => ({
          menuItem: item._id,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: getTotal()
      }
      
      const res = await axios.post('/api/orders', orderData)
      clearCart()
      onOrderPlaced(res.data)
    } catch (error) {
      console.error('Error placing order', error)
      alert('Failed to place order. Please try again.')
    } finally {
      setIsPlacing(false)
    }
  }

  const tax = getTotal() * 0.05;
  const grandTotal = getTotal() + tax;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-surface-dark/40 backdrop-blur-sm"
    >
      <div className="flex-1" onClick={onClose} />
      
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-surface-light rounded-t-[2.5rem] shadow-[0_-20px_60px_-15px_rgba(0,0,0,0.3)] max-h-[85vh] overflow-hidden flex flex-col relative"
      >
        {/* Header */}
        <div className="px-6 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <Receipt size={24} className="text-accent-orange" strokeWidth={2.5} />
              Your Order
            </h2>
            <p className="text-xs text-gray-500 font-medium">Table {tableNumber} • {cart.reduce((a,b)=>a+b.quantity, 0)} Items</p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full active:scale-95 transition-all">
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-32 no-scrollbar">
          <div className="space-y-6 mb-8">
            {cart.map(item => (
              <div key={item._id} className="flex gap-4">
                <img src={item.image || 'https://via.placeholder.com/150'} className="w-16 h-16 rounded-2xl object-cover shadow-sm" alt={item.name} />
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-bold text-gray-900 leading-tight">{item.name}</p>
                    <p className="text-sm font-black text-gray-900">₹{item.price * item.quantity}</p>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">₹{item.price}</p>
                  
                  <div className="flex items-center gap-3 bg-white self-start rounded-lg p-1 border border-gray-100 shadow-sm">
                    <button onClick={() => removeFromCart(item._id)} className="w-7 h-7 flex items-center justify-center text-accent-orange bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"><Minus size={16} strokeWidth={3} /></button>
                    <span className="text-sm font-bold w-4 text-center text-gray-900">{item.quantity}</span>
                    <button onClick={() => addToCart(item)} className="w-7 h-7 flex items-center justify-center text-accent-orange bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"><Plus size={16} strokeWidth={3} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bill Details */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-50 space-y-3">
            <h3 className="font-black text-sm text-gray-900 mb-4 tracking-wider uppercase opacity-80">Bill Details</h3>
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>Item Total</span>
              <span>₹{getTotal()}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>Taxes & Charges (5%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            
            <div className="border-t border-dashed border-gray-200 my-4 pt-4 flex justify-between items-center">
              <span className="font-black text-lg text-gray-900">Grand Total</span>
              <span className="font-black text-2xl text-accent-orange">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-surface-light via-surface-light to-transparent">
          <button 
            onClick={handlePlaceOrder}
            disabled={isPlacing}
            className="w-full bg-gradient-premium text-white rounded-[2rem] p-4 font-black text-lg shadow-[0_10px_40px_-10px_rgba(249,115,22,0.6)] active:scale-[0.98] transition-all flex justify-center items-center gap-2 group"
          >
            {isPlacing ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Place Order <CheckCircle size={20} className="group-hover:scale-110 transition-transform" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
