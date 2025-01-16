import { AccordionController } from './packages/accordion.js'
import { ModalController } from './packages/modal.js'
import { PictureLazyLoadController } from './packages/picture-lazy-load.js'
import { LazyImageLoadController } from './packages/lazy-load.js'

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

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof window !== 'undefined') {
    window.callIcons()
  }

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

  new ModalController(
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

  new ModalController(
    [
      {
        id: 'nav-1',
        toggleElements: [],
        openElements: ['#footer-nav-1-btn'],
        contentElement: '#footer-nav-1',
        closeElements: [],
        containers: ['#footer-nav-1'],
      },
      {
        id: 'nav-2',
        toggleElements: [],
        openElements: ['#footer-nav-2-btn'],
        contentElement: '#footer-nav-2',
        closeElements: [],
        containers: ['#footer-nav-2'],
      },
      {
        id: 'nav-3',
        toggleElements: [],
        openElements: ['#footer-nav-3-btn'],
        contentElement: '#footer-nav-3',
        closeElements: [],
        containers: ['#footer-nav-3'],
      },
    ],
    {
      initialActiveModal: 'nav-1',
      outsideClickClose: false,
      escapeClose: false,
      preserveModalHistory: false,
      scrollLock: {
        enabled: false,
      },
    },
  )

  new AccordionController({
    container: '#footer-container',
    accordionSelector: '.footer',
    toggleButtonSelector: '.footer-toggle',
    contentSelector: '.footer-content',
    iconSelector: '.footer-icon',
    defaultOpenIndex: 4,
    closeOthersOnOpen: false,
    animation: {
      enabled: true,
      duration: 300,
      timingFunction: 'ease',
    },
    attributes: {
      stateAttribute: 'data-state',
    },
    classes: {
      activeClass: 'footer-active',
      inactiveClass: 'footer-inactive',
    },
  })
})
