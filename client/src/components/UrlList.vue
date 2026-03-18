<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getUserUrls, deleteUrl, getErrorMessage, type UrlItem as UrlItemType } from '../api/client'
import UrlItem from './UrlItem.vue'

const emit = defineEmits<{
  deleted: []
}>()

const items = ref<UrlItemType[]>([])
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const loading = ref(false)
const error = ref('')
const sort = ref('created_at')
const order = ref<'desc' | 'asc'>('desc')

async function fetchUrls() {
  loading.value = true
  error.value = ''
  try {
    const result = await getUserUrls(page.value, 20, sort.value, order.value)
    items.value = result.data
    totalPages.value = result.pagination.pages
    total.value = result.pagination.total
  } catch (err) {
    error.value = getErrorMessage(err)
  } finally {
    loading.value = false
  }
}

async function handleDelete(code: string) {
  try {
    await deleteUrl(code)
    await fetchUrls()
    emit('deleted')
  } catch (err) {
    error.value = getErrorMessage(err)
  }
}

function setSort(field: string) {
  if (sort.value === field) {
    order.value = order.value === 'desc' ? 'asc' : 'desc'
  } else {
    sort.value = field
    order.value = 'desc'
  }
  page.value = 1
  fetchUrls()
}

function goToPage(p: number) {
  page.value = p
  fetchUrls()
}

onMounted(fetchUrls)

defineExpose({ fetchUrls })
</script>

<template>
  <div class="url-list">
    <div class="url-list-header">
      <div class="url-list-info">
        <span class="url-count">Всего: {{ total }}</span>
      </div>
      <div class="url-list-controls">
        <button
          class="btn btn-ghost btn-sm"
          :class="{ active: sort === 'created_at' }"
          @click="setSort('created_at')"
        >
          По дате {{ sort === 'created_at' ? (order === 'desc' ? '↓' : '↑') : '' }}
        </button>
        <button
          class="btn btn-ghost btn-sm"
          :class="{ active: sort === 'expires_at' }"
          @click="setSort('expires_at')"
        >
          По истечению {{ sort === 'expires_at' ? (order === 'desc' ? '↓' : '↑') : '' }}
        </button>
        <button
          class="btn btn-ghost btn-sm"
          :class="{ active: sort === 'title' }"
          @click="setSort('title')"
        >
          По названию {{ sort === 'title' ? (order === 'desc' ? '↓' : '↑') : '' }}
        </button>
        <button class="btn btn-ghost btn-sm" :disabled="loading" @click="fetchUrls">
          {{ loading ? 'Загрузка...' : 'Обновить' }}
        </button>
      </div>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div v-if="loading && items.length === 0" class="url-list-empty">
      Загрузка...
    </div>

    <div v-else-if="items.length === 0" class="url-list-empty">
      У вас пока нет сокращённых ссылок.
    </div>

    <template v-else>
      <UrlItem
        v-for="item in items"
        :key="item.short_code"
        :item="item"
        @delete="handleDelete"
      />
    </template>

    <div v-if="totalPages > 1" class="pagination">
      <button
        class="btn btn-ghost btn-sm"
        :disabled="page <= 1"
        @click="goToPage(page - 1)"
      >
        Назад
      </button>
      <span class="pagination-info">{{ page }} / {{ totalPages }}</span>
      <button
        class="btn btn-ghost btn-sm"
        :disabled="page >= totalPages"
        @click="goToPage(page + 1)"
      >
        Вперёд
      </button>
    </div>
  </div>
</template>
