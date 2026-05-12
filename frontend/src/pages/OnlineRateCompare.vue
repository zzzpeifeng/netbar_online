<script setup>
import { ref, onMounted, watch, computed, onUnmounted, nextTick } from 'vue'
import { getAvailableDates, getOnlineRateData, getStoreOrder } from '../api/onlineRate'
import * as echarts from 'echarts'

const availableDates = ref([])
const selectedDate = ref('')
const tableData = ref([])
const loading = ref(false)
const chartRef = ref(null)
let chartInstance = null
const storeOrderList = ref([]) // 门店排序配置

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

// 过滤后的门店列表（表格筛选）
const filteredTableData = computed(() => {
  if (!storeSearchQuery.value) return tableData.value
  const query = storeSearchQuery.value.toLowerCase()
  return tableData.value.filter(store =>
    store.storeName.toLowerCase().includes(query)
  )
})

// 过滤后的门店列表（图表筛选）
const filteredTableDataForChart = computed(() => {
  if (!chartSearchQuery.value) return tableData.value
  const query = chartSearchQuery.value.toLowerCase()
  return tableData.value.filter(store =>
    store.storeName.toLowerCase().includes(query)
  )
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
    const res = await getOnlineRateData(selectedDate.value)
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
      
      // 表格默认全选
      if (selectedStores.value.length === 0) {
        selectedStores.value = tableData.value.map(store => store.storeName)
      }
      // 图表默认只选吉姆电竞
      if (selectedChartStores.value.length === 0) {
        selectedChartStores.value = tableData.value
          .filter(store => store.storeName.includes('吉姆电竞'))
          .map(store => store.storeName)
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

// 表格筛选：全选/取消全选
const toggleAllStores = () => {
  if (selectedStores.value.length === tableData.value.length) {
    selectedStores.value = []
  } else {
    selectedStores.value = tableData.value.map(store => store.storeName)
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

// 图表筛选：全选/取消全选
const toggleAllChartStores = () => {
  if (selectedChartStores.value.length === tableData.value.length) {
    selectedChartStores.value = []
  } else {
    selectedChartStores.value = tableData.value.map(store => store.storeName)
  }
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
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
  if (percentage < 50) return 'bg-green-100 text-green-800'
  if (percentage <= 70) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
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
  return getPercentageClass(avg)
}

// 初始化图表，成功后立即渲染数据
const initChart = () => {
  return new Promise((resolve) => {
    const tryInit = () => {
      if (!chartRef.value) {
        resolve(false)
        return
      }
      // 容器不可见时（v-show 刚切换），等待下一帧再试
      if (chartRef.value.offsetWidth === 0 || chartRef.value.offsetHeight === 0) {
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
    title: {
      text: '上座率趋势对比',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: chartDisplayStores.value.map(s => s.storeName),
      top: 30,
      type: 'scroll'
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
      data: finalTimeLabels
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%'
      },
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
    <div class="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl shadow-lg p-6">
      <h2 class="text-xl font-semibold text-white tracking-wide">网吧上座率对比</h2>
      <p class="text-slate-300 text-sm mt-1">实时监控各门店上座率数据</p>
    </div>

    <!-- Filter Area -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex gap-4 items-center flex-wrap">
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-gray-600">日期</label>
        <input 
          type="date"
          v-model="selectedDate"
          class="px-4 py-2 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
        />
        <span v-if="!availableDates.includes(selectedDate)" class="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
          ⚠ 该日期无数据
        </span>
      </div>
        
      <!-- 表格门店筛选 -->
      <div class="relative" @click.stop>
        <button 
          ref="storeFilterButton"
          @click.stop="showStoreFilter = !showStoreFilter"
          class="px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
        >
          <span class="text-gray-600">表格门店</span>
          <span class="ml-2 bg-slate-700 text-white px-2 py-0.5 rounded-full text-xs">{{ selectedStores.length }}</span>
        </button>
          
        <div 
          v-if="showStoreFilter"
          ref="storeFilterDropdown"
          class="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden"
        >
          <!-- 搜索框 -->
          <div class="p-3 border-b border-gray-100">
            <input 
              v-model="storeSearchQuery"
              type="text"
              placeholder="搜索门店名称..."
              class="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
            />
          </div>
          <!-- 全选/取消全选 -->
          <div class="p-3 border-b border-gray-100 flex justify-between items-center">
            <button 
              @click="toggleAllStores"
              class="text-sm text-slate-700 hover:text-slate-900 font-medium"
            >
              {{ selectedStores.length === tableData.length ? '取消全选' : '全选' }}
            </button>
            <span class="text-xs text-gray-400">
              {{ filteredTableData.length }} / {{ tableData.length }}
            </span>
          </div>
          <!-- 门店列表 -->
          <div class="overflow-auto" style="max-height: 250px;">
            <label 
              v-for="store in filteredTableData" 
              :key="store.storeName"
              class="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm transition-colors"
            >
              <input 
                type="checkbox"
                :checked="selectedStores.includes(store.storeName)"
                @change="toggleStore(store.storeName)"
                class="w-4 h-4 rounded border-gray-300 text-slate-700 focus:ring-slate-400"
              />
              <span :class="store.storeName.includes('吉姆电竞') ? 'font-medium text-slate-800' : 'text-gray-600'">
                {{ store.storeName }}
              </span>
            </label>
            <div 
              v-if="filteredTableData.length === 0"
              class="p-4 text-center text-gray-400 text-sm"
            >
              未找到匹配的门店
            </div>
          </div>
        </div>
      </div>
        
      <div class="text-sm text-gray-400 ml-auto">
        {{ displayStores.length }} / {{ tableData.length }} 家门店
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
      <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-slate-700"></div>
      <p class="mt-3 text-gray-400 text-sm">加载中...</p>
    </div>

    <!-- Data Table -->
    <div v-else class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <!-- Frozen Section (吉姆电竞门店) -->
      <div v-if="jimuStores.length > 0" class="border-b border-gray-100">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <th class="p-3 text-center font-medium">排名</th>
              <th class="p-3 text-left font-medium">门店名称</th>
              <th class="p-3 text-center font-medium" v-for="hour in timeColumns" :key="hour">
                {{ hour }}:00
              </th>
              <th class="p-3 text-center font-medium">平均</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(store, idx) in jimuStores" :key="store.storeName" class="border-b border-gray-50 hover:bg-slate-50/50 transition-colors">
              <td class="p-3 text-center text-gray-400 text-xs">{{ idx + 1 }}</td>
              <td class="p-3 font-medium text-slate-700">{{ store.storeName }}</td>
              <td class="p-3 text-center" v-for="hour in timeColumns" :key="hour">
                <div class="text-xs text-gray-400 mb-1">{{ getDisplayData(store, hour).online }}/{{ getDisplayData(store, hour).total }}</div>
                <div :class="getPercentageClass(getDisplayData(store, hour).percentage)" class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {{ getDisplayData(store, hour).percentage }}%
                </div>
              </td>
              <td class="p-3 text-center">
                <span :class="getAverageRateClass(store)" class="inline-block px-3 py-1 rounded-full text-sm font-semibold">
                  {{ getAverageRate(store) }}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Scrollable Section (Other stores) -->
      <div class="overflow-auto" style="max-height: calc(100vh - 450px);">
        <table class="w-full text-sm">
          <thead class="sticky top-0 bg-white z-10 shadow-sm">
            <tr class="text-slate-600 text-xs uppercase tracking-wider border-b border-gray-100">
              <th class="p-3 text-center font-medium">排名</th>
              <th class="p-3 text-left font-medium">门店名称</th>
              <th class="p-3 text-center font-medium" v-for="hour in timeColumns" :key="hour">
                {{ hour }}:00
              </th>
              <th class="p-3 text-center font-medium">平均</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(store, idx) in otherStores" :key="store.storeName" class="border-b border-gray-50 hover:bg-slate-50/50 transition-colors">
              <td class="p-3 text-center text-gray-400 text-xs">{{ idx + 1 }}</td>
              <td class="p-3 text-gray-600">{{ store.storeName }}</td>
              <td class="p-3 text-center" v-for="hour in timeColumns" :key="hour">
                <div class="text-xs text-gray-400 mb-1">{{ getDisplayData(store, hour).online }}/{{ getDisplayData(store, hour).total }}</div>
                <div :class="getPercentageClass(getDisplayData(store, hour).percentage)" class="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {{ getDisplayData(store, hour).percentage }}%
                </div>
              </td>
              <td class="p-3 text-center">
                <span :class="getAverageRateClass(store)" class="inline-block px-3 py-1 rounded-full text-sm font-semibold">
                  {{ getAverageRate(store) }}%
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Chart Area -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <!-- Chart Header with Filter -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-lg font-semibold text-slate-800">上座率趋势对比</h3>
          <p class="text-xs text-gray-400 mt-0.5">各门店时段上座率变化</p>
        </div>
        <div class="relative">
          <button 
            ref="chartFilterButton"
            @click="showChartFilter = !showChartFilter"
            class="px-4 py-2 border border-gray-200 rounded-xl bg-white text-sm hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            <span class="text-gray-600">图表门店</span>
            <span class="ml-2 bg-slate-700 text-white px-2 py-0.5 rounded-full text-xs">{{ selectedChartStores.length }}</span>
          </button>
            
          <div 
            v-if="showChartFilter"
            ref="chartFilterDropdown"
            class="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            <!-- 搜索框 -->
            <div class="p-3 border-b border-gray-100">
              <input 
                v-model="chartSearchQuery"
                type="text"
                placeholder="搜索门店名称..."
                class="w-full px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              />
            </div>
            <!-- 全选/取消全选 -->
            <div class="p-3 border-b border-gray-100 flex justify-between items-center">
              <button 
                @click="toggleAllChartStores"
                class="text-sm text-slate-700 hover:text-slate-900 font-medium"
              >
                {{ selectedChartStores.length === tableData.length ? '取消全选' : '全选' }}
              </button>
              <span class="text-xs text-gray-400">
                {{ filteredTableDataForChart.length }} / {{ tableData.length }}
              </span>
            </div>
            <!-- 门店列表 -->
            <div class="overflow-auto" style="max-height: 250px;">
              <label 
                v-for="store in filteredTableDataForChart" 
                :key="store.storeName"
                class="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm transition-colors"
              >
                <input 
                  type="checkbox"
                  :checked="selectedChartStores.includes(store.storeName)"
                  @change="toggleChartStore(store.storeName)"
                  class="w-4 h-4 rounded border-gray-300 text-slate-700 focus:ring-slate-400"
                />
                <span :class="store.storeName.includes('吉姆电竞') ? 'font-medium text-slate-800' : 'text-gray-600'">
                  {{ store.storeName }}
                </span>
              </label>
              <div 
                v-if="filteredTableDataForChart.length === 0"
                class="p-4 text-center text-gray-400 text-sm"
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
          <div class="text-gray-300 text-5xl mb-3">📊</div>
          <p class="text-gray-400 text-sm">请选择门店以显示趋势图</p>
        </div>
        <div v-show="chartDisplayStores.length > 0" ref="chartRef" style="width: 100%; height: 100%;"></div>
      </div>
    </div>
  </div>
</template>
