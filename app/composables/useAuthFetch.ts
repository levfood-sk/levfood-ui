import type { UseFetchOptions } from 'nuxt/app'

/**
 * Composable for making authenticated API requests
 * Automatically includes the Firebase auth token in the Authorization header
 */
export const useAuthFetch = async <T>(
  url: string,
  options?: UseFetchOptions<T> & { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' }
) => {
  const { getIdToken } = useAuth()
  const token = await getIdToken()

  return $fetch<T>(url, {
    ...options,
    method: (options?.method || 'GET') as any,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`
    }
  })
}

/**
 * Show success toast notification
 */
export const showSuccessToast = (description: string, title: string = 'Úspech') => {
  useToast().add({
    title,
    description,
    color: 'success',
  })
}

/**
 * Show error toast notification
 */
export const showErrorToast = (description: string, title: string = 'Chyba') => {
  useToast().add({
    title,
    description,
    color: 'error',
  })
}
