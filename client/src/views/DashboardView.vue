<script setup lang="ts">
import { ref } from 'vue'
import ShortenForm from '../components/ShortenForm.vue'
import UrlList from '../components/UrlList.vue'

const urlListRef = ref<InstanceType<typeof UrlList> | null>(null)
const shortenFormRef = ref<InstanceType<typeof ShortenForm> | null>(null)

function onShortened() {
  urlListRef.value?.fetchUrls()
}

function onDeleted() {
  shortenFormRef.value?.clearResult()
}
</script>

<template>
  <div class="dashboard">
    <h1 style="padding-bottom: 2rem;">Мои ссылки</h1>
    <ShortenForm ref="shortenFormRef" @shortened="onShortened" />
    <UrlList ref="urlListRef" @deleted="onDeleted" />
  </div>
</template>
