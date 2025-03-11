import { ModalController } from './packages/modal.js'
import { ScrollManager } from './packages/floating-elements.js'
import { NavStickyManager } from './packages/scroll-style.js'
import { DatePickerManager } from './packages/date-selector.js'
import { DatePickerWithTime } from './packages/date-time-picker.js'
import { languages } from '../constants/date-picker-languages.js'
import { NumberInput } from './packages/number-input.js'

document.addEventListener('DOMContentLoaded', () => {
  new DatePickerManager({
    containerSelector: '.date-input-container',
  })

  // Product Info Modal Controller
  new ModalController(
    [
      {
        id: 'info',
        toggleElements: [],
        openElements: ['#product-info-btn-1'],
        contentElement: '#product-info-content-1',
        closeElements: [],
        containers: ['#product-info-content-1'],
      },
      {
        id: 'includes',
        toggleElements: [],
        openElements: ['#product-info-btn-2'],
        contentElement: '#product-info-content-2',
        closeElements: [],
        containers: ['#product-info-content-2'],
      },
      {
        id: 'faq',
        toggleElements: [],
        openElements: ['#product-info-btn-4'],
        contentElement: '#product-info-content-4',
        closeElements: [],
        containers: ['#product-info-content-4'],
      },
    ],
    {
      initialActiveModal: 'info',
      urlState: {
        enabled: true,
        queryParam: 'view',
        modals: ['info', 'includes', 'reviews', 'faq'],
      },
      scrollTo: {
        enabled: true,
        behavior: 'smooth',
        block: 'start',
        inline: 'start',
        offset: 160,
      },
      outsideClickClose: false,
      escapeClose: false,
      preserveModalHistory: false,
      scrollLock: {
        enabled: false,
      },
    },
  )

  const manager = new ScrollManager([
    {
      id: 'complete-purchase-container',
      watchSelector: '#purchase-submit-btn',
      order: 1,
      position: {
        position: 'fixed',
        right: '0px',
        bottom: '0px',
        width: '100%',
        zIndex: '200',
        opacity: '1',
        transform: 'translateY(0%)',
        transition:
          'transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform, opacity',
      },
      showAnimation: {
        opacity: '1',
        transform: 'translateY(0%)',
      },
      hideAnimation: {
        opacity: '0',
        transform: 'translateY(100%)',
      },
      onClick: () => {
        document.querySelector('#purchase-submit-btn')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      },
      // Cihaz boyutu bazında görünürlük ve sıralama ayarları
      breakpoints: {
        mobile: true, // Mobil ekranlarda görünür
        tablet: false, // Tablet ekranlarda görünür
        desktop: false, // Masaüstü ekranlarda görünür
        mobileOrder: 1, // Mobil ekranlarda sıralama
        tabletOrder: 99, // Tablet ekranlarda sıralama
        desktopOrder: 99, // Masaüstü ekranlarda sıralama
      },
    },
    {
      id: 'whatsapp-button',
      order: 2,
      position: {
        position: 'fixed',
        right: '16px',
        bottom: '64px',
        opacity: '0%',
        transform: 'translateY(100%)',
        transition: 'all 0.3s ease-in-out',
        zIndex: '210',
      },
      showAnimation: {
        transition: 'all 0.3s ease-in-out',
        transform: 'translateY(-20%)',
        opacity: '100%',
      },
      hideAnimation: {
        transition: 'all 0.3s ease-in-out',
        transform: 'translateY(100%)',
        opacity: '0%',
      },
      // Cihaz boyutu bazında görünürlük ve sıralama ayarları
      breakpoints: {
        mobile: true, // Mobil ekranlarda görünür
        tablet: true, // Tablet ekranlarda görünür
        desktop: true, // Masaüstü ekranlarda görünür
        mobileOrder: 2, // Mobil ekranlarda sıralama
        tabletOrder: 2, // Tablet ekranlarda sıralama
        desktopOrder: 2, // Masaüstü ekranlarda sıralama
      },
    },
  ])

  // Resize event listener
  window.addEventListener('resize', () => {
    manager.handleResize()
  })

  // Mobile Screen Nav Sticky Manager
  new NavStickyManager({
    navId: '#product-nav',
    contentId: '#product-content',
    mobileOnly: true,
    mobileBreakpoint: 768,
    threshold: 50,
    fixedStyles: {
      zIndex: '100',
      maxWidth: '1232px',
      margin: '0 auto',
    },
  })
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

  const date = datePicker.connect({
    input: 'date-input',
    label: 'date-input-label',
    focusContainer: 'date-input-label',
    onChange: (date: Date | null) => {}, // Boş callback
  })
})

// Örnek kullanım:
document.addEventListener('DOMContentLoaded', () => {
  // Sayaçları kişi seçiciler için başlat
  const personCounters = NumberInput.createFromSelectors(
    '.person-counter-container',
  )

  // Her sayacın değişikliğini dinle
  personCounters.forEach(counter => {
    counter.container.addEventListener('numberinput:change', event => {
      const customEvent = event as CustomEvent
      console.log('Person count changed:', customEvent.detail.value)

      // Burada ek işlemler yapabilirsiniz, ama NumberInput sınıfının kendisi
      // sadece sayaç değerini yönetmekle sorumlu
    })
  })
})
