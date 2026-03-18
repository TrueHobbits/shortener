<script setup lang="ts">
import { ref, computed } from 'vue'
import type { UrlItem } from '../api/client'

const props = defineProps<{
  item: UrlItem
}>()

const emit = defineEmits<{
  delete: [code: string]
}>()

const copied = ref(false)
const confirmDelete = ref(false)

const isExpired = computed(() => {
  if (!props.item.expires_at) return false
  return new Date(props.item.expires_at).getTime() < Date.now()
})

const displayUrl = computed(() => {
  const u = props.item.original_url
  return u.length > 60 ? u.slice(0, 57) + '...' : u
})

const shortDisplayUrl = computed(() => {
  return `${window.location.origin}/${props.item.short_code}`
})

const formattedDate = computed(() => {
  return new Date(props.item.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
})

const formattedExpires = computed(() => {
  if (!props.item.expires_at) return null
  return new Date(props.item.expires_at).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
})

async function copyUrl() {
  try {
    await navigator.clipboard.writeText(shortDisplayUrl.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = shortDisplayUrl.value
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  }
}

function handleDelete() {
  if (!confirmDelete.value) {
    confirmDelete.value = true
    setTimeout(() => (confirmDelete.value = false), 3000)
    return
  }
  emit('delete', props.item.short_code)
  confirmDelete.value = false
}
</script>

<template>
  <div class="url-item" :class="{ 'url-item--expired': isExpired }">
    <div class="url-item-main">
      <div class="url-item-title">
        {{ item.title || displayUrl }}
      </div>
      <div v-if="item.title" class="url-item-original">{{ displayUrl }}</div>
      <div class="url-item-short">
        <a :href="shortDisplayUrl" target="_blank">{{ shortDisplayUrl }}</a>
      </div>
    </div>
    <div class="url-item-meta">
      <span class="url-item-date">{{ formattedDate }}</span>
      <span v-if="formattedExpires" class="url-item-expires" :class="{ expired: isExpired }">
        {{ isExpired ? 'Истекла' : `до ${formattedExpires}` }}
      </span>
    </div>
    <div class="url-item-actions">
      <button class="btn btn-ghost btn-sm" @click="copyUrl">
        {{ copied ? 'Скопировано!' : 'Копировать' }}
      </button>
      <button
        class="btn btn-sm"
        :class="confirmDelete ? 'btn-danger' : 'btn-ghost'"
        @click="handleDelete"
      >
        {{ confirmDelete ? 'Точно удалить?' : 'Удалить' }}
      </button>
    </div>
  </div>
</template>
