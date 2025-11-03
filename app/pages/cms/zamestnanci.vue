<script setup lang="ts">
import { z } from 'zod'
import type { AdminUser, AdminRole, CreateAdminUserRequest } from '~/lib/types/admin'
import { ADMIN_ROLES } from '~/lib/types/admin'

definePageMeta({
  layout: 'dashboard',
})

// Validation schema
const adminUserSchema = z.object({
  firstName: z.string().min(1, 'Meno je povinné'),
  lastName: z.string().min(1, 'Priezvisko je povinné'),
  email: z.string().min(1, 'Email je povinný').email('Neplatný email'),
  password: z.string().min(6, 'Minimálne 6 znakov'),
  role: z.enum(['admin', 'manager', 'editor'])
})

// State
const adminUsers = ref<AdminUser[]>([])
const loading = ref(true)
const searchQuery = ref('')
const selectedRole = ref<AdminRole | 'all'>('all')
const showCreateForm = ref(false)
const createLoading = ref(false)

// Edit/Delete modal state
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const selectedAdmin = ref<AdminUser | null>(null)
const editRole = ref<AdminRole>('editor')
const editLoading = ref(false)
const deleteLoading = ref(false)

// Form state
const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'editor' as AdminRole
})

// Load admin users
const loadAdminUsers = async () => {
  loading.value = true
  try {
    const response = await useAuthFetch<{ success: boolean; adminUsers: AdminUser[] }>('/api/admin-users')
    if (response.success) {
      adminUsers.value = response.adminUsers
    }
  } catch (error) {
    console.error('Error loading admin users:', error)
    showErrorToast('Nepodarilo sa načítať zamestnancov')
  } finally {
    loading.value = false
  }
}

// Load on mount
onMounted(() => {
  loadAdminUsers()
})

// Filtered admin users
const filteredAdminUsers = computed(() => {
  let result = adminUsers.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(admin =>
      admin.fullName.toLowerCase().includes(query) ||
      admin.email.toLowerCase().includes(query)
    )
  }

  // Filter by role
  if (selectedRole.value !== 'all') {
    result = result.filter(admin => admin.role === selectedRole.value)
  }

  return result
})

// Role filter options
const roleFilterOptions = [
  { label: 'Všetky role', value: 'all' },
  ...ADMIN_ROLES.map(role => ({ label: role.label, value: role.value }))
]

// Statistics
const stats = computed(() => {
  return [
    {
      label: 'Celkom zamestnancov',
      value: adminUsers.value.length,
      icon: 'i-heroicons-users'
    },
    {
      label: 'Majiteľov',
      value: adminUsers.value.filter(a => a.role === 'admin').length,
      icon: 'i-heroicons-shield-check'
    },
    {
      label: 'Manažérov',
      value: adminUsers.value.filter(a => a.role === 'manager').length,
      icon: 'i-heroicons-briefcase'
    },
    {
      label: 'Administrátorov',
      value: adminUsers.value.filter(a => a.role === 'editor').length,
      icon: 'i-heroicons-pencil-square'
    }
  ]
})

// Get role info
const getRoleInfo = (role: AdminRole) => {
  return ADMIN_ROLES.find(r => r.value === role)
}


