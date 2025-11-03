<script setup lang="ts">
import logoLongIcon from '~/assets/icons/logo-small.svg'
const isOpen = ref(false)

// Cookie to track when modal was last dismissed
const dismissedCookie = useCookie<number>('announcement-modal-dismissed', {
  maxAge: 3600, // 1 hour in seconds
  default: () => null
})

// Check if modal should show on mount
onMounted(() => {
  // If no cookie exists or cookie value is null, show modal
  if (!dismissedCookie.value) {
    isOpen.value = true
  } else {
    // Cookie exists, check if it's older than 1 hour
    const dismissedTime = dismissedCookie.value
    const now = Date.now()
    const oneHour = 3600 * 1000 // 1 hour in milliseconds
    
    // If more than 1 hour has passed, show modal again
    if (now - dismissedTime > oneHour) {
      isOpen.value = true
    }
  }
})

// Handle modal close - store current timestamp in cookie
const handleClose = () => {
  dismissedCookie.value = Date.now()
}

// Watch for modal close (from backdrop or close button)
watch(isOpen, (newVal) => {
  if (!newVal) {
    handleClose()
  }
})
</script>

<template>
  <UModal v-model:open="isOpen" :ui="{ content: 'max-w-xl sm:rounded-[40px] rounded-[20px]' }">
    <template #content>
      <div class="py-[70px] bg-beige">
        <!-- Replace this content with your styled content -->
        <div class="text-center text-dark-green font-condensed font-bold md:text-[40px] tracking-0">
          <p class="text-[40px] leading-[100%]">OD <span class="text-orange">17.11.2025</span></p>
          <p class="text-[40px] leading-[100%]">spustené predobjednávky</p>
          <p class="text-[40px] leading-[100%] mt-8">Prevádzka začína variť <span class="text-orange">12.1.2026</span></p>
          <img :src="logoLongIcon" alt="LevFood logo" class="w-[250px] absolute bottom-0 left-0 transform -translate-x-[40px] translate-y-[35px] rotate-20 h-auto mx-auto mt-8 opacity-20" />
        </div>
      </div>
    </template>
  </UModal>
</template>

