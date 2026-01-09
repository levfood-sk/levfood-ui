<template>
  <div class="container max-w-7xl">
    <!-- Page Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-[var(--color-dark-green)] mb-2">Objednávky Jedál</h1>
      <p class="text-[var(--color-dark-green)]/60">Prehľad výberu jedál užívateľmi</p>
    </div>

    <div class="space-y-6">
      <!-- Date Navigation -->
      <div class="bg-white rounded-2xl shadow-sm border border-[var(--color-dark-green)]/10 p-4">
        <div class="flex flex-col md:flex-row items-center gap-4">
          <div class="flex items-center gap-1">
            <button
              class="p-2 rounded-lg hover:bg-[var(--color-beige)] transition-colors flex items-center justify-center"
              @click="goToPreviousDay"
            >
              <UIcon name="i-heroicons-chevron-left" class="w-5 h-5 text-[var(--color-dark-green)]" />
            </button>
            <input
              v-model="selectedDate"
              type="date"
              class="px-4 py-2 rounded-xl border border-[var(--color-dark-green)]/20 bg-[var(--color-beige)]/50 text-[var(--color-dark-green)] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]/50"
            />
            <button
              class="p-2 rounded-lg hover:bg-[var(--color-beige)] transition-colors flex items-center justify-center"
              @click="goToNextDay"
            >
              <UIcon name="i-heroicons-chevron-right" class="w-5 h-5 text-[var(--color-dark-green)]" />
            </button>
          </div>
          <div class="flex gap-2">
            <button
              class="px-4 py-2 rounded-xl border-2 border-[var(--color-dark-green)]/20 text-[var(--color-dark-green)] font-medium hover:bg-[var(--color-beige)] transition-colors"
              @click="goToToday"
            >
              Dnes
            </button>
            <button
              class="px-4 py-2 rounded-xl border-2 border-[var(--color-dark-green)]/20 text-[var(--color-dark-green)] font-medium hover:bg-[var(--color-beige)] transition-colors"
              @click="goToTomorrow"
            >
              Zajtra
            </button>
          </div>
          <div class="flex-1" />
          <div class="flex gap-2">
            <button
              class="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-beige)] text-[var(--color-dark-green)] font-semibold hover:bg-[var(--color-orange)] transition-colors disabled:opacity-50"
              :disabled="isExporting || !mealOrders || (mealOrders.totalOrders === 0 && (!mealOrders.pendingSelectionClients || mealOrders.pendingSelectionClients.length === 0))"
              @click="handleExportCsv"
            >
              <UIcon
                name="i-heroicons-arrow-down-tray"
                class="w-5 h-5"
                :class="{ 'animate-bounce': isExporting }"
              />
              CSV
            </button>
            <button
              class="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              :disabled="isLoading"
              @click="fetchMealOrders"
            >
              <UIcon
                name="i-heroicons-arrow-path"
                class="w-5 h-5"
                :class="{ 'animate-spin': isLoading }"
              />
              Obnoviť
            </button>
          </div>
        </div>
        
        <!-- Formatted date display -->
        <div class="mt-3 text-center md:text-left">
          <span class="text-lg font-semibold text-[var(--color-dark-green)]">{{ formattedDate }}</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-16">
        <div class="w-16 h-16 rounded-full bg-[var(--color-beige)] flex items-center justify-center mb-4">
          <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-[var(--color-orange)]" />
        </div>
        <p class="text-[var(--color-dark-green)]/60">Načítavam objednávky...</p>
      </div>

      <!-- No Data -->
      <div v-else-if="!mealOrders || mealOrders.totalOrders === 0" class="bg-white rounded-2xl shadow-sm border border-[var(--color-dark-green)]/10 p-12">
        <div class="text-center">
          <div class="w-20 h-20 rounded-full bg-[var(--color-beige)] flex items-center justify-center mx-auto mb-4">
            <UIcon name="i-heroicons-calendar" class="w-10 h-10 text-[var(--color-dark-green)]/40" />
          </div>
          <h3 class="text-xl font-semibold text-[var(--color-dark-green)] mb-2">Žiadne objednávky</h3>
          <p class="text-[var(--color-dark-green)]/60 max-w-md mx-auto">
            {{ mealOrders?.message || 'Pre tento deň zatiaľ nie sú žiadne objednávky jedál.' }}
          </p>
        </div>
      </div>

      <template v-else>
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Total Orders Card -->
          <div class="bg-[var(--color-dark-green)] rounded-2xl p-6 text-white">
            <p class="text-white/70 text-sm mb-1">Celkom objednávok</p>
            <p class="text-4xl font-bold">{{ mealOrders.totalOrders }}</p>
          </div>
          
          <!-- Quick Stats Card -->
          <div class="md:col-span-3 bg-white rounded-2xl shadow-sm border border-[var(--color-dark-green)]/10 p-6">
            <div class="grid grid-cols-2 gap-6">
              <!-- Ranajky Summary -->
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-8 h-8 rounded-lg bg-[var(--color-orange)]/20 flex items-center justify-center">
                    <UIcon name="i-heroicons-sun" class="w-4 h-4 text-[var(--color-orange)]" />
                  </div>
                  <span class="font-semibold text-[var(--color-dark-green)]">Raňajky</span>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between items-center p-2 rounded-lg bg-[var(--color-beige)]/50">
                    <span class="text-sm text-[var(--color-dark-green)]/70 truncate flex-1" :title="mealOrders.ranajkyCounts?.optionA?.name">
                      <span class="font-semibold text-[var(--color-dark-green)]">A:</span> {{ truncate(mealOrders.ranajkyCounts?.optionA?.name, 18) }}
                    </span>
                    <span class="font-bold text-[var(--color-dark-green)] ml-2">{{ mealOrders.ranajkyCounts?.optionA?.count || 0 }}×</span>
                  </div>
                  <div class="flex justify-between items-center p-2 rounded-lg bg-[var(--color-beige)]/50">
                    <span class="text-sm text-[var(--color-dark-green)]/70 truncate flex-1" :title="mealOrders.ranajkyCounts?.optionB?.name">
                      <span class="font-semibold text-[var(--color-dark-green)]">B:</span> {{ truncate(mealOrders.ranajkyCounts?.optionB?.name, 18) }}
                    </span>
                    <span class="font-bold text-[var(--color-dark-green)] ml-2">{{ mealOrders.ranajkyCounts?.optionB?.count || 0 }}×</span>
                  </div>
                </div>
              </div>
              <!-- Obed Summary -->
              <div>
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-8 h-8 rounded-lg bg-[var(--color-dark-green)]/10 flex items-center justify-center">
                    <UIcon name="i-heroicons-fire" class="w-4 h-4 text-[var(--color-dark-green)]" />
                  </div>
                  <span class="font-semibold text-[var(--color-dark-green)]">Obed</span>
                </div>
                <div class="space-y-2">
                  <div class="flex justify-between items-center p-2 rounded-lg bg-[var(--color-beige)]/50">
                    <span class="text-sm text-[var(--color-dark-green)]/70 truncate flex-1" :title="mealOrders.obedCounts?.optionA?.name">
                      <span class="font-semibold text-[var(--color-dark-green)]">A:</span> {{ truncate(mealOrders.obedCounts?.optionA?.name, 18) }}
                    </span>
                    <span class="font-bold text-[var(--color-dark-green)] ml-2">{{ mealOrders.obedCounts?.optionA?.count || 0 }}×</span>
                  </div>
                  <div class="flex justify-between items-center p-2 rounded-lg bg-[var(--color-beige)]/50">
                    <span class="text-sm text-[var(--color-dark-green)]/70 truncate flex-1" :title="mealOrders.obedCounts?.optionB?.name">
                      <span class="font-semibold text-[var(--color-dark-green)]">B:</span> {{ truncate(mealOrders.obedCounts?.optionB?.name, 18) }}
                    </span>
                    <span class="font-bold text-[var(--color-dark-green)] ml-2">{{ mealOrders.obedCounts?.optionB?.count || 0 }}×</span>
                  </div>
                  <div class="flex justify-between items-center p-2 rounded-lg bg-[var(--color-beige)]/50">
                    <span class="text-sm text-[var(--color-dark-green)]/70 truncate flex-1" :title="mealOrders.obedCounts?.optionC?.name">
                      <span class="font-semibold text-[var(--color-dark-green)]">C:</span> {{ truncate(mealOrders.obedCounts?.optionC?.name, 18) }}
                    </span>
                    <span class="font-bold text-[var(--color-dark-green)] ml-2">{{ mealOrders.obedCounts?.optionC?.count || 0 }}×</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Orders by Package -->
        <div class="space-y-4">
          <h2 class="text-xl font-bold text-[var(--color-dark-green)] flex items-center gap-2">
            <UIcon name="i-heroicons-users" class="w-6 h-6" />
            Podľa balíčka
          </h2>

          <!-- Package Section with Tabs in Header -->
          <div v-if="packageTabs.length > 0" class="bg-white rounded-2xl shadow-sm border border-[var(--color-dark-green)]/10 overflow-hidden">
            <!-- Green Header with Tabs -->
            <div class="bg-[var(--color-dark-green)] px-4 py-3">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-for="tab in packageTabs"
                  :key="tab.value"
                  class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  :class="[
                    activePackageTab === tab.value
                      ? (tab.isPending ? 'bg-[var(--color-orange)] text-[var(--color-dark-green)]' : 'bg-white text-[var(--color-dark-green)]')
                      : (tab.isPending ? 'bg-[var(--color-orange)]/40 text-white hover:bg-[var(--color-orange)]/60' : 'bg-white/20 text-white hover:bg-white/30')
                  ]"
                  @click="activePackageTab = tab.value"
                >
                  {{ tab.label }}
                  <span
                    class="ml-2 px-2 py-0.5 rounded-full text-xs"
                    :class="[
                      activePackageTab === tab.value
                        ? (tab.isPending ? 'bg-[var(--color-dark-green)]/20' : 'bg-[var(--color-dark-green)]/10')
                        : (tab.isPending ? 'bg-[var(--color-dark-green)]/30' : 'bg-white/20')
                    ]"
                  >
                    {{ tab.isPending ? (mealOrders?.pendingSelectionClients?.length || 0) : (mealOrders?.byPackage[tab.value]?.count || 0) }}
                  </span>
                </button>
              </div>
            </div>

            <!-- Column Visibility Controls -->
            <div class="px-4 py-3 border-b border-[var(--color-dark-green)]/10 bg-[var(--color-beige)]/30">
              <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <span class="text-sm font-medium text-[var(--color-dark-green)]">Zobrazené stĺpce:</span>
                <USelectMenu
                  v-model="selectedColumns"
                  :items="allColumns"
                  multiple
                  value-attribute="key"
                  option-attribute="label"
                  placeholder="Vyber stĺpce..."
                  :search-input="{ placeholder: 'Hľadať...' }"
                  class="w-full sm:w-80"
                >
                  <template #empty>
                    <p class="text-slate-500 text-sm p-2">Žiadne stĺpce</p>
                  </template>
                </USelectMenu>
              </div>
            </div>

            <!-- Table Content for Pending Clients -->
            <div v-if="activePackageTab === PENDING_TAB_VALUE && mealOrders?.pendingSelectionClients" class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-[var(--color-dark-green)]/10 bg-[var(--color-orange)]/10">
                    <th class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Klient</th>
                    <th class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Objednávka</th>
                    <th class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Email</th>
                    <th class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Telefón</th>
                    <th class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Typ doručenia</th>
                    <th class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Adresa</th>
                    <th class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Balíček</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(client, idx) in mealOrders.pendingSelectionClients"
                    :key="client.clientId"
                    class="border-b border-[var(--color-dark-green)]/5 hover:bg-[var(--color-orange)]/10 transition-colors"
                    :class="{ 'bg-[var(--color-orange)]/5': idx % 2 === 1 }"
                  >
                    <td class="px-6 py-4">
                      <span class="font-medium text-[var(--color-dark-green)]">{{ client.clientName }}</span>
                    </td>
                    <td class="px-6 py-4">
                      <span class="text-[var(--color-dark-green)]/60 font-mono text-sm">#{{ client.orderId }}</span>
                    </td>
                    <td class="px-6 py-4">
                      <a
                        v-if="client.email"
                        :href="`mailto:${client.email}`"
                        class="text-sm text-[var(--color-dark-green)] hover:text-[var(--color-orange)] underline"
                      >
                        {{ client.email }}
                      </a>
                      <span v-else class="text-sm text-[var(--color-dark-green)]/70">-</span>
                    </td>
                    <td class="px-6 py-4">
                      <a
                        v-if="client.phone"
                        :href="`tel:${client.phone}`"
                        class="text-sm text-[var(--color-dark-green)] hover:text-[var(--color-orange)] underline"
                      >
                        {{ client.phone }}
                      </a>
                      <span v-else class="text-sm text-[var(--color-dark-green)]/70">-</span>
                    </td>
                    <td class="px-6 py-4">
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium"
                        :class="client.deliveryType === 'domov' ? 'bg-[var(--color-orange)]/20 text-[var(--color-dark-green)]' : 'bg-[var(--color-beige)] text-[var(--color-dark-green)]'"
                      >
                        {{ client.deliveryType === 'domov' ? 'Domov' : 'Prevádzka' }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <span class="text-sm text-[var(--color-dark-green)]/70 truncate max-w-48">{{ client.deliveryAddress || '-' }}</span>
                    </td>
                    <td class="px-6 py-4">
                      <span class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-[var(--color-dark-green)] text-white">
                        {{ client.packageTier }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Table Content for Package Clients -->
            <div v-else-if="activePackageTab && mealOrders?.byPackage[activePackageTab]" class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-[var(--color-dark-green)]/10 bg-[var(--color-beige)]/30">
                    <th v-if="isColumnVisible('clientName')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Klient</th>
                    <th v-if="isColumnVisible('orderId')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Objednávka</th>
                    <th v-if="isColumnVisible('email')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Email</th>
                    <th v-if="isColumnVisible('ranajky')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Raňajky</th>
                    <th v-if="isColumnVisible('desiata')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Desiata</th>
                    <th v-if="isColumnVisible('polievka')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Polievka</th>
                    <th v-if="isColumnVisible('obed')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Obed</th>
                    <th v-if="isColumnVisible('olovrant')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Olovrant</th>
                    <th v-if="isColumnVisible('vecera')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Večera</th>
                    <th v-if="isColumnVisible('dietaryRequirements')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Diétne požiadavky</th>
                    <th v-if="isColumnVisible('deliveryType')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Typ doručenia</th>
                    <th v-if="isColumnVisible('deliveryAddress')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Adresa</th>
                    <th v-if="isColumnVisible('phone')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Telefón</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(client, idx) in mealOrders.byPackage[activePackageTab].clients"
                    :key="client.clientId"
                    class="border-b border-[var(--color-dark-green)]/5 hover:bg-[var(--color-beige)]/30 transition-colors"
                    :class="{ 'bg-[var(--color-beige)]/20': idx % 2 === 1 }"
                  >
                    <td v-if="isColumnVisible('clientName')" class="px-6 py-4">
                      <span class="font-medium text-[var(--color-dark-green)]">{{ client.clientName }}</span>
                    </td>
                    <td v-if="isColumnVisible('orderId')" class="px-6 py-4">
                      <span class="text-[var(--color-dark-green)]/60 font-mono text-sm">#{{ client.orderId }}</span>
                    </td>
                    <td v-if="isColumnVisible('email')" class="px-6 py-4">
                      <span class="text-sm text-[var(--color-dark-green)]/70">-</span>
                    </td>
                    <td v-if="isColumnVisible('ranajky')" class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <span
                          class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                          :class="client.selectedRanajky === 'A' ? 'bg-[var(--color-orange)] text-white' : 'bg-[var(--color-dark-green)] text-white'"
                        >
                          {{ client.selectedRanajky }}
                        </span>
                        <span class="text-sm text-[var(--color-dark-green)]/70 truncate max-w-40">{{ client.ranajkyName }}</span>
                      </div>
                    </td>
                    <td v-if="isColumnVisible('desiata')" class="px-6 py-4">
                      <span class="text-sm text-[var(--color-dark-green)]/70 truncate max-w-40">{{ client.desiata || '-' }}</span>
                    </td>
                    <td v-if="isColumnVisible('polievka')" class="px-6 py-4">
                      <span class="text-sm text-[var(--color-dark-green)]/70 truncate max-w-40">{{ client.polievka || '-' }}</span>
                    </td>
                    <td v-if="isColumnVisible('obed')" class="px-6 py-4">
                      <div class="flex items-center gap-2">
                        <span
                          class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                          :class="{
                            'bg-[var(--color-orange)] text-white': client.selectedObed === 'A',
                            'bg-[var(--color-dark-green)] text-white': client.selectedObed === 'B',
                            'bg-[var(--color-dark-green)]/70 text-white': client.selectedObed === 'C'
                          }"
                        >
                          {{ client.selectedObed }}
                        </span>
                        <span class="text-sm text-[var(--color-dark-green)]/70 truncate max-w-40">{{ client.obedName }}</span>
                      </div>
                    </td>
                    <td v-if="isColumnVisible('olovrant')" class="px-6 py-4">
                      <span class="text-sm text-[var(--color-dark-green)]/70 truncate max-w-40">{{ client.olovrant || '-' }}</span>
                    </td>
                    <td v-if="isColumnVisible('vecera')" class="px-6 py-4">
                      <span class="text-sm text-[var(--color-dark-green)]/70 truncate max-w-40">{{ client.vecera || '-' }}</span>
                    </td>
                    <td v-if="isColumnVisible('dietaryRequirements')" class="px-6 py-4">
                      <div v-if="client.dietaryRequirements && client.dietaryRequirements.length > 0" class="flex flex-wrap gap-1">
                        <span
                          v-for="req in client.dietaryRequirements"
                          :key="req"
                          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-orange)]/20 text-[var(--color-dark-green)]"
                        >
                          {{ req }}
                        </span>
                      </div>
                      <span v-else class="text-sm text-[var(--color-dark-green)]/70">-</span>
                    </td>
                    <td v-if="isColumnVisible('deliveryType')" class="px-6 py-4">
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium"
                        :class="client.deliveryType === 'domov' ? 'bg-[var(--color-orange)]/20 text-[var(--color-dark-green)]' : 'bg-[var(--color-beige)] text-[var(--color-dark-green)]'"
                      >
                        {{ client.deliveryType === 'domov' ? 'Domov' : 'Prevádzka' }}
                      </span>
                    </td>
                    <td v-if="isColumnVisible('deliveryAddress')" class="px-6 py-4">
                      <span class="text-sm text-[var(--color-dark-green)]/70 truncate max-w-48">{{ client.deliveryAddress || '-' }}</span>
                    </td>
                    <td v-if="isColumnVisible('phone')" class="px-6 py-4">
                      <span class="text-sm text-[var(--color-dark-green)]/70">{{ client.phone || '-' }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Skipped People Section -->
        <div v-if="mealOrders?.skippedClients?.length > 0" class="space-y-4">
          <h2 class="text-xl font-bold text-[var(--color-dark-green)] flex items-center gap-2">
            <UIcon name="i-heroicons-user-minus" class="w-6 h-6" />
            Preskočia doručenie
            <span class="px-3 py-1 rounded-full bg-[var(--color-orange)]/20 text-sm font-medium text-[var(--color-dark-green)]">
              {{ mealOrders.skippedClients.length }}
            </span>
          </h2>

          <div class="bg-white rounded-2xl shadow-sm border border-[var(--color-orange)]/30 overflow-hidden">
            <div class="px-6 py-4 bg-[var(--color-orange)]/20 text-[var(--color-dark-green)] flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UIcon name="i-heroicons-calendar-days" class="w-5 h-5" />
                <span class="font-semibold">Klienti s preskočením pre {{ formattedDate }}</span>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-[var(--color-dark-green)]/10 bg-[var(--color-beige)]/30">
                    <th v-if="isColumnVisible('clientName')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Klient</th>
                    <th v-if="isColumnVisible('orderId')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Objednávka</th>
                    <th class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Balíček</th>
                    <th v-if="isColumnVisible('deliveryType')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Typ doručenia</th>
                    <th v-if="isColumnVisible('deliveryAddress')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Adresa</th>
                    <th v-if="isColumnVisible('phone')" class="text-left px-6 py-3 text-sm font-semibold text-[var(--color-dark-green)]">Telefón</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(client, idx) in mealOrders.skippedClients"
                    :key="client.clientId"
                    class="border-b border-[var(--color-dark-green)]/5 hover:bg-[var(--color-beige)]/30 transition-colors"
                    :class="{ 'bg-[var(--color-orange)]/5': idx % 2 === 1 }"
                  >
                    <td v-if="isColumnVisible('clientName')" class="px-6 py-4">
                      <span class="font-medium text-[var(--color-dark-green)]">{{ client.clientName }}</span>
                    </td>
                    <td v-if="isColumnVisible('orderId')" class="px-6 py-4">
                      <span class="text-[var(--color-dark-green)]/60 font-mono text-sm">#{{ client.orderId }}</span>
                    </td>
                    <td class="px-6 py-4">
                      <span class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-[var(--color-dark-green)] text-white">
                        {{ client.packageTier }}
                      </span>
                    </td>
                    <td v-if="isColumnVisible('deliveryType')" class="px-6 py-4">
                      <span
                        class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium"
                        :class="client.deliveryType === 'domov' ? 'bg-[var(--color-orange)]/20 text-[var(--color-dark-green)]' : 'bg-[var(--color-beige)] text-[var(--color-dark-green)]'"
                      >
                        {{ client.deliveryType === 'domov' ? 'Domov' : 'Prevádzka' }}
                      </span>
                    </td>
                    <td v-if="isColumnVisible('deliveryAddress')" class="px-6 py-4">
                      <span class="text-sm text-[var(--color-dark-green)]/70 truncate max-w-48">{{ client.deliveryAddress || '-' }}</span>
                    </td>
                    <td v-if="isColumnVisible('phone')" class="px-6 py-4">
                      <span class="text-sm text-[var(--color-dark-green)]/70">{{ client.phone || '-' }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCsvExport } from '~/composables/useCsvExport'

definePageMeta({
  layout: 'dashboard'
})

interface ClientSelection {
  clientId: string
  clientName: string
  orderId: string
  selectedRanajky: 'A' | 'B'
  ranajkyName: string
  selectedObed: 'A' | 'B' | 'C'
  obedName: string
  deliveryType: 'prevádzka' | 'domov'
  deliveryAddress: string
  phone: string
  // Non-option meals (same for everyone)
  desiata: string
  polievka: string
  olovrant: string
  vecera: string
  // Dietary requirements (only for standard and premium packages)
  dietaryRequirements: string[]
}

interface SkippedClient {
  clientId: string
  clientName: string
  orderId: string
  packageTier: string
  deliveryType: 'prevádzka' | 'domov'
  deliveryAddress: string
  phone: string
}

interface PendingSelectionClient {
  clientId: string
  clientName: string
  email: string
  orderId: string
  packageTier: string
  deliveryType: 'prevádzka' | 'domov'
  deliveryAddress: string
  phone: string
}

interface PackageGroup {
  count: number
  clients: ClientSelection[]
}

interface MealOrderSummary {
  date: string
  totalOrders: number
  message?: string
  byPackage: Record<string, PackageGroup>
  ranajkyCounts: {
    optionA: { name: string; count: number }
    optionB: { name: string; count: number }
  }
  obedCounts: {
    optionA: { name: string; count: number }
    optionB: { name: string; count: number }
    optionC: { name: string; count: number }
  }
  fixedMeals: {
    desiata: { name: string; count: number }
    polievka: { name: string; count: number }
    olovrant: { name: string; count: number }
    vecera: { name: string; count: number }
  }
  skippedClients: SkippedClient[]
  pendingSelectionClients: PendingSelectionClient[]
}

interface ColumnConfig {
  key: string
  label: string
  default: boolean
}

const toast = useToast()
const { exportToCsv } = useCsvExport()

// State
const isLoading = ref(false)
const isExporting = ref(false)
const mealOrders = ref<MealOrderSummary | null>(null)

// Tab navigation
const activePackageTab = ref<string>('')

// Computed: available package tabs from data (with "Bez výberu" tab first)
const packageTabs = computed(() => {
  const tabs: { label: string; value: string; isPending?: boolean }[] = []

  // Add "Bez výberu" tab first if there are pending clients
  if (mealOrders.value?.pendingSelectionClients && mealOrders.value.pendingSelectionClients.length > 0) {
    tabs.push({
      label: 'Bez výberu',
      value: PENDING_TAB_VALUE,
      isPending: true
    })
  }

  // Add package tabs
  if (mealOrders.value?.byPackage) {
    Object.keys(mealOrders.value.byPackage).forEach(packageName => {
      tabs.push({
        label: packageName,
        value: packageName
      })
    })
  }

  return tabs
})

// Column visibility configuration
const STORAGE_KEY = 'mealOrdersColumnPrefs'

const allColumns: ColumnConfig[] = [
  { key: 'clientName', label: 'Klient', default: true },
  { key: 'orderId', label: 'Objednávka', default: true },
  { key: 'email', label: 'Email', default: false },
  { key: 'ranajky', label: 'Raňajky', default: true },
  { key: 'desiata', label: 'Desiata', default: false },
  { key: 'polievka', label: 'Polievka', default: false },
  { key: 'obed', label: 'Obed', default: true },
  { key: 'olovrant', label: 'Olovrant', default: false },
  { key: 'vecera', label: 'Večera', default: false },
  { key: 'dietaryRequirements', label: 'Diétne požiadavky', default: true },
  { key: 'deliveryType', label: 'Typ doručenia', default: false },
  { key: 'deliveryAddress', label: 'Adresa', default: false },
  { key: 'phone', label: 'Telefón', default: false }
]

// Special tab identifier for pending selection clients
const PENDING_TAB_VALUE = '__PENDING__'

// Normalize package name for lookup (handle Slovak characters and case)
const normalizePackageName = (name: string): string => {
  return name.toLowerCase()
    .replace('š', 's')
    .replace('ť', 't')
    .replace('č', 'c')
    .replace('ž', 'z')
    .replace('ý', 'y')
    .replace('á', 'a')
    .replace('í', 'i')
    .replace('é', 'e')
    .replace('ú', 'u')
    .replace('ô', 'o')
    .replace('ľ', 'l')
    .replace('ň', 'n')
    .replace('ď', 'd')
}

// Load column preferences from localStorage
const loadColumnPrefs = (): ColumnConfig[] => {
  if (import.meta.server) return allColumns.filter(c => c.default)
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const savedKeys = JSON.parse(saved) as string[]
      return allColumns.filter(c => savedKeys.includes(c.key))
    }
  } catch (e) {
    console.error('Error loading column preferences:', e)
  }
  return allColumns.filter(c => c.default)
}

