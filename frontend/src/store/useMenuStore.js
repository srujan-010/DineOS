import { create } from 'zustand'
import axios from 'axios'

const API_URL = '/api'

const useMenuStore = create((set) => ({
  categories: [],
  isLoading: false,
  error: null,

  fetchMenu: async () => {
    set({ isLoading: true })
    try {
      const res = await axios.get(`${API_URL}/menu`)
      set({ categories: res.data, isLoading: false })
    } catch (error) {
      set({ error: error.message, isLoading: false })
    }
  }
}))

export default useMenuStore;
