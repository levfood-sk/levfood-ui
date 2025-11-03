<!--
  Push Notifications Admin Panel

  Admin interface for sending push notifications to users.
  Allows testing notifications and enabling/disabling notification permissions.
-->

<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

const { requestPermission, permission, supported, loading: notifLoading, token } = useNotifications()
const toast = useToast()

// Form state
const notificationForm = reactive({
  title: 'Levfood Notification',
  message: 'This is a test notification from Levfood admin panel',
  icon: '/icon.png',
})

const sending = ref(false)
const result = ref<any>(null)

// Recent notifications history
const notifications = ref<any[]>([])

/**
 * Enable notifications for this device
 */
const enableNotifications = async () => {
  const success = await requestPermission()
  if (success) {
    console.log('Notifications enabled, token:', token.value)
  }
}

/**
 * Send notification to all registered devices
 */
const sendNotification = async () => {
  sending.value = true
  result.value = null

  try {
    const response = await $fetch('/api/notifications/send', {
      method: 'POST',
      body: {
        title: notificationForm.title,
        message: notificationForm.message,
        icon: notificationForm.icon,
      },
    })

    result.value = response

    // Add to history
    notifications.value.unshift({
      id: Date.now(),
      title: notificationForm.title,
      message: notificationForm.message,
      timestamp: new Date(),
      ...response,
    })

    toast.add({
      title: 'Notification sent',
      description: response.message,
      color: 'success',
    })
  } catch (error: any) {
    console.error('Send notification error:', error)
    toast.add({
      title: 'Failed to send notification',
      description: error.data?.message || error.message,
      color: 'error',
    })
  } finally {
    sending.value = false
  }
}

/**
 * Send test notification to current device only
 */
