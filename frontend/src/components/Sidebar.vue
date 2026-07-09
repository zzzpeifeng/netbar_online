<script setup>
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const menuItems = [
  { name: '网吧上座率', path: '/', icon: '📊' },
  { name: '设置', path: '/settings', icon: '⚙️' }
]

const isActive = (path) => {
  return route.path === path
}
</script>

<template>
  <div class="w-64 h-screen flex flex-col relative" style="background: linear-gradient(180deg, rgba(12,18,36,0.95) 0%, rgba(15,22,45,0.98) 100%); border-right: 1px solid rgba(0,255,255,0.1);">
    <!-- Logo -->
    <div class="p-6" style="border-bottom: 1px solid rgba(0,255,255,0.08);">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style="background: linear-gradient(135deg, #00ffff, #8b5cf6); box-shadow: 0 0 20px rgba(0,255,255,0.3);">🎮</div>
        <div>
          <h1 class="text-base font-bold tracking-wide" style="background: linear-gradient(90deg, #00ffff, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">NETBAR MONITOR</h1>
          <p class="text-xs mt-0.5" style="color: #5a6a8a;">管理平台</p>
        </div>
      </div>
    </div>

    <!-- Menu -->
    <nav class="flex-1 p-4">
      <ul class="space-y-1">
        <li v-for="item in menuItems" :key="item.path">
          <a
            @click="router.push(item.path)"
            class="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all text-sm"
            :class="isActive(item.path) ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'"
            :style="isActive(item.path) ? { background: 'rgba(0,255,255,0.08)', border: '1px solid rgba(0,255,255,0.2)', boxShadow: '0 0 15px rgba(0,255,255,0.06)' } : {}"
          >
            <span class="text-lg">{{ item.icon }}</span>
            <span class="font-medium">{{ item.name }}</span>
          </a>
        </li>
      </ul>
    </nav>

    <!-- Footer -->
    <div class="p-4" style="border-top: 1px solid rgba(0,255,255,0.08);">
      <div class="text-xs" style="color: #5a6a8a;">系统状态</div>
      <div class="flex items-center gap-2 mt-2">
        <div class="w-2 h-2 rounded-full" style="background: #00ff88; box-shadow: 0 0 8px rgba(0,255,136,0.5);"></div>
        <span class="text-xs" style="color: #00ff88;">运行中</span>
      </div>
    </div>
  </div>
</template>
