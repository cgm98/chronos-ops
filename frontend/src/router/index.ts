import { createRouter, createWebHistory } from 'vue-router';
import OverviewView from '../views/OverviewView.vue';
import TasksView from '../views/TasksView/Index.vue';
import RoutinesView from '../views/RoutinesView/Index.vue';
import CalendarView from '../views/CalendarView/Index.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'overview', component: OverviewView },
    { path: '/tasks', name: 'tasks', component: TasksView },
    { path: '/routines', name: 'routines', component: RoutinesView },
    { path: '/calendar', name: 'calendar', component: CalendarView }
  ]
});
