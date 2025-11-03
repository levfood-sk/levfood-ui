<script setup lang="ts">
interface GalleryItem {
  id: number
  description: string
  icon: string
}

interface Props {
  items?: GalleryItem[]
}

const props = withDefaults(defineProps<Props>(), {
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
    }
  ]
})

const startIndex = ref(0)
const scrollContainer = ref<HTMLElement | null>(null)

const getCardWidth = () => {
  if (!scrollContainer.value) return 0
  const firstCard = scrollContainer.value.children[0] as HTMLElement
  if (!firstCard) return 0
  const cardWidth = firstCard.offsetWidth
  // On mobile (full width), no gap. On desktop, add gap
  const isDesktop = window.innerWidth >= 1024
  const gap = isDesktop ? 24 : 0 // gap-6 = 1.5rem = 24px on desktop
  return cardWidth + gap
}

const scrollToCard = (index: number) => {
  if (!scrollContainer.value) return
  const cardWidth = getCardWidth()
  if (cardWidth > 0) {
    scrollContainer.value.scrollTo({
      left: cardWidth * index,
      behavior: 'smooth'
    })
  }
}

const goToPrevious = () => {
  if (startIndex.value > 0) {
    startIndex.value--
  } else {
    // Loop to last card
    startIndex.value = props.items.length - 1
  }
  scrollToCard(startIndex.value)
}

const goToNext = () => {
  if (startIndex.value < props.items.length - 1) {
    startIndex.value++
  } else {
    // Loop to first card
    startIndex.value = 0
  }
  scrollToCard(startIndex.value)
}

const handleScroll = (e: Event) => {
  const container = e.target as HTMLElement
  if (container) {
    const cardWidth = getCardWidth()
    if (cardWidth > 0) {
      // Calculate which card is currently in view
      const scrollPos = container.scrollLeft
      const newIndex = Math.round(scrollPos / cardWidth)
      startIndex.value = Math.min(Math.max(newIndex, 0), props.items.length - 1)
    }
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
    <div ref="scrollContainer" class="flex lg:gap-6 gap-0 overflow-x-auto max-lg:snap-x max-lg:snap-mandatory scrollbar-hide" style="-webkit-overflow-scrolling: touch;">
      <div 
        v-for="item in props.items" 
        :key="item.id"
        class="flex-shrink-0 w-full lg:w-auto max-lg:snap-center"
      >
        <div class="h-full w-full lg:max-w-[560px]">
          <div class="w-full aspect-square lg:h-[460px] lg:w-[460px] bg-gray-200 flex items-center justify-center">
            <UIcon :name="item.icon" class="w-24 h-24 text-gray-400" />
          </div>
        </div>
      </div>
    </div>

    <!-- Navigation Controls -->
    <div class="flex lg:justify-start justify-center gap-6 mt-6">
      <button
        @click="goToPrevious"
        class="w-12 h-12 rounded-full bg-[var(--color-orange)] flex items-center justify-center shadow-lg hover:opacity-80 transition-opacity"
      >
        <UIcon name="i-lucide-arrow-left" class="w-6 h-6 text-[var(--color-dark-green)]" />
      </button>
      <button
        @click="goToNext"
        class="w-12 h-12 rounded-full bg-[var(--color-orange)] flex items-center justify-center shadow-lg hover:opacity-80 transition-opacity"
      >
        <UIcon name="i-lucide-arrow-right" class="w-6 h-6 text-[var(--color-dark-green)]" />
      </button>
    </div>
  </div>
</template>

