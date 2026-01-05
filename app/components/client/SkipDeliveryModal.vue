<script setup lang="ts">
interface Props {
  open: boolean
  date: string
  formattedDate: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()

const handleClose = () => {
  emit('update:open', false)
}

const handleConfirm = () => {
  emit('confirm')
}
</script>

<template>
  <UModal
    :open="open"
    title="Preskočiť doručenie?"
    description="Potvrďte preskočenie doručenia"
    @update:open="handleClose"
  >
    <template #content>
      <div class="p-6">
        <!-- Warning icon -->
        <div class="mb-4 flex justify-center">
          <div class="flex size-16 items-center justify-center rounded-full bg-[var(--color-orange)]/20">
            <UIcon name="i-heroicons-calendar-days" class="size-8 text-[var(--color-orange)]" />
          </div>
        </div>

        <!-- Title -->
        <h2 class="mb-2 text-center text-xl font-bold text-[var(--color-dark-green)]">
          Preskočiť doručenie?
        </h2>

        <!-- Description -->
        <p class="mb-4 text-center text-[var(--color-dark-green)]/70">
          Naozaj chcete preskočiť doručenie na <strong>{{ formattedDate }}</strong>?
        </p>

        <!-- Info box -->
        <div class="mb-6 rounded-xl bg-[var(--color-beige)] p-4">
          <div class="flex items-start gap-3">
            <UIcon name="i-heroicons-information-circle" class="size-5 shrink-0 text-[var(--color-dark-green)]" />
            <p class="text-sm text-[var(--color-dark-green)]">
              Váš kredit bude predĺžený o 1 deň. Túto akciu nie je možné vrátiť späť.
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-3">
          <UButton
            block
            size="lg"
            variant="outline"
            color="neutral"
            class="h-12 flex-1 font-medium"
            :disabled="loading"
            @click="handleClose"
          >
            Zrušiť
          </UButton>
          <UButton
            block
            size="lg"
            color="neutral"
            class="h-12 flex-1 bg-[var(--color-orange)] font-medium text-white hover:bg-[var(--color-orange)]/90"
            :loading="loading"
            :disabled="loading"
            @click="handleConfirm"
          >
            {{ loading ? 'Preskakujem...' : 'Preskočiť' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
