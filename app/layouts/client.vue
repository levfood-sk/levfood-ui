<script setup lang="ts">
const { isLinked } = useClientAuth()
</script>

<template>
  <div class="min-h-screen bg-[#FCEFE6]">
    <!-- Header with logo -->
    <header class="sticky top-0 z-40 flex h-16 items-center justify-center border-b border-[#0E2825]/10 bg-[#FCEFE6]">
      <NuxtLink to="/client" class="flex items-center">
        <img
          src="~/assets/icons/logo-long-orange.svg"
          alt="LevFood"
          class="h-8"
        />
      </NuxtLink>
    </header>

    <!-- Main content - centered with max-width for mobile feel -->
    <main class="mx-auto max-w-md px-6 py-8">
      <slot />
    </main>
  </div>
</template>
