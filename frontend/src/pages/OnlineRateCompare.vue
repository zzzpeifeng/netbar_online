<script setup>
import { ref, onMounted, watch, computed, onUnmounted, nextTick } from 'vue'
import { getAvailableDates, getOnlineRateData, getStoreOrder } from '../api/onlineRate'
import { getAreaList, OTHER_AREA_ID } from '../api/area'
import * as echarts from 'echarts'

const availableDates = ref([])
const selectedDate = ref('')
const tableData = ref([])
const loading = ref(false)
const chartRef = ref(null)
let chartInstance = null
const storeOrderList = ref([]) // 门店排序配置

// ========== 区筛选 ==========
const areas = ref([])
const areasLoading = ref(false)
const showAreaFilter = ref(false)
const selectedAreas = ref([]) // 选中的区ID数组；空数组表示不按区筛选（全部区）
const areaFilterButton = ref(null)
const areaFilterDropdown = ref(null)
// 门店名归一化：去除所有空白字符，解决 "吉姆电竞- 尖" vs "吉姆电竞-尖" 不一致
const normalizeName = (name) => (name || '').replace(/\s+/g, '')
// 门店名 → 区信息映射 { areaId, areaName }（key 为归一化名）
const storeToAreaMap = computed(() => {
  const m = {}
  for (const a of areas.value) {
    for (const s of (a.stores || [])) {
      m[normalizeName(s.storeName)] = { areaId: a._id, areaName: a.name }
    }
  }
  return m
})
// 选中区所包含的门店名称集合（空选中表示全部区 → 全集）
const areaAllowedStoreNames = computed(() => {
  if (selectedAreas.value.length === 0) return null
  const set = new Set()
  for (const aid of selectedAreas.value) {
    const a = areas.value.find(x => x._id === aid)
    if (a) for (const s of (a.stores || [])) set.add(normalizeName(s.storeName))
  }
  return set
})
// 门店是否在区筛选允许范围内
const isStoreAllowedByArea = (storeName) => {
  const allowed = areaAllowedStoreNames.value
  if (!allowed) return true
  return allowed.has(normalizeName(storeName))
}
// 拉取区列表
const fetchAreas = async () => {
  areasLoading.value = true
  try {
    const res = await getAreaList()
    areas.value = res?.data || []
  } catch (e) {
    console.error('拉取区列表失败:', e)
    areas.value = []
  } finally {
    areasLoading.value = false
  }
}
// 区筛选：切换区选中
const toggleArea = (areaId) => {
  const i = selectedAreas.value.indexOf(areaId)
  if (i > -1) selectedAreas.value.splice(i, 1)
  else selectedAreas.value.push(areaId)
}
// 区筛选：全选/取消全选 → 取消全选等价于"不按区筛选（空）"
const toggleAllAreas = () => {
  if (selectedAreas.value.length === areas.value.length) {
    selectedAreas.value = []
  } else {
    selectedAreas.value = areas.value.map(a => a._id)
  }
}
// 幽灵选中裁剪：当区筛选变化时，把 selectedStores / selectedChartStores 中不在允许范围内的门店移除
// 若移除后为空 → 自动回补（在允许范围内全选），避免空选中导致表格/图表空白
const clipGhostSelections = () => {
  const allowed = areaAllowedStoreNames.value
  if (!allowed) return // 不筛选时不裁剪
  const clip = (list) => {
    const next = list.value.filter(n => allowed.has(normalizeName(n)))
    if (next.length === 0 && tableData.value.length > 0) {
      // 回补：在允许范围内尽可能选
      return tableData.value.filter(s => allowed.has(normalizeName(s.storeName))).map(s => s.storeName)
    }
    return next
  }
  selectedStores.value = clip(selectedStores)
  selectedChartStores.value = clip(selectedChartStores)
}
watch(selectedAreas, () => {
  clipGhostSelections()
}, { deep: true })

// 表格门店筛选
const showStoreFilter = ref(false)
const selectedStores = ref([])
const storeFilterButton = ref(null)
const storeFilterDropdown = ref(null)
const storeSearchQuery = ref('') // 门店搜索关键词

