import axios from 'axios'
import { getAccessToken } from '../stores/auth'

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

export const api = axios.create({
  baseURL,
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
