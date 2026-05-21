<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { getStoreOrder, updateStoreOrder, resetStoreOrder } from '../api/onlineRate'
import { getDailyStats, getIpDetail } from '../api/visitLog'
import draggable from 'vuedraggable'
import * as echarts from 'echarts'

const storeList = ref([])
const loading = ref(false)
const saving = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const showConfirmReset = ref(false)

// ===== 热力墙相关状态 =====
const heatmapRef = ref(null)
const heatmapLoading = ref(false)
const heatmapEmpty = ref(false)
let heatmapInstance = null
const showIpDetail = ref(false)
const ipDetailDate = ref('')
const ipDetailList = ref([])
const ipDetailLoading = ref(false)

// 格式化日期为 YYYY-MM-DD
const formatDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 生成热力图数据
const generateHeatmapData = (dailyStats) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const endDate = new Date(today)
  const startDate = new Date(today)
  startDate.setFullYear(startDate.getFullYear() - 1)
  startDate.setDate(startDate.getDate() + 1) // 从一年前的明天开始
  
  // 建立 uv 查找表
  const uvMap = {}
  dailyStats.forEach(d => { uvMap[d.date] = d.uv })

  // 调整起始日期为该周的周一
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
    const currentDay = cursor.getDay() // 0=Sun
    const rowIdx = currentDay === 0 ? 6 : currentDay - 1
    const msDiff = cursor.getTime() - adjustedStart.getTime()
    const daysDiff = Math.floor(msDiff / 86400000)
    const colIdx = Math.floor(daysDiff / 7)
    
    heatmapData.push([colIdx, rowIdx, uv])
    
    // 记录每月1号所在的列
    if (cursor.getDate() === 1) {
      const monthKey = cursor.getMonth() + 1
      if (!monthMarks[monthKey]) {
        monthMarks[monthKey] = { col: colIdx, label: `${monthKey}月` }
      }
    }
    
    cursor.setDate(cursor.getDate() + 1)
  }

  const totalCols = Math.max(...heatmapData.map(d => d[0])) + 1
  const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  return { heatmapData, monthMarks, totalCols, dayLabels }
}

