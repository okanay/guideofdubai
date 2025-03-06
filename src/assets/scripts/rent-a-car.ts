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

  // Bugünün tarihini al
  const today = new Date()

  // Sonsuz döngüyü önlemek için bayrak
  let isUpdatingConstraints = false

  // Yardımcı fonksiyon: Tarihe belirli sayıda gün ekler
  function addDaysToDate(date: Date, days: number) {
    if (!date) return null
    const newDate = new Date(date)
    newDate.setDate(newDate.getDate() + days)
    return newDate
  }

  // Önce inputları basit callback'lerle bağlayalım
  const departureInput = datePicker.connect({
    input: 'date-input-start',
    label: 'date-input-start-label',
    focusContainer: 'date-input-start-label',
    onChange: (date: Date | null) => {}, // Boş callback
  })

  const returnInput = datePicker.connect({
    input: 'date-input-end',
    label: 'date-input-end-label',
    focusContainer: 'date-input-end-label',
    onChange: (date: Date | null) => {}, // Boş callback
  })

  // Gidiş-dönüş tarih kısıtlamalarını güncelleme fonksiyonu
  // Gidiş-dönüş tarih kısıtlamalarını güncelleme fonksiyonu
  function updateDateConstraints(focusTarget?: 'departure' | 'return') {
    // Eğer güncelleme zaten yapılıyorsa, çıkış yap
    if (isUpdatingConstraints) return

    // Güncelleme bayrağını ayarla
    isUpdatingConstraints = true

    try {
      if (focusTarget === 'departure') {
        // Gidiş tarihi değiştirildiğinde
        const departureDate = departureInput.getDate()
        if (departureDate) {
          // Dönüş tarihini sıfırla
          returnInput.resetAllInputs()
          // Dönüş tarihinin min değerini gidiş tarihinden bir gün sonrası olarak ayarla
          const minReturnDate = addDaysToDate(departureDate, 1)
          if (minReturnDate) {
            returnInput.changeMinDate(minReturnDate)
          }
        }
      } else if (focusTarget === 'return') {
        // Dönüş tarihi değiştirildiğinde
        // Bu durumda özel bir işlem yapmaya gerek yok
      } else {
        // Sayfa yüklendiğinde başlangıç kısıtlamalarını ayarla
        // ÖNEMLİ: data-min-date değerini ezmemek için bu satırı kaldırdık
        // departureInput.changeMinDate(today)

        // Dönüş tarihi için varsayılan değerleri ayarla
        const departureDate = departureInput.getDate()
        if (departureDate) {
          // Eğer gidiş tarihi zaten seçilmişse
          const minReturnDate = addDaysToDate(departureDate, 1)
          if (minReturnDate) {
            returnInput.changeMinDate(minReturnDate)
          }
        } else {
          // Gidiş tarihi seçilmemişse, dönüş tarihi için min date bugün + 1
          const tomorrowDate = addDaysToDate(today, 1)
          if (tomorrowDate) {
            returnInput.changeMinDate(tomorrowDate)
          }
        }
      }
    } finally {
      // İşlem bitti, bayrağı sıfırla
      isUpdatingConstraints = false
    }
  }

  // Şimdi setOnChange ile gerçek callback'leri ayarlayalım
  departureInput.setOnChange((date: Date | null) => {
    updateDateConstraints('departure')
  })

  returnInput.setOnChange((date: Date | null) => {
    updateDateConstraints('return')
  })

  // Varsayılan kısıtlamaları ayarla
  updateDateConstraints()
})
