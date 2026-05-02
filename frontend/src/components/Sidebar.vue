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
  <div class="w-64 bg-slate-800 text-white h-screen flex flex-col">
    <!-- Logo -->
    <div class="p-6 border-b border-slate-700">
      <h1 class="text-xl font-bold text-white tracking-wide">网吧数据</h1>
      <p class="text-slate-400 text-xs mt-1">管理平台</p>
    </div>

    <!-- Menu -->
    <nav class="flex-1 p-4">
      <ul class="space-y-1">
        <li v-for="item in menuItems" :key="item.path">
          <a
            @click="router.push(item.path)"
            class="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all text-sm"
            :class="isActive(item.path) ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-700 hover:text-white'"
          >
            <span class="text-lg">{{ item.icon }}</span>
            <span class="font-medium">{{ item.name }}</span>
          </a>
        </li>
      </ul>
    </nav>

    <!-- Footer -->
    <div class="p-4 border-t border-slate-700">
      <div class="text-xs text-slate-400">系统状态</div>
      <div class="flex items-center gap-2 mt-2">
        <div class="w-2 h-2 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50"></div>
        <span class="text-xs text-emerald-400">运行中</span>
      </div>
    </div>
  </div>
</template>
