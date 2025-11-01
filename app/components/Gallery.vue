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
  timerEggIcon?: string
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'top',
  timerEggIcon: '',
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
const topScrollContainer = ref<HTMLElement | null>(null)
const sideScrollContainer = ref<HTMLElement | null>(null)

const goToPrevious = () => {
  if (startIndex.value > 0) {
    startIndex.value--
    scrollToIndex(startIndex.value)
  }
}

const goToNext = () => {
  if (startIndex.value < props.items.length - 1) {
    startIndex.value++
    scrollToIndex(startIndex.value)
  }
}

const scrollToIndex = (index: number) => {
  const container = props.layout === 'top' ? topScrollContainer.value : sideScrollContainer.value
  if (container) {
    const cardWidth = container.scrollWidth / props.items.length
    container.scrollTo({
      left: cardWidth * index,
      behavior: 'smooth'
    })
  }
}

const handleScroll = (e: Event) => {
  const container = e.target as HTMLElement
  if (container) {
    const cardWidth = container.scrollWidth / props.items.length
    const newIndex = Math.round(container.scrollLeft / cardWidth)
    startIndex.value = newIndex
  }
}

onMounted(() => {
  if (topScrollContainer.value) {
    topScrollContainer.value.addEventListener('scroll', handleScroll)
  }
  if (sideScrollContainer.value) {
    sideScrollContainer.value.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  if (topScrollContainer.value) {
    topScrollContainer.value.removeEventListener('scroll', handleScroll)
  }
  if (sideScrollContainer.value) {
    sideScrollContainer.value.removeEventListener('scroll', handleScroll)
  }
})

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value)
})
</script>

