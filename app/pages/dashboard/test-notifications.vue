<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

const toast = useToast()

interface LinkedClient {
  id: string
  name: string
  email: string
  hasExpoPushToken: boolean
  notificationsEnabled: boolean
}

interface SendResult {
  success: boolean
  notificationId: string
  clientName: string
  inAppCreated: boolean
  pushAttempted: boolean
  pushSent: boolean
  pushError: string | null
  clientHasPushEnabled: boolean
}

// State
const clients = ref<LinkedClient[]>([])
const loadingClients = ref(false)
const selectedClientId = ref<string>('')
const title = ref('Testovacia notifikácia')
const body = ref('Toto je testovacia správa pre overenie zobrazovania notifikácií v aplikácii.')
const sending = ref(false)
const lastResult = ref<SendResult | null>(null)

// Computed
const selectedClient = computed(() =>
  clients.value.find(c => c.id === selectedClientId.value)
)

const isValid = computed(() =>
  selectedClientId.value && title.value.trim() && body.value.trim()
)

// Load linked clients
const loadClients = async () => {
  loadingClients.value = true
  try {
    const response = await $fetch<{ clients: LinkedClient[]; total: number }>('/api/test/linked-clients')
    clients.value = response.clients
  } catch (error: any) {
    toast.add({
      title: 'Chyba',
      description: error.data?.message || 'Nepodarilo sa načítať klientov',
      color: 'error',
    })
  } finally {
    loadingClients.value = false
  }
}

// Send test notification
const sendNotification = async () => {
  if (!isValid.value) return

  sending.value = true
  lastResult.value = null

  try {
    const result = await $fetch<SendResult>('/api/test/send-notification', {
      method: 'POST',
      body: {
        clientId: selectedClientId.value,
        title: title.value,
        body: body.value,
      },
    })

    lastResult.value = result

    toast.add({
      title: 'Úspech',
      description: `Notifikácia vytvorená pre ${result.clientName}`,
      color: 'success',
    })
  } catch (error: any) {
    toast.add({
      title: 'Chyba',
      description: error.data?.message || 'Nepodarilo sa odoslať notifikáciu',
      color: 'error',
    })
  } finally {
    sending.value = false
  }
}

