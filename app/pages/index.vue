<script setup lang="ts">
// SEO Meta Tags
useSeoMeta({
  title: 'LevFood | Krabičková strava Levice – čerstvé a poctivé jedlá denne',
  description: 'Krabičková strava LevFood v Leviciach. Čerstvé, chutné a poctivo pripravené denné menu doručené až k vám. Jednoduché objednanie, kvalitné jedlo každý deň.',
  keywords: 'krabičková strava Levice, denné menu Levice, zdravé jedlo Levice, dovoz jedla Levice, LevFood, rozvoz jedla Levice, jedlo na celý deň',
  ogTitle: 'LevFood | Krabičková strava Levice – čerstvé a poctivé jedlá denne',
  ogDescription: 'Krabičková strava LevFood v Leviciach. Čerstvé, chutné a poctivo pripravené denné menu doručené až k vám. Jednoduché objednanie, kvalitné jedlo každý deň.',
  ogType: 'website',
})

const { user } = useAuth()
const { scrollToSection } = useScrollTo()

// Import simple icons as components (for Tailwind styling)
import EmailIcon from '~/assets/icons/email-icon.svg?component'
import PhoneIcon from '~/assets/icons/phone-icon.svg?component'
import MapPinIcon from '~/assets/icons/map-pin.svg?component'

// Import decorative/multi-color SVGs and images as URLs (keep as images)
import appleBadgeIcon from '~/assets/img/apple-badge.svg'
import playBadgeIcon from '~/assets/img/play-badge.svg'
import levMapIcon from '~/assets/icons/lev-map.svg'
import lionBulletIcon from '~/assets/icons/lion-bullet.svg'
import vegetableIcon from '~/assets/icons/vegetable.svg'
import saltShakersIcon from '~/assets/icons/salt-shakers.svg'
import logoLongIcon from '~/assets/icons/logo-long.svg'
import timerEggIcon from '~/assets/icons/timer-egg.svg'
import packagesIcon from '~/assets/icons/packages.svg'
import mobileIcon from '~/assets/icons/mobile.svg'
import numbersIcon from '~/assets/icons/numbers.svg'
import smallHatIcon from '~/assets/icons/small-hat.svg'
import lionFaceIcon from '~/assets/icons/lion-face.svg'
import chefHatIcon from '~/assets/icons/chef-hat.svg'
import wheatIcon from '~/assets/icons/wheat.svg'
import foodBoxIcon from '~/assets/icons/food-box.svg'
import tomatoIcon from '~/assets/icons/tomato.svg'

// Days options for pricing dropdowns
const daysOptions = [
  { label: '5 dní', value: '5' },
  { label: '6 dní', value: '6' }
]

// Days options for OFFICE (only 5 days)
const officeDaysOptions = [
  { label: '5 dní', value: '5' }
]

// Selected days for each package
const economyDays = ref('')
const standardDays = ref('')
const premiumDays = ref('')
const officeDays = ref('5') // Default to 5 days for OFFICE

// Package pricing structure
const packagePricing = {
  EKONOMY: {
    '5': 299,  // TESTING
    '6': 339   // TESTING
  },
  ŠTANDARD: {
    '5': 323, // 10% off from 359€
    '6': 359  // 10% off from 399€
  },
  PREMIUM: {
    '5': 377, // 10% off from 419€
    '6': 413  // 10% off from 459€
  },
  OFFICE: {
    '5': 249,
    '6': 249 // Not used, but keeping for consistency
  }
}

// Original prices (before discount) for Standard and Premium
const originalPricing = {
  ŠTANDARD: {
    '5': 359,
    '6': 399
  },
  PREMIUM: {
    '5': 419,
    '6': 459
  }
}

// Computed prices for each package
const economyPrice = computed(() => {
  const days = economyDays.value || '5'
  return packagePricing.EKONOMY[days as '5' | '6']
})

const standardPrice = computed(() => {
  const days = standardDays.value || '5'
  return packagePricing.ŠTANDARD[days as '5' | '6']
})

const premiumPrice = computed(() => {
  const days = premiumDays.value || '5'
  return packagePricing.PREMIUM[days as '5' | '6']
})

const officePrice = computed(() => {
  return packagePricing.OFFICE['5'] // Always 5 days for OFFICE
})

// Original prices (before discount) for Standard and Premium
const standardOriginalPrice = computed(() => {
  const days = standardDays.value || '5'
  return originalPricing.ŠTANDARD[days as '5' | '6']
})

const premiumOriginalPrice = computed(() => {
  const days = premiumDays.value || '5'
  return originalPricing.PREMIUM[days as '5' | '6']
})

// Map internal package names to lowercase English URL params
const packageUrlMap: Record<'EKONOMY' | 'ŠTANDARD' | 'PREMIUM' | 'OFFICE', string> = {
  EKONOMY: 'economy',
  ŠTANDARD: 'standard',
  PREMIUM: 'premium',
  OFFICE: 'office'
}

// Handle order button click
function handleOrderClick(packageType: 'EKONOMY' | 'ŠTANDARD' | 'PREMIUM' | 'OFFICE', selectedDays: string) {
  // Default to 5 days if no selection
  const duration = selectedDays || '5'

  navigateTo({
    path: '/objednavka',
    query: {
      package: packageUrlMap[packageType],
      duration: duration
    }
  })
}

