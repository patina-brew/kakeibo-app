import { createRouter, createWebHistory } from 'vue-router'
import CalendarView from './views/CalendarView.vue'
import SummaryView from './views/SummaryView.vue'

export const routes = [
  { path: '/', name: 'calendar', component: CalendarView },
  { path: '/summary', name: 'summary', component: SummaryView },
]

export function createAppRouter(history = createWebHistory()) {
  return createRouter({ history, routes })
}
