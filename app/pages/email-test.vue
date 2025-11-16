<script setup lang="ts">
import logoLongIcon from '~/assets/icons/logo-long-orange.svg'

definePageMeta({
  layout: false
})

const email = ref('')
const emailType = ref<'password-reset' | 'admin-notification' | 'order-notification' | 'client-order-confirmation'>('password-reset')
const loading = ref(false)
const error = ref('')
const success = ref(false)
const messageId = ref('')

const emailTypes = [
  {
    value: 'password-reset',
    label: 'Email na obnovenie hesla',
    description: 'Testuje šablónu emailu pre obnovenie hesla'
  },
  {
    value: 'admin-notification',
    label: 'Email s upozornením pre admina',
    description: 'Testuje šablónu emailu s upozornením pre administrátora'
  },
  {
    value: 'order-notification',
    label: 'Email s upozornením o objednávke',
    description: 'Testuje email s upozornením o objednávke odosielaný administrátorom'
  },
  {
    value: 'client-order-confirmation',
    label: 'Email s potvrdením objednávky pre klienta',
    description: 'Testuje email s potvrdením objednávky odosielaný klientom'
  }
]

const handleSendTest = async () => {
  loading.value = true
  error.value = ''
  success.value = false
  messageId.value = ''

  try {
    const response = await $fetch('/api/test/send-email', {
      method: 'POST',
      body: {
        email: email.value,
        type: emailType.value
      }
    })

    if (response.success) {
      success.value = true
      messageId.value = response.messageId || ''
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
  <div class="min-h-screen flex items-center justify-center bg-beige px-4 py-8">
    <UCard class="w-full bg-beige max-w-2xl" :ui="{ root: 'border-0 ring-0', header: 'border-0 ring-0' }">
      <template #header>
        <div class="text-center pt-2">
          <NuxtLink to="/" class="inline-block mb-4">
            <img :src="logoLongIcon" alt="LevFood logo" class="w-[240px] h-auto" />
          </NuxtLink>
          <h2 class="text-2xl font-bold text-[var(--color-dark-green)]">Testovacia stránka emailov</h2>
          <p class="text-sm text-[var(--color-dark-green)]/80 mt-2">
            Tato stránka bola vytvorená pre testovacie účely. Po testovaní bude odstranená.
          </p>
        </div>
      </template>

      <div class="space-y-6">
        <!-- Success Message -->
        <UAlert
          v-if="success"
          color="green"
          variant="soft"
          title="Email odoslaný!"
          :description="`Testovací email bol úspešne odoslaný. Message ID: ${messageId}`"
        >
          <template #icon>
            <Icon name="lucide:check-circle" class="w-5 h-5" />
          </template>
        </UAlert>

        <!-- Error Alert -->
        <UAlert
          v-if="error"
          variant="soft"
          color="red"
          :title="error"
          :close-button="{ icon: 'i-heroicons-x-mark-20-solid', color: 'red', variant: 'link' }"
          @close="error = ''"
        >
          <template #icon>
            <Icon name="lucide:alert-circle" class="w-5 h-5" />
          </template>
        </UAlert>

        <!-- Form -->
        <form @submit.prevent="handleSendTest" class="flex flex-col gap-4">
          <!-- Email Type Selection -->
          <UFormGroup label="Typ emailu" required class="w-full">
            <div class="space-y-2">
              <div
                v-for="type in emailTypes"
                :key="type.value"
                class="relative"
              >
                <label
                  :for="`type-${type.value}`"
                  class="flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-all"
                  :class="[
                    emailType === type.value
                      ? 'border-[var(--color-orange)] bg-orange-50/50'
                      : 'border-[var(--color-dark-green)]/20 hover:border-[var(--color-dark-green)]/40'
                  ]"
                >
                  <input
                    :id="`type-${type.value}`"
                    v-model="emailType"
                    type="radio"
                    :value="type.value"
                    class="mt-1"
                  />
                  <div class="flex-1">
                    <div class="font-semibold text-[var(--color-dark-green)]">
                      {{ type.label }}
                    </div>
                    <div class="text-sm text-[var(--color-dark-green)]/70 mt-1">
                      {{ type.description }}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </UFormGroup>

          <!-- Email Input -->
          <UFormGroup label="Email príjemcu" required class="w-full">
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
            <template #help>
              <p class="text-xs text-[var(--color-dark-green)]/60">
                Zadajte emailovú adresu, na ktorú chcete dostať testovací email
              </p>
            </template>
          </UFormGroup>

          <!-- Submit Button -->
          <UButton
            type="submit"
            block
            color="neutral"
            size="lg"
            :loading="loading"
            :disabled="!email"
            class="pricing-button bg-[var(--color-dark-green)] text-beige mb-4 h-14 text-lg font-bold"
          >
            <Icon v-if="!loading" name="lucide:send" class="w-5 h-5 mr-2" />
            Odoslať testovací email
          </UButton>
        </form>

        <!-- Back to Login Link -->
        <div class="text-center pt-4 border-t border-[var(--color-dark-green)]/20">
          <NuxtLink
            to="/login"
            class="text-sm text-[var(--color-dark-green)] hover:text-[var(--color-orange)] transition-colors inline-flex items-center gap-1"
          >
            <Icon name="lucide:arrow-left" class="w-4 h-4" />
            Späť na prihlásenie
          </NuxtLink>
          <span class="mx-3 text-[var(--color-dark-green)]/30">•</span>
          <NuxtLink
            to="/"
            class="text-sm text-[var(--color-dark-green)] hover:text-[var(--color-orange)] transition-colors inline-flex items-center gap-1"
          >
            <Icon name="lucide:home" class="w-4 h-4" />
            Domov
          </NuxtLink>
        </div>
      </div>
    </UCard>
  </div>
</template>
