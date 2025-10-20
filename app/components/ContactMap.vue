<script setup lang="ts">
// Type declarations for Google Maps
declare global {
  interface Window {
    google: any
    initGoogleMap: () => void
  }
}

// Google Maps configuration
const mapConfig = {
  center: { lat: 48.2177004, lng: 18.6042033 }, // Žilina, Slovakia coordinates
  zoom: 15,
  mapTypeId: 'roadmap' as const,
  mapId: 'LEVFOOD_MAP' // Required for AdvancedMarkerElement
}

// Map instance ref
const mapElement = ref<HTMLElement>()
const mapInstance = ref<any>()
const isMapLoaded = ref(false)

// Initialize map
onMounted(() => {
  if (process.client) {
    loadGoogleMapsScript()
  }
})

const loadGoogleMapsScript = async () => {
  // Check if Google Maps is already loaded
  if (window.google && window.google.maps) {
    initializeMap()
    return
  }

  // Check if script is already being loaded
  if (document.querySelector('script[src*="maps.googleapis.com"]')) {
    // Wait for script to load
    const checkLoaded = setInterval(() => {
      if (window.google && window.google.maps) {
        clearInterval(checkLoaded)
        initializeMap()
      }
    }, 100)
    return
  }

  // Load the script with proper async loading pattern
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${useRuntimeConfig().public.googleMapsApiKey}&libraries=marker&loading=async&callback=initGoogleMap`
  script.async = true
  script.defer = true
  
  // Set global callback
  window.initGoogleMap = () => {
    isMapLoaded.value = true
    initializeMap()
  }
  
  document.head.appendChild(script)
}

const initializeMap = async () => {
  if (mapElement.value && window.google && window.google.maps) {
    try {
      // Create the map
      mapInstance.value = new window.google.maps.Map(mapElement.value, mapConfig)
      
      // Wait for the map to be fully initialized
      await new Promise((resolve) => {
        if (mapInstance.value) {
          window.google.maps.event.addListenerOnce(mapInstance.value, 'idle', resolve)
        } else {
          resolve(true)
        }
      })
      
      // Import the AdvancedMarkerElement library
      const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker")
      
      // Create an AdvancedMarkerElement
      const marker = new AdvancedMarkerElement({
        position: mapConfig.center,
        map: mapInstance.value,
        title: 'Our Location'
      })
    } catch (error) {
      console.error('Error initializing map with AdvancedMarkerElement:', error)
      
      // Fallback to regular marker if AdvancedMarkerElement fails
      if (mapInstance.value) {
        new window.google.maps.Marker({
          position: mapConfig.center,
          map: mapInstance.value,
          title: 'Our Location'
        })
      }
    }
  }
}
</script>

<template>
  <div 
    ref="mapElement"
    class="w-full h-full min-h-[500px] bg-gray-200 flex items-center justify-center"
  >
    <!-- Fallback content when map is loading -->
    <div class="text-center">
      <UIcon name="i-lucide-map" class="w-16 h-16 text-gray-400 mb-4" />
      <p class="text-gray-500">Načítavam mapu...</p>
    </div>
  </div>
</template>

