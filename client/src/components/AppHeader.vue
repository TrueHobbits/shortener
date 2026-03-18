<script setup lang="ts">
import { useAuth } from '../stores/auth'
import { useRouter } from 'vue-router'

const { isAuthenticated, logout } = useAuth()
const router = useRouter()

async function handleLogout() {
  await logout()
  router.push('/')
}
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <router-link to="/" class="logo">Shortener</router-link>
      <nav class="header-nav">
        <router-link to="/" class="nav-link">Главная</router-link>
        <router-link v-if="isAuthenticated" to="/dashboard" class="nav-link">
          Мои ссылки
        </router-link>
      </nav>
      <div class="header-actions">
        <template v-if="isAuthenticated">
          <button class="btn btn-ghost" @click="handleLogout">Выйти</button>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-ghost">Войти</router-link>
          <router-link to="/register" class="btn btn-primary btn-sm header-register-btn">
            Регистрация
          </router-link>
        </template>
      </div>
    </div>
  </header>
</template>
