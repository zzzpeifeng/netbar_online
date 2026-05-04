<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-gradient-to-r from-slate-800 to-slate-700 px-4 pt-12 pb-4">
      <h1 class="text-lg font-semibold text-white tracking-wide">网吧上座率</h1>
      <p class="text-slate-300 text-xs mt-1">实时监控数据</p>
    </div>

    <!-- Filter Area -->
    <div class="px-4 py-3 flex gap-2 items-center">
      <div class="flex-1 min-w-0">
        <input 
          type="date"
          v-model="selectedDate"
          class="w-full px-2 py-2 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
        />
      </div>
      <button 
        @click="showFilter = true"
        class="px-2.5 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 flex items-center gap-1 flex-shrink-0"
      >
        筛选
        <span class="bg-slate-700 text-white px-1 py-0.5 rounded-full text-xs">{{ selectedStores.length }}</span>
      </button>
    </div>

    <!-- Data Table (Horizontal Scroll) -->
    <div class="px-4">
      <div class="bg-white rounded-2xl border border-gray-100">
        <!-- 整体横向滚动 -->
        <div class="overflow-x-auto">
          <div class="inline-block min-w-full">
            <!-- Header -->
            <div class="flex border-b border-gray-100">
              <div class="sticky left-0 z-20 w-20 min-w-20 px-3 py-2.5 bg-slate-50 text-xs text-slate-500 font-medium uppercase tracking-wider border-r border-gray-100">
                门店
              </div>
              <div 
                v-for="hour in timeColumns" 
                :key="hour"
                class="w-14 min-w-14 px-1 py-2.5 text-center text-xs text-slate-500 font-medium"
              >
                {{ hour }}
              </div>
            </div>

            <!-- Store Rows -->
            <template v-for="(group, groupName) in groupedStores" :key="groupName">
              <!-- Group Header -->
              <div class="px-3 py-1.5 bg-gray-50 text-xs text-slate-500 font-medium border-b border-gray-100">
                {{ groupName }}
              </div>
              
              <!-- Store Row -->
              <div 
                v-for="store in group" 
                :key="store.storeName"
                class="flex border-b border-gray-50 last:border-b-0"
              >
                <!-- Store Name (Fixed) -->
                <div class="sticky left-0 z-10 w-20 min-w-20 px-3 py-2.5 bg-white border-r border-gray-100 flex items-center">
                  <span class="text-xs" :class="groupName === '吉姆电竞' ? 'text-slate-700 font-medium' : 'text-slate-600'">
                    {{ store.storeName.replace('吉姆电竞-', '') }}
                  </span>
                </div>
                
                <!-- Time Slots -->
                <div 
                  v-for="hour in timeColumns" 
                  :key="hour"
                  class="w-14 min-w-14 px-1 py-2 text-center"
                >
                  <div class="text-xs text-slate-400 mb-0.5">{{ getDisplayData(store, hour).online }}/{{ getDisplayData(store, hour).total }}</div>
                  <div :class="getPercentageClass(getDisplayData(store, hour).percentage)" class="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium">
                    {{ getDisplayData(store, hour).percentage }}%
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter Modal -->
    <div 
      v-if="showFilter"
      class="fixed inset-0 z-50 flex items-end"
    >
      <!-- Overlay -->
      <div 
        class="absolute inset-0 bg-black/30 backdrop-blur-sm"
        @click="showFilter = false"
      ></div>
      
      <!-- Modal Content -->
      <div class="relative bg-white rounded-t-3xl w-full max-h-[70vh] flex flex-col z-10">
        <!-- Handle -->
        <div class="w-9 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-4 flex-shrink-0"></div>
        
        <div class="flex-1 overflow-y-auto px-5 pb-8">
          <h3 class="text-lg font-semibold text-slate-800 mb-3">选择门店</h3>
          
          <!-- Search -->
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="搜索门店名称..."
            class="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent mb-3"
          />
          
          <!-- Select All -->
          <div class="flex justify-between items-center py-2.5 border-b border-gray-100 mb-2">
            <span class="text-sm text-slate-700 font-medium">全选</span>
            <button 
              @click="toggleAll"
              class="w-11 h-6 rounded-full transition-colors relative"
              :class="selectedStores.length === storeList.length ? 'bg-slate-700' : 'bg-gray-300'"
            >
              <div 
                class="w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all"
                :class="selectedStores.length === storeList.length ? 'right-0.5' : 'left-0.5'"
              ></div>
            </button>
          </div>

          <!-- Store List -->
          <label 
            v-for="store in filteredStores" 
            :key="store"
            class="flex items-center gap-3 py-3 border-b border-gray-50 cursor-pointer"
          >
            <input 
              type="checkbox"
              :checked="selectedStores.includes(store)"
              @change="toggleStore(store)"
              class="w-5 h-5 accent-slate-700"
            />
            <span 
              class="text-sm"
              :class="store.includes('吉姆电竞') ? 'text-slate-700 font-medium' : 'text-slate-600'"
            >
              {{ store }}
            </span>
          </label>

          <div 
            v-if="filteredStores.length === 0"
            class="py-8 text-center text-gray-400 text-sm"
          >
            未找到匹配的门店
          </div>

          <!-- Confirm Button -->
          <button 
            @click="showFilter = false"
            class="w-full py-3.5 bg-slate-800 text-white rounded-xl text-sm font-medium mt-4 shadow-sm"
          >
            确认 ({{ selectedStores.length }}/{{ storeList.length }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { getAvailableDates, getOnlineRateData, getStoreOrder } from '../api/onlineRate'

export default {
  setup() {
    const availableDates = ref([])
    const selectedDate = ref('')
    const tableData = ref([])
    const loading = ref(false)
    const showFilter = ref(false)
    const selectedStores = ref([])
    const searchQuery = ref('')
    const storeOrderList = ref([])
    const timeColumns = [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]

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

    // 获取数据
    const fetchData = async () => {
      if (!selectedDate.value) return
      loading.value = true
      try {
        const res = await getOnlineRateData(selectedDate.value)
        if (res.data && res.data.length > 0) {
          // 获取排序配置
          let orderMap = {}
          try {
            const orderRes = await getStoreOrder()
            if (orderRes.data && orderRes.data.length > 0) {
              storeOrderList.value = orderRes.data
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
          
          // 默认全选
          if (selectedStores.value.length === 0) {
            selectedStores.value = tableData.value.map(store => store.storeName)
          }
        }
      } catch (error) {
        console.error('获取数据失败:', error)
      } finally {
        loading.value = false
      }
    }

    // 门店列表
    const storeList = computed(() => {
      return tableData.value.map(store => store.storeName)
    })

    // 过滤后的门店列表
    const filteredStores = computed(() => {
      if (!searchQuery.value) return storeList.value
      const query = searchQuery.value.toLowerCase()
      return storeList.value.filter(name => name.toLowerCase().includes(query))
    })

    // 显示的门店
    const displayStores = computed(() => {
      return tableData.value.filter(store => 
        selectedStores.value.includes(store.storeName)
      )
    })

    // 分组门店
    const groupedStores = computed(() => {
      const groups = {
        '吉姆电竞': [],
        '其他门店': []
      }
      displayStores.value.forEach(store => {
        if (store.storeName.includes('吉姆电竞')) {
          groups['吉姆电竞'].push(store)
        } else {
          groups['其他门店'].push(store)
        }
      })
      // 移除空分组
      if (groups['吉姆电竞'].length === 0) delete groups['吉姆电竞']
      if (groups['其他门店'].length === 0) delete groups['其他门店']
      return groups
    })

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

    // 切换门店选中
    const toggleStore = (storeName) => {
      const index = selectedStores.value.indexOf(storeName)
      if (index > -1) {
        selectedStores.value.splice(index, 1)
      } else {
        selectedStores.value.push(storeName)
      }
    }

    // 全选/取消全选
    const toggleAll = () => {
      if (selectedStores.value.length === storeList.value.length) {
        selectedStores.value = []
      } else {
        selectedStores.value = [...storeList.value]
      }
    }

    // 监听日期变化
    watch(() => selectedDate.value, (newDate) => {
      if (newDate) {
        fetchData()
      }
    })

    onMounted(() => {
      fetchDates()
    })

    return {
      selectedDate,
      tableData,
      loading,
      showFilter,
      selectedStores,
      searchQuery,
      storeList,
      filteredStores,
      displayStores,
      groupedStores,
      timeColumns,
      toggleStore,
      toggleAll,
      getDisplayData,
      getPercentageClass
    }
  }
}
</script>