const sendTestNotification = async () => {
  if (!token.value) {
    toast.add({
      title: 'Enable notifications first',
      description: 'You need to enable notifications to test',
      color: 'warning',
    })
    return
  }

  sending.value = true

  try {
    const response = await $fetch('/api/notifications/send', {
      method: 'POST',
      body: {
        title: notificationForm.title,
        message: notificationForm.message,
        icon: notificationForm.icon,
        token: token.value,
      },
    })

    toast.add({
      title: 'Test notification sent',
      description: 'Check your notifications',
      color: 'success',
    })
  } catch (error: any) {
    toast.add({
      title: 'Failed to send test notification',
      description: error.data?.message || error.message,
      color: 'error',
    })
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-slate-900">Push Notifications</h1>
      <p class="text-slate-600 mt-1">Send notifications to all registered devices</p>
    </div>

    <!-- Notification Permission Card -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-bell" class="w-5 h-5 text-primary-500" />
          <h3 class="text-lg font-semibold">Notification Settings</h3>
        </div>
      </template>

      <div class="space-y-4">
        <!-- Browser Support -->
        <UAlert
          v-if="!supported"
          color="error"
          variant="soft"
          icon="i-heroicons-exclamation-triangle"
          title="Notifications not supported"
          description="Your browser doesn't support push notifications"
        />

        <!-- Permission Status -->
        <div class="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div>
            <p class="text-sm font-medium text-slate-700">Notification Permission</p>
            <p class="text-xs text-slate-500 mt-1">
              {{ permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Denied' : 'Not requested' }}
            </p>
          </div>
          <UBadge
            :color="permission === 'granted' ? 'success' : permission === 'denied' ? 'error' : 'neutral'"
            variant="subtle"
            size="lg"
          >
            {{ permission }}
          </UBadge>
        </div>

        <!-- FCM Token (for debugging) -->
        <div v-if="token" class="p-4 bg-slate-50 rounded-lg">
          <p class="text-xs font-medium text-slate-700 mb-2">FCM Token (for development)</p>
          <code class="text-xs text-slate-600 break-all">{{ token }}</code>
        </div>

        <!-- Enable Button -->
        <UButton
          v-if="permission !== 'granted' && supported"
          block
          size="lg"
          :loading="notifLoading"
          @click="enableNotifications"
        >
          <template #leading>
            <UIcon name="i-heroicons-bell-alert" />
          </template>
          Enable Notifications
        </UButton>
      </div>
    </UCard>

    <!-- Send Notification Form -->
    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-paper-airplane" class="w-5 h-5 text-primary-500" />
          <h3 class="text-lg font-semibold">Send Notification</h3>
        </div>
      </template>

      <form @submit.prevent="sendNotification" class="space-y-4">
        <!-- Title -->
        <UFormGroup label="Title" required>
          <UInput
            v-model="notificationForm.title"
            placeholder="Notification title"
            size="lg"
            required
          />
        </UFormGroup>

        <!-- Message -->
        <UFormGroup label="Message" required>
          <UTextarea
            v-model="notificationForm.message"
            placeholder="Notification message"
            :rows="4"
            required
          />
        </UFormGroup>

        <!-- Icon URL -->
        <UFormGroup label="Icon URL" hint="Optional">
          <UInput
            v-model="notificationForm.icon"
            placeholder="https://example.com/icon.png"
            size="lg"
          />
        </UFormGroup>

        <!-- Actions -->
        <div class="flex gap-3">
          <UButton
            type="button"
            color="neutral"
            variant="soft"
            class="flex-1"
            :loading="sending"
            :disabled="sending || permission !== 'granted'"
            @click="sendTestNotification"
          >
            <template #leading>
              <UIcon name="i-heroicons-beaker" />
            </template>
            Test on This Device
          </UButton>

          <UButton
            type="submit"
            color="primary"
            class="flex-1"
            :loading="sending"
            :disabled="sending"
          >
            <template #leading>
              <UIcon name="i-heroicons-paper-airplane" />
            </template>
            Send to All Devices
          </UButton>
        </div>
      </form>

      <!-- Result Display -->
      <div v-if="result" class="mt-4 p-4 bg-success-50 rounded-lg border border-success-200">
        <div class="flex items-start gap-2">
          <UIcon name="i-heroicons-check-circle" class="w-5 h-5 text-success-600 mt-0.5" />
          <div class="flex-1">
            <p class="text-sm font-medium text-success-900">{{ result.message }}</p>
            <div v-if="result.successCount !== undefined" class="text-xs text-success-700 mt-1">
              Success: {{ result.successCount }} / {{ result.totalDevices }}
              <span v-if="result.failureCount > 0" class="text-error-600 ml-2">
                Failed: {{ result.failureCount }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Notification History -->
    <UCard v-if="notifications.length > 0">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-clock" class="w-5 h-5 text-primary-500" />
            <h3 class="text-lg font-semibold">Recent Notifications</h3>
          </div>
          <UBadge color="neutral" variant="subtle">
            {{ notifications.length }}
          </UBadge>
        </div>
      </template>

      <div class="space-y-3">
        <div
          v-for="notif in notifications.slice(0, 5)"
          :key="notif.id"
          class="p-4 bg-slate-50 rounded-lg"
        >
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <p class="text-sm font-semibold text-slate-900">{{ notif.title }}</p>
              <p class="text-sm text-slate-600 mt-1">{{ notif.message }}</p>
              <div class="flex items-center gap-4 mt-2">
                <p class="text-xs text-slate-500">
                  {{ new Date(notif.timestamp).toLocaleString() }}
                </p>
                <UBadge
                  v-if="notif.successCount !== undefined"
                  color="success"
                  variant="subtle"
                  size="xs"
                >
                  {{ notif.successCount }} sent
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Info Card -->
    <UCard>
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p class="text-sm font-medium text-slate-900">How it works</p>
            <ul class="text-xs text-slate-600 mt-2 space-y-1 list-disc list-inside">
              <li>Enable notifications to register this device</li>
              <li>"Test on This Device" sends to your device only</li>
              <li>"Send to All Devices" broadcasts to all registered users</li>
              <li>Notifications work even when the tab is in background</li>
              <li>Users can disable notifications in browser settings</li>
            </ul>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>
