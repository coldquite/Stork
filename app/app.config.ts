export default defineAppConfig({
  project: {
    sourceCodeUrl: 'https://gitlab.fit.cvut.cz/pihaland/cap'
  },
  ui: {
    colors: {
      primary: 'stork',
      neutral: 'slate',
      secondary: 'capaccent'
    },
    header: {
      slots: {
        root: 'bg-default/75 backdrop-blur border-b-2 border-default h-(--ui-header-height) sticky top-0 z-50'
      }
    },
    card: {
      variants: {
        variant: {
          outline: {
            root: 'bg-default ring-2 ring-default divide-y-2 divide-default'
          },
          subtle: {
            root: 'bg-elevated/50 ring-2 ring-default divide-y-2 divide-default'
          }
        }
      }
    },
    pageCTA: {
      variants: {
        variant: {
          outline: {
            root: 'bg-default ring-2 ring-default'
          },
          subtle: {
            root: 'bg-elevated/50 ring-2 ring-default'
          }
        }
      }
    },
    modal: {
      slots: {
        content: 'bg-default divide-y-2 divide-default flex flex-col focus:outline-none',
        description: 'mt-1 text-muted text-base'
      },
      variants: {
        fullscreen: {
          false: {
            content: 'w-[calc(100vw-2rem)] max-w-lg rounded-lg shadow-lg ring-2 ring-default'
          }
        }
      }
    },
    alert: {
      compoundVariants: [
        {
          color: 'warning',
          variant: 'soft',
          class: {
            root: 'bg-warning/10 ring ring-inset ring-warning/35 text-secondary-800 dark:text-secondary-100'
          }
        },
        {
          color: 'warning',
          variant: 'subtle',
          class: {
            root: 'bg-warning/10 ring ring-inset ring-warning/35 text-secondary-800 dark:text-secondary-100'
          }
        }
      ]
    },
    separator: {
      defaultVariants: {
        size: 'sm'
      }
    }
  }
})
