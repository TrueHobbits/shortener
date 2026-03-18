<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { shortenUrl, getGuestToken, getErrorMessage, type ShortenResponse } from '../api/client'
import { useAuth } from '../stores/auth'

const emit = defineEmits<{
  shortened: []
}>()

const { isAuthenticated } = useAuth()

const url = ref('')
const title = ref('')
const ttl = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<ShortenResponse | null>(null)
const copied = ref(false)
const urlWarning = ref('')

const ttlOptions = [
  { value: '', label: 'Срок жизни (макс. 24ч)' },
  { value: '15', label: '15 минут' },
  { value: '30', label: '30 минут' },
  { value: '60', label: '1 час' },
  { value: '180', label: '3 часа' },
  { value: '360', label: '6 часов' },
  { value: '720', label: '12 часов' },
  { value: '1440', label: '24 часа' },
]

function checkUrlProtocol() {
  const v = url.value.trim()
  if (v && !v.startsWith('http://') && !v.startsWith('https://')) {
    urlWarning.value = 'URL должен начинаться с http:// или https://'
  } else {
    urlWarning.value = ''
  }
}

// Countdown timer
const countdown = ref('')
let countdownInterval: ReturnType<typeof setInterval> | null = null

function startCountdown(expiresAtStr: string) {
  if (countdownInterval) clearInterval(countdownInterval)
  function update() {
    const now = Date.now()
    const exp = new Date(expiresAtStr).getTime()
    const diff = exp - now
    if (diff <= 0) {
      countdown.value = 'Истекла'
      if (countdownInterval) clearInterval(countdownInterval)
      return
    }
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    const parts: string[] = []
    if (h > 0) parts.push(`${h}ч`)
    parts.push(`${m}м`)
    parts.push(`${s}с`)
    countdown.value = parts.join(' ')
  }
  update()
  countdownInterval = setInterval(update, 1000)
}

onUnmounted(() => {
  if (countdownInterval) clearInterval(countdownInterval)
})

function computeExpiresAt(): string | undefined {
  if (!ttl.value) return undefined
  const minutes = parseInt(ttl.value, 10)
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000)
  return expiresAt.toISOString()
}

async function handleSubmit() {
  error.value = ''
  result.value = null
  countdown.value = ''

  const trimmedUrl = url.value.trim()
  if (!trimmedUrl) {
    error.value = 'Введите URL'
    return
  }
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    error.value = 'URL должен начинаться с http:// или https://'
    return
  }

  loading.value = true
  try {
    // Ensure guest token exists for unauthenticated users
    if (!isAuthenticated.value && !localStorage.getItem('guest_token')) {
      await getGuestToken()
    }

    const res = await shortenUrl(
      trimmedUrl,
      isAuthenticated.value && title.value.trim() ? title.value.trim() : undefined,
      isAuthenticated.value ? computeExpiresAt() : undefined,
    )

    // Build display URL using current origin
    res.short_url = `${window.location.origin}/${res.short_code}`
    result.value = res

    if (res.expires_at) {
      startCountdown(res.expires_at)
    }

    emit('shortened')
    url.value = ''
    title.value = ''
    ttl.value = ''
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function clearResult() {
  result.value = null
  countdown.value = ''
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

defineExpose({ clearResult })

async function copyToClipboard() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value.short_url)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = result.value.short_url
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  }
}
</script>

<template>
  <form class="shorten-form" @submit.prevent="handleSubmit">
    <div class="form-row">
      <div class="form-inputs">
        <div class="input-wrapper">
          <input
            v-model="url"
            type="text"
            class="input input-lg"
            placeholder="Вставьте ссылку..."
            @input="checkUrlProtocol"
          />
          <p v-if="urlWarning" class="form-warning">{{ urlWarning }}</p>
        </div>

        <div v-if="isAuthenticated" class="form-extras">
          <input
            v-model="title"
            type="text"
            class="input"
            placeholder="Название (необязательно)"
          />
          <select v-model="ttl" class="input">
            <option v-for="opt in ttlOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-lg" :disabled="loading">
        {{ loading ? 'Сокращаем...' : 'Сократить' }}
      </button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div v-if="result" class="shorten-result">
      <div class="result-url-row">
        <a :href="result.short_url" target="_blank" class="result-url">
          {{ result.short_url }}
        </a>
        <button type="button" class="btn btn-ghost btn-sm" @click="copyToClipboard">
          {{ copied ? 'Скопировано!' : 'Копировать' }}
        </button>
      </div>
      <p v-if="countdown" class="result-expires">
        Действует ещё: <span class="countdown">{{ countdown }}</span>
      </p>
    </div>
  </form>
</template>
