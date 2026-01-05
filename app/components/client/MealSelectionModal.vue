<script setup lang="ts">
import type { RanajkyOption, ObedOption } from '~/lib/types/client-portal'

interface Props {
  open: boolean
  mealType: 'ranajky' | 'obed'
  options: RanajkyOption[] | ObedOption[]
  currentSelection: 'A' | 'B' | 'C' | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [selection: 'A' | 'B' | 'C']
}>()

const selectedOption = ref<'A' | 'B' | 'C' | null>(null)

// Reset selection when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      selectedOption.value = props.currentSelection
    }
  }
)

const title = computed(() => (props.mealType === 'ranajky' ? 'Vyberte raňajky' : 'Vyberte obed'))

const handleConfirm = () => {
  if (selectedOption.value) {
    emit('confirm', selectedOption.value)
  }
}

const handleClose = () => {
  emit('update:open', false)
}
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :description="mealType === 'ranajky' ? 'Vyberte jednu z možností raňajok' : 'Vyberte jednu z možností obeda'"
    @update:open="handleClose"
  >
    <template #content>
      <div class="p-6">
        <!-- Header -->
        <div class="mb-6 flex items-center justify-between">
          <h2 class="text-xl font-bold text-[var(--color-dark-green)]">
            {{ title }}
          </h2>
          <button
            type="button"
            class="rounded-full p-1 text-[var(--color-dark-green)]/60 transition-colors hover:bg-[var(--color-dark-green)]/10 hover:text-[var(--color-dark-green)]"
            @click="handleClose"
          >
            <UIcon name="i-heroicons-x-mark" class="size-6" />
          </button>
        </div>

        <!-- Options -->
        <div class="mb-6 space-y-3">
          <button
            v-for="option in options"
            :key="option.id"
            type="button"
            class="flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all"
            :class="
              selectedOption === option.id
                ? 'border-[var(--color-dark-green)] bg-[var(--color-dark-green)]/5'
                : 'border-[var(--color-dark-green)]/20 hover:border-[var(--color-dark-green)]/40'
            "
            @click="selectedOption = option.id"
          >
            <!-- Radio indicator -->
            <div
              class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
              :class="
                selectedOption === option.id
                  ? 'border-[var(--color-dark-green)] bg-[var(--color-dark-green)]'
                  : 'border-[var(--color-dark-green)]/30'
              "
            >
              <div
                v-if="selectedOption === option.id"
                class="size-2 rounded-full bg-white"
              />
            </div>

            <!-- Option content -->
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex size-6 items-center justify-center rounded-full text-xs font-bold"
                  :class="
                    selectedOption === option.id
                      ? 'bg-[var(--color-dark-green)] text-white'
                      : 'bg-[var(--color-dark-green)]/10 text-[var(--color-dark-green)]'
                  "
                >
                  {{ option.id }}
                </span>
                <span class="font-medium text-[var(--color-dark-green)]">
                  Možnosť {{ option.id }}
                </span>
              </div>
              <p class="mt-1 text-sm text-[var(--color-dark-green)]/70">
                {{ option.name }}
              </p>
            </div>
          </button>
        </div>

        <!-- Confirm button -->
        <UButton
          block
          size="lg"
          color="neutral"
          class="h-14 bg-[var(--color-dark-green)] text-lg font-bold text-[var(--color-beige)]"
          :loading="loading"
          :disabled="!selectedOption || loading"
          @click="handleConfirm"
        >
          {{ loading ? 'Ukladám...' : 'Potvrdiť výber' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
