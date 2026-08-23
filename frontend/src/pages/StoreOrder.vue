<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { getStoreOrder, updateStoreOrder, resetStoreOrder } from '../api/onlineRate'
import {
  getAreaList,
  createArea,
  updateArea,
  deleteArea,
  setStoresForArea,
  moveStoreToArea,
  OTHER_AREA_ID,
} from '../api/area'
import { getDailyStats, getIpDetail } from '../api/visitLog'
import draggable from 'vuedraggable'
import * as echarts from 'echarts'

// ============== 通用 ==============
const storeList = ref([])
const loading = ref(false)
const saving = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const showConfirmReset = ref(false)
const toastSuccess = (msg = '操作成功！') => {
  showSuccess.value = true
  setTimeout(() => { showSuccess.value = false }, 2500)
}
const toastError = (msg) => {
  errorMessage.value = msg || '操作失败'
  showError.value = true
}
const flashSuccess = () => toastSuccess()

// ============== Tab ==============
const activeTab = ref('order') // 'order' | 'area'

// ============== 热力墙 ==============
const heatmapRef = ref(null)
const heatmapLoading = ref(false)
const heatmapEmpty = ref(false)
let heatmapInstance = null
const showIpDetail = ref(false)
const ipDetailDate = ref('')
const ipDetailList = ref([])
const ipDetailLoading = ref(false)
const formatDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
const generateHeatmapData = (dailyStats) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(today)
  const startDate = new Date(today)
  startDate.setFullYear(startDate.getFullYear() - 1)
  startDate.setDate(startDate.getDate() + 1)
  const uvMap = {}
  dailyStats.forEach(d => { uvMap[d.date] = d.uv })
  const adjustedStart = new Date(startDate)
  const startDay = adjustedStart.getDay()
  const daysToMonday = startDay === 0 ? 6 : startDay - 1
  adjustedStart.setDate(adjustedStart.getDate() - daysToMonday)
  const heatmapData = []
  const monthMarks = {}
  const cursor = new Date(adjustedStart)
  while (cursor <= endDate) {
    const dateStr = formatDate(cursor)
    const uv = uvMap[dateStr] || 0
    const currentDay = cursor.getDay()
    const rowIdx = currentDay === 0 ? 6 : currentDay - 1
    const msDiff = cursor.getTime() - adjustedStart.getTime()
    const daysDiff = Math.floor(msDiff / 86400000)
    const colIdx = Math.floor(daysDiff / 7)
    heatmapData.push([colIdx, rowIdx, uv])
    if (cursor.getDate() === 1) {
      const monthKey = cursor.getMonth() + 1
      if (!monthMarks[monthKey]) monthMarks[monthKey] = { col: colIdx, label: `${monthKey}月` }
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  const totalCols = Math.max(...heatmapData.map(d => d[0])) + 1
  const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return { heatmapData, monthMarks, totalCols, dayLabels }
}
const initHeatmap = async () => {
  heatmapLoading.value = true
  heatmapEmpty.value = false
  try {
    const today = new Date()
    const end = formatDate(today)
    const start = new Date(today)
    start.setFullYear(start.getFullYear() - 1)
    const startStr = formatDate(start)
    const res = await getDailyStats(startStr, end)
    const dailyStats = res.data || []
    const { heatmapData, monthMarks, totalCols, dayLabels } = generateHeatmapData(dailyStats)
    const maxUv = Math.max(...heatmapData.map(d => d[2]), 1)
    heatmapLoading.value = false
    await nextTick()
    if (!heatmapRef.value) return
    if (heatmapInstance) { heatmapInstance.dispose(); heatmapInstance = null }
    heatmapInstance = echarts.init(heatmapRef.value)
    const monthLabelData = new Array(totalCols).fill('')
    Object.values(monthMarks).forEach(m => { if (m.col < totalCols) monthLabelData[m.col] = m.label })
    const option = {
      tooltip: {
        backgroundColor: 'rgba(26, 16, 64, 0.95)', borderColor: '#7c3aed', borderWidth: 1,
        textStyle: { color: '#e9d5ff', fontSize: 12 },
        formatter: (params) => {
          if (params.value) {
            const [col, row, uv] = params.value
            const adjustedStart = new Date()
            adjustedStart.setFullYear(adjustedStart.getFullYear() - 1)
            adjustedStart.setDate(adjustedStart.getDate() + 1)
            const startDay = adjustedStart.getDay()
            const daysToMonday = startDay === 0 ? 6 : startDay - 1
            adjustedStart.setDate(adjustedStart.getDate() - daysToMonday)
            const date = new Date(adjustedStart)
            date.setDate(date.getDate() + col * 7 + row)
            return `<div style="font-weight:600;margin-bottom:4px">${formatDate(date)}</div><div>独立访客: ${uv} IP</div><div style="color:#a78bfa;font-size:11px">点击查看详情</div>`
          }
          return ''
        }
      },
      grid: { left: 60, right: 30, top: 44, bottom: 16 },
      xAxis: {
        type: 'category', data: monthLabelData,
        splitArea: { show: true, areaStyle: { color: ['rgba(15, 10, 46, 0.3)', 'rgba(15, 10, 46, 0.5)'] } },
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { fontSize: 11, color: '#a78bfa', margin: 8, interval: 0, overflow: 'truncate', width: 40 }
      },
      yAxis: {
        type: 'category', data: dayLabels,
        splitArea: { show: true, areaStyle: { color: ['rgba(15, 10, 46, 0.3)', 'rgba(15, 10, 46, 0.5)'] } },
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { fontSize: 11, color: '#a78bfa', margin: 8 },
        inverse: true
      },
      visualMap: {
        min: 0, max: maxUv, calculable: true, orient: 'horizontal', left: 'center', bottom: 0,
        itemWidth: 14, itemHeight: 10, textStyle: { color: '#a78bfa', fontSize: 11 },
        inRange: { color: ['#1e1b4b', '#4c1d95', '#6d28d9', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e9d5ff'] },
        pieces: [
          { min: maxUv * 0.8, color: '#e9d5ff' },
          { min: maxUv * 0.6, max: maxUv * 0.8 - 1, color: '#c4b5fd' },
          { min: maxUv * 0.4, max: maxUv * 0.6 - 1, color: '#a78bfa' },
          { min: maxUv * 0.2, max: maxUv * 0.4 - 1, color: '#8b5cf6' },
          { min: 1, max: maxUv * 0.2 - 1, color: '#6d28d9' },
          { value: 0, color: '#1e1b4b' }
        ], show: false
      },
      series: [{
        name: '访问热力图', type: 'heatmap', data: heatmapData, label: { show: false },
        emphasis: { itemStyle: { shadowBlur: 12, shadowColor: 'rgba(168, 85, 247, 0.6)', borderColor: '#a855f7', borderWidth: 1.5 } },
        itemStyle: { borderColor: 'rgba(15, 10, 46, 0.4)', borderWidth: 2, borderRadius: 2 }
      }]
    }
    heatmapInstance.setOption(option, true)
    heatmapInstance.off('click')
    heatmapInstance.on('click', async (params) => {
      if (params.value) {
        const [col, row] = params.value
        const adjustedStart = new Date()
        adjustedStart.setFullYear(adjustedStart.getFullYear() - 1)
        adjustedStart.setDate(adjustedStart.getDate() + 1)
        const startDay = adjustedStart.getDay()
        const daysToMonday = startDay === 0 ? 6 : startDay - 1
        adjustedStart.setDate(adjustedStart.getDate() - daysToMonday)
        const date = new Date(adjustedStart)
        date.setDate(date.getDate() + col * 7 + row)
        const dateStr = formatDate(date)
        await fetchIpDetail(dateStr)
      }
    })
  } catch (error) {
    console.error('获取热力图数据失败:', error)
    heatmapLoading.value = false
    await nextTick()
    if (heatmapRef.value) {
      if (heatmapInstance) { heatmapInstance.dispose(); heatmapInstance = null }
      heatmapInstance = echarts.init(heatmapRef.value)
      const { heatmapData, monthMarks, totalCols, dayLabels } = generateHeatmapData([])
      const monthLabelData = new Array(totalCols).fill('')
      Object.values(monthMarks).forEach(m => { if (m.col < totalCols) monthLabelData[m.col] = m.label })
      heatmapInstance.setOption({
        tooltip: { show: true },
        grid: { left: 60, right: 30, top: 44, bottom: 16 },
        xAxis: { type: 'category', data: monthLabelData, splitArea: { show: true }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 11, color: '#a78bfa' } },
        yAxis: { type: 'category', data: dayLabels, splitArea: { show: true }, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { fontSize: 11, color: '#a78bfa' }, inverse: true },
        visualMap: { min: 0, max: 1, show: false, inRange: { color: ['#1e1b4b'] } },
        series: [{ type: 'heatmap', data: heatmapData, itemStyle: { borderColor: 'rgba(15,10,46,0.4)', borderWidth: 2, borderRadius: 2 } }]
      })
    }
  }
}
const fetchIpDetail = async (date) => {
  ipDetailLoading.value = true
  showIpDetail.value = true
  ipDetailDate.value = date
  try {
    const res = await getIpDetail(date)
    ipDetailList.value = res.data || []
  } catch (error) {
    console.error('获取IP详情失败:', error)
    ipDetailList.value = []
  } finally {
    ipDetailLoading.value = false
  }
}
const closeIpDetail = () => { showIpDetail.value = false; ipDetailList.value = [] }
const handleHeatmapResize = () => { if (heatmapInstance) heatmapInstance.resize() }
const formatTimestamp = (ts) => {
  if (!ts) return '-'
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
const getPageName = (path) => ({ '/': '上座率对比', '/settings': '设置', '/h5': 'H5页面' })[path] || path
const getPageBadgeStyle = (page) => ({
  '/': 'bg-purple-700/40 text-purple-200',
  '/settings': 'bg-purple-700/40 text-purple-200',
  '/h5': 'bg-emerald-700/40 text-emerald-200'
}[page] || 'bg-purple-700/40 text-purple-200')

// ============== Tab1: 门店排序 ==============
const fetchStoreOrder = async () => {
  loading.value = true
  try {
    const res = await getStoreOrder()
    storeList.value = (res.data || []).sort((a, b) => a.order - b.order)
  } catch (error) {
    console.error('获取门店排序失败:', error)
    storeList.value = [
      { storeName: '吉姆电竞-尖草坪店', order: 1, isJim: true },
      { storeName: '吉姆电竞-经园路店', order: 2, isJim: true },
      { storeName: '闹他电竞（印象城店）', order: 3, isJim: false },
      { storeName: '小男孩电竞（依晨店）', order: 4, isJim: false },
    ]
  } finally {
    loading.value = false
  }
}
const saveOrder = async () => {
  saving.value = true
  try {
    const data = storeList.value.map((store, index) => ({
      storeName: store.storeName, order: index + 1, isJim: store.isJim || false
    }))
    await updateStoreOrder(data)
    toastSuccess()
  } catch (error) {
    console.error('保存失败:', error)
    toastError('保存失败，请重试')
  } finally { saving.value = false }
}
const requestReset = () => { showConfirmReset.value = true }
const confirmReset = async () => {
  showConfirmReset.value = false
  try {
    await resetStoreOrder()
    await fetchStoreOrder()
    toastSuccess()
  } catch (error) {
    console.error('重置失败:', error)
    toastError('重置失败，请重试')
  }
}
const cancelReset = () => { showConfirmReset.value = false }

// ============== Tab2: 区管理 ==============
const areas = ref([])
const areasLoading = ref(false)
const selectedAreaId = ref(null)
const selectedArea = computed(() => areas.value.find(a => a._id === selectedAreaId.value) || null)
const areaStoreListLocal = ref([]) // 区内门店本地拖拽顺序（不回写 DB order）

// —— 新增/编辑区弹窗
const showAreaModal = ref(false)
const areaModalMode = ref('create') // 'create' | 'edit'
const areaForm = reactiveSafe({ name: '', order: 1 })
function reactiveSafe(obj) { return ref({ ...obj }) }
const openCreateArea = () => {
  const realCount = areas.value.filter(a => !a.isVirtual).length
  areaModalMode.value = 'create'
  areaForm.value = { name: '', order: realCount + 1 }
  showAreaModal.value = true
}
const openEditArea = (area) => {
  areaModalMode.value = 'edit'
  areaForm.value = { _id: area._id, name: area.name, order: area.order }
  showAreaModal.value = true
}
const submitAreaModal = async () => {
  const name = String(areaForm.value.name || '').trim()
  if (!name) { toastError('请输入区名'); return }
  try {
    if (areaModalMode.value === 'create') {
      await createArea({ name, order: areaForm.value.order })
    } else {
      await updateArea(areaForm.value._id, { name, order: areaForm.value.order })
    }
    await refreshAreas(areaModalMode.value === 'create' ? undefined : selectedAreaId.value)
    toastSuccess()
    showAreaModal.value = false
  } catch (e) {
    console.error(e)
    toastError(e?.response?.data?.error || (areaModalMode.value === 'create' ? '创建失败' : '更新失败'))
  }
}

// —— 删除区确认
const showDeleteAreaConfirm = ref(false)
const deleteTarget = ref(null)
const openDeleteArea = (area) => { deleteTarget.value = area; showDeleteAreaConfirm.value = true }
const cancelDeleteArea = () => { showDeleteAreaConfirm.value = false; deleteTarget.value = null }
const confirmDeleteArea = async () => {
  if (!deleteTarget.value) return
  try {
    const res = await deleteArea(deleteTarget.value._id)
    const recycle = res?.storesRecycled ?? 0
    const wasSelected = selectedAreaId.value === deleteTarget.value._id
    await refreshAreas(wasSelected ? OTHER_AREA_ID : selectedAreaId.value)
    toastSuccess(recycle > 0 ? `删除成功，${recycle} 家门店已归入【其他】` : '删除成功')
    showDeleteAreaConfirm.value = false
    deleteTarget.value = null
  } catch (e) {
    console.error(e)
    toastError(e?.response?.data?.error || '删除失败')
  }
}

// —— 区列表刷新 + 区切换
const areaStoreOrderMap = computed(() => {
  // storeName → area name
  const m = {}
  for (const a of areas.value) {
    for (const s of (a.stores || [])) m[s.storeName] = a.name
  }
  return m
})

const refreshAreas = async (preserveId) => {
  areasLoading.value = true
  try {
    const res = await getAreaList()
    areas.value = (res?.data || []).map(a => ({
      ...a,
      stores: (a.stores || []).slice().sort((x, y) => (x.order ?? 0) - (y.order ?? 0))
    }))
  } catch (e) {
    console.error(e)
    areas.value = []
    toastError('加载区列表失败')
  } finally {
    areasLoading.value = false
  }
  const pick = areas.value.find(a => a._id === preserveId) ||
    areas.value.find(a => !a.isVirtual) ||
    areas.value[0] || null
  if (pick) selectArea(pick._id)
  else {
    selectedAreaId.value = null
    areaStoreListLocal.value = []
  }
}

const selectArea = (id) => {
  selectedAreaId.value = id
  const a = areas.value.find(x => x._id === id)
  areaStoreListLocal.value = a ? (a.stores || []).map(s => ({ ...s })) : []
}

// —— 添加门店弹窗
const showAddStoresModal = ref(false)
const addStoreSearch = ref('')
const addStoreSelected = ref([])
const allStoresCached = computed(() => storeList.value)
const addStoreFiltered = computed(() => {
  const q = addStoreSearch.value.trim().toLowerCase()
  if (!q) return allStoresCached.value
  return allStoresCached.value.filter(s => s.storeName.toLowerCase().includes(q))
})
const openAddStoresModal = async () => {
  if (!storeList.value?.length) await fetchStoreOrder()
  addStoreSearch.value = ''
  addStoreSelected.value = (selectedArea.value?.stores || []).map(s => s.storeName)
  showAddStoresModal.value = true
}
const toggleAddStore = (sn) => {
  const i = addStoreSelected.value.indexOf(sn)
  if (i > -1) addStoreSelected.value.splice(i, 1)
  else addStoreSelected.value.push(sn)
}
const toggleAddAllStores = () => {
  if (addStoreSelected.value.length === addStoreFiltered.value.length) addStoreSelected.value = []
  else addStoreSelected.value = addStoreFiltered.value.map(s => s.storeName)
}
const confirmAddStores = async () => {
  if (!selectedArea.value) return
  if (selectedArea.value.isVirtual) { toastError('【其他】区不支持手动添加，门店取消所属区后会自动归入【其他】'); return }
  try {
    const res = await setStoresForArea(selectedArea.value._id, addStoreSelected.value)
    if (res?.notFound?.length) console.warn('未找到门店:', res.notFound)
    await refreshAreas(selectedArea.value._id)
    toastSuccess(res?.added || res?.removed ? `新增 ${res.added ?? 0} 家 / 移出 ${res.removed ?? 0} 家` : '无变化')
    showAddStoresModal.value = false
  } catch (e) {
    console.error(e)
    toastError(e?.response?.data?.error || '保存失败')
  }
}

// —— 区内单门店 → 移出本区 → 归其他
const removeStoreFromArea = async (storeName) => {
  if (!selectedArea.value) return
  try {
    await moveStoreToArea(OTHER_AREA_ID, storeName)
    await refreshAreas(selectedArea.value._id)
    toastSuccess(`【${storeName}】已归入【其他】`)
  } catch (e) {
    toastError(e?.response?.data?.error || '移出失败')
  }
}

onMounted(() => {
  fetchStoreOrder()
  initHeatmap()
  refreshAreas()
  window.addEventListener('resize', handleHeatmapResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleHeatmapResize)
  if (heatmapInstance) { heatmapInstance.dispose(); heatmapInstance = null }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Title -->
    <div class="glass-card p-6 flex items-center justify-between relative overflow-hidden" style="border-top: 2px solid transparent; border-image: linear-gradient(90deg, transparent, #8b5cf6, transparent) 1;">
      <div>
        <h2 class="text-xl font-semibold tracking-wide section-title" style="color: #e0e0e0;">设置</h2>
        <p class="text-sm mt-1" style="color: #6b7fa3;">门店排序配置 · 区管理 · 访问统计</p>
      </div>
      <button @click="$router.push('/')" class="text-sm transition-colors" style="color: #8892a4;" onmouseover="this.style.color='#00ffff'" onmouseout="this.style.color='#8892a4'">← 返回上座率页面</button>
    </div>

    <!-- Success/Error Toast -->
    <div v-if="showSuccess" class="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium" style="color: #00ff88; background: rgba(0,255,136,0.1); border: 1px solid rgba(0,255,136,0.2);">
      <span>✓</span><span class="text-sm font-medium">操作成功！</span>
    </div>
    <div v-if="showError" class="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style="color: #ff4466; background: rgba(255,68,102,0.1); border: 1px solid rgba(255,68,102,0.2);">
      <div class="flex items-center gap-2"><span>✗</span><span class="font-medium">{{ errorMessage }}</span></div>
      <button @click="showError = false" class="text-xl transition-colors" style="color: #ff4466;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">&times;</button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 p-1 rounded-2xl w-fit" style="background: rgba(15,20,40,0.6); border: 1px solid rgba(0,255,255,0.1);">
      <button
        @click="activeTab = 'order'"
        class="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
        :style="activeTab === 'order' ? { background: 'rgba(0,255,255,0.1)', color: '#00ffff', border: '1px solid rgba(0,255,255,0.25)' } : { color: '#8892a4' }"
      >门店排序</button>
      <button
        @click="activeTab = 'area'"
        class="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
        :style="activeTab === 'area' ? { background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' } : { color: '#8892a4' }"
      >区管理</button>
    </div>

    <!-- ============= Tab1: 门店排序 ============= -->
    <div v-show="activeTab === 'order'">
      <!-- Description -->
      <div class="glass-card p-5">
        <h3 class="text-sm font-semibold mb-2" style="color: #e0e0e0;">门店排序设置</h3>
        <p class="text-sm" style="color: #6b7fa3;">拖拽门店条目可调整显示顺序，排序将应用于"网吧上座率"页面的门店列表。</p>
      </div>
      <div class="glass-card p-5 flex gap-4">
        <button @click="saveOrder" :disabled="saving" class="sci-btn-primary px-5 py-2.5 flex items-center gap-2 text-sm font-medium disabled:opacity-50">
          <span v-if="saving" class="animate-spin">⟳</span><span v-else>⟡</span>{{ saving ? '保存中...' : '保存排序' }}
        </button>
        <button @click="requestReset" class="sci-btn-ghost px-5 py-2.5 flex items-center gap-2 text-sm font-medium">↺ 重置为默认</button>
      </div>
      <div v-if="loading" class="text-center py-16 glass-card">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2" style="border-color: #00ffff;"></div>
        <p class="mt-3 text-sm" style="color: #6b7fa3;">加载中...</p>
      </div>
      <div v-else class="glass-card overflow-hidden">
        <table class="w-full text-sm sci-table">
          <thead>
            <tr style="background: rgba(0,255,255,0.04);">
              <th class="p-3 text-center font-medium">排序</th>
              <th class="p-3 text-left font-medium">门店名称</th>
              <th class="p-3 text-center font-medium">品牌</th>
              <th class="p-3 text-center font-medium">区</th>
              <th class="p-3 text-center font-medium">操作</th>
            </tr>
          </thead>
          <draggable v-model="storeList" tag="tbody" item-key="storeName">
            <template #item="{ element, index }">
              <tr class="border-b border-white/5 hover:bg-cyan-500/5 cursor-move transition-colors">
                <td class="p-3 text-center">
                  <div class="flex items-center justify-center gap-2"><span style="color: #4a5a7a;">⠿</span><span class="font-semibold" style="color: #c8d0e0;">{{ index + 1 }}</span></div>
                </td>
                <td class="p-3" style="color: #c8d0e0;">{{ element.storeName }}</td>
                <td class="p-3 text-center">
                  <span class="px-3 py-1 rounded-full text-xs font-medium" :class="element.isJim ? 'badge-jim' : 'badge-other'">{{ element.isJim ? '吉姆电竞' : '其他' }}</span>
                </td>
                <td class="p-3 text-center">
                  <span class="px-2 py-0.5 rounded-md text-[11px]" style="background: rgba(139,92,246,0.1); color: #a78bfa; border: 1px solid rgba(139,92,246,0.2);">{{ areaStoreOrderMap[element.storeName] || '其他' }}</span>
                </td>
                <td class="p-3 text-center" style="color: #4a5a7a;"><span class="text-lg">⋮⋮</span></td>
              </tr>
            </template>
          </draggable>
        </table>
      </div>
    </div>

    <!-- ============= Tab2: 区管理 ============= -->
    <div v-show="activeTab === 'area'">
      <div class="glass-card overflow-hidden">
        <div class="flex h-[620px]">
          <!-- 左：区列表 -->
          <div class="w-72 shrink-0 flex flex-col" style="border-right: 1px solid rgba(0,255,255,0.08); background: rgba(8,12,24,0.4);">
            <div class="p-4 flex items-center justify-between" style="border-bottom: 1px solid rgba(0,255,255,0.08);">
              <div class="font-semibold" style="color: #e0e0e0;">区列表</div>
              <button @click="openCreateArea" class="sci-btn-primary px-3 py-1.5 text-xs">+ 新增区</button>
            </div>
            <div v-if="areasLoading" class="flex-1 flex items-center justify-center">
              <div class="w-6 h-6 border-2 border-purple-500 border-b-transparent rounded-full animate-spin"></div>
            </div>
            <div v-else class="flex-1 overflow-auto p-2 space-y-1">
              <div
                v-for="a in areas" :key="a._id"
                @click="selectArea(a._id)"
                class="group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm"
                :style="selectedAreaId === a._id ? { background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.35)' } : { color: '#8892a4', border: '1px solid transparent' }"
                :title="a.isVirtual ? '未分配到任何区的门店，自动归入【其他】' : ''"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-base">{{ a.isVirtual ? '⬜' : '🟦' }}</span>
                  <span class="font-medium truncate">{{ a.name }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-[11px] px-2 py-0.5 rounded-full shrink-0" style="background: rgba(255,255,255,0.04); color: #5a6a8a;">({{ a.stores?.length || 0 }})</span>
                  <div class="hidden group-hover:flex items-center gap-0.5" @click.stop>
                    <button @click.stop="openEditArea(a)" class="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/5" :style="a.isVirtual ? 'opacity:0.3; cursor:not-allowed' : ''" title="编辑">✏️</button>
                    <button v-if="!a.isVirtual" @click.stop="openDeleteArea(a)" class="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/5" title="删除">🗑</button>
                  </div>
                </div>
              </div>
              <div v-if="areas.length === 0" class="text-center text-xs py-10" style="color: #5a6a8a;">暂无区，点击「+ 新增区」开始</div>
            </div>
          </div>
          <!-- 右：门店分配 -->
          <div class="flex-1 flex flex-col min-w-0">
            <div class="p-4 flex items-center justify-between" style="border-bottom: 1px solid rgba(0,255,255,0.08);">
              <div>
                <div class="font-semibold text-base" style="color: #e0e0e0;">
                  【{{ selectedArea?.name || '-' }}】门店分配
                </div>
                <div class="text-xs mt-0.5" style="color: #6b7fa3;">
                  共 <span class="font-semibold" style="color: #a78bfa;">{{ areaStoreListLocal.length }}</span> 家
                  <span v-if="selectedArea?.isVirtual" class="ml-2" style="color: #ffaa00;">● 虚拟区，门店取消所属区后会自动归入此处</span>
                </div>
              </div>
              <div class="flex gap-2">
                <button
                  @click="openAddStoresModal"
                  :disabled="!selectedArea || selectedArea?.isVirtual"
                  class="sci-btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 disabled:opacity-40"
                  :title="selectedArea?.isVirtual ? '【其他】区不支持手动添加：取消门店所属区后会自动归入' : ''"
                >＋ 添加已有门店</button>
              </div>
            </div>
            <div class="flex-1 overflow-auto p-4">
              <div v-if="!selectedArea" class="h-full flex flex-col items-center justify-center text-sm gap-3" style="color: #5a6a8a;">
                <span class="text-4xl opacity-20">🗂️</span><span>请从左侧选择一个区</span>
              </div>
              <div v-else-if="areaStoreListLocal.length === 0" class="h-full flex flex-col items-center justify-center text-sm gap-3" style="color: #5a6a8a;">
                <span class="text-4xl opacity-20">🏪</span>
                <span>{{ selectedArea.isVirtual ? '当前【其他】区无门店' : '本区暂无门店，点击右上角「＋ 添加已有门店」开始' }}</span>
              </div>
              <draggable v-else v-model="areaStoreListLocal" tag="div" item-key="storeName" handle=".drag-handle" class="space-y-2">
                <template #item="{ element, index }">
                  <div class="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors group" style="background: rgba(15,22,45,0.6); border: 1px solid rgba(139,92,246,0.12);">
                    <span class="drag-handle text-base cursor-move shrink-0" style="color: #4a5a7a;">⠿</span>
                    <span class="text-xs w-6 text-center shrink-0 font-semibold" style="color: #8b5cf6;">{{ index + 1 }}</span>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-medium truncate" style="color: #e0e0e0;">{{ element.storeName }}</span>
                        <span class="px-2 py-0.5 rounded-full text-[11px]" :class="element.isJim ? 'badge-jim' : 'badge-other'">{{ element.isJim ? '吉姆电竞' : '其他' }}</span>
                      </div>
                      <div class="text-xs mt-1" style="color: #5a6a8a;">order: {{ element.order ?? '-' }}</div>
                    </div>
                    <button
                      @click="removeStoreFromArea(element.storeName)"
                      class="px-3 py-1.5 rounded-lg text-xs transition-all opacity-80 hover:opacity-100"
                      style="background: rgba(255,68,102,0.1); color: #ff8aa0; border: 1px solid rgba(255,68,102,0.2);"
                      :title="selectedArea?.isVirtual ? '从「其他」移出没有意义；如需分配，请直接在对应区使用「＋ 添加已有门店」' : `移出本区 → 归入【其他】`"
                    >移出本区</button>
                  </div>
                </template>
              </draggable>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ============= 访问热力墙（始终展示） ============= -->
    <div class="relative overflow-hidden rounded-2xl shadow-xl" style="background: linear-gradient(135deg, #0f0a2e 0%, #1a1040 50%, #0f0a2e 100%);">
      <div class="absolute inset-0 opacity-5" style="background: radial-gradient(circle at 20% 50%, #a855f7 0%, transparent 50%), radial-gradient(circle at 80% 50%, #6d28d9 0%, transparent 50%);"></div>
      <div class="relative p-6 pb-2">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-xl font-semibold text-white tracking-wide">访问热力墙</h2>
            <p class="text-purple-300 text-sm mt-1">最近一年网站日访问量统计 · 按独立IP去重</p>
          </div>
        </div>
      </div>
      <div class="relative px-4 pb-4">
        <div v-if="heatmapLoading" class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3">
            <div class="w-8 h-8 border-2 border-purple-500 border-b-transparent rounded-full animate-spin"></div>
            <span class="text-purple-300 text-sm">加载中...</span>
          </div>
        </div>
        <div v-else-if="heatmapEmpty" class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3">
            <div class="w-14 h-14 rounded-2xl bg-purple-900/20 flex items-center justify-center"><span class="text-2xl text-purple-400/50">📊</span></div>
            <span class="text-purple-300/60 text-sm">暂无访问数据</span>
            <span class="text-purple-400/40 text-xs">数据收集后将自动展示</span>
          </div>
        </div>
        <div v-else>
          <div ref="heatmapRef" class="w-full" style="height: 240px;"></div>
          <div class="flex items-center justify-center gap-3 pt-3 pb-1">
            <span class="text-xs text-purple-300/60">少</span>
            <div class="flex gap-1">
              <div class="w-3 h-3 rounded-sm" style="background: #1e1b4b;"></div>
              <div class="w-3 h-3 rounded-sm" style="background: #4c1d95;"></div>
              <div class="w-3 h-3 rounded-sm" style="background: #6d28d9;"></div>
              <div class="w-3 h-3 rounded-sm" style="background: #8b5cf6;"></div>
              <div class="w-3 h-3 rounded-sm" style="background: #a78bfa;"></div>
              <div class="w-3 h-3 rounded-sm" style="background: #c4b5fd;"></div>
              <div class="w-3 h-3 rounded-sm" style="background: #e9d5ff;"></div>
            </div>
            <span class="text-xs text-purple-300/60">多</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 弹窗：新增/编辑区 ========== -->
    <div v-if="showAreaModal" class="fixed inset-0 flex items-center justify-center z-50" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);" @click.self="showAreaModal = false">
      <div class="rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" style="background: rgba(15,22,45,0.98); border: 1px solid rgba(0,255,255,0.2);">
        <h3 class="text-lg font-semibold mb-5" style="color: #e0e0e0;">{{ areaModalMode === 'create' ? '新增区' : '编辑区' }}</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-medium mb-2" style="color: #6b7fa3;">区名 *</label>
            <input v-model="areaForm.name" type="text" placeholder="如：小店区 / 大店区" class="sci-input w-full px-4 py-2.5 rounded-xl text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-2" style="color: #6b7fa3;">排序（越小越靠前）</label>
            <input v-model.number="areaForm.order" type="number" class="sci-input w-full px-4 py-2.5 rounded-xl text-sm" />
          </div>
        </div>
        <div class="flex gap-3 justify-end mt-6">
          <button @click="showAreaModal = false" class="sci-btn-ghost px-5 py-2.5 text-sm font-medium">取消</button>
          <button @click="submitAreaModal" class="sci-btn-primary px-5 py-2.5 text-sm font-medium">{{ areaModalMode === 'create' ? '创建' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- ========== 弹窗：确认删除区 ========== -->
    <div v-if="showDeleteAreaConfirm" class="fixed inset-0 flex items-center justify-center z-50" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);">
      <div class="rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" style="background: rgba(15,22,45,0.98); border: 1px solid rgba(255,68,102,0.3);">
        <h3 class="text-lg font-semibold mb-2" style="color: #e0e0e0;">确认删除区</h3>
        <p class="text-sm mb-6" style="color: #6b7fa3;">
          确定要删除 <span class="font-semibold" style="color: #ff4466;">「{{ deleteTarget?.name }}」</span> 吗？<br/>
          该区下 <span class="font-semibold" style="color: #ffaa00;">{{ deleteTarget?.stores?.length || 0 }} 家门店</span> 将自动归入【其他】区。<br/>
          此操作不可撤销。
        </p>
        <div class="flex gap-3 justify-end">
          <button @click="cancelDeleteArea" class="sci-btn-ghost px-5 py-2.5 text-sm font-medium">取消</button>
          <button @click="confirmDeleteArea" class="px-5 py-2.5 rounded-xl text-sm font-medium transition-all" style="background: rgba(255,68,102,0.2); color: #ff4466; border: 1px solid rgba(255,68,102,0.3);">确认删除</button>
        </div>
      </div>
    </div>

    <!-- ========== 弹窗：添加门店到区 ========== -->
    <div v-if="showAddStoresModal" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="showAddStoresModal = false">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div class="relative rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" style="background: linear-gradient(135deg, #1a1040, #0f0a2e); border: 1px solid rgba(139,92,246,0.3);">
        <div class="px-5 py-4 border-b border-purple-700/30 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-white">添加门店到【{{ selectedArea?.name }}】</h3>
            <p class="text-purple-300/60 text-xs mt-0.5">勾选后将把选中门店整体移动到此区（若原属其他区会自动从旧区移除）</p>
          </div>
          <button @click="showAddStoresModal = false" class="w-8 h-8 rounded-lg bg-purple-800/30 hover:bg-purple-700/40 text-purple-300 hover:text-white flex items-center justify-center transition-all"><span class="text-lg leading-none">&times;</span></button>
        </div>
        <div class="px-5 py-3" style="border-bottom: 1px solid rgba(139,92,246,0.15);">
          <input v-model="addStoreSearch" type="text" placeholder="搜索门店名称..." class="sci-input w-full px-4 py-2 text-sm rounded-xl" />
        </div>
        <div class="px-5 py-3 flex items-center justify-between" style="border-bottom: 1px solid rgba(139,92,246,0.15);">
          <button @click="toggleAddAllStores" class="text-sm font-medium hover:opacity-80" style="color: #c4b5fd;">
            {{ addStoreSelected.length === addStoreFiltered.length ? '取消全选' : '全选' }}
          </button>
          <span class="text-xs" style="color: #5a6a8a;">已选 {{ addStoreSelected.length }} / {{ allStoresCached.length }}</span>
        </div>
        <div class="max-h-72 overflow-y-auto space-y-0.5 px-2 py-2">
          <label v-for="s in addStoreFiltered" :key="s.storeName" class="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg text-sm transition-colors hover:bg-white/5">
            <input type="checkbox" :checked="addStoreSelected.includes(s.storeName)" @change="toggleAddStore(s.storeName)" class="w-4 h-4 rounded" style="accent-color: #a78bfa;" />
            <div class="min-w-0 flex-1 flex items-center gap-2">
              <span :style="s.isJim ? 'color: #00ffff; font-weight: 500;' : 'color: #c8d0e0;'" class="truncate">{{ s.storeName }}</span>
              <span class="px-1.5 py-0.5 rounded-md text-[10px] shrink-0" style="background: rgba(139,92,246,0.12); color: #a78bfa; border: 1px solid rgba(139,92,246,0.2);">
                {{ areaStoreOrderMap[s.storeName] || '其他' }}
              </span>
            </div>
          </label>
          <div v-if="addStoreFiltered.length === 0" class="p-4 text-center text-sm" style="color: #5a6a8a;">未找到匹配的门店</div>
        </div>
        <div class="px-5 py-4 flex justify-end gap-3" style="border-top: 1px solid rgba(139,92,246,0.15);">
          <button @click="showAddStoresModal = false" class="sci-btn-ghost px-5 py-2 text-sm font-medium">取消</button>
          <button @click="confirmAddStores" class="sci-btn-primary px-5 py-2 text-sm font-medium">确认保存</button>
        </div>
      </div>
    </div>

    <!-- ============= 其他公共弹窗 ============= -->
    <div v-if="showConfirmReset" class="fixed inset-0 flex items-center justify-center z-50" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);">
      <div class="rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" style="background: rgba(15,22,45,0.98); border: 1px solid rgba(255,68,102,0.3);">
        <h3 class="text-lg font-semibold mb-2" style="color: #e0e0e0;">确认重置</h3>
        <p class="text-sm mb-6" style="color: #6b7fa3;">确定要重置为默认排序吗？此操作不可撤销。</p>
        <div class="flex gap-4 justify-end">
          <button @click="cancelReset" class="sci-btn-ghost px-5 py-2.5 text-sm font-medium">取消</button>
          <button @click="confirmReset" class="px-5 py-2.5 rounded-xl text-sm font-medium transition-all" style="background: rgba(255,68,102,0.2); color: #ff4466; border: 1px solid rgba(255,68,102,0.3);">确认重置</button>
        </div>
      </div>
    </div>

    <div v-if="showIpDetail" class="fixed inset-0 z-50 flex items-center justify-center" @click.self="closeIpDetail">
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div class="relative rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" style="background: linear-gradient(135deg, #1a1040, #0f0a2e);">
        <div class="px-5 py-4 border-b border-purple-700/30 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-white">{{ ipDetailDate }}</h3>
            <p class="text-purple-300/60 text-xs mt-0.5">IP 访问详情</p>
          </div>
          <button @click="closeIpDetail" class="w-8 h-8 rounded-lg bg-purple-800/30 hover:bg-purple-700/40 text-purple-300 hover:text-white flex items-center justify-center transition-all"><span class="text-lg leading-none">&times;</span></button>
        </div>
        <div class="px-5 py-4 max-h-80 overflow-y-auto space-y-2">
          <div v-if="ipDetailLoading" class="flex items-center justify-center py-8">
            <div class="w-6 h-6 border-2 border-purple-500 border-b-transparent rounded-full animate-spin"></div>
          </div>
          <div v-else-if="ipDetailList.length === 0" class="flex flex-col items-center py-8"><span class="text-purple-400/50 text-sm">当天无访问记录</span></div>
          <div v-for="(item, idx) in ipDetailList" :key="idx" class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-purple-800/20">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-purple-200 truncate">{{ item.ip }}</span>
                <span class="px-1.5 py-0.5 rounded-md text-xs font-medium shrink-0" :class="getPageBadgeStyle(item.page)">{{ getPageName(item.page) }}</span>
              </div>
              <div class="text-xs text-purple-400/60 mt-0.5">{{ formatTimestamp(item.timestamp) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
