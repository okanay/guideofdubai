import { AccordionController } from './packages/accordion.js'
import { ModalController } from './packages/modal.js'
import { PictureLazyLoadController } from './packages/picture-lazy-load.js'
import { LazyImageLoadController } from './packages/lazy-load.js'

declare global {
  interface Window {
    LayoutModals: ModalController
    CompleteRegisterModal: ModalController
    openCart: () => void
    callIcons: () => void
  }
}

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

  const completeRegisterModal = new ModalController(
    [
      {
        id: 'register',
        toggleElements: [],
        openElements: [],
        contentElement: '#complete-register-modal',
        closeElements: [],
        containers: ['#complete-register-modal-content'],
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

  window.CompleteRegisterModal = completeRegisterModal
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
