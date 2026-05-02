import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000
})

// 获取有数据的日期列表（倒序）
export const getAvailableDates = () => {
  return api.get('/online-rate/dates')
}

// 获取指定日期的上座率数据
export const getOnlineRateData = (date) => {
  return api.get('/online-rate/query', { params: { date } })
}

// 获取门店排序配置
export const getStoreOrder = () => {
  return api.get('/store-order/list')
}

// 更新门店排序配置
export const updateStoreOrder = (data) => {
  return api.post('/store-order/update', data)
}

// 重置门店排序为默认
export const resetStoreOrder = () => {
  return api.post('/store-order/reset')
}

// 导入 Excel 数据
export const importExcelData = (file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post('/online-rate/import', formData)
}

export default api
