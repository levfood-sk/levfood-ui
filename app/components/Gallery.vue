<script setup lang="ts">
interface GalleryItem {
  id: number
  description: string
  icon: string
  name?: string
  role?: string
}

interface Props {
  title: string
  subtitle: string
  items?: GalleryItem[]
  layout?: 'side' | 'top'
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'top',
  items: () => [
    {
      id: 1,
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      icon: 'i-lucide-mountain'
    },
    {
      id: 2,
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      icon: 'i-lucide-building'
    },
    {
      id: 3,
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      icon: 'i-lucide-trees'
    },
    {
      id: 4,
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      icon: 'i-lucide-waves'
    },
    {
      id: 5,
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      icon: 'i-lucide-map-pin'
    },
    {
      id: 6,
      title: 'Sunset',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      icon: 'i-lucide-sun'
    }
  ]
})

const startIndex = ref(0)

const goToPrevious = () => {
  if (startIndex.value > 0) {
    startIndex.value--
  }
}

const goToNext = () => {
  if (startIndex.value < props.items.length - 1) {
    startIndex.value++
  }
}

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value)
})
</script>

<template>
  <div class="container mx-auto px-4 py-20">
    <!-- Top Layout -->
    <div v-if="layout === 'top'">
      <!-- Title at Top -->
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold text-slate-900 mb-4">{{ title }}</h2>
        <p class="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
          {{ subtitle }}
        </p>
      </div>

      <!-- Gallery Content -->
      <div class="relative">
        <!-- Images in Row -->
        <div class="flex gap-6">
          <div 
            v-for="item in visibleItems" 
            :key="item.id"
            class="flex-shrink-0"
          >
            <UCard class="overflow-hidden h-full w-[400px]" variant="soft">
              <div class="h-[350px] bg-gray-200 flex items-center justify-center">
                <UIcon :name="item.icon" class="w-24 h-24 text-gray-400" />
              </div>
              <div class="p-6 h-[200px] flex flex-col">
                <h3 v-if="item.name" class="text-xl font-bold text-slate-900 mb-1">{{ item.name }}</h3>
                <p v-if="item.role" class="text-sm text-slate-500 mb-3">{{ item.role }}</p>
                <p class="text-slate-600 flex-grow overflow-hidden">{{ item.description }}</p>
                
                <!-- Social Links (only show if name exists, indicating a team member) -->
                <div v-if="item.name" class="flex gap-3 mt-4">
                  <UButton icon="i-lucide-linkedin" variant="ghost" color="neutral" size="sm" />
                  <UButton icon="i-lucide-twitter" variant="ghost" color="neutral" size="sm" />
                  <UButton icon="i-lucide-dribbble" variant="ghost" color="neutral" size="sm" />
                </div>
              </div>
            </UCard>
          </div>
        </div>

        <!-- Navigation Controls -->
        <div class="flex justify-center gap-3 mt-6">
          <UButton
            icon="i-lucide-chevron-left"
            size="lg"
            variant="outline"
            color="neutral"
            :disabled="startIndex === 0"
            @click="goToPrevious"
          />
          <UButton
            icon="i-lucide-chevron-right"
            size="lg"
            variant="outline"
            color="neutral"
            :disabled="startIndex >= props.items.length - 1"
            @click="goToNext"
          />
        </div>
      </div>
    </div>

    <!-- Side Layout -->
    <div v-else class="grid grid-cols-12 gap-4 items-center">
      <!-- Left Text Content -->
      <div class="col-span-12 lg:col-span-4 flex flex-col">
        <h2 class="text-4xl font-bold text-slate-900 mb-4">{{ title }}</h2>
        <p class="text-lg text-slate-600 leading-relaxed">
          {{ subtitle }}
        </p>
      </div>

      <!-- Right Gallery Content -->
      <div class="col-span-12 lg:col-span-8">
        <div class="relative">
          <!-- Images in Row -->
          <div class="flex gap-6">
            <div 
              v-for="item in visibleItems" 
              :key="item.id"
              class="flex-shrink-0"
            >
              <UCard class="overflow-hidden h-full max-w-[560px]" variant="soft">
                <div class="h-[560px] bg-gray-200 flex items-center justify-center">
                  <UIcon :name="item.icon" class="w-24 h-24 text-gray-400" />
                </div>
                <div class="p-6 h-[200px] flex flex-col">
                  <p class="text-slate-600 flex-grow overflow-hidden">{{ item.description }}</p>
                </div>
              </UCard>
            </div>
          </div>

          <!-- Navigation Controls -->
          <div class="flex gap-3 mt-6">
            <UButton
              icon="i-lucide-chevron-left"
              size="lg"
              variant="outline"
              color="neutral"
              :disabled="startIndex === 0"
              @click="goToPrevious"
            />
            <UButton
              icon="i-lucide-chevron-right"
              size="lg"
              variant="outline"
              color="neutral"
              :disabled="startIndex >= props.items.length - 1"
              @click="goToNext"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
