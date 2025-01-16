import { InputCounter } from '../packages/input-counter.js'
import { ModalController } from '../packages/modal.js'

declare global {
  interface Window {
    FocusCountrySearchInput: () => void
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const controller = new ModalController(
    [
      {
        id: 'select-room-options',
        toggleElements: ['#select-room-options'],
        openElements: ['#select-room-options-container'],
        contentElement: '#select-room-options-container',
        closeElements: ['#people-select-close'],
        containers: ['#select-room-options-container'],
      },
    ],
    {
      outsideClickClose: true,
      escapeClose: true,
      preserveModalHistory: false,
      scrollLock: {
        enabled: false,
      },
    },
  )

  const FocusCountrySearchInput = () => {
    setTimeout(() => {
      const focusInput = document.getElementById('country-search-input')
      const element = document.getElementById('select-room-options')

      if (element && focusInput) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })

        focusInput.focus()
        controller.setActiveModal('select-room-options')
      }
    }, 100)
  }

  window.FocusCountrySearchInput = FocusCountrySearchInput
})

// DOM yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
  const counterConfig = [
    {
      type: 'adult',
      dataAttribute: 'data-adult',
      textElementId: 'adult-text',
      minusButtonId: 'adult-minus',
      plusButtonId: 'adult-plus',
      countElementId: 'adult-count',
      containerId: 'adult-container',
    },
    {
      type: 'child',
      dataAttribute: 'data-child',
      textElementId: 'child-text',
      minusButtonId: 'child-minus',
      plusButtonId: 'child-plus',
      countElementId: 'child-count',
      containerId: 'child-container',
    },
    {
      type: 'baby',
      dataAttribute: 'data-baby',
      textElementId: 'baby-text',
      minusButtonId: 'baby-minus',
      plusButtonId: 'baby-plus',
      countElementId: 'baby-count',
      containerId: 'baby-container',
    },
    {
      type: 'room',
      dataAttribute: 'data-room',
      textElementId: 'room-text',
      minusButtonId: 'room-minus',
      plusButtonId: 'room-plus',
      countElementId: 'room-count',
      containerId: 'room-container',
    },
  ]

  const selectConfig = [
    {
      type: 'country',
      dataAttribute: 'data-country',
      selectElementId: 'country-select-input',
      containerId: 'country-container',
    },
  ]

  new InputCounter('select-room-options', counterConfig, selectConfig)
})
