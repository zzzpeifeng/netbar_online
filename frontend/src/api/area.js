import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 15000,
})

export const OTHER_AREA_ID = '__OTHER__'

/**
 * 区列表（含"其他"虚拟区 + 每个区下门店详情）
 */
export const getAreaList = () =>
  api.get('/area/list').then((r) => r.data)

/**
 * 创建区
 * @param {{ name: string, order?: number }} data
 */
export const createArea = (data) =>
  api.post('/area/create', data).then((r) => r.data)

/**
 * 更新区
 * @param {string} id - 区 _id（禁止传 __OTHER__）
 * @param {{ name?: string, order?: number }} data
 */
export const updateArea = (id, data) =>
  api.post(`/area/update/${id}`, data).then((r) => r.data)

/**
 * 删除区（该区门店自动归入【其他】）
 * @param {string} id - 区 _id（禁止传 __OTHER__）
 */
export const deleteArea = (id) =>
  api.post(`/area/delete/${id}`).then((r) => r.data)

/**
 * 移动单门店到指定区
 * @param {string} areaId - 区 _id 或 __OTHER__（归到"其他"）
 * @param {string} storeName - 门店名称
 */
export const moveStoreToArea = (areaId, storeName) =>
  api.post(`/area/${areaId}/move-store`, { storeName }).then((r) => r.data)

/**
 * 全量覆盖区下门店
 * @param {string} areaId - 区 _id（禁止传 __OTHER__）
 * @param {string[]} storeNames - 门店名称数组
 */
export const setStoresForArea = (areaId, storeNames) =>
  api.post(`/area/${areaId}/set-stores`, { storeNames }).then((r) => r.data)

export default api
