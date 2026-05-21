import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
})

// 上报页面访问
export const reportVisit = (data) => {
  return api.post('/visit-log/report', data)
}

// 获取每日独立IP统计（按天聚合）
export const getDailyStats = (start, end) => {
  return api.get('/visit-log/daily-stats', { params: { start, end } })
}

// 获取指定日期的IP访问详情
export const getIpDetail = (date) => {
  return api.get('/visit-log/ip-detail', { params: { date } })
}
