<script setup lang="ts">
interface GalleryItem {
  id: number
  description: string
  icon: string
  name?: string
  role?: string
}

interface Props {
  items?: GalleryItem[]
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [
    {
      id: 1,
      name: 'John Doe',
      role: 'Developer',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      icon: 'i-lucide-user'
    },
    {
      id: 2,
      name: 'Jane Smith',
      role: 'Designer',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      icon: 'i-lucide-user'
    }
  ]
})

const startIndex = ref(0)
const scrollContainer = ref<HTMLElement | null>(null)

const goToPrevious = () => {
  if (scrollContainer.value && scrollContainer.value.scrollLeft > 0) {
    const containerWidth = scrollContainer.value.clientWidth
    scrollContainer.value.scrollBy({
      left: -containerWidth,
      behavior: 'smooth'
    })
  }
}

const goToNext = () => {
  if (scrollContainer.value) {
    const containerWidth = scrollContainer.value.clientWidth
    const maxScroll = scrollContainer.value.scrollWidth - scrollContainer.value.clientWidth
    if (scrollContainer.value.scrollLeft < maxScroll) {
      scrollContainer.value.scrollBy({
        left: containerWidth,
        behavior: 'smooth'
      })
    }
  }
}

const handleScroll = (e: Event) => {
  const container = e.target as HTMLElement
  if (container) {
    const maxScroll = container.scrollWidth - container.clientWidth
    const newIndex = Math.round((container.scrollLeft / maxScroll) * 100)
    startIndex.value = newIndex
  }
}

onMounted(() => {
  if (scrollContainer.value) {
    scrollContainer.value.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  if (scrollContainer.value) {
    scrollContainer.value.removeEventListener('scroll', handleScroll)
  }
})
</script>

<template>
  <div class="relative">
    <!-- Images in Row -->
    <div ref="scrollContainer" class="flex gap-6 overflow-x-auto max-lg:snap-x max-lg:snap-mandatory scrollbar-hide" style="-webkit-overflow-scrolling: touch;">
      <div 
        v-for="item in props.items" 
        :key="item.id"
        class="flex-shrink-0 w-full lg:w-auto max-lg:snap-center"
      >
        <div class="h-full w-full lg:w-[400px] bg-[var(--color-beige)] rounded-none overflow-hidden">
          <div class="h-[250px] lg:h-[350px] bg-gray-200 flex items-center justify-center">
            <UIcon :name="item.icon" class="w-24 h-24 text-gray-400" />
          </div>
          <div class="p-6 flex flex-col bg-[var(--color-beige)]">
            <h3 v-if="item.name" class="text-2xl font-bold text-[var(--color-dark-green)] mb-1 font-condensed">{{ item.name }}</h3>
            <p v-if="item.role" class="text-base text-[var(--color-dark-green)] mb-4 font-condensed">{{ item.role }}</p>
            <p class="text-[var(--color-dark-green)] text-base leading-relaxed flex-grow mb-6">{{ item.description }}</p>
            
            <!-- Social Links (only show if name exists, indicating a team member) -->
            <div v-if="item.name" class="flex gap-3">
              <button class="w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity">
                <UIcon name="i-lucide-linkedin" class="w-6 h-6 text-[var(--color-dark-green)]" />
              </button>
              <button class="w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity">
                <UIcon name="i-lucide-twitter" class="w-6 h-6 text-[var(--color-dark-green)]" />
              </button>
              <button class="w-8 h-8 flex items-center justify-center hover:opacity-70 transition-opacity">
                <UIcon name="i-lucide-dribbble" class="w-6 h-6 text-[var(--color-dark-green)]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Controls -->
    <div class="flex justify-center gap-6 mt-6">
      <button
        :disabled="startIndex === 0"
        @click="goToPrevious"
        class="w-12 h-12 rounded-full bg-[var(--color-orange)] flex items-center justify-center shadow-lg hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <UIcon name="i-lucide-arrow-left" class="w-6 h-6 text-[var(--color-dark-green)]" />
      </button>
      <button
        :disabled="startIndex >= 100"
        @click="goToNext"
        class="w-12 h-12 rounded-full bg-[var(--color-orange)] flex items-center justify-center shadow-lg hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <UIcon name="i-lucide-arrow-right" class="w-6 h-6 text-[var(--color-dark-green)]" />
      </button>
    </div>
  </div>
</template>