const selectedColumns = ref<ColumnConfig[]>(loadColumnPrefs())

// Save to localStorage when changed
watch(selectedColumns, (cols) => {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cols.map(c => c.key)))
  }
}, { deep: true })

// Check if a column is visible in UI table (based on user selection)
const isColumnVisible = (key: string) => selectedColumns.value.some(col => col.key === key)

// Default to tomorrow + 2 days (typical production lead time)
const getDefaultDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 2) // 2 days ahead for production
  return date.toISOString().split('T')[0]
}

const selectedDate = ref(getDefaultDate())

// Formatted date for display
const formattedDate = computed(() => {
  const [year, month, day] = selectedDate.value.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const dayNames = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota']
  const months = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra']
  return `${dayNames[dateObj.getDay()]}, ${day}. ${months[month - 1]} ${year}`
})

// Helpers
const truncate = (str: string | undefined, maxLength: number) => {
  if (!str) return '-'
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str
}

const goToPreviousDay = () => {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() - 1)
  selectedDate.value = date.toISOString().split('T')[0]
}

const goToNextDay = () => {
  const date = new Date(selectedDate.value)
  date.setDate(date.getDate() + 1)
  selectedDate.value = date.toISOString().split('T')[0]
}

const goToToday = () => {
  selectedDate.value = new Date().toISOString().split('T')[0]
}

