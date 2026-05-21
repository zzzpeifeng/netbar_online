import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { reportVisit } from './api/visitLog'

const app = createApp(App)
app.use(router)
app.mount('#app')

// 全局路由后置钩子：每次页面切换上报访问
router.afterEach((to) => {
  reportVisit({ page: to.path }).catch(() => {})
})
