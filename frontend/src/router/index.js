import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../components/DefaultLayout.vue'
import H5Layout from '../components/H5Layout.vue'
import OnlineRateCompare from '../pages/OnlineRateCompare.vue'
import StoreOrder from '../pages/StoreOrder.vue'
import H5OnlineRate from '../pages/H5OnlineRate.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      children: [
        {
          path: '',
          name: 'online-rate',
          component: OnlineRateCompare
        },
        {
          path: 'settings',
          name: 'settings',
          component: StoreOrder
        }
      ]
    },
    {
      path: '/h5',
      name: 'h5',
      component: H5OnlineRate
    }
  ]
})

export default router
