<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../stores/auth'
import { useRouter } from 'vue-router'
import { getErrorMessage } from '../api/client'

const props = defineProps<{
  mode: 'login' | 'register'
}>()

const { login, register } = useAuth()
const router = useRouter()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')
const successMessage = ref('')

async function handleSubmit() {
  error.value = ''
  successMessage.value = ''

  if (!email.value.trim()) {
    error.value = 'Введите email'
    return
  }
  if (!password.value) {
    error.value = 'Введите пароль'
    return
  }
  if (password.value.length < 6) {
    error.value = 'Пароль должен быть не менее 6 символов'
    return
  }

  loading.value = true
  try {
    if (props.mode === 'login') {
      await login(email.value.trim(), password.value)
      router.push('/dashboard')
    } else {
      const result = await register(email.value.trim(), password.value)
      successMessage.value =
        result.message || 'Регистрация успешна! Проверьте почту для подтверждения.'
      email.value = ''
      password.value = ''
    }
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="auth-form" @submit.prevent="handleSubmit">
    <h1 class="auth-title">
      {{ mode === 'login' ? 'Вход' : 'Регистрация' }}
    </h1>

    <p v-if="successMessage" class="form-success">{{ successMessage }}</p>

    <div class="form-field">
      <input
        v-model="email"
        type="email"
        class="input"
        placeholder="Email"
        autocomplete="email"
      />
    </div>

    <div class="form-field">
      <input
        v-model="password"
        type="password"
        class="input"
        placeholder="Пароль"
        autocomplete="current-password"
      />
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
      {{ loading
        ? (mode === 'login' ? 'Входим...' : 'Регистрируем...')
        : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')
      }}
    </button>

    <p class="auth-switch">
      <template v-if="mode === 'login'">
        Нет аккаунта?
        <router-link to="/register">Зарегистрироваться</router-link>
      </template>
      <template v-else>
        Уже есть аккаунт?
        <router-link to="/login">Войти</router-link>
      </template>
    </p>
  </form>
</template>
