import { ModalController } from './packages/modal.js'
import { NavStickyManager } from './packages/scroll-style.js'
import { DatePickerManager } from './packages/date-selector.js'

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
  const mobilePriceContainer = document.getElementById(
    'mobile-price-container',
  ) as HTMLElement | null

  const fixedButtonGroups = document.getElementById(
    'fixed-button-groups',
  ) as HTMLElement | null

  const chatModal = document.getElementById(
    'chat-bot-modal',
  ) as HTMLElement | null

  function throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
  ): (...args: Parameters<T>) => void {
    let lastCall = 0
    let timeout: number | null = null

    return function (this: any, ...args: Parameters<T>): void {
      const now = new Date().getTime()
      const timeSinceLastCall = now - lastCall

      if (timeSinceLastCall >= delay) {
        lastCall = now
        func.apply(this, args)
      } else {
        if (timeout !== null) {
          clearTimeout(timeout)
        }

        timeout = window.setTimeout(() => {
          lastCall = new Date().getTime()
          func.apply(this, args)
        }, delay - timeSinceLastCall)
      }
    }
  }

  function updatePurchaseButtonState(): void {
    const isDesktop = window.innerWidth >= 640

    if (mobilePriceContainer) {
      if (isDesktop) {
        mobilePriceContainer.dataset.visible = 'false'
      } else {
        const purchaseSubmitBtn = document.getElementById(
          'purchase-submit-btn',
        ) as HTMLElement | null

        const isPurchaseVisible =
          purchaseSubmitBtn &&
          purchaseSubmitBtn.offsetParent !== null &&
          isElementInViewport(purchaseSubmitBtn)

        if (fixedButtonGroups) {
          fixedButtonGroups.dataset.purchase = isPurchaseVisible
            ? 'hidden'
            : 'visible'
        }

        const shouldBeVisible =
          isPurchaseVisible &&
          (!chatModal || chatModal.dataset.state !== 'minimized')

        mobilePriceContainer.dataset.visible = shouldBeVisible
          ? 'false'
          : 'true'
      }
    }
  }

  function isElementInViewport(el: HTMLElement): boolean {
    if (!el) return false

    const rect = el.getBoundingClientRect()

    return (
      rect.top <
        (window.innerHeight || document.documentElement.clientHeight) &&
      rect.left >= 0 &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
  }

  // İlk durumu ayarla
  updatePurchaseButtonState()

  // Scroll olayını izle
  window.addEventListener('scroll', throttle(updatePurchaseButtonState, 200))

  // Ekran boyutu değiştiğinde kontrol et
  window.addEventListener(
    'resize',
    throttle(() => {
      setTimeout(updatePurchaseButtonState, 100)
    }, 200),
  )

  // Cihaz oryantasyonu değiştiğinde kontrol et
  window.addEventListener(
    'orientationchange',
    throttle(() => {
      setTimeout(updatePurchaseButtonState, 300)
    }, 200),
  )

  // DOM değişikliklerini izle
  const observer = new MutationObserver(
    throttle(() => {
      updatePurchaseButtonState()
    }, 200),
  )

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'hidden'],
  })

  // AI Modal durumu güncelleme fonksiyonu - global tanımlama
  ;(window as any).updateFixedButtonsState = function (): void {
    if (chatModal && fixedButtonGroups) {
      if (chatModal.dataset.state === 'minimized') {
        fixedButtonGroups.dataset.state = 'minimized'
      } else {
        fixedButtonGroups.dataset.state = 'normal'
      }
    }

    updatePurchaseButtonState()
  }

  // Scroll tamamlandığında kontrol et (debounce yaklaşımı)
  let scrollTimeout: number
  window.addEventListener('scroll', function () {
    clearTimeout(scrollTimeout)
    scrollTimeout = window.setTimeout(function () {
      updatePurchaseButtonState()
    }, 200)
  })

  // Sayfa tam yüklendiğinde kontrol et
  window.addEventListener('load', updatePurchaseButtonState)

  // Periyodik kontrol
  const checkInterval = window.setInterval(updatePurchaseButtonState, 2000)

  // Sayfa kapatıldığında interval'i temizle
  window.addEventListener('beforeunload', () => {
    clearInterval(checkInterval)
  })
})
