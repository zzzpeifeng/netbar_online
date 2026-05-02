<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Page Content -->
    <div class="pb-20">
      <router-view />
    </div>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
      <div class="flex justify-around items-center py-2">
        <button 
          @click="router.push('/h5')"
          class="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors"
          :class="$route.path === '/h5' ? 'text-slate-800' : 'text-gray-400'"
        >
          <span class="text-xl">📊</span>
          <span class="text-xs font-medium">数据</span>
        </button>        
      </div>
    </nav>
  </div>
</template>

<script>
import { useRouter, useRoute } from 'vue-router'

export default {
  setup() {
    const router = useRouter()
    const route = useRoute()
    return { router, route }
  }
}
</script>
