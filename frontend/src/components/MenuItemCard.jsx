import React from 'react'
import useCartStore from '../store/useCartStore'
import { Plus, Minus, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

export default function MenuItemCard({ item }) {
  const { cart, addToCart, removeFromCart } = useCartStore()
  
  const cartItem = cart.find(c => c._id === item._id)
  const quantity = cartItem ? cartItem.quantity : 0

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group bg-white rounded-[2rem] p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-50 flex gap-5 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-shadow duration-300 relative overflow-hidden"
    >
      {/* Decorative gradient blur in background on hover */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-accent-orange/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Details */}
      <div className="flex-1 py-2 flex flex-col z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-4 h-4 rounded border flex items-center justify-center ${item.type === 'veg' ? 'border-green-600' : 'border-red-600'}`}>
            <div className={`w-2 h-2 rounded-full ${item.type === 'veg' ? 'bg-green-600' : 'bg-red-600'}`}></div>
          </div>
          {item.popular && (
            <span className="text-[10px] font-black uppercase tracking-wider text-white bg-accent-orange px-2 py-0.5 rounded-md">Bestseller</span>
          )}
        </div>
        
        <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">{item.name}</h3>
        <p className="text-lg font-bold text-gray-800 mb-2">₹{item.price}</p>
        <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-4">
          {item.description || 'Deliciously crafted with the finest ingredients for a perfect taste.'}
        </p>
        
        {item.prepTime && (
          <div className="mt-auto flex items-center gap-1.5 text-xs font-bold text-gray-400 bg-gray-50 self-start px-2.5 py-1 rounded-lg">
            <Clock size={14} />
            {item.prepTime} mins
          </div>
        )}
      </div>

      {/* Image & Add Button */}
      <div className="relative w-[140px] h-[140px] flex-shrink-0 z-10">
        <div className="w-full h-full rounded-3xl overflow-hidden shadow-sm">
          <img 
            src={item.image || 'https://via.placeholder.com/150'} 
            alt={item.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        </div>
        
        {/* Add Button overlapping image */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-28">
          {quantity === 0 ? (
            <button 
              onClick={() => addToCart(item)}
              className="w-full bg-white text-accent-orange font-black shadow-[0_8px_20px_-4px_rgba(249,115,22,0.3)] py-2 rounded-xl uppercase text-sm active:scale-95 transition-all border border-accent-orange/10 hover:bg-accent-orange hover:text-white"
            >
              ADD
            </button>
          ) : (
            <div className="w-full bg-accent-orange text-white font-bold shadow-[0_8px_20px_-4px_rgba(249,115,22,0.4)] py-2 rounded-xl flex justify-between items-center px-2">
              <button onClick={() => removeFromCart(item._id)} className="p-1 hover:bg-white/20 rounded-lg active:scale-90 transition-transform">
                <Minus size={18} strokeWidth={3} />
              </button>
              <span className="text-base">{quantity}</span>
              <button onClick={() => addToCart(item)} className="p-1 hover:bg-white/20 rounded-lg active:scale-90 transition-transform">
                <Plus size={18} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
