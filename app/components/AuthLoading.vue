<!--
  Auth Loading Component

  Shows a loading spinner while Firebase auth is initializing.
  Prevents flash of unauthorized content.
-->

<script setup lang="ts">
const loading = useState('firebase-auth-loading')
</script>

<template>
  <div v-if="loading" class="fixed inset-0 bg-gradient-professional flex items-center justify-center z-50"> 
    <div class="text-center">
      <UIcon name="i-heroicons-arrow-path" class="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
      <p class="text-lg font-medium text-slate-900">Načítavam ...</p>
    </div>
  </div>
</template>