<template>
  <div class="container mx-auto px-4 lg:py-20 py-10">
    <!-- Top Layout -->
    <div v-if="layout === 'top'">
      <!-- Title at Top -->
      <div class="grid grid-cols-12 gap-4 mb-16 relative items-center justify-center">
        <!-- Timer Egg Icon (absolute positioned) -->
        <img 
          v-if="timerEggIcon"
          :src="timerEggIcon" 
          alt="Timer egg" 
          class="absolute lg:block hidden top-[40px] right-[60px] w-24 h-28 lg:w-32 lg:h-36 xl:w-40 xl:h-44 opacity-90 z-10"
        />
        
        <div class="col-span-12 lg:col-span-8 lg:col-start-3 text-center">
          <h2 class="text-[4rem] lg:text-[6rem] font-condensed font-bold text-[var(--color-dark-green)] leading-tight">
            {{ title }}
          </h2>
        </div>
        
        <div class="col-span-12 text-center">
          <p class="text-[1.5rem] lg:text-[2.5rem] text-[var(--color-dark-green)] leading-relaxed font-condensed">
            {{ subtitle }}
          </p>
        </div>
      </div>

      <!-- Gallery Content -->
      <div class="relative">
        <!-- Images in Row -->
        <div ref="topScrollContainer" class="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide" style="-webkit-overflow-scrolling: touch;">
          <div 
            v-for="item in props.items" 
            :key="item.id"
            class="flex-shrink-0 w-full lg:w-auto snap-center"
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
            :disabled="startIndex >= props.items.length - 1"
            @click="goToNext"
            class="w-12 h-12 rounded-full bg-[var(--color-orange)] flex items-center justify-center shadow-lg hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <UIcon name="i-lucide-arrow-right" class="w-6 h-6 text-[var(--color-dark-green)]" />
          </button>
        </div>
      </div>
    </div>

    <!-- Side Layout -->
    <div v-else class="grid grid-cols-12 gap-4 items-center">
      <!-- Left Text Content with Bubbles -->
      <div class="col-span-12 lg:col-span-6 flex flex-col relative lg:py-20 py-6">
        <!-- Mobile Grid Bubbles (above title) -->
        <!-- <div 
          v-if="title === 'Galéria'"
          class="grid grid-cols-2 gap-4 mb-8 lg:hidden"
        >
          <div class="bg-[var(--color-orange)] rounded-lg p-6 flex items-center justify-center shadow-lg">
            <span class="text-white text-[2rem] font-condensed font-bold text-center leading-tight">lokálne<br/>suroviny</span>
          </div>
          <div class="bg-[var(--color-orange)] rounded-lg p-6 flex items-center justify-center shadow-lg">
            <span class="text-white text-[2rem] font-condensed font-bold text-center leading-tight">eko<br/>balenie</span>
          </div>
          <div class="bg-[var(--color-orange)] rounded-lg p-6 flex items-center justify-center shadow-lg">
            <span class="text-white text-[2rem] font-condensed font-bold text-center leading-tight">poctivá<br/>chuť</span>
          </div>
          <div class="bg-[var(--color-orange)] rounded-lg p-6 flex items-center justify-center shadow-lg">
            <span class="text-white text-[2rem] font-condensed font-bold text-center leading-tight">kvalita<br/>bez kompromisov</span>
          </div>
        </div> -->
        
        <!-- Gallery Title -->
        <h2 class="text-[4rem] lg:text-[6rem] font-condensed font-bold text-[var(--color-dark-green)] mb-4 relative z-10 text-center lg:text-left">
          {{ title }}
        </h2>
        
        <!-- Desktop Bubbles (positioned around title) -->
        <!-- <div 
          class="absolute w-full h-full hidden lg:block"
          v-if="title === 'Galéria'"
        >
          <div class="absolute top-[-370px] left-[60px] bg-[var(--color-orange)] rounded-full w-[200px] h-[200px] flex items-center justify-center shadow-lg">
            <span class="text-white text-[1.5rem] w-full text-center font-condensed font-bold leading-tight px-4">lokálne<br/>suroviny</span>
          </div>
          
          <div class="absolute top-[-120px] left-0 bg-[var(--color-orange)] rounded-full flex items-center w-[120px] h-[120px] justify-center shadow-lg">
            <span class="text-white text-[1.5rem] w-full text-center font-condensed font-bold leading-tight px-2">eko<br/>balenie</span>
          </div>
          
          <div class="absolute top-[-180px] right-[180px] bg-[var(--color-orange)] rounded-full w-[170px] h-[170px] flex items-center justify-center shadow-lg">
            <span class="text-white text-[1.5rem] w-full text-center font-condensed font-bold leading-tight px-4">poctivá<br/>chuť</span>
          </div>
          
          <div class="absolute top-[50px] right-[100px] bg-[var(--color-orange)] rounded-full w-[220px] h-[220px] flex items-center justify-center shadow-lg">
            <span class="text-white text-[1.5rem] w-full text-center font-condensed font-bold leading-tight px-4">kvalita<br/>bez kompromisov</span>
          </div>
        </div> -->
      </div>

      <!-- Right Gallery Content -->
      <div class="col-span-12 lg:col-span-6">
        <div class="relative">
          <!-- Images in Row -->
          <div ref="sideScrollContainer" class="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide" style="-webkit-overflow-scrolling: touch;">
            <div 
              v-for="item in props.items" 
              :key="item.id"
              class="flex-shrink-0 w-full lg:w-auto snap-center"
            >
              <UCard class="overflow-hidden h-full w-full lg:max-w-[560px]" variant="soft">
                <div class="h-[250px] lg:h-[460px] bg-gray-200 flex items-center justify-center">
                  <UIcon :name="item.icon" class="w-24 h-24 text-gray-400" />
                </div>
                <div class="p-6 flex flex-col">
                  <p class="text-slate-600 flex-grow overflow-hidden">{{ item.description }}</p>
                </div>
              </UCard>
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
              :disabled="startIndex >= props.items.length - 1"
              @click="goToNext"
              class="w-12 h-12 rounded-full bg-[var(--color-orange)] flex items-center justify-center shadow-lg hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UIcon name="i-lucide-arrow-right" class="w-6 h-6 text-[var(--color-dark-green)]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
