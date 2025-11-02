declare module '#app/nuxt.config' {
  interface AppConfigInput {
    ui?: {
      colors?: {
        primary?: string
        secondary?: string
        success?: string
        info?: string
        warning?: string
        error?: string
        neutral?: string
        orange?: string
      }
    }
  }
}

declare module '@nuxt/schema' {
  interface AppConfigInput {
    ui?: {
      colors?: {
        primary?: string
        secondary?: string
        success?: string
        info?: string
        warning?: string
        error?: string
        neutral?: string
        orange?: string
      }
    }
  }
}

declare module '@nuxt/ui' {
  interface InputColor {
    orange: string
  }
}

export {}

