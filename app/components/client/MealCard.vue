<script setup lang="ts">
import type { MealSlot, MealItem, RanajkyOption, ObedOption } from '~/lib/types/client-portal'
import { MEAL_SLOT_LABELS } from '~/lib/types/client-portal'

interface Props {
  mealType: MealSlot
  meal: MealItem | RanajkyOption | ObedOption | null
  isSelectable?: boolean
  selectedOption?: 'A' | 'B' | 'C' | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSelectable: false,
  selectedOption: null,
  disabled: false,
})

const emit = defineEmits<{
  select: []
}>()

// Meal type icons using heroicons (matching mobile app's Ionicons)
// Mobile: sunny-outline, cafe-outline, water-outline, restaurant-outline, nutrition-outline, moon-outline
const mealIcons: Record<MealSlot, string> = {
  ranajky: 'i-heroicons-sun',           // sunny-outline
  desiata: 'i-heroicons-cup-soda',      // cafe-outline (coffee/snack)
  polievka: 'i-heroicons-beaker',       // water-outline (soup/liquid)
  obed: 'i-heroicons-cake',             // restaurant-outline (main meal)
  olovrant: 'i-heroicons-heart',        // nutrition-outline (afternoon snack)
  vecera: 'i-heroicons-moon',           // moon-outline
}

const mealLabel = computed(() => MEAL_SLOT_LABELS[props.mealType])
const mealIcon = computed(() => mealIcons[props.mealType])

const displayName = computed(() => {
  if (!props.meal) return 'Nedostupné'
  return props.meal.name
})

const hasSelection = computed(() => props.isSelectable && props.selectedOption)
const needsSelection = computed(() => props.isSelectable && !props.selectedOption && !props.disabled)
</script>

<template>
  <div
    class="rounded-2xl bg-white p-4 shadow-sm transition-all"
    :class="{
      'border-2 border-dashed border-[var(--color-dark-green)]/30': needsSelection,
    }"
  >
    <div class="flex items-start gap-3">
      <!-- Icon -->
      <div
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-beige)]"
      >
        <UIcon
          :name="mealIcon"
          class="size-5 text-[var(--color-dark-green)]"
        />
      </div>

      <!-- Content -->
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-semibold text-[var(--color-dark-green)]">
            {{ mealLabel }}
          </h3>

          <!-- Selection badge or button -->
          <template v-if="isSelectable">
            <!-- Editable: show button to change selection -->
            <button
              v-if="hasSelection && !disabled"
              type="button"
              class="rounded-full bg-[var(--color-dark-green)] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[var(--color-dark-green)]/80"
              @click="emit('select')"
            >
              Možnosť {{ selectedOption }}
            </button>
            <!-- Locked: just show badge -->
            <span
              v-else-if="hasSelection && disabled"
              class="rounded-full bg-[var(--color-dark-green)]/10 px-3 py-1 text-xs font-medium text-[var(--color-dark-green)]"
            >
              Možnosť {{ selectedOption }}
            </span>
            <!-- Editable but no selection: show Vybrať button -->
            <button
              v-else-if="!disabled"
              type="button"
              class="rounded-full bg-[var(--color-orange)] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--color-orange)]/90"
              @click="emit('select')"
            >
              Vybrať
            </button>
            <!-- Locked with no selection: show nothing or placeholder -->
            <span
              v-else
              class="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-400"
            >
              Nevybraté
            </span>
          </template>
        </div>

        <!-- Meal name -->
        <p
          class="mt-1 text-sm"
          :class="meal ? 'text-[var(--color-dark-green)]/70' : 'text-[var(--color-dark-green)]/40 italic'"
        >
          {{ displayName }}
        </p>
      </div>
    </div>
  </div>
</template>
