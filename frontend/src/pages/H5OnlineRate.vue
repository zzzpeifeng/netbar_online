<template>
  <div class="min-h-screen" style="background: #0a0e1a;">
    <!-- Header -->
    <div class="px-4 pt-12 pb-4" style="background: linear-gradient(135deg, rgba(12,18,36,0.95), rgba(15,22,45,0.98));">
      <h1 class="text-lg font-semibold tracking-wide" style="color: #e0e0e0;">网吧上座率</h1>
      <p class="text-xs mt-1" style="color: #6b7fa3;">实时监控数据</p>
    </div>

    <!-- Filter Area -->
    <div class="px-4 py-3">
      <div class="flex gap-2 items-center">
        <input
          type="date"
          v-model="selectedDate"
          style="width: 130px; flex-shrink: 0;"
          class="sci-input px-2 py-2 rounded-xl text-sm"
        />
        <button
          @click="showAreaFilter = true"
          class="sci-btn-ghost flex-shrink-0 px-3 py-2 rounded-xl text-sm flex items-center gap-1 whitespace-nowrap"
        >
          <span class="text-xs">区</span>
          <span class="px-1 py-0.5 rounded-full text-xs" :style="selectedAreas.length === 0 ? { background: 'rgba(139,92,246,0.12)', color: '#a78bfa' } : { background: 'rgba(139,92,246,0.2)', color: '#c4b5fd' }">
            {{ selectedAreas.length === 0 ? '全部' : selectedAreas.length }}
          </span>
        </button>
        <button 
          @click="showFilter = true"
          class="sci-btn-ghost flex-shrink-0 px-3 py-2 rounded-xl text-sm flex items-center gap-1 whitespace-nowrap"
        >
          <span class="hidden sm:inline">筛选</span>
          <span class="inline sm:hidden text-xs">筛</span>
          <span class="px-1 py-0.5 rounded-full text-xs" style="background: rgba(0,255,255,0.15); color: #00ffff;">{{ selectedStores.length }}</span>
        </button>
      </div>
    </div>

    <!-- Data Table (Horizontal Scroll) -->
    <div class="px-4">
      <div class="rounded-2xl" style="background: rgba(15,20,40,0.6); backdrop-filter: blur(20px); border: 1px solid rgba(0,255,255,0.12);">
        <!-- 整体横向滚动 -->
        <div class="overflow-x-auto">
          <div class="inline-block min-w-full">
            <!-- Header -->
            <div class="flex" style="border-bottom: 1px solid rgba(0,255,255,0.08);">
              <div class="sticky left-0 z-20 w-20 min-w-20 px-3 py-2.5 text-xs font-medium uppercase tracking-wider" style="background: rgba(0,255,255,0.04); color: #6b7fa3; border-right: 1px solid rgba(0,255,255,0.08);">
                门店
              </div>
              <div 
                v-for="hour in timeColumns" 
                :key="hour"
                class="w-14 min-w-14 px-1 py-2.5 text-center text-xs font-medium" style="color: #6b7fa3;"
              >
                {{ hour }}
              </div>
            </div>

            <!-- Store Rows -->
            <template v-for="(group, groupName) in groupedStores" :key="groupName">
              <!-- Group Header -->
              <div class="px-3 py-1.5 text-xs font-medium" style="color: #6b7fa3; background: rgba(0,255,255,0.04); border-bottom: 1px solid rgba(0,255,255,0.08);">
                {{ groupName }}
              </div>
              
              <!-- Store Row -->
              <div 
                v-for="store in group" 
                :key="store.storeName"
                class="flex" style="border-bottom: 1px solid rgba(255,255,255,0.03);"
              >
                <!-- Store Name (Fixed) -->
                <div class="sticky left-0 z-10 w-20 min-w-20 px-3 py-2.5 flex items-center" style="background: rgba(15,20,40,0.9); border-right: 1px solid rgba(0,255,255,0.08);">
                  <span class="text-xs" :class="groupName === '吉姆电竞' ? 'text-cyan-400 font-medium' : 'text-slate-400'">
                    {{ store.storeName.replace('吉姆电竞-', '') }}
                  </span>
                </div>
                
                <!-- Time Slots -->
                <div 
                  v-for="hour in timeColumns" 
                  :key="hour"
                  class="w-14 min-w-14 px-1 py-2 text-center"
                >
                  <div class="text-xs mb-0.5" style="color: #5a6a8a;">{{ getDisplayData(store, hour).online }}/{{ getDisplayData(store, hour).total }}</div>
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
        class="absolute inset-0" style="background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);"
        @click="showFilter = false"
      ></div>
      
      <!-- Modal Content -->
      <div class="relative rounded-t-3xl w-full max-h-[70vh] flex flex-col z-10" style="background: rgba(15,22,45,0.98); backdrop-filter: blur(20px);">
        <!-- Handle -->
        <div class="w-9 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-4 flex-shrink-0" style="background: rgba(255,255,255,0.15);"></div>
        
        <div class="flex-1 overflow-y-auto px-5 pb-8">
          <h3 class="text-lg font-semibold mb-3" style="color: #e0e0e0;">选择门店</h3>
          
          <!-- Search -->
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="搜索门店名称..."
            class="sci-input w-full px-4 py-2.5 rounded-xl text-sm mb-3"
          />
          
          <!-- Select All -->
          <div class="flex justify-between items-center py-2.5 mb-2" style="border-bottom: 1px solid rgba(0,255,255,0.08);">
            <span class="text-sm font-medium" style="color: #e0e0e0;">全选</span>
            <button 
              @click="toggleAll"
              class="w-11 h-6 rounded-full transition-colors relative"
              :class="selectedStores.length === storeList.length ? 'bg-slate-700' : 'bg-gray-300'"
              :style="selectedStores.length === storeList.length ? { background: 'rgba(0,255,255,0.3)' } : { background: 'rgba(255,255,255,0.1)' }"
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
            class="flex items-center gap-3 py-3 cursor-pointer" style="border-bottom: 1px solid rgba(255,255,255,0.03);"
          >
            <input
              type="checkbox"
              :checked="selectedStores.includes(store)"
              @change="toggleStore(store)"
              class="w-5 h-5"
              style="accent-color: #00ffff;"
            />
            <span
              class="text-sm"
              :class="store.includes('吉姆电竞') ? 'text-cyan-400 font-medium' : 'text-slate-400'"
            >
              {{ store }}
            </span>
            <span
              v-if="storeToAreaMap[store]"
              class="px-1.5 py-0.5 rounded-md text-[10px] shrink-0"
              style="background: rgba(139,92,246,0.12); color: #a78bfa; border: 1px solid rgba(139,92,246,0.2);"
            >
              {{ storeToAreaMap[store].areaName }}
            </span>
          </label>

          <div 
            v-if="filteredStores.length === 0"
            class="py-8 text-center text-sm" style="color: #5a6a8a;"
          >
            未找到匹配的门店
          </div>

          <!-- Confirm Button -->
          <button 
            @click="showFilter = false"
            class="w-full py-3.5 rounded-xl text-sm font-medium mt-4" style="background: rgba(0,255,255,0.15); color: #00ffff; border: 1px solid rgba(0,255,255,0.2);"
          >
            确认 ({{ selectedStores.length }}/{{ storeList.length }})
          </button>
        </div>
      </div>
    </div>

    <!-- Area Filter Modal -->
    <div
      v-if="showAreaFilter"
      class="fixed inset-0 z-50 flex items-end"
    >
      <!-- Overlay -->
      <div
        class="absolute inset-0" style="background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);"
        @click="showAreaFilter = false"
      ></div>

      <!-- Modal Content -->
      <div class="relative rounded-t-3xl w-full max-h-[70vh] flex flex-col z-10" style="background: rgba(15,22,45,0.98); backdrop-filter: blur(20px);">
        <!-- Handle -->
        <div class="w-9 h-1 rounded-full mx-auto mt-3 mb-4 flex-shrink-0" style="background: rgba(255,255,255,0.15);"></div>

        <div class="flex-1 overflow-y-auto px-5 pb-8">
          <h3 class="text-lg font-semibold mb-3" style="color: #e0e0e0;">选择区</h3>

          <!-- Loading -->
          <div v-if="areasLoading" class="py-8 flex items-center justify-center gap-2 text-sm" style="color: #5a6a8a;">
            <div class="w-4 h-4 border-2 border-purple-500 border-b-transparent rounded-full animate-spin"></div>加载区...
          </div>

          <template v-else>
            <!-- Select All -->
            <div class="flex justify-between items-center py-2.5 mb-2" style="border-bottom: 1px solid rgba(139,92,246,0.08);">
              <span class="text-sm font-medium" style="color: #e0e0e0;">
                {{ selectedAreas.length === areas.length && areas.length > 0 ? '取消全选（=不筛选）' : '全选所有区' }}
              </span>
              <button
                @click="toggleAllAreas"
                class="w-11 h-6 rounded-full transition-colors relative"
                :style="selectedAreas.length === areas.length && areas.length > 0 ? { background: 'rgba(139,92,246,0.3)' } : { background: 'rgba(255,255,255,0.1)' }"
              >
                <div
                  class="w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all"
                  :class="selectedAreas.length === areas.length && areas.length > 0 ? 'right-0.5' : 'left-0.5'"
                ></div>
              </button>
            </div>

            <!-- Area List -->
            <label
              v-for="a in areas"
              :key="a._id"
              class="flex items-center gap-3 py-3 cursor-pointer" style="border-bottom: 1px solid rgba(255,255,255,0.03);"
            >
              <input
                type="checkbox"
                :checked="selectedAreas.includes(a._id)"
                @change="toggleArea(a._id)"
                class="w-5 h-5"
                style="accent-color: #8b5cf6;"
              />
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span class="text-sm truncate" :style="a.isVirtual ? 'color: #ffaa00;' : 'color: #c8d0e0;'">
                  {{ a.name }}
                </span>
                <span class="px-1.5 py-0.5 rounded-full text-[11px] shrink-0" style="background: rgba(255,255,255,0.04); color: #5a6a8a;">
                  {{ a.stores?.length || 0 }}
                </span>
              </div>
            </label>

            <div v-if="areas.length === 0" class="py-8 text-center text-sm" style="color: #5a6a8a;">
              暂无区数据，请在设置页面中创建
            </div>

            <!-- Tip -->
            <div class="mt-3 px-1 py-1 text-[11px]" style="color: #5a6a8a;">
              未选中任何区 = 不按区筛选（全部显示）
            </div>

            <!-- Confirm Button -->
            <button
              @click="showAreaFilter = false"
              class="w-full py-3.5 rounded-xl text-sm font-medium mt-4" style="background: rgba(139,92,246,0.15); color: #c4b5fd; border: 1px solid rgba(139,92,246,0.2);"
            >
              确认 ({{ selectedAreas.length === 0 ? '全部' : selectedAreas.length + '/' + areas.length }})
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { getAvailableDates, getOnlineRateData, getStoreOrder } from '../api/onlineRate'
import { reportVisit } from '../api/visitLog'
import { getAreaList } from '../api/area'

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
    // 时间列定义：根据接口返回数据动态生成，避免写死漏列/错位
    const timeColumns = computed(() => {
      const set = new Set()
      for (const s of tableData.value) {
        if (s.timeSlots) Object.keys(s.timeSlots).forEach(k => set.add(k))
      }
      return Array.from(set).sort()
    })

    // ========== 区筛选 ==========
    const areas = ref([])
    const areasLoading = ref(false)
    const showAreaFilter = ref(false)
    const selectedAreas = ref([]) // 空数组 = 不按区筛选（全部区）

    // 门店名 → 区信息映射 { areaId, areaName }
    const storeToAreaMap = computed(() => {
      const m = {}
      for (const a of areas.value) {
        for (const s of (a.stores || [])) {
          m[s.storeName] = { areaId: a._id, areaName: a.name }
        }
      }
      return m
    })
    // 选中区所包含的门店名称集合（空选中表示全部区 → null）
    const areaAllowedStoreNames = computed(() => {
      if (selectedAreas.value.length === 0) return null
      const set = new Set()
      for (const aid of selectedAreas.value) {
        const a = areas.value.find(x => x._id === aid)
        if (a) for (const s of (a.stores || [])) set.add(s.storeName)
      }
      return set
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
    // 幽灵选中裁剪：当区筛选变化时，把 selectedStores 中不在允许范围内的门店移除
    // 若移除后为空 → 自动回补（在允许范围内全选），避免空选中导致表格空白
    const clipGhostSelections = () => {
      const allowed = areaAllowedStoreNames.value
      if (!allowed) return // 不筛选时不裁剪
      const next = selectedStores.value.filter(n => allowed.has(n))
      if (next.length === 0 && tableData.value.length > 0) {
        selectedStores.value = tableData.value
          .filter(s => allowed.has(s.storeName))
          .map(s => s.storeName)
      } else {
        selectedStores.value = next
      }
    }

    // 获取数据
    const fetchData = async () => {
      if (!selectedDate.value) return
      loading.value = true
      try {
        // 并行拉取：上座率数据 + 区列表
        const [res] = await Promise.all([
          getOnlineRateData(selectedDate.value),
          fetchAreas().catch(e => { console.warn('拉取区列表失败，继续', e); return null })
        ])
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

          // 区筛选幽灵裁剪（基于新数据）
          clipGhostSelections()

          // 默认全选（仅在未手动选过时，考虑区筛选范围）
          if (selectedStores.value.length === 0) {
            const allowed = areaAllowedStoreNames.value
            if (allowed) {
              selectedStores.value = tableData.value
                .filter(s => allowed.has(s.storeName))
                .map(s => s.storeName)
            } else {
              selectedStores.value = tableData.value.map(store => store.storeName)
            }
          }
        }
      } catch (error) {
        console.error('获取数据失败:', error)
      } finally {
        loading.value = false
      }
    }

    // 门店列表（叠加区筛选范围）
    const storeList = computed(() => {
      const allowed = areaAllowedStoreNames.value
      const pool = allowed
        ? tableData.value.filter(s => allowed.has(s.storeName))
        : tableData.value
      return pool.map(store => store.storeName)
    })

    // 过滤后的门店列表（搜索 + 区筛选）
    const filteredStores = computed(() => {
      if (!searchQuery.value) return storeList.value
      const query = searchQuery.value.toLowerCase()
      return storeList.value.filter(name => name.toLowerCase().includes(query))
    })

    // 显示的门店（区筛选 + 门店选中）
    const displayStores = computed(() => {
      const allowed = areaAllowedStoreNames.value
      return tableData.value.filter(store =>
        selectedStores.value.includes(store.storeName) &&
        (!allowed || allowed.has(store.storeName))
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
      // hour 已是动态时段字符串（如 "10:00"），直接作为 timeKey 取数
      const data = store.timeSlots?.[hour]
      
      if (!data) return { online: 0, total: 0, percentage: 0 }
        
      return {
        online: data.onlineCount,
        total: data.totalCount,
        percentage: data.percentage
      }
    }

    // 获取百分比对应的样式类
    const getPercentageClass = (percentage) => {
      if (percentage < 50) return 'rate-low'
      if (percentage <= 70) return 'rate-mid'
      return 'rate-high'
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

    // 全选/取消全选（考虑区筛选范围）
    const toggleAll = () => {
      const pool = storeList.value
      const allSelected = pool.length > 0 && pool.every(n => selectedStores.value.includes(n))
      if (allSelected) {
        // 取消全选：只移除 pool 里的那些
        selectedStores.value = selectedStores.value.filter(n => !pool.includes(n))
      } else {
        // 全选：合并入 pool
        const set = new Set([...selectedStores.value, ...pool])
        selectedStores.value = [...set]
      }
    }

    // 区筛选变化时裁剪幽灵选中
    watch(selectedAreas, () => {
      clipGhostSelections()
    }, { deep: true })

    // 监听日期变化
    watch(() => selectedDate.value, (newDate) => {
      if (newDate) {
        fetchData()
      }
    })

    onMounted(() => {
      fetchDates()
      reportVisit({ page: '/h5' }).catch(() => {})
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
      getPercentageClass,
      // 区筛选
      areas,
      areasLoading,
      showAreaFilter,
      selectedAreas,
      storeToAreaMap,
      toggleArea,
      toggleAllAreas
    }
  }
}
</script>