// 初始化热力图
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

    // 即使无数据也渲染完整热力图（uv 全为 0，显示空格子）
    const { heatmapData, monthMarks, totalCols, dayLabels } = generateHeatmapData(dailyStats)
    const maxUv = Math.max(...heatmapData.map(d => d[2]), 1)

    // 先关闭 loading 让 v-else 分支的 heatmapRef DOM 挂载到页面
    heatmapLoading.value = false
    await nextTick()
    if (!heatmapRef.value) {
      console.error('heatmapRef DOM 未找到')
      return
    }

    if (heatmapInstance) {
      heatmapInstance.dispose()
      heatmapInstance = null
    }
    heatmapInstance = echarts.init(heatmapRef.value)

    // 月份标签数据处理
    const monthLabelData = new Array(totalCols).fill('')
    Object.values(monthMarks).forEach(m => {
      if (m.col < totalCols) {
        monthLabelData[m.col] = m.label
      }
    })

    const option = {
      tooltip: {
        backgroundColor: 'rgba(26, 16, 64, 0.95)',
        borderColor: '#7c3aed',
        borderWidth: 1,
        textStyle: { color: '#e9d5ff', fontSize: 12 },
        formatter: (params) => {
          if (params.value) {
            const [col, row, uv] = params.value
            // 反推日期
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
      grid: {
        left: 60,
        right: 30,
        top: 44,
        bottom: 16,
      },
      xAxis: {
        type: 'category',
        data: monthLabelData,
        splitArea: { show: true, areaStyle: { color: ['rgba(15, 10, 46, 0.3)', 'rgba(15, 10, 46, 0.5)'] } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 11,
          color: '#a78bfa',
          margin: 8,
          interval: 0,
          overflow: 'truncate',
          width: 40,
        },
      },
      yAxis: {
        type: 'category',
        data: dayLabels,
        splitArea: { show: true, areaStyle: { color: ['rgba(15, 10, 46, 0.3)', 'rgba(15, 10, 46, 0.5)'] } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 11,
          color: '#a78bfa',
          margin: 8,
        },
        inverse: true,
      },
      visualMap: {
        min: 0,
        max: maxUv,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 0,
        itemWidth: 14,
        itemHeight: 10,
        textStyle: { color: '#a78bfa', fontSize: 11 },
        inRange: {
          color: ['#1e1b4b', '#4c1d95', '#6d28d9', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e9d5ff']
        },
        pieces: [
          { min: maxUv * 0.8, color: '#e9d5ff' },
          { min: maxUv * 0.6, max: maxUv * 0.8 - 1, color: '#c4b5fd' },
          { min: maxUv * 0.4, max: maxUv * 0.6 - 1, color: '#a78bfa' },
          { min: maxUv * 0.2, max: maxUv * 0.4 - 1, color: '#8b5cf6' },
          { min: 1, max: maxUv * 0.2 - 1, color: '#6d28d9' },
          { value: 0, color: '#1e1b4b' },
        ],
        show: false,
      },
      series: [{
        name: '访问热力图',
        type: 'heatmap',
        data: heatmapData,
        label: { show: false },
        emphasis: {
          itemStyle: {
            shadowBlur: 12,
            shadowColor: 'rgba(168, 85, 247, 0.6)',
            borderColor: '#a855f7',
            borderWidth: 1.5,
          }
        },
        itemStyle: {
          borderColor: 'rgba(15, 10, 46, 0.4)',
          borderWidth: 2,
          borderRadius: 2,
        }
      }]
    }

    heatmapInstance.setOption(option, true)

    // 点击事件：显示IP详情
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

    heatmapLoading.value = false
  } catch (error) {
    console.error('获取热力图数据失败:', error)
    // API 失败时也渲染空白热力图
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

// 获取IP详情
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

// 关闭IP详情弹层
const closeIpDetail = () => {
  showIpDetail.value = false
  ipDetailList.value = []
}

// 处理窗口resize
const handleHeatmapResize = () => {
  if (heatmapInstance) {
    heatmapInstance.resize()
  }
}

// 获取页面中文名
const getPageName = (path) => {
  const map = {
    '/': '上座率对比',
    '/settings': '设置',
    '/h5': 'H5页面',
  }
  return map[path] || path
}

// 格式化时间戳
const formatTimestamp = (ts) => {
  if (!ts) return '-'
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// 获取页面标签样式
const getPageBadgeStyle = (page) => {
  const styles = {
    '/': 'bg-purple-700/40 text-purple-200',
    '/settings': 'bg-purple-700/40 text-purple-200',
    '/h5': 'bg-emerald-700/40 text-emerald-200',
  }
  return styles[page] || 'bg-purple-700/40 text-purple-200'
}

// 获取门店排序配置
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

// 保存排序
const saveOrder = async () => {
  saving.value = true
  try {
    const data = storeList.value.map((store, index) => ({
      storeName: store.storeName,
      order: index + 1,
      isJim: store.isJim || false
    }))
    await updateStoreOrder(data)
    showSuccess.value = true
    setTimeout(() => { showSuccess.value = false }, 3000)
  } catch (error) {
    console.error('保存失败:', error)
    errorMessage.value = '保存失败，请重试'
    showError.value = true
  } finally {
    saving.value = false
  }
}

// 请求重置
const requestReset = () => {
  showConfirmReset.value = true
}

// 确认重置
const confirmReset = async () => {
  showConfirmReset.value = false
  try {
    await resetStoreOrder()
    await fetchStoreOrder()
    showSuccess.value = true
    setTimeout(() => { showSuccess.value = false }, 3000)
  } catch (error) {
    console.error('重置失败:', error)
    errorMessage.value = '重置失败，请重试'
    showError.value = true
  }
}

// 取消重置
const cancelReset = () => {
  showConfirmReset.value = false
}

onMounted(() => {
  fetchStoreOrder()
  initHeatmap()
  window.addEventListener('resize', handleHeatmapResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleHeatmapResize)
  if (heatmapInstance) {
    heatmapInstance.dispose()
    heatmapInstance = null
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Title -->
    <div class="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl shadow-lg p-6 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-white tracking-wide">设置</h2>
        <p class="text-slate-300 text-sm mt-1">门店排序配置 · 访问统计</p>
      </div>
      <button 
        @click="$router.push('/')"
        class="text-sm text-slate-300 hover:text-white transition-colors"
      >
        ← 返回上座率页面
      </button>
    </div>

    <!-- Success Message -->
    <div 
      v-if="showSuccess" 
      class="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2"
    >
      <span>✓</span>
      <span class="text-sm font-medium">操作成功！</span>
    </div>

    <!-- Error Message -->
    <div 
      v-if="showError" 
      class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <span>✗</span>
        <span class="text-sm font-medium">{{ errorMessage }}</span>
      </div>
      <button 
        @click="showError = false"
        class="text-red-400 hover:text-red-600 transition-colors"
      >
        <span class="text-xl">&times;</span>
      </button>
    </div>

    <!-- ======== 访问热力墙 ======== -->
    <div class="relative overflow-hidden rounded-2xl shadow-xl" style="background: linear-gradient(135deg, #0f0a2e 0%, #1a1040 50%, #0f0a2e 100%);">
      <!-- 装饰背景 -->
      <div class="absolute inset-0 opacity-5" style="background: radial-gradient(circle at 20% 50%, #a855f7 0%, transparent 50%), radial-gradient(circle at 80% 50%, #6d28d9 0%, transparent 50%);"></div>
      
      <div class="relative p-6 pb-2">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-xl font-semibold text-white tracking-wide">访问热力墙</h2>
            <p class="text-purple-300 text-sm mt-1">最近一年网站日访问量统计 · 按独立IP去重</p>
          </div>
          <div class="flex items-center gap-2 text-xs text-purple-400/70">
            <span>总记录</span>
            <span class="text-white font-semibold">{{ heatmapEmpty ? '0' : '-' }} IP</span>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="relative px-4 pb-4">
        <!-- 加载中 -->
        <div v-if="heatmapLoading" class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3">
            <div class="w-8 h-8 border-2 border-purple-500 border-b-transparent rounded-full animate-spin"></div>
            <span class="text-purple-300 text-sm">加载中...</span>
          </div>
        </div>

        <!-- 空数据 -->
        <div v-else-if="heatmapEmpty" class="flex items-center justify-center py-20">
          <div class="flex flex-col items-center gap-3">
            <div class="w-14 h-14 rounded-2xl bg-purple-900/20 flex items-center justify-center">
              <span class="text-2xl text-purple-400/50">📊</span>
            </div>
            <span class="text-purple-300/60 text-sm">暂无访问数据</span>
            <span class="text-purple-400/40 text-xs">数据收集后将自动展示</span>
          </div>
        </div>

        <!-- 热力图 -->
        <div v-else>
          <div ref="heatmapRef" class="w-full" style="height: 240px;"></div>
          
          <!-- 图例 -->
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
    <!-- ======== 访问热力墙 END ======== -->

    <!-- Description -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <h3 class="text-sm font-semibold text-slate-700 mb-2">门店排序设置</h3>
      <p class="text-sm text-gray-500">拖拽门店条目可调整显示顺序，排序将应用于"网吧上座率"页面的门店列表。</p>
    </div>

    <!-- Action Buttons -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex gap-4">
      <button
        @click="saveOrder"
        :disabled="saving"
        class="px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 disabled:opacity-50 flex items-center gap-2 text-sm font-medium transition-all shadow-sm"
      >
        <span v-if="saving" class="animate-spin">⟳</span>
        <span v-else>⟡</span>
        {{ saving ? '保存中...' : '保存排序' }}
      </button>
      <button
        @click="requestReset"
        class="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 flex items-center gap-2 text-sm font-medium transition-all"
      >
        ↺ 重置为默认
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
      <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-slate-700"></div>
      <p class="mt-3 text-gray-400 text-sm">加载中...</p>
    </div>

    <!-- Sortable List -->
    <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <th class="p-3 text-center font-medium">排序</th>
            <th class="p-3 text-left font-medium">门店名称</th>
            <th class="p-3 text-center font-medium">品牌</th>
            <th class="p-3 text-center font-medium">操作</th>
          </tr>
        </thead>
        <draggable
          v-model="storeList"
          tag="tbody"
          item-key="storeName"
        >
          <template #item="{ element, index }">
            <tr class="border-b border-gray-50 hover:bg-slate-50/50 cursor-move transition-colors">
              <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-2">
                  <span class="text-slate-300">⠿</span>
                  <span class="font-semibold text-slate-700">{{ index + 1 }}</span>
                </div>
              </td>
              <td class="p-3 text-slate-700">{{ element.storeName }}</td>
              <td class="p-3 text-center">
                <span
                  class="px-3 py-1 rounded-full text-xs font-medium"
                  :class="element.isJim ? 'bg-slate-100 text-slate-700' : 'bg-gray-100 text-gray-600'"
                >
                  {{ element.isJim ? '吉姆电竞' : '其他' }}
                </span>
              </td>
              <td class="p-3 text-center text-slate-300">
                <span class="text-lg">⋮⋮</span>
              </td>
            </tr>
          </template>
        </draggable>
      </table>
    </div>

    <!-- Confirm Reset Modal -->
    <div 
      v-if="showConfirmReset" 
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h3 class="text-lg font-semibold text-slate-800 mb-2">确认重置</h3>
        <p class="text-gray-500 text-sm mb-6">确定要重置为默认排序吗？此操作不可撤销。</p>
        <div class="flex gap-4 justify-end">
          <button 
            @click="cancelReset"
            class="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-medium"
          >
            取消
          </button>
          <button 
            @click="confirmReset"
            class="px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all text-sm font-medium shadow-sm"
          >
            确认重置
          </button>
        </div>
      </div>
    </div>

    <!-- IP详情弹层 -->
    <div 
      v-if="showIpDetail"
      class="fixed inset-0 z-50 flex items-center justify-center"
      @click.self="closeIpDetail"
    >
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div class="relative rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" style="background: linear-gradient(135deg, #1a1040, #0f0a2e);">
        <!-- 头部 -->
        <div class="px-5 py-4 border-b border-purple-700/30 flex items-center justify-between">
          <div>
            <h3 class="text-base font-semibold text-white">{{ ipDetailDate }}</h3>
            <p class="text-purple-300/60 text-xs mt-0.5">IP 访问详情</p>
          </div>
          <button 
            @click="closeIpDetail"
            class="w-8 h-8 rounded-lg bg-purple-800/30 hover:bg-purple-700/40 text-purple-300 hover:text-white flex items-center justify-center transition-all"
          >
            <span class="text-lg leading-none">&times;</span>
          </button>
        </div>

        <!-- 内容 -->
        <div class="px-5 py-4 max-h-80 overflow-y-auto space-y-2">
          <!-- 加载中 -->
          <div v-if="ipDetailLoading" class="flex items-center justify-center py-8">
            <div class="w-6 h-6 border-2 border-purple-500 border-b-transparent rounded-full animate-spin"></div>
          </div>

          <!-- 空 -->
          <div v-else-if="ipDetailList.length === 0" class="flex flex-col items-center py-8">
            <span class="text-purple-400/50 text-sm">当天无访问记录</span>
          </div>

          <!-- IP列表 -->
          <div 
            v-for="(item, idx) in ipDetailList" 
            :key="idx"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-purple-800/20"
          >
            <!-- IP -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-purple-200 truncate">{{ item.ip }}</span>
                <span class="px-1.5 py-0.5 rounded-md text-xs font-medium shrink-0" :class="getPageBadgeStyle(item.page)">{{ getPageName(item.page) }}</span>
              </div>
              <div class="text-xs text-purple-400/60 mt-0.5">
                {{ formatTimestamp(item.timestamp) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
