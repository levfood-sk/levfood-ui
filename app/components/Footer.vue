<script setup lang="ts">
import logoSmallIcon from '@/assets/icons/logo-small.svg'

const currentYear = new Date().getFullYear()
const legalLinks = [
  { label: 'Zásady ochrany osobných údajov', to: '/zasady-ochrany' },
  { label: 'Terms of Service', to: '/podmienky-pouzivania' },
  { label: 'Cookies Settings', to: '#' }
]
const socials = [
  { icon: 'i-lucide-facebook', to: '#' },
  { icon: 'i-lucide-instagram', to: '#' },
  { icon: 'i-lucide-twitter', to: '#' },
  { icon: 'i-lucide-linkedin', to: '#' },
  { icon: 'i-lucide-youtube', to: '#' }
]
</script>

<template>
  <footer class="bg-[var(--color-dark-green)] py-10">
    <div class="container mx-auto px-4">
      <div class="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-0">
        <img :src="logoSmallIcon" alt="LevFood Logo" class="w-16 lg:w-24 h-auto" />
        <div class="flex gap-6 items-center">
          <NuxtLink v-for="s in socials" :key="s.icon" :to="s.to" aria-label="social" class="text-[var(--color-beige)] hover:text-[var(--color-orange)] transition-colors flex items-center justify-center">
            <UIcon :name="s.icon" class="w-6 h-6" />
          </NuxtLink>
        </div>
      </div>


      <div class="my-8 h-px w-full bg-[var(--color-beige)] opacity-30" />

      <div class="flex flex-col items-center justify-center gap-3 text-[var(--color-beige)]">
        <div class="flex lg:flex-row flex-col items-center gap-3">
          <p class="text-sm lg:block hidden">© {{ currentYear }} Všetky práva vyhradené.</p>
          <NuxtLink v-for="l in legalLinks" :key="l.label" :to="l.to" class="hover:text-[var(--color-orange)] transition-colors text-sm">{{ l.label }}</NuxtLink>
        </div>
        <p class="text-sm mt-4 lg:hidden block">© {{ currentYear }} Všetky práva vyhradené.</p>
      </div>
    </div>
  </footer>
</template>


