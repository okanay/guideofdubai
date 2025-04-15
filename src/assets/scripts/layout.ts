import { ModalController } from './packages/modal.js'
import { PictureLazyLoadController } from './packages/picture-lazy-load.js'
import { LazyImageLoadController } from './packages/lazy-load.js'
import { DatePickerWithTime } from './packages/date-time-picker.js'
import { languages } from '../constants/date-picker-languages.js'

declare global {
  interface Window {
    LayoutModals: ModalController
    CompleteRegisterModal: ModalController

    openCart: () => void
    callIcons: () => void
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dateInputStart = document.getElementById('ai-form-date-input-start')
  const dateInputEnd = document.getElementById('ai-form-date-input-end')

  if (!dateInputStart && !dateInputEnd) {
    return
  }

  const DatePicker = new DatePickerWithTime({
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
  const departureInput = DatePicker.connect({
    input: 'ai-form-date-input-start',
    label: 'ai-form-date-input-start-label',
    focusContainer: 'ai-form-date-input-start-label',
    onChange: (date: Date | null) => {}, // Boş callback
  })

  const returnInput = DatePicker.connect({
    input: 'ai-form-date-input-end',
    label: 'ai-form-date-input-end-label',
    focusContainer: 'ai-form-date-input-end-label',
    onChange: (date: Date | null) => {}, // Boş callback
  })

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
        const returnDate = returnInput.getDate()

        if (departureDate) {
          // Minimum dönüş tarihini hesapla (gidiş + 1 gün)
          const minReturnDate = addDaysToDate(departureDate, 1)

          if (minReturnDate) {
            // Eğer mevcut bir dönüş tarihi varsa
            if (returnDate) {
              // Gidiş ve dönüş tarihlerini karşılaştırmak için aynı formatta olduklarından emin olalım
              // Sadece yıl-ay-gün kısmını kontrol etmek için saat bilgilerini sıfırlayalım
              const departureDateOnly = new Date(
                departureDate.getFullYear(),
                departureDate.getMonth(),
                departureDate.getDate(),
              )
              const returnDateOnly = new Date(
                returnDate.getFullYear(),
                returnDate.getMonth(),
                returnDate.getDate(),
              )

              // Eğer yeni gidiş tarihi, mevcut dönüş tarihinden sonraysa veya aynı günse
              // dönüş tarihini sıfırla
              if (departureDateOnly.getTime() >= returnDateOnly.getTime()) {
                returnInput.resetAllInputs()
              }

              // Her durumda dönüş tarihinin minimum değerini güncelle
              returnInput.changeMinDate(minReturnDate)
            } else {
              // Dönüş tarihi seçili değilse, sadece min değeri güncelle
              returnInput.changeMinDate(minReturnDate)
            }
          }
        }
      } else if (focusTarget === 'return') {
        // Dönüş tarihi değiştirildiğinde
        // Bu durumda özel bir işlem yapmaya gerek yok
      } else {
        // Sayfa yüklendiğinde başlangıç kısıtlamalarını ayarla
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

document.addEventListener('DOMContentLoaded', async () => {
  window.callIcons()

  new PictureLazyLoadController({
    imageSelector: '.lazy-picture',
    rootMargin: '50px 0px',
    threshold: 0.1,
    filterStyle: 'blur(5px)',
    maxConcurrentLoads: 3,
  })

  new LazyImageLoadController({
    imageSelector: '.lazy-image',
    rootMargin: '400px 0px',
    threshold: 0.1,
    filterStyle: 'blur(5px)',
    maxConcurrentLoads: 3,
  })

  const layoutModals = new ModalController(
    [
      {
        id: 'language-menu',
        toggleElements: [],
        openElements: [
          '#language-currency-selector-button',
          '#language-currency-selector-button-mobile',
        ],
        contentElement: '#language-currency-selector-options',
        closeElements: ['#language-selector-closed-button'],
        containers: ['#language-currency-selector-options-content'],
      },
      {
        id: 'search-modal',
        toggleElements: [],
        openElements: ['#search-button', '#search-button-mobile'],
        contentElement: '#search-modal',
        closeElements: ['#search-modal-close-button'],
        containers: ['#search-modal-content'],
      },
      {
        id: 'mobile-menu',
        toggleElements: ['#mobile-menu-button'],
        openElements: [],
        contentElement: '#mobile-navigation',
        closeElements: [],
        containers: ['#mobile-navigation-content'],
      },
      {
        id: 'shopping-cart-modal',
        toggleElements: [
          '#shopping-cart-button',
          '#shopping-cart-button-mobile',
        ],
        openElements: [],
        contentElement: '#shopping-cart-modal',
        closeElements: ['#close-shopping-cart'],
        containers: ['#shopping-cart-modal-content'],
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
        enabled: true,
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

  window.LayoutModals = layoutModals
})

document.addEventListener('DOMContentLoaded', async () => {
  function formatUserName(name: string) {
    // Boşlukları temizle ve birden fazla boşluğu tek boşluğa indir
    const cleanName = name.trim().replace(/\s+/g, ' ')

    // İsmi boşluklardan böl
    const nameParts = cleanName.split(' ')

    // Son ismin ilk harfi
    const lastInitial = nameParts[nameParts.length - 1][0]

    // İlk isim 4 harften uzunsa
    if (nameParts[0].length > 4) {
      return `${nameParts[0][0]}. ${lastInitial}.`
    } else {
      // İlk isim 4 harf veya daha kısaysa
      return `${nameParts[0]} ${lastInitial}.`
    }
  }

  // DOM yüklendikten sonra çalışacak kod
  const userNameElement = document.getElementById('user-name')
  if (userNameElement && userNameElement.textContent) {
    const originalName = userNameElement.textContent.trim()
    const formattedName = formatUserName(originalName)
    userNameElement.textContent = formattedName

    // Hover durumunda orijinal ismi göstermek için title attribute'u ekle
    userNameElement.title = originalName
  }
})
