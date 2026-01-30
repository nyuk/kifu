import axios from 'axios'

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

export const api = axios.create({
  baseURL,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kifu_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