// 图表门店筛选
const showChartFilter = ref(false)
const selectedChartStores = ref([])
const chartFilterButton = ref(null)
const chartFilterDropdown = ref(null)
const chartSearchQuery = ref('') // 图表门店搜索关键词

// 过滤后的门店列表（表格筛选）——叠加区筛选
const filteredTableData = computed(() => {
  let list = tableData.value
  // 区筛选
  const allowed = areaAllowedStoreNames.value
  if (allowed) list = list.filter(s => allowed.has(normalizeName(s.storeName)))
  // 搜索
  if (storeSearchQuery.value) {
    const q = storeSearchQuery.value.toLowerCase()
    list = list.filter(s => s.storeName.toLowerCase().includes(q))
  }
  return list
})

// 过滤后的门店列表（图表筛选）——叠加区筛选
const filteredTableDataForChart = computed(() => {
  let list = tableData.value
  // 区筛选
  const allowed = areaAllowedStoreNames.value
  if (allowed) list = list.filter(s => allowed.has(normalizeName(s.storeName)))
  // 搜索
  if (chartSearchQuery.value) {
    const q = chartSearchQuery.value.toLowerCase()
    list = list.filter(s => s.storeName.toLowerCase().includes(q))
  }
  return list
})

// 获取有数据的日期列表
const fetchDates = async () => {
  try {
    const res = await getAvailableDates()
    availableDates.value = res.data || []
    if (availableDates.value.length > 0) {
      selectedDate.value = availableDates.value[0]
      fetchData()
    }
  } catch (error) {
    console.error('获取日期失败:', error)
  }
}

