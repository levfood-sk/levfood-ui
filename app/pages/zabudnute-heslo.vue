<script setup lang="ts">
import logoLongIcon from '~/assets/icons/logo-long-orange.svg'

definePageMeta({
  layout: false
})

const email = ref('')
const loading = ref(false)
const error = ref('')
const success = ref(false)

const handleSubmit = async () => {
  loading.value = true
  error.value = ''
  success.value = false

  try {
    const response = await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value }
    })

    if (response.success) {
      success.value = true
    } else {
      error.value = response.error || 'Nastala chyba pri odosielaní emailu'
    }
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Nastala chyba pri odosielaní emailu'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-beige px-4">
    <UCard class="w-full bg-beige max-w-md" :ui="{ root: 'border-0 ring-0', header: 'border-0 ring-0' }">
      <template #header>
        <div class="text-center pt-2">
          <NuxtLink to="/" class="inline-block mb-4">
            <img :src="logoLongIcon" alt="LevFood logo" class="w-[240px] h-auto" />
          </NuxtLink>
          <h2 class="text-2xl font-bold text-[var(--color-dark-green)]">Zabudnuté heslo</h2>
          <p class="text-sm text-[var(--color-dark-green)]/80 mt-2">
            Zadajte svoj email a pošleme vám odkaz na obnovenie hesla
          </p>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Success Message -->
        <UAlert
          v-if="success"
          color="green"
          variant="soft"
          title="Email bol odoslaný!"
          description="Ak je váš email v našom systéme, obdržíte email s inštrukciami na obnovenie hesla."
        />

        <!-- Error Alert -->
        <UAlert
          v-if="error"
          variant="soft"
          :title="error"
          :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'red', variant: 'link' }"
          @close="error = ''"
        />

        <!-- Form -->
        <form v-if="!success" @submit.prevent="handleSubmit" class="flex flex-col gap-4">
          <UFormGroup label="Email" required class="w-full">
            <UInput
              v-model="email"
              type="email"
              placeholder="vas@email.com"
              size="lg"
              :disabled="loading"
              required
              class="w-full bg-beige"
              :ui="{
                base: 'rounded-md bg-transparent placeholder:text-[var(--color-dark-green)]/50 ring-1 ring-[var(--color-dark-green)] focus:border-[var(--color-orange)] focus:ring-2 focus:ring-inset focus:ring-[var(--color-orange)]',
                icon: 'text-[var(--color-dark-green)]'
              }"
            >
              <template #leading>
                <Icon name="lucide:mail" class="w-5 h-5" />
              </template>
            </UInput>
          </UFormGroup>

          <UButton
            type="submit"
            block
            color="neutral"
            size="lg"
            :loading="loading"
            class="pricing-button bg-[var(--color-dark-green)] text-beige mb-4 h-14 text-lg font-bold"
          >
            Odoslať email
          </UButton>
        </form>

        <!-- Back to Login Link -->
        <div class="text-center pt-4 border-t border-[var(--color-dark-green)]/20">
          <NuxtLink
            to="/admin-levfood"
            class="text-sm text-[var(--color-dark-green)] hover:text-[var(--color-orange)] transition-colors"
          >
            <Icon name="lucide:arrow-left" class="w-4 h-4 inline mr-1" />
            Späť na prihlásenie
          </NuxtLink>
        </div>
      </div>
    </UCard>
  </div>
</template>
