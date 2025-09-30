<script setup lang="ts">
const colorMode = useColorMode()

const isDark = computed({
  get() {
    return colorMode.value === 'dark'
  },
  set(value) {
    colorMode.preference = value ? 'dark' : 'light'
  }
})

const toggleTheme = () => {
  isDark.value = !isDark.value
}
</script>

<template>
  <UButton
    color="neutral"
    variant="ghost"
    aria-label="Toggle theme"
    @click="toggleTheme"
  >
    <Icon v-if="isDark" name="lucide:moon" class="w-5 h-5" />
    <Icon v-else name="lucide:sun" class="w-5 h-5" />
  </UButton>
</template>