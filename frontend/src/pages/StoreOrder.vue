<script setup>
import { ref, onMounted } from 'vue'
import { getStoreOrder, updateStoreOrder, resetStoreOrder } from '../api/onlineRate'
import draggable from 'vuedraggable'

const storeList = ref([])
const loading = ref(false)
const saving = ref(false)
const showSuccess = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const showConfirmReset = ref(false)

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
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page Title -->
    <div class="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl shadow-lg p-6 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold text-white tracking-wide">设置 - 门店排序配置</h2>
        <p class="text-slate-300 text-sm mt-1">调整门店显示顺序</p>
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
  </div>
</template>