// Features list
const features = [
  {
    title: 'Prehľadný kalendár',
    description: 'sledujte svoj plán stravovania jednoducho a prehľadne každý deň.'
  },
  {
    title: 'Jedlá podľa teba',
    description: 'vyberte si z viacerých alternatív podľa chuti alebo svojich preferencií.'
  },
  {
    title: 'Čerstvosť a udržateľnosť',
    description: '100% čerstvé, lokálne suroviny, ekologické balenie, férový prístup.'
  },
  {
    title: 'Flexibilné doručenie',
    description: 'upravte si miesto doručenia alebo pozastavte objednávku podľa potreby.'
  }
]

// Team members
const teamMembers = [
  {
    id: 1,
    name: 'Pavel Kotlár',
    role: 'Šéfkuchár',
    description: 'Varím srdcom. Každé jedlo, ktoré pošleme, musí byť také, aké by som pripravil pre rodinu.',
    icon: 'i-lucide-user'
  },
  {
    id: 2,
    name: 'Zuzana Stehlíková',
    role: 'Balenie a logistika',
    description: 'Načasované, čerstvé, spoľhlivé – to je môj cieľ každý deň.',
    icon: 'i-lucide-user'
  },
  {
    id: 3,
    name: 'Mgr. Filip Dvořáček',
    role: 'Nutričný špecialista',
    description: 'Zdravé stravovanie nie je o obmedzovaní – je o rovnováhe. Každé jedlo navrhujem tak, aby podporovalo tvoje ciele a chuťové bunky.',
    icon: 'i-lucide-user'
  },
  {
    id: 4,
    name: 'Vanda Petrášová',
    role: 'Obchodný zástupca',
    description: 'Buduje a rozvíja obchodné partnerstvá.',
    icon: 'i-lucide-user'
  },
  {
    id: 5,
    name: 'Ivana',
    role: 'Manažment prevádzky',
    description: 'Má pod kontrolou každý detail chodu kuchyne aj logistiky, aby všetko fungovalo presne podľa plánu.',
    icon: 'i-lucide-user'
  },
  {
    id: 6,
    name: 'MUDr. Peter Birčák',
    role: 'InBody váženie',
    description: 'Pomáha klientom lepšie porozumieť svojmu telu a posúva ich k zdravším výsledkom.',
    icon: 'i-lucide-user'
  }
]