// Format date
const formatDate = (timestamp: any) => {
  if (!timestamp) return '-'

  let date: Date
  if (timestamp.toDate) {
    // Firestore Timestamp
    date = timestamp.toDate()
  } else if (timestamp._seconds) {
    // Serialized Firestore Timestamp from API
    date = new Date(timestamp._seconds * 1000)
  } else {
    // Regular date string or timestamp
    date = new Date(timestamp)
  }

  return new Intl.DateTimeFormat('sk-SK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Form validation
const isFormValid = computed(() => {
  const result = adminUserSchema.safeParse(form)
  return result.success
})

// Reset form
const resetForm = () => {
  form.firstName = ''
  form.lastName = ''
  form.email = ''
  form.password = ''
  form.role = 'editor'
}

// Create admin user
const handleCreateAdmin = async () => {
  // Validate form with Zod
  const result = adminUserSchema.safeParse(form)
  if (!result.success) {
    const firstError = result.error.issues[0]
    useToast().add({
      title: 'Chyba',
      description: firstError?.message || 'Neplatné údaje',
      color: 'error',
    })
    return
  }

  createLoading.value = true

  try {
    const requestData: CreateAdminUserRequest = {
      email: form.email,
      password: form.password,
      firstName: form.firstName,
      lastName: form.lastName,
      role: form.role
    }

    await useAuthFetch('/api/admin-users/create', {
      method: 'POST',
      body: requestData
    })

    showSuccessToast('Zamestnanec bol úspešne vytvorený')
    await loadAdminUsers()

    showCreateForm.value = false
    resetForm()
  } catch (error: any) {
    console.error('Error creating admin:', error)
    showErrorToast(error.data?.message || 'Nepodarilo sa vytvoriť zamestnanca')
  } finally {
    createLoading.value = false
  }
}

// Toggle create form
const toggleCreateForm = () => {
  showCreateForm.value = !showCreateForm.value
  if (showCreateForm.value) {
    resetForm()
  }
}

// Open edit modal
const openEditModal = (admin: AdminUser) => {
  selectedAdmin.value = admin
  editRole.value = admin.role
  showEditModal.value = true
}

// Update admin role
const handleUpdateRole = async () => {
  if (!selectedAdmin.value) return

  editLoading.value = true
  try {
    await useAuthFetch(`/api/admin-users/${selectedAdmin.value.uid}`, {
      method: 'PATCH',
      body: { role: editRole.value }
    })

    showSuccessToast('Rola bola úspešne zmenená')
    await loadAdminUsers()
    showEditModal.value = false
  } catch (error: any) {
    console.error('Error updating admin:', error)
    showErrorToast(error.data?.message || 'Nepodarilo sa zmeniť rolu')
  } finally {
    editLoading.value = false
  }
}

// Open delete modal
const openDeleteModal = (admin: AdminUser) => {
  selectedAdmin.value = admin
  showDeleteModal.value = true
}

// Delete admin user
const handleDeleteAdmin = async () => {
  if (!selectedAdmin.value) return

  deleteLoading.value = true
  try {
    await useAuthFetch(`/api/admin-users/${selectedAdmin.value.uid}`, {
      method: 'DELETE'
    })

    showSuccessToast('Zamestnanec bol úspešne odstránený')
    await loadAdminUsers()
    showDeleteModal.value = false
  } catch (error: any) {
    console.error('Error deleting admin:', error)
    showErrorToast(error.data?.message || 'Nepodarilo sa odstrániť zamestnanca')
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-3xl font-bold" style="color: var(--color-dark-green)">Zamestnanci</h1>
        <p class="text-slate-600 mt-1">Správa administrátorov a zamestnancov</p>
      </div>
      <button
        class="flex items-center justify-center gap-2 w-full md:w-auto bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-roboto mt-4 md:mt-0"
        @click="toggleCreateForm"
      >
        <UIcon :name="showCreateForm ? 'i-heroicons-x-mark' : 'i-heroicons-plus'" class="w-5 h-5" />
        {{ showCreateForm ? 'Zrušiť' : 'Pridať zamestnanca' }}
      </button>
    </div>

    <!-- Create Admin Form -->
    <UCard v-if="showCreateForm">
      <template #header>
        <h2 class="text-xl font-semibold" style="color: var(--color-dark-green)">Pridať nového zamestnanca</h2>
      </template>

      <form @submit.prevent="handleCreateAdmin" class="space-y-6">
        <!-- Name Fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium" style="color: var(--color-dark-green)">Meno *</label>
            <UInput
              v-model="form.firstName"
              placeholder="Janko"
              size="lg"
              :disabled="createLoading"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-sm font-medium" style="color: var(--color-dark-green)">Priezvisko *</label>
            <UInput
              v-model="form.lastName"
              placeholder="Hraško"
              size="lg"
              :disabled="createLoading"
            />
          </div>
        </div>

        <!-- Email -->
        <div class="space-y-2">
          <label class="block text-sm font-medium" style="color: var(--color-dark-green)">Email *</label>
          <UInput
            v-model="form.email"
            type="email"
            placeholder="email@example.com"
            size="lg"
            :disabled="createLoading"
          />
        </div>

        <!-- Password -->
        <div class="space-y-2">
          <label class="block text-sm font-medium" style="color: var(--color-dark-green)">Heslo *</label>
          <UInput
            v-model="form.password"
            type="text"
            placeholder="Minimálne 6 znakov"
            size="lg"
            :disabled="createLoading"
          />
          <p class="text-xs text-slate-500">
            Minimálne 6 znakov
          </p>
        </div>

        <!-- Role -->
        <div class="space-y-2">
          <label class="block text-sm font-medium" style="color: var(--color-dark-green)">Rola *</label>
          <URadioGroup
            v-model="form.role"
            :items="ADMIN_ROLES"
            :disabled="createLoading"
            color="orange"
            variant="table"
          >
            <template #label="{ item }">
              <div class="flex flex-col gap-1">
                <p class="font-semibold" style="color: var(--color-dark-green)">{{ item.label }}</p>
                <p class="text-sm text-slate-600">{{ item.description }}</p>
              </div>
            </template>
          </URadioGroup>
        </div>

        <!-- Footer Buttons -->
        <div class="flex flex-col md:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            @click="toggleCreateForm"
            :disabled="createLoading"
            class="w-full md:w-auto px-6 py-3 rounded-lg border-2 text-slate-600 border-gray-300 font-semibold hover:bg-gray-50 transition-all font-roboto disabled:opacity-50"
          >
            Zrušiť
          </button>
          <button
            type="submit"
            :disabled="createLoading || !isFormValid"
            class="w-full md:w-auto flex items-center justify-center gap-2 bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-roboto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <UIcon v-if="createLoading" name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
            {{ createLoading ? 'Vytváram...' : 'Vytvoriť zamestnanca' }}
          </button>
        </div>
      </form>
    </UCard>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard v-for="stat in stats" :key="stat.label">
        <div class="flex items-center gap-4">
          <div class="p-2 rounded-lg flex items-center justify-center" style="background-color: var(--color-beige)">
            <UIcon :name="stat.icon" class="w-6 h-6" style="color: var(--color-dark-green)" />
          </div>
          <div>
            <p class="text-2xl font-bold" style="color: var(--color-dark-green)">{{ stat.value }}</p>
            <p class="text-sm text-slate-600">{{ stat.label }}</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Filters -->
    <UCard>
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
          <UInput
            v-model="searchQuery"
            placeholder="Hľadať podľa mena alebo emailu..."
            icon="i-heroicons-magnifying-glass"
            size="lg"
          />
        </div>
        <USelect
          v-model="selectedRole"
          :items="roleFilterOptions"
          size="lg"
          class="w-full md:w-64"
        />
      </div>
    </UCard>

    <!-- Admin Users Table -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">Zoznam zamestnancov</h2>
      </template>

      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 animate-spin" style="color: var(--color-orange)" />
      </div>

      <div v-else-if="filteredAdminUsers.length === 0" class="text-center py-12">
        <UIcon name="i-heroicons-users" class="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <p class="text-slate-600">Žiadni zamestnanci</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-slate-200">
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Meno</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Email</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Rola</th>
              <th class="text-left px-4 py-3 text-sm font-semibold text-slate-700">Vytvorené</th>
              <th class="text-right px-4 py-3 text-sm font-semibold text-slate-700">Akcie</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="admin in filteredAdminUsers"
              :key="admin.uid"
              class="border-b border-slate-100 hover:bg-slate-50 transition-colors"
            >
              <!-- Name -->
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <UAvatar :alt="admin.fullName" size="md" class="bg-beige text-dark-green" />
                  <p class="font-medium text-dark-green">{{ admin.fullName }}</p>
                </div>
              </td>

              <!-- Email -->
              <td class="px-4 py-3">
                <p class="text-slate-600">{{ admin.email }}</p>
              </td>

              <!-- Role -->
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  :style="{
                    backgroundColor: admin.role === 'admin' ? 'var(--color-orange)' : admin.role === 'manager' ? 'var(--color-beige)' : '#e5e7eb',
                    color: 'var(--color-dark-green)'
                  }"
                >
                  {{ getRoleInfo(admin.role)?.label }}
                </span>
              </td>

              <!-- Created At -->
              <td class="px-4 py-3">
                <p class="text-sm text-slate-600">{{ formatDate(admin.createdAt) }}</p>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3">
                <div class="flex justify-end gap-2">
                  <button
                    @click="openEditModal(admin)"
                    class="p-2 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    title="Upraviť rolu"
                  >
                    <UIcon name="i-lucide-user-pen" class="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    @click="openDeleteModal(admin)"
                    class="p-2 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Odstrániť"
                  >
                    <UIcon name="i-lucide-trash-2" class="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Edit Role Modal -->
    <UModal v-model:open="showEditModal" :title="`Upraviť rolu - ${selectedAdmin?.fullName}`">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-slate-600">Vyberte novú rolu pre tohto zamestnanca:</p>
          <URadioGroup
            v-model="editRole"
            color="orange"
            :items="ADMIN_ROLES"
            :disabled="editLoading"
            variant="table"
          >
            <template #label="{ item }">
              <div class="flex flex-col gap-1">
                <p class="font-semibold" style="color: var(--color-dark-green)">{{ item.label }}</p>
                <p class="text-sm text-slate-600">{{ item.description }}</p>
              </div>
            </template>
          </URadioGroup>
        </div>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="close"
            :disabled="editLoading"
            class="px-6 py-3 rounded-lg border-2 text-slate-600 border-gray-300 font-semibold hover:bg-gray-50 transition-all font-roboto disabled:opacity-50"
          >
            Zrušiť
          </button>
          <button
            type="button"
            @click="handleUpdateRole"
            :disabled="editLoading"
            class="flex items-center gap-2 bg-[var(--color-orange)] text-[var(--color-dark-green)] font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-lg font-roboto disabled:opacity-50"
          >
            <UIcon v-if="editLoading" name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
            {{ editLoading ? 'Ukladám...' : 'Uložiť zmeny' }}
          </button>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" title="Potvrdiť odstránenie">
      <template #body>
        <div class="space-y-4">
          <p class="text-slate-600 text-condensed">
            Naozaj chcete odstrániť zamestnanca <strong>{{ selectedAdmin?.fullName }}</strong>?
          </p>
        </div>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-3">
          <button
            type="button"
            @click="close"
            :disabled="deleteLoading"
            class="px-6 py-3 rounded-lg border-2 text-slate-600 border-gray-300 font-semibold hover:bg-gray-50 transition-all font-roboto disabled:opacity-50"
          >
            Zrušiť
          </button>
          <button
            type="button"
            @click="handleDeleteAdmin"
            :disabled="deleteLoading"
            class="flex items-center gap-2 bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 hover:bg-red-700 font-roboto disabled:opacity-50"
          >
            <UIcon v-if="deleteLoading" name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin" />
            {{ deleteLoading ? 'Odstraňujem...' : 'Odstrániť' }}
          </button>
        </div>
      </template>
    </UModal>
  </div>
</template>
