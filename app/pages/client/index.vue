<script setup lang="ts">
definePageMeta({
  layout: false,
  middleware: 'client',
  ssr: false, // Client-only page - requires Firebase auth
})

// This page just serves as a redirect handler
// The middleware handles routing logic based on auth state
const { user, isLinked, linkCheckComplete } = useClientAuth()
const router = useRouter()

// Fallback redirect if middleware doesn't catch it
watchEffect(() => {
  if (!user.value) {
    router.replace('/login')
  } else if (isLinked.value) {
    router.replace('/client/calendar')
  } else if (linkCheckComplete.value) {
    router.replace('/client/order-code')
  }
})
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <UIcon name="i-heroicons-arrow-path" class="size-8 animate-spin text-[#0E2825]" />
  </div>
</template>
