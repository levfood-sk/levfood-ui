<script setup lang="ts">
const { user } = useAuth()

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

// Selected days for each package
const economyDays = ref('')
const standardDays = ref('')
const premiumDays = ref('')

// Features list
const features = [
  'Sleduj svoj plán stravovania prehľadne v kalendári',
  'Výber si jedlá podľa chuti alebo preferencií',
  'Lokálne suroviny, eko balenie, férový prístup',
  'Uprav si doručenie, pozastav objednávku'
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
    name: 'XY',
    role: 'Pomocná sila v kuchyni',
    description: 'Každý deň začínam s vôňou čerstvých surovín. Môjou úlohou je, aby v kuchyni všetko klapalo do posledného detailu.',
    icon: 'i-lucide-user'
  },
  {
    id: 4,
    name: 'Mgr. Filip',
    role: 'Nutričný špecialista',
    description: 'Zdravé stravovanie nie je o obmedzovaní – je o rovnováhe. Každé jedlo navrhujem tak, aby podporovalo tvoje ciele a chuťové bunky.',
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
            <p class="mt-6 mx-auto text-[18px] leading-[150%] text-white">
              LevFood prináša chutné a vyvážené jedlá priamo k tvojim dverám v Leviciach a okolí. Zdravé stravovanie nemusí byť zložité – stačí si vybrať balíček, ktorý ti sedí a o zvyšok sa postaráme my.
            </p>

            <!-- CTA Buttons -->
            <div class="mt-10 flex flex-col sm:flex-row justify-center gap-6">
              <NuxtLink to="/form">
                <button class="btn-primary">
                  Objednaj si balíček
                </button>
              </NuxtLink>
              <NuxtLink to="#features">
                <button class="btn-secondary">
                  Zisti viac
                </button>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Features Section Wrapper -->
    <div class="bg-[var(--color-beige)]">
      <!-- Features Section -->
      <div class="bg-[var(--color-dark-green)] pb-[200px] rounded-b-[40px]">
        <div class="container mx-auto px-4">
          <div class="flex flex-col items-center">
            <!-- Features List -->
            <ul class="space-y-[2.875em] mb-8 flex flex-col items-start">
              <li v-for="feature in features" :key="feature" class="flex items-center gap-4 max-w-2xl">
                <img 
                  :src="lionBulletIcon" 
                  alt="Bullet" 
                  class="w-[2.25em] h-[2.25em] flex-shrink-0"
                />
                <span class="text-beige text-[1.75rem] md:text-[2rem] font-bold text-left tracking-tight font-condensed">
                  {{ feature }}
                </span>
              </li>
            </ul>

            <!-- App Download Buttons -->
            <div class="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
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
            <span class="mt-4 text-[var(--color-dark-green)] font-bold text-lg sm:text-xl text-center">Vyber si svoj plán</span>
          </div>
          
          <UIcon name="i-lucide-move-down" class="w-8 h-8 sm:w-10 sm:h-10 text-[var(--color-dark-green)]" />

          <!-- Step 2 -->
          <div class="flex flex-col items-center">
            <img :src="mobileIcon" alt="Mobile" class="w-20 h-20 sm:w-24 sm:h-24 text-[var(--color-dark-green)]" />
            <span class="mt-4 text-[var(--color-dark-green)] font-bold text-lg sm:text-xl text-center">Stiahni si App</span>
          </div>
          
          <UIcon name="i-lucide-move-down" class="w-8 h-8 sm:w-10 sm:h-10 text-[var(--color-dark-green)]" />

          <!-- Step 3 -->
          <div class="flex flex-col items-center">
            <img :src="numbersIcon" alt="Numbers" class="w-20 h-20 sm:w-24 sm:h-24 text-[var(--color-dark-green)]" />
            <span class="mt-4 text-[var(--color-dark-green)] font-bold text-lg sm:text-xl text-center">Zadaj kód</span>
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
            <span class="text-[var(--color-dark-green)] font-bold text-lg sm:text-xl text-center">Ty si len vychutnaj</span>
          </div>
        </div>

        <!-- Process Flow - Desktop (horizontal with step 5 centered below) -->
        <div class="hidden lg:block mb-[200px]">
          <!-- Main row with 4 steps -->
          <div class="flex items-center justify-center gap-8 mb-8">
            <!-- Step 1 -->
            <div class="flex flex-row items-center">
              <span class="mr-4 text-[var(--color-dark-green)] font-bold text-[24px] leading-[120%] text-center">Vyber si svoj plán</span>
              <img :src="packagesIcon" alt="Packages" class="h-[60px] text-[var(--color-dark-green)]" />
            </div>
            
            <UIcon name="i-lucide-move-right" class="w-12 h-12 text-[var(--color-dark-green)] flex-shrink-0" />

            <!-- Step 2 -->
            <div class="flex flex-row items-center">
              <span class="mr-4 text-[var(--color-dark-green)] font-bold text-[24px] leading-[120%] text-center">Stiahni si App</span>
              <img :src="mobileIcon" alt="Mobile" class="h-[60px] text-[var(--color-dark-green)]" />
            </div>
            
            <UIcon name="i-lucide-move-right" class="w-12 h-12 text-[var(--color-dark-green)] flex-shrink-0" />

            <!-- Step 3 -->
            <div class="flex flex-row items-center">
              <span class="mr-4 text-[var(--color-dark-green)] font-bold text-[24px] leading-[120%] text-center">Zadaj kód</span>
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
              <span class="mt-4 text-[var(--color-dark-green)] font-bold text-xl text-center max-w-[150px]">Ty si len vychutnaj</span>
             
            </div>
          </div>
        </div>
      </div>
      <!-- Decorative Vegetable - Off screen at bottom -->
      <div class="absolute bottom-[-20px] lg:right-[100px] right-[50px]">
        <img :src="vegetableIcon" alt="Vegetable" class="lg:w-[500px] md:w-[300px] w-[200px] h-auto" />
      </div>
    </div>

    <!-- Info Section -->
    <div class="bg-[var(--color-beige)]">
      <div class="bg-[var(--color-dark-green)] relative overflow-hidden pt-[50px] lg:pt-[200px] lg:pb-[200px] pb-[100px] rounded-[40px]">
        <!-- Lion Bullet - Overflowing on right (half off screen) -->
        <div class="hidden lg:block absolute right-[-325px] top-[50%] transform -translate-y-[50%]  z-0">
          <img :src="lionBulletIcon" alt="Lion Bullet" class="w-[650px] h-[650px] object-cover" />
        </div>
      <div class="container mx-auto px-4 py-20 relative">
        <div class="grid grid-cols-12 gap-4 items-center relative">
          <!-- Content -->
          <div class="col-span-12 lg:col-span-8 ">
            <h2 class="md:text-[96px] sm:text-[72px] text-[64px] leading-[100%] font-condensed font-extrabold text-[var(--color-orange)] tracking-tight">
              LevFood
            </h2>
            <p class="md:text-[40px] sm:text-[32px] text-[24px] leading-[150%] font-condensed text-[var(--color-orange)]">
              viac chuti, menej starostí
            </p>
            
            <!-- Feature List -->
            <ul class="sm:space-y-1 space-y-3 mt-[40px]">
              <li class="text-[var(--color-beige)] text-[24px] sm:text-[32px] leading-[120%]">
                Varíme čerstvo každý deň priamo v Leviciach
              </li>
              <li class="text-[var(--color-beige)] text-[24px] sm:text-[32px] leading-[120%]">
                Vyvážené porcie podľa moderných výživových zásad
              </li>
              <li class="text-[var(--color-beige)] text-[24px] sm:text-[32px] leading-[120%]">
                Sezónne chute
              </li>
              <li class="text-[var(--color-beige)] text-[24px] sm:text-[32px] leading-[120%]">
                Šetríme tvoj čas aj energiu
              </li>
              <li class="text-[var(--color-beige)] text-[24px] sm:text-[32px] leading-[120%]">
                Transparentné zloženie a presné makrá
              </li>
              <li class="text-[var(--color-beige)] text-[24px] sm:text-[32px] leading-[120%]">
                Doručenie priamo k tvojim dverám v Leviciach a okolí
              </li>
              <li class="text-[var(--color-beige)] text-[24px] sm:text-[32px] leading-[120%]">
                Vyzdvihnutie kedykoľvek 24/7
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
      <div class="container mx-auto lg:px-4 px-0">
        <!-- Section Header -->
        <div class="flex items-center justify-center gap-4 lg:mb-8 mb-2 px-4">
          <h2 class="md:text-[96px] sm:text-[72px] text-[64px] leading-[100%] font-condensed font-extrabold text-[var(--color-dark-green)] tracking-tight">
            Cenník
          </h2>
        </div>
        <div class="text-center mb-8 px-4">
          <p class="md:text-[40px] sm:text-[32px] text-[24px] leading-[150%] font-condensed text-[var(--color-dark-green)]">
            Vyber si plán, ktorý sedí tvojmu životnému štýlu
          </p>
        </div>

        <!-- Pricing Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:gap-6 gap-8">
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
              <span class="text-[4rem] font-bold text-[var(--color-dark-green)]">290€</span> <span class="text-2xl font-bold text-[var(--color-dark-green)]">4 týždne</span>
            </div>
            <div class="mb-6">
              <label class="block text-[var(--color-dark-green)] mb-2">Počet dní v týždni</label>
              <USelect 
                v-model="economyDays"
                :items="daysOptions" 
                placeholder="Vyber počet dní"
                color="neutral"
                highlight
                class="pricing-select w-full bg-transparent h-[3.5rem]"
              />
            </div>
            <UButton 
              class="pricing-button bg-[var(--color-dark-green)] text-white mb-6 h-14 text-lg font-bold"
              block
            >
              Objednať EKONOMY
            </UButton>
            <div class="border-t border-[var(--color-dark-green)] my-4"></div>
            <ul class="space-y-1">
              <li class="flex items-center gap-3">
                <div class="bg-[var(--color-beige)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">Vyvážené denné menu</span>
              </li>
              <li class="flex items-center gap-3">
                <div class="bg-[var(--color-beige)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">4 jedlá denne (raňajky + obed s polievkou + večera)</span>
              </li>
              <li class="flex items-center gap-3">
                <div class="bg-[var(--color-beige)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">Výdaj na prevádzke Nám. Šoltésovej 12 v Leviciach</span>
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
              <span class="text-[4rem] font-bold text-[var(--color-dark-green)]">350€</span> <span class="text-2xl font-bold text-[var(--color-dark-green)]">4 týždne</span>
            </div>
            <div class="mb-6">
              <label class="block text-[var(--color-dark-green)] mb-2">Počet dní v týždni</label>
              <USelect 
                v-model="standardDays"
                :items="daysOptions" 
                placeholder="Vyber počet dní"
                color="neutral"
                highlight
                class="pricing-select w-full bg-transparent h-[3.5rem]"
              />
            </div>
            <UButton 
              class="pricing-button hover-beige bg-[var(--color-dark-green)] text-white mb-6 h-14 text-lg font-bold"
              block
            >
              Objednať ŠTANDARD
            </UButton>
            <div class="border-t border-[var(--color-dark-green)] my-4"></div>
            <ul class="space-y-3">
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
                <span class="text-[var(--color-dark-green)]">Doručenie na adresu alebo výdaj jedla na prevádzke 24/7</span>
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
              <span class="text-[4rem] font-bold text-[var(--color-dark-green)]">400€</span> <span class="text-2xl font-bold text-[var(--color-dark-green)]">4 týždne</span>
            </div>
            <div class="mb-6">
              <label class="block text-[var(--color-dark-green)] mb-2">Počet dní v týždni</label>
              <USelect 
                v-model="premiumDays"
                :items="daysOptions" 
                placeholder="Vyber počet dní"
                color="neutral"
                highlight
                class="pricing-select w-full bg-transparent h-[3.5rem]"
              />
            </div>
            <UButton 
              class="pricing-button bg-[var(--color-dark-green)] text-white mb-6 h-14 text-lg font-bold"
              block
            >
              Objednať Premium
            </UButton>
            <div class="border-t border-[var(--color-dark-green)] my-4"></div>
            <ul class="space-y-3">
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
                <span class="text-[var(--color-dark-green)]">variácie s dôrazom na nutričnú rovnováhu</span>
              </li>
              <li class="flex items-start gap-3">
                <div class="bg-[var(--color-beige)] rounded-full p-1 flex-shrink-0 mt-1">
                  <UIcon name="i-lucide-check" class="w-5 h-5 text-[var(--color-dark-green)]" />
                </div>
                <span class="text-[var(--color-dark-green)]">Prispôsobenie kalórií a makrotnutrientov tvojim potrebám (Mgr. Filip Dvořáček)</span>
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
                <span class="text-[var(--color-dark-green)]">InBody váženie - kompletná analýza tela (MUDr. Peter Birčák)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>



    <!-- Gallery Section -->
    <div class="bg-[var(--color-beige)] relative">
      <!-- Desktop Layout -->
      <div class="hidden lg:flex lg:flex-row">
        <div class="container mx-auto px-4 lg:py-28  py-10">

          <div class="grid grid-cols-12 gap-4 items-center">
            <!-- Left Text Content -->
            <div class="col-span-12 lg:col-span-6 flex flex-col relative lg:py-20 py-6">
              <!-- Gallery Title -->
              <h2 class="text-[4rem] lg:text-[6rem] font-condensed font-bold text-[var(--color-dark-green)] mb-4 relative z-10 text-center lg:text-left">
                Galéria
              </h2>
              <div class="relative h-0 hidden lg:block">
                <p class="font-condensed text-center text-[31px] font-bold relative translate-y-[-550px] translate-x-[100px] trasnns w-[200px] h-[200px] rounded-full bg-[var(--color-orange)] text-white flex items-center justify-center">lokálne suroviny</p>
                <p class="font-condensed text-center text-[31px] font-bold relative translate-y-[-500px] translate-x-[10px] w-[150px] h-[150px] rounded-full bg-[var(--color-orange)] text-white flex items-center justify-center">eko balenie</p>
                <p class="font-condensed text-center text-[31px] font-bold relative translate-y-[-700px] translate-x-[310px] w-[170px] h-[170px] rounded-full bg-[var(--color-orange)] text-white flex items-center justify-center">poctivá chuť</p>
                <p class="py-2 px-4 font-condensed text-[31px] font-bold relative translate-y-[-650px] translate-x-[330px] w-[220px] h-[220px] rounded-full bg-[var(--color-orange)] text-white flex items-center justify-center">kvalita 
                  bez kompromisov</p>
              </div>
            </div>
          </div>
        </div>
        <!-- Right Gallery Content - Overflow design -->
        <div class="w-1/2 absolute right-0">
          <ProductGallery />
        </div>
      </div>

      <!-- Mobile Layout -->
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
    </div>

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
      <div class="bg-[var(--color-dark-green)] rounded-t-[40px] py-20">
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
                  <p class="text-lg text-[var(--color-beige)]">Nám. sv. Michala 5<br/>934 01 Levice</p>
                </div>
              </div>
              
              <!-- Phone -->
              <div class="flex items-start gap-4">
                <PhoneIcon class="w-8 h-8 flex-shrink-0 text-[var(--color-beige)]" />
                <div>
                  <h4 class="font-condensed text-2xl font-bold text-[var(--color-beige)] mb-2">Telefón</h4>
                  <a href="tel:+421905000000" class="text-lg text-[var(--color-beige)] hover:text-[var(--color-orange)] transition-colors">+421 905 000 000</a>
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