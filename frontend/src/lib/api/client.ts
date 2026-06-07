import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('b4b_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== 'undefined' &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/logout')
    ) {
      localStorage.removeItem('b4b_token')
      localStorage.removeItem('b4b_user')
      document.cookie = 'b4b_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'b4b_status=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      document.cookie = 'b4b_company_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
