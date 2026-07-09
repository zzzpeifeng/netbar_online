<script setup>
import Sidebar from '../components/Sidebar.vue'
</script>

<template>
  <div class="flex h-screen" style="background: #0a0e1a;">
    <!-- Sidebar -->
    <Sidebar />

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <header class="px-6 py-4 flex items-center justify-between" style="background: rgba(12,18,36,0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0,255,255,0.1);">
        <h1 class="text-lg font-semibold tracking-wide" style="color: #e0e0e0;">网吧数据监控平台</h1>
        <span class="text-xs" style="color: #00ffff; text-shadow: 0 0 8px rgba(0,255,255,0.4);">● 在线</span>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-auto p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