// 获取上座率数据
const fetchData = async () => {
  if (!selectedDate.value) return
  loading.value = true
  try {
    // 并行拉取：上座率数据 + 门店排序 + 区列表
    const [res, areaRes] = await Promise.all([
      getOnlineRateData(selectedDate.value),
      fetchAreas().catch(e => { console.warn('拉取区列表失败，继续', e); return null })
    ])
    if (res.data && res.data.length > 0) {
      // 获取门店排序配置
      let orderMap = {}
      try {
        const orderRes = await getStoreOrder()
        if (orderRes.data && orderRes.data.length > 0) {
          storeOrderList.value = orderRes.data
          // 创建门店名称到排序位置的映射
          orderRes.data.forEach((item, idx) => {
            orderMap[item.storeName] = item.order || idx + 1
          })
        }
      } catch (err) {
        console.warn('获取排序配置失败，使用默认顺序', err)
      }
      
      // 根据排序配置排序数据
      tableData.value = res.data.sort((a, b) => {
        const orderA = orderMap[a.storeName] || 999
        const orderB = orderMap[b.storeName] || 999
        return orderA - orderB
      })
      
      // 区筛选幽灵裁剪（基于新数据）
      clipGhostSelections()

      // 表格默认全选（仅在未手动选过时）
      if (selectedStores.value.length === 0) {
        const allowed = areaAllowedStoreNames.value
        if (allowed) {
          selectedStores.value = tableData.value.filter(s => allowed.has(normalizeName(s.storeName))).map(s => s.storeName)
        } else {
          selectedStores.value = tableData.value.map(store => store.storeName)
        }
      }
      // 图表默认优先选吉姆电竞；若筛选不到（如门店改名），降级为区允许范围内的全选，避免空选中导致图表/loading 异常
      if (selectedChartStores.value.length === 0) {
        const allowed = areaAllowedStoreNames.value
        let pool = tableData.value
        if (allowed) pool = pool.filter(s => allowed.has(normalizeName(s.storeName)))
        const jimu = pool
          .filter(store => store.storeName.includes('吉姆电竞'))
          .map(store => store.storeName)
        selectedChartStores.value = jimu.length > 0
          ? jimu
          : pool.map(s => s.storeName)
      }
      await nextTick()
      await updateChart()
    }
  } catch (error) {
    console.error('获取数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 表格筛选：切换门店选中
const toggleStore = (storeName) => {
  const index = selectedStores.value.indexOf(storeName)
  if (index > -1) {
    selectedStores.value.splice(index, 1)
  } else {
    selectedStores.value.push(storeName)
  }
}

// 表格筛选：全选/取消全选（考虑区筛选范围）
const toggleAllStores = () => {
  const allowed = areaAllowedStoreNames.value
  const pool = allowed
    ? tableData.value.filter(s => allowed.has(normalizeName(s.storeName))).map(s => s.storeName)
    : tableData.value.map(s => s.storeName)
  const allSelectedInPool = pool.length > 0 && pool.every(n => selectedStores.value.includes(n))
  if (allSelectedInPool) {
    // 取消全选：只移除 pool 里的那些
    selectedStores.value = selectedStores.value.filter(n => !pool.includes(n))
  } else {
    // 全选：合并入 pool
    const set = new Set([...selectedStores.value, ...pool])
    selectedStores.value = [...set]
  }
}

// 图表筛选：切换门店选中
const toggleChartStore = (storeName) => {
  const index = selectedChartStores.value.indexOf(storeName)
  if (index > -1) {
    selectedChartStores.value.splice(index, 1)
  } else {
    selectedChartStores.value.push(storeName)
  }
}

// 图表筛选：全选/取消全选（考虑区筛选范围）
const toggleAllChartStores = () => {
  const allowed = areaAllowedStoreNames.value
  const pool = allowed
    ? tableData.value.filter(s => allowed.has(normalizeName(s.storeName))).map(s => s.storeName)
    : tableData.value.map(s => s.storeName)
  const allSelectedInPool = pool.length > 0 && pool.every(n => selectedChartStores.value.includes(n))
  if (allSelectedInPool) {
    selectedChartStores.value = selectedChartStores.value.filter(n => !pool.includes(n))
  } else {
    const set = new Set([...selectedChartStores.value, ...pool])
    selectedChartStores.value = [...set]
  }
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  if (showAreaFilter.value && 
      areaFilterButton.value && 
      !areaFilterButton.value.contains(event.target) &&
      areaFilterDropdown.value &&
      !areaFilterDropdown.value.contains(event.target)) {
    showAreaFilter.value = false
  }
  if (showStoreFilter.value && 
      storeFilterButton.value && 
      !storeFilterButton.value.contains(event.target) &&
      storeFilterDropdown.value &&
      !storeFilterDropdown.value.contains(event.target)) {
    showStoreFilter.value = false
    storeSearchQuery.value = ''
  }
  if (showChartFilter.value && 
      chartFilterButton.value && 
      !chartFilterButton.value.contains(event.target) &&
      chartFilterDropdown.value &&
      !chartFilterDropdown.value.contains(event.target)) {
    showChartFilter.value = false
    chartSearchQuery.value = ''
  }
}

// 表格显示的门店
const displayStores = computed(() => {
  return tableData.value.filter(store =>
    selectedStores.value.includes(store.storeName)
  )
})

const jimuStores = computed(() => {
  return displayStores.value.filter(store =>
    store.storeName.includes('吉姆电竞')
  )
})

const otherStores = computed(() => {
  return displayStores.value.filter(store =>
    !store.storeName.includes('吉姆电竞')
  )
})

// 图表显示的门店
const chartDisplayStores = computed(() => {
  return tableData.value.filter(store =>
    selectedChartStores.value.includes(store.storeName)
  )
})

// 时间列定义（12:00 - 23:00）
const timeColumns = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]

// 获取显示数据
const getDisplayData = (store, hour) => {
  const timeKey = `${hour.toString().padStart(2, '0')}:00`
  const data = store.timeSlots?.[timeKey]
  
  if (!data) return { online: 0, total: 0, percentage: 0 }
    
  return {
    online: data.onlineCount,
    total: data.totalCount,
    percentage: data.percentage
  }
}

// 获取百分比对应的样式类
const getPercentageClass = (percentage) => {
  if (percentage < 50) return 'rate-low inline-block px-2.5 py-0.5 rounded-full text-xs font-medium'
  if (percentage <= 70) return 'rate-mid inline-block px-2.5 py-0.5 rounded-full text-xs font-medium'
  return 'rate-high inline-block px-2.5 py-0.5 rounded-full text-xs font-medium'
}

// 计算平均上座率
const getAverageRate = (store) => {
  const slots = store.timeSlots || {}
  const percentages = Object.values(slots)
    .map(slot => slot.percentage || 0)
    .filter(p => p > 0)
    
  if (percentages.length === 0) return 0
    
  const avg = percentages.reduce((sum, p) => sum + p, 0) / percentages.length
  return Math.round(avg)
}

// 获取平均上座率的样式类
const getAverageRateClass = (store) => {
  const avg = getAverageRate(store)
  if (avg < 50) return 'rate-low inline-block px-3 py-1 rounded-full text-sm font-semibold'
  if (avg <= 70) return 'rate-mid inline-block px-3 py-1 rounded-full text-sm font-semibold'
  return 'rate-high inline-block px-3 py-1 rounded-full text-sm font-semibold'
}

// 初始化图表，成功后立即渲染数据
// 关键：容器持续不可见时必须超时兜底 resolve(false)，绝不能永久 pending（否则会卡死 loading）
const initChart = (timeoutMs = 1200) => {
  return new Promise((resolve) => {
    const start = Date.now()
    const tryInit = () => {
      if (!chartRef.value) {
        resolve(false)
        return
      }
      // 容器不可见时（v-show 刚切换 / 未选中门店）等待下一帧再试
      if (chartRef.value.offsetWidth === 0 || chartRef.value.offsetHeight === 0) {
        if (Date.now() - start > timeoutMs) {
          console.warn('图表容器持续不可见，放弃初始化')
          resolve(false)
          return
        }
        requestAnimationFrame(tryInit)
        return
      }
      if (chartInstance) {
        chartInstance.dispose()
        chartInstance = null
      }
      chartInstance = echarts.init(chartRef.value)
      window.addEventListener('resize', handleResize)
      document.addEventListener('click', handleClickOutside)
      resolve(true)
    }
    tryInit()
  })
}

// 更新图表数据
const updateChart = async () => {
  if (!chartRef.value) {
    return
  }
  
  if (!chartInstance) {
    const ok = await initChart()
    if (!ok) return
  }
  
  if (chartDisplayStores.value.length === 0) {
    chartInstance.clear()
    return
  }
    
  const finalTimeLabels = timeColumns.map(h => `${h}:00`)
    
  const series = chartDisplayStores.value.map(store => {
    const data = timeColumns.map(hour => {
      const timeKey = `${hour.toString().padStart(2, '0')}:00`
      const slot = store.timeSlots?.[timeKey]
      return slot ? slot.percentage : 0
    })
        
    return {
      name: store.storeName,
      type: 'line',
      data: data,
      smooth: true,
      lineStyle: {
        width: store.storeName.includes('吉姆电竞') ? 3 : 2
      },
      itemStyle: {
        borderWidth: store.storeName.includes('吉姆电竞') ? 3 : 2
      }
    }
  })
    
  const option = {
    backgroundColor: 'transparent',
    title: {
      text: '上座率趋势对比',
      left: 'center',
      textStyle: { color: '#c8d0e0', fontSize: 14 }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15,22,45,0.95)',
      borderColor: 'rgba(0,255,255,0.3)',
      textStyle: { color: '#c8d0e0', fontSize: 12 }
    },
    legend: {
      data: chartDisplayStores.value.map(s => s.storeName),
      top: 30,
      type: 'scroll',
      textStyle: { color: '#8892a4', fontSize: 11 }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 80,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: finalTimeLabels,
      axisLine: { lineStyle: { color: 'rgba(0,255,255,0.15)' } },
      axisTick: { show: false },
      axisLabel: { color: '#6b7fa3' }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%',
        color: '#6b7fa3'
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      max: 100
    },
    series: series
  }
    
  chartInstance.setOption(option, true)
}

// 处理窗口大小变化
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// 监听图表门店变化
watch(selectedChartStores, async () => {
  await nextTick()
  await updateChart()
}, { deep: true })

// 监听 selectedDate 变化
watch(() => selectedDate.value, (newDate) => {
  if (newDate) {
    fetchData()
  }
})

onMounted(async () => {
  await fetchDates()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Title -->
    <div class="glass-card p-6 relative overflow-hidden" style="border-top: 2px solid transparent; border-image: linear-gradient(90deg, transparent, #00ffff, transparent) 1;">
      <h2 class="text-xl font-semibold tracking-wide section-title" style="color: #e0e0e0;">网吧上座率对比</h2>
      <p class="text-sm mt-1" style="color: #6b7fa3;">实时监控各门店上座率数据</p>
    </div>

    <!-- Filter Area -->
    <div class="glass-card p-5 flex gap-4 items-center flex-wrap relative z-20">
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium" style="color: #6b7fa3;">日期</label>
        <input 
          type="date"
          v-model="selectedDate"
          class="sci-input px-4 py-2 rounded-xl text-sm"
        />
        <span v-if="!availableDates.includes(selectedDate)" class="text-xs px-3 py-1 rounded-full" style="color: #ffaa00; background: rgba(255,170,0,0.1); border: 1px solid rgba(255,170,0,0.2);">
          ⚠ 该日期无数据
        </span>
      </div>

      <!-- 区筛选 -->
      <div class="relative" @click.stop>
        <button 
          ref="areaFilterButton"
          @click.stop="showAreaFilter = !showAreaFilter; showStoreFilter = false; showChartFilter = false"
          class="sci-btn-ghost px-4 py-2 text-sm"
        >
          <span>区筛选</span>
          <span 
            class="ml-2 px-2 py-0.5 rounded-full text-xs" 
            :style="selectedAreas.length === 0 
              ? { background: 'rgba(139,92,246,0.12)', color: '#a78bfa' } 
              : { background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }"
          >
            {{ selectedAreas.length === 0 ? '全部' : selectedAreas.length }}
          </span>
        </button>
          
        <div 
          v-if="showAreaFilter"
          ref="areaFilterDropdown"
          class="absolute top-full left-0 mt-2 w-64 rounded-2xl shadow-xl z-50 overflow-hidden" 
          style="background: rgba(15,22,45,0.98); backdrop-filter: blur(20px); border: 1px solid rgba(139,92,246,0.25);"
        >
          <!-- 全选/取消全选 -->
          <div class="p-3 flex justify-between items-center" style="border-bottom: 1px solid rgba(139,92,246,0.12);">
            <button 
              @click="toggleAllAreas"
              class="text-sm font-medium hover:opacity-80" 
              style="color: #c4b5fd;"
            >
              {{ selectedAreas.length === areas.length && areas.length > 0 ? '取消全选（=不筛选）' : '全选所有区' }}
            </button>
            <span class="text-xs" style="color: #5a6a8a;">
              区 {{ areas.length }}
            </span>
          </div>
          <!-- 区列表 -->
          <div class="overflow-auto" style="max-height: 260px;">
            <div v-if="areasLoading" class="p-4 flex items-center justify-center gap-2 text-sm" style="color: #5a6a8a;">
              <div class="w-4 h-4 border-2 border-purple-500 border-b-transparent rounded-full animate-spin"></div>加载区...
            </div>
            <label 
              v-for="a in areas" 
              :key="a._id"
              class="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-white/5"
            >
              <input 
                type="checkbox"
                :checked="selectedAreas.includes(a._id)"
                @change="toggleArea(a._id)"
                class="w-4 h-4 rounded"
                style="accent-color: #8b5cf6;"
              />
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span class="text-base shrink-0">{{ a.isVirtual ? '⬜' : '🟦' }}</span>
                <span class="truncate" :style="a.isVirtual ? 'color: #ffaa00;' : 'color: #c8d0e0;'">
                  {{ a.name }}
                </span>
                <span class="text-[11px] shrink-0 px-1.5 py-0.5 rounded-full" style="background: rgba(255,255,255,0.04); color: #5a6a8a;">
                  {{ a.stores?.length || 0 }}
                </span>
              </div>
            </label>
            <div 
              v-if="!areasLoading && areas.length === 0"
              class="p-4 text-center text-sm" style="color: #5a6a8a;"
            >
              暂无区数据
            </div>
          </div>
          <div class="px-4 py-2 text-[11px]" style="border-top: 1px solid rgba(139,92,246,0.12); color: #5a6a8a;">
            💡 未选中任何区 = 不按区筛选（全部显示）
          </div>
        </div>
      </div>
        
      <!-- 表格门店筛选 -->
      <div class="relative" @click.stop>
        <button 
          ref="storeFilterButton"
          @click.stop="showStoreFilter = !showStoreFilter; showAreaFilter = false; showChartFilter = false"
          class="sci-btn-ghost px-4 py-2 text-sm"
        >
          <span>表格门店</span>
          <span class="ml-2 px-2 py-0.5 rounded-full text-xs" style="background: rgba(0,255,255,0.15); color: #00ffff;">{{ selectedStores.length }}</span>
        </button>
          
        <div 
          v-if="showStoreFilter"
          ref="storeFilterDropdown"
          class="absolute top-full left-0 mt-2 w-72 rounded-2xl shadow-xl z-50 overflow-hidden" style="background: rgba(15,22,45,0.98); backdrop-filter: blur(20px); border: 1px solid rgba(0,255,255,0.15);"
        >
          <!-- 搜索框 -->
          <div class="p-3" style="border-bottom: 1px solid rgba(0,255,255,0.08);">
            <input 
              v-model="storeSearchQuery"
              type="text"
              placeholder="搜索门店名称..."
              class="sci-input w-full px-4 py-2 text-sm rounded-xl"
            />
          </div>
          <!-- 全选/取消全选 -->
          <div class="p-3 flex justify-between items-center" style="border-bottom: 1px solid rgba(0,255,255,0.08);">
            <button 
              @click="toggleAllStores"
              class="text-sm font-medium hover:opacity-80" style="color: #00ffff;"
            >
              {{ selectedStores.length === (areaAllowedStoreNames ? tableData.filter(s => areaAllowedStoreNames.has(normalizeName(s.storeName))).length : tableData.length) ? '取消全选' : '全选' }}
            </button>
            <span class="text-xs" style="color: #5a6a8a;">
              {{ filteredTableData.length }} / {{ areaAllowedStoreNames ? tableData.filter(s => areaAllowedStoreNames.has(normalizeName(s.storeName))).length : tableData.length }}
            </span>
          </div>
          <!-- 门店列表 -->
          <div class="overflow-auto" style="max-height: 250px;">
            <label 
              v-for="store in filteredTableData" 
              :key="store.storeName"
              class="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-white/5"
            >
              <input 
                type="checkbox"
                :checked="selectedStores.includes(store.storeName)"
                @change="toggleStore(store.storeName)"
                class="w-4 h-4 rounded"
                style="accent-color: #00ffff;"
              />
              <div class="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                <span :style="store.storeName.includes('吉姆电竞') ? 'color: #00ffff; font-weight: 500;' : 'color: #8892a4;'">
                  {{ store.storeName }}
                </span>
                <span 
                  v-if="storeToAreaMap[normalizeName(store.storeName)]"
                  class="px-1.5 py-0.5 rounded-md text-[10px] shrink-0" 
                  style="background: rgba(139,92,246,0.12); color: #a78bfa; border: 1px solid rgba(139,92,246,0.2);"
                >
                  {{ storeToAreaMap[normalizeName(store.storeName)].areaName }}
                </span>
              </div>
            </label>
            <div 
              v-if="filteredTableData.length === 0"
              class="p-4 text-center text-sm" style="color: #5a6a8a;"
            >
              未找到匹配的门店
            </div>
          </div>
        </div>
      </div>
        
      <div class="text-sm ml-auto" style="color: #5a6a8a;">
        {{ displayStores.length }} / {{ tableData.length }} 家门店
        <span v-if="selectedAreas.length > 0" class="ml-2" style="color: #a78bfa;">
          · 已按区筛选
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 glass-card">
      <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2" style="border-color: #00ffff;"></div>
      <p class="mt-3 text-sm" style="color: #6b7fa3;">加载中...</p>
    </div>

    <!-- Data Table -->
    <div v-else class="glass-card overflow-hidden">
      <!-- Frozen Section (吉姆电竞门店) -->
      <div v-if="jimuStores.length > 0" style="border-bottom: 1px solid rgba(0,255,255,0.08);">
        <table class="w-full text-sm sci-table">
          <thead>
            <tr style="background: rgba(0,255,255,0.04);">
              <th class="p-3 text-center font-medium">排名</th>
              <th class="p-3 text-left font-medium">门店名称</th>
              <th class="p-3 text-center font-medium" v-for="hour in timeColumns" :key="hour">
                {{ hour }}:00
              </th>
              <th class="p-3 text-center font-medium">平均</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(store, idx) in jimuStores" :key="store.storeName" class="border-b border-white/5 hover:bg-cyan-500/5 transition-colors">
              <td class="p-3 text-center text-xs" style="color: #4a5a7a;">{{ idx + 1 }}</td>
              <td class="p-3 font-medium">
                <div class="flex items-center gap-2 flex-wrap">
                  <span style="color: #e0e0e0;">{{ store.storeName }}</span>
                  <span 
                    v-if="storeToAreaMap[normalizeName(store.storeName)]"
                    class="px-1.5 py-0.5 rounded-md text-[10px] shrink-0" 
                    style="background: rgba(139,92,246,0.12); color: #a78bfa; border: 1px solid rgba(139,92,246,0.2);"
                  >
                    {{ storeToAreaMap[normalizeName(store.storeName)].areaName }}
                  </span>
                </div>
              </td>
              <td class="p-3 text-center" v-for="hour in timeColumns" :key="hour">
                <div class="text-xs mb-1" style="color: #5a6a8a;">{{ getDisplayData(store, hour).online }}/{{ getDisplayData(store, hour).total }}</div>
                <div :class="getPercentageClass(getDisplayData(store, hour).percentage)">
                  {{ getDisplayData(store, hour).percentage }}%
                </div>
              </td>
              <td class="p-3 text-center">
                <span :class="getAverageRateClass(store)">
                  {{ getAverageRate(store) }}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Scrollable Section (Other stores) -->
      <div class="overflow-auto" style="max-height: calc(100vh - 450px);">
        <table class="w-full text-sm sci-table">
          <thead class="sticky top-0 z-10 shadow-sm" style="background: rgba(15,20,40,0.95); backdrop-filter: blur(10px);">
            <tr>
              <th class="p-3 text-center font-medium">排名</th>
              <th class="p-3 text-left font-medium">门店名称</th>
              <th class="p-3 text-center font-medium" v-for="hour in timeColumns" :key="hour">
                {{ hour }}:00
              </th>
              <th class="p-3 text-center font-medium">平均</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(store, idx) in otherStores" :key="store.storeName" class="border-b border-white/5 hover:bg-cyan-500/5 transition-colors">
              <td class="p-3 text-center text-xs" style="color: #4a5a7a;">{{ idx + 1 }}</td>
              <td class="p-3">
                <div class="flex items-center gap-2 flex-wrap">
                  <span style="color: #8892a4;">{{ store.storeName }}</span>
                  <span 
                    v-if="storeToAreaMap[normalizeName(store.storeName)]"
                    class="px-1.5 py-0.5 rounded-md text-[10px] shrink-0" 
                    style="background: rgba(139,92,246,0.12); color: #a78bfa; border: 1px solid rgba(139,92,246,0.2);"
                  >
                    {{ storeToAreaMap[normalizeName(store.storeName)].areaName }}
                  </span>
                </div>
              </td>
              <td class="p-3 text-center" v-for="hour in timeColumns" :key="hour">
                <div class="text-xs mb-1" style="color: #5a6a8a;">{{ getDisplayData(store, hour).online }}/{{ getDisplayData(store, hour).total }}</div>
                <div :class="getPercentageClass(getDisplayData(store, hour).percentage)">
                  {{ getDisplayData(store, hour).percentage }}%
                </div>
              </td>
              <td class="p-3 text-center">
                <span :class="getAverageRateClass(store)">
                  {{ getAverageRate(store) }}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Chart Area -->
    <div class="glass-card p-6">
      <!-- Chart Header with Filter -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-semibold section-title" style="color: #e0e0e0;">上座率趋势对比</h3>
          <p class="text-xs mt-0.5" style="color: #5a6a8a;">各门店时段上座率变化</p>
        </div>
        <div class="relative">
          <button 
            ref="chartFilterButton"
            @click="showChartFilter = !showChartFilter; showAreaFilter = false; showStoreFilter = false"
            class="sci-btn-ghost px-4 py-2 text-sm"
          >
            <span>图表门店</span>
            <span class="ml-2 px-2 py-0.5 rounded-full text-xs" style="background: rgba(0,255,255,0.15); color: #00ffff;">{{ selectedChartStores.length }}</span>
          </button>
            
          <div 
            v-if="showChartFilter"
            ref="chartFilterDropdown"
            class="absolute top-full right-0 mt-2 w-72 rounded-2xl shadow-xl z-50 overflow-hidden" style="background: rgba(15,22,45,0.98); backdrop-filter: blur(20px); border: 1px solid rgba(0,255,255,0.15);"
          >
            <!-- 搜索框 -->
            <div class="p-3" style="border-bottom: 1px solid rgba(0,255,255,0.08);">
              <input 
                v-model="chartSearchQuery"
                type="text"
                placeholder="搜索门店名称..."
                class="sci-input w-full px-4 py-2 text-sm rounded-xl"
              />
            </div>
            <!-- 全选/取消全选 -->
            <div class="p-3 flex justify-between items-center" style="border-bottom: 1px solid rgba(0,255,255,0.08);">
              <button 
                @click="toggleAllChartStores"
                class="text-sm font-medium hover:opacity-80" style="color: #00ffff;"
              >
                {{ (() => {
                  const allowed = areaAllowedStoreNames
                  const pool = allowed ? tableData.filter(s => allowed.has(normalizeName(s.storeName))) : tableData
                  return pool.length > 0 && pool.every(s => selectedChartStores.includes(s.storeName)) ? '取消全选' : '全选'
                })() }}
              </button>
              <span class="text-xs" style="color: #5a6a8a;">
                {{ filteredTableDataForChart.length }} / {{ areaAllowedStoreNames ? tableData.filter(s => areaAllowedStoreNames.has(normalizeName(s.storeName))).length : tableData.length }}
              </span>
            </div>
            <!-- 门店列表 -->
            <div class="overflow-auto" style="max-height: 250px;">
              <label 
                v-for="store in filteredTableDataForChart" 
                :key="store.storeName"
                class="flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-white/5"
              >
                <input 
                  type="checkbox"
                  :checked="selectedChartStores.includes(store.storeName)"
                  @change="toggleChartStore(store.storeName)"
                  class="w-4 h-4 rounded"
                  style="accent-color: #00ffff;"
                />
                <div class="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                  <span :style="store.storeName.includes('吉姆电竞') ? 'color: #00ffff; font-weight: 500;' : 'color: #8892a4;'">
                    {{ store.storeName }}
                  </span>
                  <span 
                    v-if="storeToAreaMap[normalizeName(store.storeName)]"
                    class="px-1.5 py-0.5 rounded-md text-[10px] shrink-0" 
                    style="background: rgba(139,92,246,0.12); color: #a78bfa; border: 1px solid rgba(139,92,246,0.2);"
                  >
                    {{ storeToAreaMap[normalizeName(store.storeName)].areaName }}
                  </span>
                </div>
              </label>
              <div 
                v-if="filteredTableDataForChart.length === 0"
                class="p-4 text-center text-sm" style="color: #5a6a8a;"
              >
                未找到匹配的门店
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Chart Content -->
      <div style="height: 400px; position: relative;">
        <div v-show="chartDisplayStores.length === 0" class="absolute inset-0 flex flex-col items-center justify-center">
          <div class="text-4xl mb-3 opacity-20">📊</div>
          <p class="text-sm" style="color: #5a6a8a;">请选择门店以显示趋势图</p>
        </div>
        <div v-show="chartDisplayStores.length > 0" ref="chartRef" style="width: 100%; height: 100%;"></div>
      </div>
    </div>
  </div>
</template>
