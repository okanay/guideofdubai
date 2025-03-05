import { brands } from '../constants/car-brands.js'
import { languages } from '../constants/date-picker-languages.js'
import { DynamicSlider } from './packages/dynamic-slider.js'
import { ModalController } from './packages/modal.js'
import { RangeSlider } from './packages/range-slider.js'
import SearchableSelect from './packages/searchable-select.js'
import { DatePickerWithTime } from './packages/date-time-picker.js'

declare global {
  interface Window {
    DynamicSlider: DynamicSlider
    CarBrandSelectInput: SearchableSelect
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
      clearButton: 'clear-button',
    },
  })
  window.CarBrandSelectInput = CarBrandSelectInput
  window.CarBrandSelectInput.updateOptions(brands)

  document.dispatchEvent(new CustomEvent('CarBrandSelectReady'))
})

document.addEventListener('DOMContentLoaded', () => {
  const datePicker = new DatePickerWithTime({
    minDate: new Date(),
    autoClose: false,
    elements: {
      container: 'date-picker',
      monthContainer: 'current-month',
      daysContainer: 'calendar-days',
      timeContainer: 'time-container',
      buttons: {
        prev: 'prev-month',
        next: 'next-month',
        reset: 'reset-date',
        resetAll: 'reset-all',
        close: 'close-picker',
      },
    },
    output: {
      fullFormat: true,
      between: ' & ',
      slash: '-',
      order: ['day', 'month', 'year'],
      backendFormat: ['year', 'month', 'day'],
    },
    language: languages,
    timePicker: {
      enabled: true,
      use24HourFormat: true,
      minuteInterval: 30,
      defaultHours: 12,
      defaultMinutes: 0,
    },
  })

  // Departure inputu bağla
  const departureInput = datePicker.connect({
    input: 'date-input-start',
    label: 'date-input-start-label',
    focusContainer: 'date-input-start-label',
  })

  // Return inputu bağla
  const returnInput = datePicker.connect({
    input: 'date-input-end',
    label: 'date-input-end-label',
    focusContainer: 'date-input-end-label',
  })

  // Yardımcı fonksiyon: Tarihe belirli sayıda gün ekler
  function addDaysToDate(date: Date, days: number) {
    if (!date) return null
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() + days)
    return newDate
  }

  // Gidiş-dönüş tarih kısıtlamalarını güncelleme fonksiyonu
  function updateDateConstraints(focusTarget?: 'departure' | 'return') {
    const departureDate = departureInput.getDate()
    const returnDate = returnInput.getDate()

    // Gidiş tarihi seçildiyse, dönüş tarihinin min değerini gidiş tarihinden bir gün sonrası olarak ayarla
    if (departureDate) {
      const minReturnDate = addDaysToDate(departureDate, 1)
      returnInput.changeMinDate(minReturnDate!)

      // Eğer mevcut dönüş tarihi min tarihten önceyse, dönüş tarihini min tarihe ayarla
      if (returnDate && returnDate < minReturnDate!) {
        returnInput.resetDate(minReturnDate!)
      }
    }

    // Dönüş tarihi seçildiyse, gidiş tarihinin max değerini dönüş tarihinden bir gün öncesi olarak ayarla
    if (returnDate) {
      const maxDepartureDate = addDaysToDate(returnDate, -1)
      departureInput.changeMaxDate(maxDepartureDate!)

      // Eğer mevcut gidiş tarihi max tarihten sonraysa, gidiş tarihini max tarihe ayarla
      if (departureDate && departureDate > maxDepartureDate!) {
        departureInput.resetDate(maxDepartureDate!)
      }
    }
  }

  // Input değerleri değiştiğinde kısıtlamaları güncelle
  document
    .getElementById('date-input-start')!
    .addEventListener('change', () => updateDateConstraints('departure'))

  document
    .getElementById('date-input-end')!
    .addEventListener('change', () => updateDateConstraints('return'))

  // Sayfa yüklendiğinde başlangıç kısıtlamalarını ayarla
  updateDateConstraints()
})