// Load clients on mount
onMounted(() => {
  loadClients()
})
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center gap-3">
      <UIcon name="i-heroicons-beaker" class="w-8 h-8 text-orange-500" />
      <div>
        <h2 class="text-3xl font-bold text-slate-900">Test notifikácií</h2>
        <p class="text-sm text-slate-500">Odošli testovaciu notifikáciu konkrétnemu používateľovi</p>
      </div>
    </div>

    <UCard class="max-w-3xl">
      <template #header>
        <h3 class="text-xl font-semibold text-slate-900">Odoslať testovaciu notifikáciu</h3>
      </template>

      <div class="space-y-6">
        <!-- Client Selection -->
        <UFormField
          label="Vyber používateľa"
          required
          help="Notifikácia sa zobrazí v aplikácii tohto používateľa"
        >
          <div v-if="loadingClients" class="flex items-center gap-2 py-2">
            <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-orange-500" />
            <span class="text-sm text-slate-500">Načítavam používateľov...</span>
          </div>

          <USelectMenu
            v-else
            v-model="selectedClientId"
            :items="clients.map(c => ({ label: `${c.name} (${c.email})`, value: c.id, ...c }))"
            placeholder="Vyber používateľa"
            class="w-full"
            value-key="value"
          >
            <template #item="{ item }">
              <div class="flex items-center justify-between w-full">
                <div>
                  <p class="font-medium">{{ item.name }}</p>
                  <p class="text-xs text-slate-500">{{ item.email }}</p>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    v-if="item.notificationsEnabled && item.hasExpoPushToken"
                    color="success"
                    variant="subtle"
                    size="xs"
                  >
                    Push ON
                  </UBadge>
                  <UBadge
                    v-else
                    color="neutral"
                    variant="subtle"
                    size="xs"
                  >
                    Push OFF
                  </UBadge>
                </div>
              </div>
            </template>
          </USelectMenu>
        </UFormField>

        <!-- Selected Client Info -->
        <div v-if="selectedClient" class="p-4 bg-slate-50 rounded-lg">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-slate-900">{{ selectedClient.name }}</p>
              <p class="text-sm text-slate-500">{{ selectedClient.email }}</p>
              <p class="text-xs text-slate-400 mt-1">ID: {{ selectedClient.id }}</p>
            </div>
            <div class="text-right">
              <UBadge
                v-if="selectedClient.notificationsEnabled && selectedClient.hasExpoPushToken"
                color="success"
                variant="subtle"
              >
                <UIcon name="i-heroicons-bell" class="w-3 h-3 mr-1" />
                Push povolený
              </UBadge>
              <UBadge
                v-else
                color="warning"
                variant="subtle"
              >
                <UIcon name="i-heroicons-bell-slash" class="w-3 h-3 mr-1" />
                Push zakázaný
              </UBadge>
              <p class="text-xs text-slate-500 mt-1">
                {{ selectedClient.notificationsEnabled && selectedClient.hasExpoPushToken
                  ? 'Dostane push aj in-app notifikáciu'
                  : 'Dostane len in-app notifikáciu' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Title Input -->
        <UFormField
          label="Názov notifikácie"
          required
        >
          <UInput
            v-model="title"
            placeholder="Zadaj názov..."
            class="w-full"
          />
        </UFormField>

        <!-- Body Input -->
        <UFormField
          label="Text notifikácie"
          required
        >
          <UTextarea
            v-model="body"
            placeholder="Zadaj text notifikácie..."
            :rows="4"
            class="w-full"
          />
        </UFormField>

        <!-- Send Button -->
        <div class="flex justify-end pt-4">
          <button
            class="flex items-center justify-center hero-button border-2 border-transparent bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-condensed disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            :disabled="!isValid || sending"
            @click="sendNotification"
          >
            <UIcon v-if="sending" name="i-heroicons-arrow-path" class="w-5 h-5 mr-2 animate-spin" />
            <UIcon v-else name="i-heroicons-paper-airplane" class="w-5 h-5 mr-2" />
            {{ sending ? 'Odosielam...' : 'Odoslať notifikáciu' }}
          </button>
        </div>

        <!-- Result Display -->
        <div v-if="lastResult" class="p-4 rounded-lg border" :class="lastResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'">
          <div class="flex items-start gap-3">
            <UIcon
              name="i-heroicons-check-circle"
              class="w-6 h-6 text-green-600 mt-0.5"
            />
            <div class="flex-1">
              <p class="font-medium text-green-900">
                Notifikácia odoslaná pre {{ lastResult.clientName }}
              </p>
              <div class="mt-2 space-y-1 text-sm">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-check" class="w-4 h-4 text-green-600" />
                  <span class="text-green-700">In-app notifikácia vytvorená</span>
                </div>
                <div class="flex items-center gap-2">
                  <UIcon
                    :name="lastResult.pushSent ? 'i-heroicons-check' : 'i-heroicons-x-mark'"
                    class="w-4 h-4"
                    :class="lastResult.pushSent ? 'text-green-600' : 'text-amber-500'"
                  />
                  <span :class="lastResult.pushSent ? 'text-green-700' : 'text-amber-600'">
                    {{ lastResult.pushSent
                      ? 'Push notifikácia odoslaná'
                      : lastResult.clientHasPushEnabled
                        ? `Push zlyhala: ${lastResult.pushError}`
                        : 'Push neodoslaný (používateľ nemá povolené)' }}
                  </span>
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-2">
                ID: {{ lastResult.notificationId }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Linked Clients Overview -->
    <UCard class="max-w-3xl">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-users" class="w-5 h-5 text-orange-500" />
            <h3 class="text-xl font-semibold text-slate-900">Prepojení používatelia</h3>
          </div>
          <UBadge color="neutral" variant="subtle">
            {{ clients.length }} celkom
          </UBadge>
        </div>
      </template>

      <div v-if="loadingClients" class="flex items-center justify-center py-8">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin text-orange-500" />
      </div>

      <div v-else-if="clients.length === 0" class="text-center py-8 text-slate-500">
        Žiadni prepojení používatelia
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div
          v-for="client in clients"
          :key="client.id"
          class="flex items-center justify-between py-3 first:pt-0 last:pb-0"
        >
          <div>
            <p class="font-medium text-slate-900">{{ client.name }}</p>
            <p class="text-sm text-slate-500">{{ client.email }}</p>
          </div>
          <div class="flex items-center gap-3">
            <UBadge
              v-if="client.notificationsEnabled && client.hasExpoPushToken"
              color="success"
              variant="subtle"
              size="sm"
            >
              Push ON
            </UBadge>
            <UBadge
              v-else
              color="neutral"
              variant="subtle"
              size="sm"
            >
              Push OFF
            </UBadge>
            <button
              class="text-sm text-orange-600 hover:text-orange-700 font-medium"
              @click="selectedClientId = client.id"
            >
              Vybrať
            </button>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
