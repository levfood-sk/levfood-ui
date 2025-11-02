export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate',
      success: 'emerald',
      warning: 'amber',
      error: 'red'
    },
    button: {
      defaultVariants: {
        size: 'md',
        color: 'primary'
      }
    },
    card: {
      slots: {
        root: 'bg-white',
      },
      ring: 'ring-1 ring-gray-200/50',
      rounded: 'rounded-xl',
      shadow: 'shadow-sm'
    },
    input: {
      slots: {
        root: 'w-full'
      },
      defaultVariants: {
        size: 'md',
        color: 'primary'
      }
    },
    formGroup: {
      slots: {
        root: 'w-full',
        container: 'w-full'
      }
    }
  }
})