<template>
  <div class="min-h-screen" style="background: #0a0e1a;">
    <!-- Page Content -->
    <div class="pb-20">
      <router-view />
    </div>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 z-40" style="background: rgba(12,18,36,0.95); backdrop-filter: blur(20px); border-top: 1px solid rgba(0,255,255,0.1);">
      <div class="flex justify-around items-center py-2">
        <button 
          @click="router.push('/h5')"
          class="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors"
          :style="$route.path === '/h5' ? { color: '#00ffff' } : { color: '#5a6a8a' }"
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
