import { create } from 'zustand'

const useCartStore = create((set, get) => ({
  cart: [],
  tableNumber: null,
  sessionId: null,
  
  setTableSession: (tableNumber, sessionId) => set({ tableNumber, sessionId }),
  
  addToCart: (item) => set((state) => {
    const existing = state.cart.find(cartItem => cartItem._id === item._id);
    if (existing) {
      return {
        cart: state.cart.map(cartItem => 
          cartItem._id === item._id 
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        )
      };
    }
    return { cart: [...state.cart, { ...item, quantity: 1 }] };
  }),
  
  removeFromCart: (itemId) => set((state) => {
    const existing = state.cart.find(cartItem => cartItem._id === itemId);
    if (existing.quantity > 1) {
      return {
        cart: state.cart.map(cartItem => 
          cartItem._id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        )
      };
    }
    return { cart: state.cart.filter(cartItem => cartItem._id !== itemId) };
  }),
  
  clearCart: () => set({ cart: [] }),
  
  getTotal: () => {
    return get().cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
}))

export default useCartStore;
