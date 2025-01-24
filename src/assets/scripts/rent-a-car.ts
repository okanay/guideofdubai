import { brands } from '../constants/car-brands.js'
import { languages } from '../constants/date-picker-languages.js'
import { DatePicker, type DatePickerConfig } from './packages/date-picker.js'
import { DynamicSlider } from './packages/dynamic-slider.js'
import { ModalController } from './packages/modal.js'
import { RangeSlider } from './packages/range-slider.js'
import SearchableSelect from './packages/searchable-select.js'

declare global {
  interface Window {
    DynamicSlider: DynamicSlider
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const slider = new DynamicSlider()
  window.DynamicSlider = slider
})

document.addEventListener('DOMContentLoaded', () => {
  new RangeSlider({
    containerId: 'price-range-1',
    minDisplayId: 'display-min-value-1',
    maxDisplayId: 'display-max-value-1',
    sliderRangeId: 'slider-range-1',
    minHandleId: 'min-handle-1',
    maxHandleId: 'max-handle-1',
    minInputId: 'min_price_1',
    maxInputId: 'max_price_1',
  })
})

document.addEventListener('DOMContentLoaded', () => {
  const today = new Date()
  const datepickerConfig: DatePickerConfig = {
    minDate: today,
    elements: {
      container: 'date-picker',
      monthContainer: 'current-month',
      daysContainer: 'calendar-days',
      buttons: {
        prev: 'prev-month',
        next: 'next-month',
        reset: 'reset-date',
        resetAll: 'reset-all',
        close: 'close-picker',
      },
    },
    input: {
      type: 'two',
      elements: {
        start: {
          id: 'date-input-start',
          focusContainer: 'date-input-start-label',
        },
        end: {
          id: 'date-input-end',
          focusContainer: 'date-input-end-label',
        },
      },
    },
    output: {
      slash: '-',
      fullFormat: true,
      backendFormat: ['year', 'month', 'day'],
      order: ['day', 'month', 'year'],
      between: 'to',
    },
    autoClose: true,
    autoSwitchInput: true,
    language: [...languages],
  }

  const datePicker = new DatePicker(datepickerConfig)
})

document.addEventListener('DOMContentLoaded', () => {
  new ModalController(
    [
      {
        id: 'filter-modal',
        openElements: [],
        toggleElements: ['#filter-modal-button'],
        contentElement: '#filter-modal',
        closeElements: ['#filter-modal-close-button'],
        containers: ['#filter-container'],
      },
    ],
    {
      outsideClickClose: true,
      escapeClose: true,
      preserveModalHistory: true,
      attributes: {
        stateAttribute: 'data-state',
        values: {
          open: 'open',
          preserved: 'open',
          hidden: 'closed',
        },
      },
      scrollLock: {
        enabled: false,
        styles: {
          hidden: {
            overflow: 'hidden',
            position: 'fixed',
            width: '100%',
          },
          visible: {
            overflow: 'auto',
            position: 'static',
            width: 'auto',
          },
        },
      },
    },
  )
})

document.addEventListener('DOMContentLoaded', () => {
  const CarBrandSelectInput = new SearchableSelect({
    elements: {
      container: 'car-brand-container',
      select: 'car-brand-select-input',
      input: 'car-brand-search-input',
      suggestions: 'car-brand-suggestions',
      clearButton: 'clear-button', // opsiyonel
    },
  })
  CarBrandSelectInput.updateOptions(brands)
})