// Redirect to dashboard if already logged in (client-side only)
onMounted(() => {
  if (user.value) {
    navigateTo('/dashboard')
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-professional">
    <AuthLoading />
    <AnnouncementModal />
    
    <!-- Hero Section -->
    <div class="relative min-h-[80vh] pb-[30px] lg:pb-[200px] pt-[50px] flex items-center justify-center bg-[var(--color-dark-green)] overflow-hidden">
      <!-- Navigation - Overlay on top of hero -->
      <nav class="absolute top-0 left-0 right-0 z-50 bg-[var(--color-dark-green)]">
        <div class="container mx-auto px-4">
          <div class="flex items-center justify-center h-16 mt-6">
            <NuxtLink to="/" class="flex items-center">
              <img 
                :src="logoLongIcon" 
                alt="LevFood logo" 
                class="w-[240px] h-auto"
              />
            </NuxtLink>
          </div>
        </div>
      </nav>
      <!-- Corner Illustrations -->
      <!-- Top Left: Chef Hat -->
      <img 
        :src="chefHatIcon" 
        alt="Chef hat" 
        class="absolute lg:top-[40px] lg:left-0 bottom-[-20px] left-[0px]"
      />
      
      <!-- Top Right: Wheat -->
      <img 
        :src="wheatIcon" 
        alt="Wheat" 
        class="absolute top-[220px] right-[60px] hidden lg:block"
      />
      
      <!-- Bottom Left: Food Box -->
      <img 
        :src="foodBoxIcon" 
        alt="Food box" 
        class="absolute bottom-[30px] left-[150px] hidden lg:block"
      />
      
      <!-- Bottom Right: Tomato -->
      <img 
        :src="tomatoIcon" 
        alt="Tomato" 
        class="absolute bottom-[160px] right-[170px] hidden lg:block"
      />

      <!-- Main Content -->
      <div class="container mx-auto px-4 pt-28 lg:pb-48 pb-64 relative z-10">
        <div class="grid grid-cols-12 gap-4">
          <div class="col-span-12 lg:col-span-8 lg:col-start-3 text-center">
            <!-- Main Heading -->
            <h1 class="md:text-[128px] sm:text-[96px] text-[64px] leading-[84%] font-bold text-[var(--color-orange)] tracking-tight mb-6 text-sofia">
              Chutne, <br/> vyvážene a <br/> bez starostí.
            </h1>

            <!-- Description -->
            <p class="mt-6 mx-auto text-[18px] leading-[150%] text-beige">
              LevFood prináša krabičkovú stravu formou chutných a vyvážených jedál priamo k Vaším dverám v Leviciach a okolí. Ušetrite čas strávený nákupmi, varením či umývaním riadu – my sa postaráme, vy si len vychutnáte.
            </p>

            <!-- CTA Buttons -->
            <div class="mt-10 flex flex-col sm:flex-row justify-center gap-6">
              <button 
                @click="scrollToSection('pricing-section')" 
                class="btn-primary"
              >
                Objednaj si balíček
              </button>
              <button 
                @click="scrollToSection('info-section')" 
                class="btn-secondary"
              >
                Zisti viac
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section Wrapper -->
    <div class="bg-[var(--color-beige)]">
      <!-- Features Section -->
      <div class="bg-[var(--color-dark-green)] pb-[200px] md:rounded-b-[40px] rounded-b-[20px]">
        <div class="container mx-auto px-4">
          <div class="flex flex-col items-center">
            <!-- Features List -->
            <ul class="space-y-[2.875em] mb-8 flex flex-col items-start">
              <li v-for="feature in features" :key="feature.title" class="flex items-center gap-4 max-w-2xl">
                <img
                  :src="lionBulletIcon"
                  alt="Bullet"
                  class="w-[2.25em] h-[2.25em] flex-shrink-0"
                />
                <span class="text-beige text-[1.75rem] md:text-[2rem] text-left tracking-tight font-condensed">
                  <strong class="font-bold">{{ feature.title }}</strong> – {{ feature.description }}
                </span>
              </li>
            </ul>

            <!-- App Download Buttons -->
            <!-- <div class="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-block"
              >
                <img
                  :src="appleBadgeIcon"
                  alt="Download on the App Store"
                  class="h-12 md:h-14 w-auto object-contain"
                />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-block"
              >
                <img
                  :src="playBadgeIcon"
                  alt="Get it on Google Play"
                  class="h-12 md:h-14 w-auto object-contain"
                />
              </a>
            </div> -->
           

            <!-- Custom Orange App Download Buttons -->
             <div class="flex flex-col items-center justify-center">
              <h3 class="mt-[100px] text-orange text-[1.75rem] md:text-[2rem] text-center tracking-tight font-condensed">Aplikácia bude už čoskoro dostupná. <br>Hneď, ako bude pripravená, pošleme vám e-mail.</h3>

             </div>
            <div class="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
              <button
                disabled
                aria-disabled="true"
                class="group bg-orange cursor-not-allowed hover:bg-beige transition-colors duration-300 rounded-xl px-6 py-3 flex items-center gap-3 min-w-[200px] shadow-lg"
              >
                <UIcon
                  name="i-lucide-apple"
                  class="w-8 h-8 text-dark-green group-hover:text-dark-green transition-colors duration-300"
                />
                <div class="flex flex-col items-start">
                  <span class="text-xs text-dark-green group-hover:text-dark-green transition-colors duration-300">Stiahnuť z</span>
                  <span class="text-base font-bold text-dark-green group-hover:text-dark-green transition-colors duration-300">App Store</span>
                </div>
              </button>
              <button
                disabled
                aria-disabled="true"
                class="group bg-orange cursor-not-allowed hover:bg-beige transition-colors duration-300 rounded-xl px-6 py-3 flex items-center gap-3 min-w-[200px] shadow-lg"
              >
                <UIcon
                  name="i-lucide-smartphone"
                  class="w-8 h-8 text-dark-green group-hover:text-dark-green transition-colors duration-300"
                />
                <div class="flex flex-col items-start">
                  <span class="text-xs text-dark-green group-hover:text-dark-green transition-colors duration-300">Získajte na</span>
                  <span class="text-base font-bold text-dark-green group-hover:text-dark-green transition-colors duration-300">Google Play</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Process Section -->
    <div class="bg-[var(--color-beige)] overflow-hidden relative">
      <div class="container mx-auto px-4 py-12 px-2 py-24 relative">
        <!-- Main Title -->
        <div class="text-center">
          <h2 class="md:text-[96px] sm:text-[72px] text-[64px] leading-[120%] font-condensed font-extrabold text-[var(--color-dark-green)] tracking-tight">
            Ako to funguje?
          </h2>
          <p class="md:text-[40px] sm:text-[32px] text-[24px] lg:mb-[100px] mb-[80px] leading-[150%] font-condensed text-[var(--color-dark-green)]">
            Päť krokov k pohodlnému stravovaniu v Leviciach
          </p>
        </div>

        <!-- Process Flow - Mobile (vertical) -->
        <div class="flex flex-col lg:hidden items-center gap-8">
          <!-- Step 1 -->
          <div class="flex flex-col items-center">
            <img :src="packagesIcon" alt="Packages" class="w-20 h-20 sm:w-24 sm:h-24 text-[var(--color-dark-green)]" />
            <span class="mt-4 text-[var(--color-dark-green)] font-bold text-lg sm:text-xl text-center">Vyberte si svoj plán</span>
          </div>
          
          <UIcon name="i-lucide-move-down" class="w-8 h-8 sm:w-10 sm:h-10 text-[var(--color-dark-green)]" />

          <!-- Step 2 -->
          <div class="flex flex-col items-center">
            <img :src="mobileIcon" alt="Mobile" class="w-20 h-20 sm:w-24 sm:h-24 text-[var(--color-dark-green)]" />
            <span class="mt-4 text-[var(--color-dark-green)] font-bold text-lg sm:text-xl text-center">Stiahnite si aplikáciu</span>
          </div>
          
          <UIcon name="i-lucide-move-down" class="w-8 h-8 sm:w-10 sm:h-10 text-[var(--color-dark-green)]" />

          <!-- Step 3 -->
          <div class="flex flex-col items-center">
            <img :src="numbersIcon" alt="Numbers" class="w-20 h-20 sm:w-24 sm:h-24 text-[var(--color-dark-green)]" />
            <span class="mt-4 text-[var(--color-dark-green)] font-bold text-lg sm:text-xl text-center">Zadajte kód</span>
          </div>
          
          <UIcon name="i-lucide-move-down" class="w-8 h-8 sm:w-10 sm:h-10 text-[var(--color-dark-green)]" />

          <!-- Step 4 -->
          <div class="flex flex-col items-center">
            <img :src="smallHatIcon" alt="Small Hat" class="w-20 h-20 sm:w-24 sm:h-24 text-[var(--color-dark-green)]" />
            <span class="mt-4 text-[var(--color-dark-green)] font-bold text-lg sm:text-xl text-center">My varíme a balíme</span>
          </div>
          
          <UIcon name="i-lucide-move-down" class="w-8 h-8 sm:w-10 sm:h-10 text-[var(--color-dark-green)]" />

          <!-- Step 5 -->
          <div class="flex flex-col items-center">
            <img :src="lionFaceIcon" alt="Lion Face" class="w-20 h-20 sm:w-24 sm:h-24 text-[var(--color-dark-green)]" />
            <span class="mt-4 text-[var(--color-dark-green)] font-bold text-lg sm:text-xl text-center">Vy si len vychutnajte</span>
          </div>
        </div>

        <!-- Process Flow - Desktop (horizontal with step 5 centered below) -->
        <div class="hidden lg:block mb-[200px]">
          <!-- Main row with 4 steps -->
          <div class="flex items-center justify-center gap-8 mb-8">
            <!-- Step 1 -->
            <div class="flex flex-row items-center">
              <span class="mr-4 text-[var(--color-dark-green)] font-bold text-[24px] leading-[120%] text-center">Vyberte si svoj plán</span>
              <img :src="packagesIcon" alt="Packages" class="h-[60px] text-[var(--color-dark-green)]" />
            </div>
            
            <UIcon name="i-lucide-move-right" class="w-12 h-12 text-[var(--color-dark-green)] flex-shrink-0" />

            <!-- Step 2 -->
            <div class="flex flex-row items-center">
              <span class="mr-4 text-[var(--color-dark-green)] font-bold text-[24px] leading-[120%] text-center">Stiahnite si aplikáciu</span>
              <img :src="mobileIcon" alt="Mobile" class="h-[60px] text-[var(--color-dark-green)]" />
            </div>
            
            <UIcon name="i-lucide-move-right" class="w-12 h-12 text-[var(--color-dark-green)] flex-shrink-0" />

            <!-- Step 3 -->
            <div class="flex flex-row items-center">
              <span class="mr-4 text-[var(--color-dark-green)] font-bold text-[24px] leading-[120%] text-center">Zadajte kód</span>
              <img :src="numbersIcon" alt="Numbers" class="h-[60px] text-[var(--color-dark-green)]" />
            </div>
            
            <UIcon name="i-lucide-move-right" class="w-12 h-12 text-[var(--color-dark-green)] flex-shrink-0" />

            <!-- Step 4 -->
            <div class="flex flex-row items-center">
              <span class="mr-4 text-[var(--color-dark-green)] font-bold text-[24px] leading-[120%] text-center">My varíme a balíme</span>
              <img :src="smallHatIcon" alt="Small Hat" class="h-[60px] text-[var(--color-dark-green)]" />
            </div>
          </div>

          <!-- Arrow down (centered) -->
          <div class="flex justify-center mb-8">
            <UIcon name="i-lucide-move-down" class="w-12 h-12 text-[var(--color-dark-green)]" />
          </div>

          <!-- Step 5 (centered in its own row) -->
          <div class="flex justify-center">
            <div class="flex flex-col items-center">
              <img :src="lionFaceIcon" alt="Lion Face" class="h-[60px] text-[var(--color-dark-green)]" />
              <span class="mt-5 text-[var(--color-dark-green)] font-bold text-[24px] leading-[120%] text-center">Vy si len vychutnajte</span>
             
            </div>
          </div>
        </div>
      </div>
      <!-- Decorative Vegetable - Off screen at bottom -->
      <div class="absolute bottom-[-20px] lg:right-[100px] right-[20px]">
        <img :src="vegetableIcon" alt="Vegetable" class="lg:w-[500px] md:w-[300px] w-[250px] h-auto" />
      </div>
    </div>

    <!-- Info Section -->
    <div class="bg-[var(--color-beige)]">
      <div class="bg-[var(--color-dark-green)] relative overflow-hidden pt-[50px] lg:pt-[200px] lg:pb-[200px] pb-[100px] md:rounded-[40px] rounded-[20px]">
        <!-- Lion Bullet - Overflowing on right (half off screen) -->
        <div class="hidden lg:block absolute right-[-325px] top-[50%] transform -translate-y-[50%]  z-0">
          <img :src="lionBulletIcon" alt="Lion Bullet" class="w-[650px] h-[650px] object-cover" />
        </div>
      <div class="container mx-auto px-4 py-20 relative">
        <div id="info-section" class="absolute -top-[40px]"></div>
        <div class="grid grid-cols-12 gap-4 items-center relative">
          <!-- Content -->
          <div  class="col-span-12 lg:col-span-8 ">
            <h2 class="md:text-[96px] sm:text-[72px] text-[64px] leading-[100%] font-condensed font-extrabold text-[var(--color-orange)] tracking-tight">
              LevFood
            </h2>
            <p class="md:text-[40px] sm:text-[32px] text-[22px] leading-[150%] font-condensed text-[var(--color-orange)]">
              viac chuti, menej starostí
            </p>
            
            <!-- Feature List -->
            <ul class="sm:space-y-4 space-y-5 mt-[40px]">
              <li class="text-[var(--color-beige)] text-[22px] sm:text-[32px] leading-[120%]">
                <strong class="font-bold">Kvalitné suroviny</strong> – denne čerstvo pripravené jedlá
              </li>
              <li class="text-[var(--color-beige)] text-[22px] sm:text-[32px] leading-[120%]">
                <strong class="font-bold">Vyvážené porcie</strong> – nutrične vyvážené a odborne zostavené jedlá podľa moderných výživových princípov
              </li>
              <li class="text-[var(--color-beige)] text-[22px] sm:text-[32px] leading-[120%]">
                <strong class="font-bold">Sezónne chute</strong> – pochutnajte si na pestrých kombináciách jedál v sezónnych chutiach
              </li>
              <li class="text-[var(--color-beige)] text-[22px] sm:text-[32px] leading-[120%]">
                <strong class="font-bold">Ušetríme ti čas a energiu</strong> – prinášame Vám chutné jedlá priamo k Vaším dverám (domov alebo do práce)
              </li>
              <li class="text-[var(--color-beige)] text-[22px] sm:text-[32px] leading-[120%]">
                <strong class="font-bold">Transparentné zloženie</strong> – viete, čo prijímate, jedálniček zostavený nutričným špecialistom
              </li>
              <li class="text-[var(--color-beige)] text-[22px] sm:text-[32px] leading-[120%]">
                <strong class="font-bold">Doručenie v Leviciach a okolí alebo vyzdvihnutie na výdajnom mieste 24/7</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Pricing Section -->
    <div class="bg-[var(--color-beige)] py-[50px] lg:py-[200px] relative">
      <img :src="saltShakersIcon" alt="Salt Shakers" class="hidden lg:block w-32 h-32 xl:w-48 xl:h-48 absolute top-[20px] left-[50%] translate-x-[150px]" />
      <div class="container mx-auto lg:px-4 px-0 relative">
        <div id="pricing-section" class="absolute -top-[50px]"></div>
        <!-- Section Header -->
        <div class="flex items-center justify-center gap-4 lg:mb-8 mb-2 px-4">
          <h2 class="md:text-[96px] sm:text-[72px] text-[64px] leading-[100%] font-condensed font-extrabold text-[var(--color-dark-green)] tracking-tight">
            Cenník
          </h2>
        </div>
        <div class="text-center md:mb-12 mb-8  px-4">
          <p class="md:text-[40px] sm:text-[32px] text-[24px] leading-[150%] font-condensed text-[var(--color-dark-green)]">
            Začni dnes – vyber si svoj balíček
          </p>
          <p class="font-bold md:text-[40px] sm:text-[32px] text-[24px] leading-[150%] font-condensed text-[var(--color-dark-green)]">
            Zľava 10% na všetky predobjednávky DO KONCA ROKA<br>pre balíky ŠTANDARD a PREMIUM
          </p>
        </div>

        <!-- Pricing Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 md:gap-6 gap-8 p-4 lg:p-0">
          <!-- Economy Card -->
          <div class="pricing-card bg-[var(--color-beige)] border-2 border-[var(--color-dark-green)] rounded-[32px] p-6 flex flex-col h-fit relative lg:top-[30px] top-0">
            <h3 class="text-2xl font-bold text-[var(--color-dark-green)] mb-2">
              Balíček EKONOMY
            </h3>
            <p class="text-[var(--color-dark-green)] mb-6">
              Pre tých, ktorí chcú chutné jedlo jednoducho a bez komplikácií.
            </p>
            <div class="border-t border-[var(--color-dark-green)] my-4"></div>
            <div class="text-4xl font-bold text-[var(--color-dark-green)] mb-6">
              <div>
                <span class="text-[4rem] font-bold text-[var(--color-dark-green)]">{{ economyPrice }}€</span>
              </div>
              <span class="text-2xl font-bold text-[var(--color-dark-green)]">4 týždne</span>
            </div>
            <div class="mb-6">
              <label class="block text-[var(--color-dark-green)] mb-2">Počet dní v týždni</label>
              <USelect
                v-model="economyDays"
                :items="daysOptions"
                placeholder="Vyber počet dní"
                class="pricing-select w-full bg-transparent h-[3.5rem] data-[state=open]:border-[var(--color-orange)] data-[state=closed]:border-[var(--color-dark-green)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-dark-green)] data-[state=open]:ring-2 data-[state=open]:ring-inset data-[state=open]:ring-[var(--color-orange)] data-[state=closed]:ring-[var(--color-dark-green)]"

              />
            </div>
            <UButton
              class="pricing-button bg-[var(--color-dark-green)] text-beige mb-6 h-14 text-lg font-bold"
              block
              @click="handleOrderClick('EKONOMY', economyDays)"
            >
              Objednať EKONOMY
            </UButton>
            <div class="border-t border-[var(--color-dark-green)] my-4"></div>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-beige)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">Vyvážené denné menu</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-beige)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">4 jedlá denne (raňajky + obed s polievkou + večera)</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-beige)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">Vyzdvihnutie len na výdajnom mieste – Kalvínske námestie 126/2, Levice</span>
              </li>
            </ul>
          </div>

          <!-- Standard Card - Highlighted with Orange -->
          <div class="pricing-card bg-[var(--color-orange)] border-[var(--color-dark-green)] rounded-[32px] p-6 flex flex-col h-fit">
            <h3 class="text-2xl font-bold text-[var(--color-dark-green)] mb-2">
              Balíček ŠTANDARD
            </h3>
            <p class="text-[var(--color-dark-green)] mb-6">
              Pre tých, ktorí si potrpia na kvalitu a pestrosť.
            </p>
            <div class="border-t border-[var(--color-dark-green)] my-4"></div>
            <div class="text-4xl font-bold text-[var(--color-dark-green)] mb-6">
              <div>
                <span class="text-[4rem] font-bold text-[var(--color-dark-green)]">{{ standardPrice }}€</span> <span class="text-[2rem] font-bold text-[#868882] line-through">{{ standardOriginalPrice }}€</span>
              </div>
              <span class="text-2xl font-bold text-[var(--color-dark-green)]">4 týždne</span>
            </div>
            <div class="mb-6">
              <label class="block text-[var(--color-dark-green)] mb-2">Počet dní v týždni</label>
              <USelect
                v-model="standardDays"
                :items="daysOptions"
                placeholder="Vyber počet dní"
                class="pricing-select w-full bg-transparent h-[3.5rem] data-[state=open]:border-[var(--color-dark-green)] data-[state=closed]:border-[var(--color-dark-green)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-orange)] data-[state=open]:ring-2 data-[state=open]:ring-inset data-[state=open]:ring-[var(--color-dark-green)] data-[state=closed]:ring-[var(--color-dark-green)]"
              />
            </div>
            <UButton
              class="pricing-button hover-beige bg-[var(--color-dark-green)] text-beige mb-6 h-14 text-lg font-bold"
              block
              @click="handleOrderClick('ŠTANDARD', standardDays)"
            >
              Objednať ŠTANDARD
            </UButton>
            <div class="border-t border-[var(--color-dark-green)] my-4"></div>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-orange)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">V balíčku je možnosť výberu špeciálneho menu: bezlaktózové, bezlepkové alebo vegetariánske.</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-orange)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">5 jedál denne (raňajky + obed s polievkou + olovrant + večera)</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-orange)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">Doručenie na adresu alebo výdajné miesto</span>
              </li>
            </ul>
          </div>

          <!-- Premium Card -->
          <div class="pricing-card bg-[var(--color-beige)] border-2 border-[var(--color-dark-green)] rounded-[32px] p-6 flex flex-col relative lg:top-[30px] top-0">
            <h3 class="text-2xl font-bold text-[var(--color-dark-green)] mb-2">
              Balíček PREMIUM
            </h3>
            <p class="text-[var(--color-dark-green)] mb-6">
              Pre tých, ktorí chcú maximum bez kompromisov.
            </p>
            <div class="border-t border-[var(--color-dark-green)] my-4"></div>
            <div class="text-4xl font-bold text-[var(--color-dark-green)] mb-6">
              <div>
                <span class="text-[4rem] font-bold text-[var(--color-dark-green)]">{{ premiumPrice }}€</span> <span class="text-[2rem] font-bold text-[#868882] line-through">{{ premiumOriginalPrice }}€</span>
              </div>
              <span class="text-2xl font-bold text-[var(--color-dark-green)]">4 týždne</span>
            </div>
            <div class="mb-6">
              <label class="block text-[var(--color-dark-green)] mb-2">Počet dní v týždni</label>
              <USelect 
                v-model="premiumDays"
                :items="daysOptions" 
                placeholder="Vyber počet dní"
                class="pricing-select w-full bg-transparent h-[3.5rem] data-[state=open]:border-[var(--color-orange)] data-[state=closed]:border-[var(--color-dark-green)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-dark-green)] data-[state=open]:ring-2 data-[state=open]:ring-inset data-[state=open]:ring-[var(--color-orange)] data-[state=closed]:ring-[var(--color-dark-green)]"
              />
            </div>
            <UButton 
              class="pricing-button bg-[var(--color-dark-green)] text-beige mb-6 h-14 text-lg font-bold"
              block
              @click="handleOrderClick('PREMIUM', premiumDays)"
            >
              Objednať PREMIUM
            </UButton>
            <div class="border-t border-[var(--color-dark-green)] my-4"></div>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-beige)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">V balíčku je možnosť výberu špeciálneho menu: bezlaktózové, bezlepkové alebo vegetariánske.</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-beige)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">6 jedál denne (raňajky + desiata + obed s polievkou + olovrant + večera)</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-beige)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">Prispôsobenie kalórií a makronutrientov tvojim potrebám (Nutričný špecialista Mgr. Filip Dvořáček)</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-beige)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">Doručenie na adresu alebo výdaj jedla na prevádzke 24/7</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-beige)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">InBody váženie – kompletná analýza zloženia tela (MUDr. Peter Birčák)</span>
              </li>
            </ul>
          </div>

          <!-- Office Card - Highlighted with Orange -->
          <div class="pricing-card bg-[var(--color-orange)] border-[var(--color-dark-green)] rounded-[32px] p-6 flex flex-col h-fit">
            <h3 class="text-2xl font-bold text-[var(--color-dark-green)] mb-2">
              Balíček OFFICE
            </h3>
            <p class="text-[var(--color-dark-green)] mb-6">
              Kompletné riešenie pre pracovný deň.
            </p>
            <div class="border-t border-[var(--color-dark-green)] my-4"></div>
            <div class="text-4xl font-bold text-[var(--color-dark-green)] mb-6">
              <div>
                <span class="text-[4rem] font-bold text-[var(--color-dark-green)]">{{ officePrice }}€</span>
              </div>
              <span class="text-2xl font-bold text-[var(--color-dark-green)]">4 týždne</span>
            </div>
            <div class="mb-6">
              <label class="block text-[var(--color-dark-green)] mb-2">Počet dní v týždni</label>
              <USelect
                v-model="officeDays"
                :items="officeDaysOptions"
                disabled
                class="pricing-select w-full bg-transparent h-[3.5rem] data-[state=open]:border-[var(--color-dark-green)] data-[state=closed]:border-[var(--color-dark-green)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-orange)] data-[state=open]:ring-2 data-[state=open]:ring-inset data-[state=open]:ring-[var(--color-dark-green)] data-[state=closed]:ring-[var(--color-dark-green)] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span class="text-xs text-[var(--color-dark-green)]/70 mt-2 block">Len 5 dní v týždni</span>
            </div>
            <UButton
              class="pricing-button hover-beige bg-[var(--color-dark-green)] text-beige mb-6 h-14 text-lg font-bold"
              block
              @click="handleOrderClick('OFFICE', officeDays)"
            >
              Objednať OFFICE
            </UButton>
            <div class="border-t border-[var(--color-dark-green)] my-4"></div>
            <ul class="space-y-3">
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-orange)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">Kompletné riešenie pre pracovný deň</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-orange)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">4 jedlá denne (raňajky + obed s polievkou + večera)</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-orange)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">Doručenie na adresu alebo výdaj jedla na prevádzke 24/7</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>



    <!-- Gallery Section -->
    <!-- <div class="bg-[var(--color-beige)] relative">
      <div class="hidden lg:flex lg:flex-row">
        <div class="container mx-auto px-4 lg:py-28  py-10">

          <div class="grid grid-cols-12 gap-4 items-center">
            <div class="col-span-12 lg:col-span-6 flex flex-col relative lg:py-20 py-6">
              <h2 class="text-[4rem] lg:text-[6rem] font-condensed font-bold text-[var(--color-dark-green)] mb-4 relative z-10 text-center lg:text-left">
                Galéria
              </h2>
              <div class="relative h-0 hidden lg:block">
                <p class="font-condensed text-center text-[31px] font-bold relative translate-y-[-550px] translate-x-[100px] trasnns w-[200px] h-[200px] rounded-full bg-[var(--color-orange)] text-white flex items-center justify-center">lokálne suroviny</p>
                <p class="font-condensed text-center text-[31px] font-bold relative translate-y-[-500px] translate-x-[10px] w-[150px] h-[150px] rounded-full bg-[var(--color-orange)] text-white flex items-center justify-center">eko balenie</p>
                <p class="font-condensed text-center text-[31px] font-bold relative translate-y-[-700px] translate-x-[310px] w-[170px] h-[170px] rounded-full bg-[var(--color-orange)] text-white flex items-center justify-center">poctivá chuť</p>
                <p class="text-center py-2 px-4 font-condensed text-[31px] font-bold relative translate-y-[-650px] translate-x-[330px] w-[220px] h-[220px] rounded-full bg-[var(--color-orange)] text-white flex items-center justify-center">kvalita 
                  bez kompromisov</p>
              </div>
            </div>
          </div>
        </div>
        <div class="w-1/2 absolute right-0">
          <ProductGallery />
        </div>
      </div>
      <div class="lg:hidden py-10">
        <div class="block lg:hidden grid md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-4 mb-4">
          <div class="flex flex-col items-center justify-center">
            <p class="font-condensed aspect-square h-[200px] text-center text-[31px] font-bold bg-[var(--color-orange)] text-white flex items-center justify-center rounded-full">lokálne suroviny</p>

          </div>
          <div class="flex flex-col items-center justify-center">
            <p class="font-condensed aspect-square h-[200px] text-center text-[31px] font-bold bg-[var(--color-orange)] text-white flex items-center justify-center rounded-full">eko balenie</p>
          </div>
          <div class="flex flex-col items-center justify-center">
            <p class="font-condensed aspect-square h-[200px] text-center text-[31px] font-bold bg-[var(--color-orange)] text-white flex items-center justify-center rounded-full">poctivá chuť</p>
          </div>
          <div class="flex flex-col items-center justify-center">
            <p class="font-condensed aspect-square h-[200px] text-center text-[31px] font-bold bg-[var(--color-orange)] text-white flex items-center justify-center rounded-full">kvalita 
              bez kompromisov</p>
          </div>
        </div>
        <div class="px-4 mb-6">
          <h2 class="text-[4rem] font-condensed font-bold text-[var(--color-dark-green)] text-center">
            Galéria
          </h2>
        </div>
        <ProductGallery />
      </div>
    </div> -->

    <!-- Team Section -->
    <div class="overflow-hidden bg-[var(--color-beige)] py-20">
      <div class="container mx-auto px-4 lg:py-20 py-10">
        <!-- Title at Top -->
        <div class="grid grid-cols-12 gap-4 mb-16 relative items-center justify-center">
          <!-- Timer Egg Icon (absolute positioned) -->
          <img 
            :src="timerEggIcon" 
            alt="Timer egg" 
            class="absolute lg:block hidden top-[40px] xl:right-[80px] right-[0px] w-24 h-28 lg:w-40 lg:h-40 opacity-90 z-10"
          />
          
          <div class="col-span-12 lg:col-span-8 lg:col-start-3 text-center">
            <h2 class="md:text-[96px] sm:text-[72px] text-[64px] leading-[100%] font-condensed font-extrabold text-[var(--color-dark-green)] tracking-tight">
              Tím, ktorý stojí za prevádzkou LevFood
            </h2>
          </div>
          <div class="col-span-12 text-center">
            <p class="md:text-[40px] sm:text-[32px] text-[24px] leading-[150%] font-condensed text-[var(--color-dark-green)]">Za každým balíčkom LevFood stoja ľudia, ktorí milujú kvalitné a chutné jedlo. Od šéfkuchára až po vodiča – všetci veríme, že zdravé jedlo má meniť život k lepšiemu. </p>
          </div>
        </div>

        <!-- Gallery Content -->
        <PeopleGallery :items="teamMembers" />
      </div>
    </div>

    <!-- Contact Section -->
    <div class="bg-[var(--color-beige)]">
      <div class="bg-[var(--color-dark-green)] md:rounded-t-[40px] rounded-t-[20px] py-20">
        <div class="container mx-auto px-4">
          <!-- Section Header -->
          <div class="text-center mb-16">
            <h2 class="md:text-[96px] sm:text-[72px] text-[64px] leading-[120%] font-condensed font-extrabold text-[var(--color-beige)] tracking-tight">
              Kontakt
            </h2>
          </div>

          <!-- Contact Grid -->
          <div class="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:items-center">
            <!-- Contact Information -->
            <div class="lg:col-span-7 space-y-8 order-1">
              <!-- Address -->
              <div class="flex items-start gap-4">
                <MapPinIcon class="w-8 h-8 flex-shrink-0 text-[var(--color-beige)]" />
                <div>
                  <h4 class="font-condensed text-2xl font-bold text-[var(--color-beige)] mb-2">Adresa</h4>
                  <p class="text-lg text-[var(--color-beige)]">Kalvínske námestie 126/2<br/>934 01 Levice</p>
                </div>
              </div>
              
              <!-- Phone -->
              <div class="flex items-start gap-4">
                <PhoneIcon class="w-8 h-8 flex-shrink-0 text-[var(--color-beige)]" />
                <div>
                  <h4 class="font-condensed text-2xl font-bold text-[var(--color-beige)] mb-2">Telefón</h4>
                  <a href="tel:+421911395933" class="text-lg text-[var(--color-beige)] hover:text-[var(--color-orange)] transition-colors">+421 911 395 933</a>
                </div>
              </div>
              
              <!-- Email -->
              <div class="flex items-start gap-4">
                <EmailIcon class="w-8 h-8 flex-shrink-0 text-[var(--color-beige)]" />
                <div>
                  <h4 class="font-condensed text-2xl font-bold text-[var(--color-beige)] mb-2">Email</h4>
                  <a href="mailto:info@levfood.sk" class="text-lg text-[var(--color-beige)] hover:text-[var(--color-orange)] transition-colors">info@levfood.sk</a>
                </div>
              </div>
            </div>

            <!-- Map -->
            <div class="w-full lg:col-span-5 order-2">
              <img :src="levMapIcon" alt="Mapa Levice" class="w-full h-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <Footer />
  </div>
</template>