export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate',
      success: 'emerald',
      warning: 'amber',
      error: 'red',
      orange: 'orange'
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
        root: 'w-full',
        base: 'h-14'
      },
      defaultVariants: {
        size: 'md',
        color: 'orange'
      },
      compoundVariants: [
        {
          color: 'orange',
          variant: ['outline', 'subtle'],
          class: 'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500'
        },
        {
          color: 'orange',
          highlight: true,
          class: 'ring ring-inset ring-orange-500'
        }
      ]
    },
    select: {
      slots: {
        base: 'h-14',
        content: 'bg-[var(--color-beige)]',
        item: 'text-[var(--color-dark-green)] hover:bg-[var(--color-orange)]/20'
      },
      defaultVariants: {
        color: 'orange',
        variant: 'outline'
      },
      compoundVariants: [
        {
          color: 'orange',
          variant: ['outline', 'subtle'],
          slots: {
            content: 'bg-[var(--color-beige)] color-[var(--color-dark-green)]'
          },
          class: 'data-[state=open]:border-[var(--color-orange)] data-[state=closed]:border-[var(--color-dark-green)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-dark-green)] data-[state=open]:ring-2 data-[state=open]:ring-inset data-[state=open]:ring-[var(--color-orange)] data-[state=closed]:ring-[var(--color-dark-green)]'
        },
        {
          color: 'orange',
          highlight: true,
          class: 'border-[var(--color-green)] ring ring-inset ring-[var(--color-orange)]'
        }
      ]
    },
    textarea: {
      slots: {
        base: 'min-h-14'
      },
      defaultVariants: {
        color: 'orange'
      },
      compoundVariants: [
        {
          color: 'orange',
          variant: ['outline', 'subtle'],
          class: 'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500'
        },
        {
          color: 'orange',
          highlight: true,
          class: 'ring ring-inset ring-orange-500'
        }
      ]
    },
    formGroup: {
      slots: {
        root: 'w-full',
        container: 'w-full'
      }
    },
    radioGroup: {
      variants: {
        color: {
          orange: {
            base: 'focus-visible:outline-orange-500',
            indicator: 'bg-orange'
          }
        }
      },
      compoundVariants: [
        {
          color: 'orange',
          variant: 'card',
          class: {
            item: 'has-data-[state=checked]:border-orange'
          }
        },
        {
          color: 'orange',
          variant: 'table',
          class: {
            item: 'has-data-[state=checked]:bg-orange-500/10 has-data-[state=checked]:border-orange-500/50 has-data-[state=checked]:z-[1]'
          }
        }
      ]
    },
    checkbox: {
      slots: {
        icon: 'text-[var(--color-beige)]'
      },
      variants: {
        color: {
          orange: {
            base: 'ring-orange-500 focus-visible:outline-orange-500',
            indicator: 'bg-orange-500'
          }
        }
      },
      compoundVariants: [
        {
          color: 'orange',
          variant: 'card',
          class: {
            root: 'border-orange-500'
          }
        }
      ]
    },
    checkboxGroup: {
      compoundVariants: [
        {
          color: 'orange',
          variant: 'card',
          class: {
            item: 'has-data-[state=checked]:bg-orange-500 border-orange-500'
          }
        },
        {
          color: 'orange',
          variant: 'table',
          class: {
            item: 'has-data-[state=checked]:bg-orange-500/10 has-data-[state=checked]:border-orange-500/50 has-data-[state=checked]:z-[1]'
          }
        }
      ]
    },
    switch: {
      variants: {
        color: {
          orange: {
            base: 'bg-gray-200 data-[state=checked]:bg-orange-500',
            thumb: 'bg-white'
          }
        }
      }
    },
  }
})