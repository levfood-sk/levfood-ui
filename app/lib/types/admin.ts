import type { Timestamp } from 'firebase/firestore'

export type AdminRole = 'admin' | 'manager' | 'editor'

export interface AdminRoleInfo {
  value: AdminRole
  label: string
  description: string
}

export const ADMIN_ROLES: AdminRoleInfo[] = [
  {
    value: 'admin',
    label: 'Majiteľ',
    description: 'Plný prístup k všetkým funkciám'
  },
  {
    value: 'manager',
    label: 'Manažér prevádzky',
    description: 'Správa objednávok a užívateľov'
  },
  {
    value: 'editor',
    label: 'Administrátor webu',
    description: 'Správa obsahu a CMS'
  }
]

export interface AdminUser {
  uid: string
  email: string
  firstName: string
  lastName: string
  fullName: string
  role: AdminRole
  createdAt: Timestamp
  createdBy: string
  updatedAt?: Timestamp
  updatedBy?: string
}

export interface CreateAdminUserRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  role: AdminRole
}

export interface CreateAdminUserResponse {
  success: boolean
  adminUser?: AdminUser
  error?: string
}