const goToTomorrow = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  selectedDate.value = date.toISOString().split('T')[0]
}

// CSV Export
const handleExportCsv = () => {
  if (!mealOrders.value || !activePackageTab.value) {
    toast.add({
      title: 'Upozornenie',
      description: 'Žiadne dáta na export',
      color: 'warning'
    })
    return
  }

  isExporting.value = true
  try {
    // Handle pending selection clients export
    if (activePackageTab.value === PENDING_TAB_VALUE) {
      const pendingClients = mealOrders.value.pendingSelectionClients
      if (!pendingClients || pendingClients.length === 0) {
        toast.add({
          title: 'Upozornenie',
          description: 'Žiadni klienti bez výberu',
          color: 'warning'
        })
        return
      }

      // Columns for pending clients
      const columns = [
        { header: 'Klient', dataKey: 'clientName' },
        { header: 'Objednávka', dataKey: 'orderId' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Telefón', dataKey: 'phone' },
        { header: 'Typ doručenia', dataKey: 'deliveryType' },
        { header: 'Adresa', dataKey: 'deliveryAddress' },
        { header: 'Balíček', dataKey: 'packageTier' }
      ]

      // Build rows for pending clients
      const rows = pendingClients.map(client => ({
        clientName: client.clientName,
        orderId: `#${client.orderId}`,
        email: client.email || '-',
        phone: client.phone ? `+${client.phone.replace(/^\+/, '')}` : '-',
        deliveryType: client.deliveryType === 'domov' ? 'Domov' : 'Prevádzka',
        deliveryAddress: client.deliveryAddress || '-',
        packageTier: client.packageTier
      }))

      // Header info for pending clients export
      const headerInfo = [
        { label: 'Dátum', value: formattedDate.value },
        { label: 'Typ', value: 'Klienti bez výberu jedál' },
        { label: 'Počet klientov', value: pendingClients.length.toString() }
      ]

      exportToCsv({
        columns,
        rows,
        filename: `bez-vyberu-${selectedDate.value}.csv`,
        headerInfo
      })

      toast.add({
        title: 'Úspech',
        description: 'CSV súbor bol úspešne vygenerovaný',
        color: 'success'
      })
      return
    }

    // Handle package clients export (existing logic)
    const packageData = mealOrders.value.byPackage[activePackageTab.value]
    if (!packageData) {
      toast.add({
        title: 'Upozornenie',
        description: 'Žiadne dáta pre vybraný balíček',
        color: 'warning'
      })
      return
    }

    // Define CSV columns per package type (independent of UI table selection)
    // Economy: raňajky + obed s polievkou + večera
    // Standard: raňajky + obed s polievkou + olovrant + večera
    // Premium: raňajky + desiata + obed s polievkou + olovrant + večera
    // Office: raňajky + desiata + obed s polievkou
    const pkgNormalized = normalizePackageName(activePackageTab.value)

    const csvColumnsByPackage: Record<string, { header: string; dataKey: string }[]> = {
      economy: [
        { header: 'Klient', dataKey: 'clientName' },
        { header: 'Objednávka', dataKey: 'orderId' },
        { header: 'Raňajky', dataKey: 'ranajky' },
        { header: 'Polievka', dataKey: 'polievka' },
        { header: 'Obed', dataKey: 'obed' },
        { header: 'Večera', dataKey: 'vecera' },
        { header: 'Diétne požiadavky', dataKey: 'dietaryRequirements' },
        { header: 'Typ doručenia', dataKey: 'deliveryType' },
        { header: 'Adresa', dataKey: 'deliveryAddress' },
        { header: 'Telefón', dataKey: 'phone' }
      ],
      standard: [
        { header: 'Klient', dataKey: 'clientName' },
        { header: 'Objednávka', dataKey: 'orderId' },
        { header: 'Raňajky', dataKey: 'ranajky' },
        { header: 'Polievka', dataKey: 'polievka' },
        { header: 'Obed', dataKey: 'obed' },
        { header: 'Olovrant', dataKey: 'olovrant' },
        { header: 'Večera', dataKey: 'vecera' },
        { header: 'Diétne požiadavky', dataKey: 'dietaryRequirements' },
        { header: 'Typ doručenia', dataKey: 'deliveryType' },
        { header: 'Adresa', dataKey: 'deliveryAddress' },
        { header: 'Telefón', dataKey: 'phone' }
      ],
      premium: [
        { header: 'Klient', dataKey: 'clientName' },
        { header: 'Objednávka', dataKey: 'orderId' },
        { header: 'Raňajky', dataKey: 'ranajky' },
        { header: 'Desiata', dataKey: 'desiata' },
        { header: 'Polievka', dataKey: 'polievka' },
        { header: 'Obed', dataKey: 'obed' },
        { header: 'Olovrant', dataKey: 'olovrant' },
        { header: 'Večera', dataKey: 'vecera' },
        { header: 'Diétne požiadavky', dataKey: 'dietaryRequirements' },
        { header: 'Typ doručenia', dataKey: 'deliveryType' },
        { header: 'Adresa', dataKey: 'deliveryAddress' },
        { header: 'Telefón', dataKey: 'phone' }
      ],
      office: [
        { header: 'Klient', dataKey: 'clientName' },
        { header: 'Objednávka', dataKey: 'orderId' },
        { header: 'Raňajky', dataKey: 'ranajky' },
        { header: 'Desiata', dataKey: 'desiata' },
        { header: 'Polievka', dataKey: 'polievka' },
        { header: 'Obed', dataKey: 'obed' },
        { header: 'Diétne požiadavky', dataKey: 'dietaryRequirements' },
        { header: 'Typ doručenia', dataKey: 'deliveryType' },
        { header: 'Adresa', dataKey: 'deliveryAddress' },
        { header: 'Telefón', dataKey: 'phone' }
      ]
    }

    // Get columns for current package (fallback to premium which has all columns)
    const columns = csvColumnsByPackage[pkgNormalized] || csvColumnsByPackage.premium

    // Build rows with mapped data
    const rows = packageData.clients.map(client => ({
      clientName: client.clientName,
      orderId: `#${client.orderId}`,
      ranajky: `${client.selectedRanajky}: ${client.ranajkyName}`,
      desiata: client.desiata || '-',
      polievka: client.polievka || '-',
      obed: `${client.selectedObed}: ${client.obedName}`,
      olovrant: client.olovrant || '-',
      vecera: client.vecera || '-',
      dietaryRequirements: client.dietaryRequirements?.length > 0 ? client.dietaryRequirements.join(', ') : '-',
      deliveryType: client.deliveryType === 'domov' ? 'Domov' : 'Prevádzka',
      deliveryAddress: client.deliveryAddress || '-',
      phone: client.phone ? `+${client.phone.replace(/^\+/, '')}` : '-'
    }))

    // Build header info with food totals
    const headerInfo = [
      { label: 'Dátum', value: formattedDate.value },
      { label: 'Balíček', value: activePackageTab.value },
      { label: 'Celkom objednávok', value: mealOrders.value.totalOrders.toString() },
      { label: '', value: '' }, // Empty separator
      { label: 'SÚHRN JEDÁL', value: '' },
      { label: `Raňajky A (${mealOrders.value.ranajkyCounts.optionA.name})`, value: `${mealOrders.value.ranajkyCounts.optionA.count}×` },
      { label: `Raňajky B (${mealOrders.value.ranajkyCounts.optionB.name})`, value: `${mealOrders.value.ranajkyCounts.optionB.count}×` },
      { label: `Obed A (${mealOrders.value.obedCounts.optionA.name})`, value: `${mealOrders.value.obedCounts.optionA.count}×` },
      { label: `Obed B (${mealOrders.value.obedCounts.optionB.name})`, value: `${mealOrders.value.obedCounts.optionB.count}×` },
      { label: `Obed C (${mealOrders.value.obedCounts.optionC.name})`, value: `${mealOrders.value.obedCounts.optionC.count}×` }
    ]

    // Add fixed meals based on selected package type
    // Desiata: premium, office
    // Polievka: all packages
    // Olovrant: standard, premium
    // Vecera: economy, standard, premium
    if (mealOrders.value.fixedMeals) {
      const fixedMeals = mealOrders.value.fixedMeals
      const pkgNormalized = normalizePackageName(activePackageTab.value)

      // Desiata: only for premium and office
      if (fixedMeals.desiata.name && (pkgNormalized === 'premium' || pkgNormalized === 'office')) {
        headerInfo.push({ label: 'Desiata', value: `${fixedMeals.desiata.name} (${fixedMeals.desiata.count}×)` })
      }
      // Polievka: all packages
      if (fixedMeals.polievka.name) {
        headerInfo.push({ label: 'Polievka', value: `${fixedMeals.polievka.name} (${fixedMeals.polievka.count}×)` })
      }
      // Olovrant: only for standard and premium
      if (fixedMeals.olovrant.name && (pkgNormalized === 'standard' || pkgNormalized === 'premium')) {
        headerInfo.push({ label: 'Olovrant', value: `${fixedMeals.olovrant.name} (${fixedMeals.olovrant.count}×)` })
      }
      // Vecera: only for economy, standard, premium (not office)
      if (fixedMeals.vecera.name && (pkgNormalized === 'economy' || pkgNormalized === 'standard' || pkgNormalized === 'premium')) {
        headerInfo.push({ label: 'Večera', value: `${fixedMeals.vecera.name} (${fixedMeals.vecera.count}×)` })
      }
    }

    exportToCsv({
      columns,
      rows,
      filename: `objednavky-jedal-${activePackageTab.value}-${selectedDate.value}.csv`,
      headerInfo
    })

    toast.add({
      title: 'Úspech',
      description: 'CSV súbor bol úspešne vygenerovaný',
      color: 'success'
    })
  } catch (error: unknown) {
    console.error('CSV export error:', error)
    toast.add({
      title: 'Chyba',
      description: error instanceof Error ? error.message : 'Nepodarilo sa vytvoriť CSV',
      color: 'error'
    })
  } finally {
    isExporting.value = false
  }
}

// Fetch data
const fetchMealOrders = async () => {
  isLoading.value = true
  try {
    const response = await useAuthFetch(`/api/admin/meal-orders/${selectedDate.value}`)
    mealOrders.value = response as MealOrderSummary
  } catch (error: any) {
    console.error('Error fetching meal orders:', error)
    toast.add({
      title: 'Chyba',
      description: error.data?.message || 'Nepodarilo sa načítať objednávky',
      color: 'error',
    })
    mealOrders.value = null
  } finally {
    isLoading.value = false
  }
}

// Watch for date changes
watch(selectedDate, () => {
  fetchMealOrders()
})

// Set initial tab when package tabs change
watch(packageTabs, (tabs) => {
  if (tabs.length > 0 && !tabs.some(t => t.value === activePackageTab.value)) {
    activePackageTab.value = tabs[0]?.value || ''
  }
}, { immediate: true })

// Initial load
onMounted(async () => {
  const { isAuthenticated, loading: authLoading } = useAuth()
  
  if (authLoading.value) {
    await new Promise<void>((resolve) => {
      const unwatch = watch(authLoading, (loading) => {
        if (!loading) {
          unwatch()
          resolve()
        }
      }, { immediate: true })
    })
  }

  if (isAuthenticated.value) {
    fetchMealOrders()
  }
})
</script>
