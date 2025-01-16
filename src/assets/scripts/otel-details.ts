import { ModalController } from './packages/modal.js'
import { NavStickyManager } from './packages/scroll-style.js'
import { MultiGroupImageGallery } from './packages/multi-group-gallery.js'
import { Slider } from './packages/slider.js'
import { TouchDirectionDetector } from './packages/touch-event.js'
import { UpdateElementInnerHTMLById } from './packages/image-gallery.js'
import { UpdateProductSliderDataItems } from './packages/image-gallery.js'

import { initScrollObserver } from './packages/scroll-observer.js'

document.addEventListener('DOMContentLoaded', () => {
  initScrollObserver('otel-price-table', 'scroll-notification')
})

document.addEventListener('DOMContentLoaded', () => {
  new ModalController(
    [
      {
        id: 'info',
        toggleElements: [],
        openElements: ['#otel-info-btn-1'],
        contentElement: '#otel-info-content-1',
        closeElements: [],
        containers: ['#otel-info-content-1'],
      },
      {
        id: 'includes',
        toggleElements: [],
        openElements: ['#otel-info-btn-3'],
        contentElement: '#otel-info-content-3',
        closeElements: [],
        containers: ['#otel-info-content-3'],
      },
      {
        id: 'rules',
        toggleElements: [],
        openElements: ['#otel-info-btn-4'],
        contentElement: '#otel-info-content-4',
        closeElements: [],
        containers: ['#otel-info-content-4'],
      },
      {
        id: 'details',
        toggleElements: [],
        openElements: ['#otel-info-btn-5'],
        contentElement: '#otel-info-content-5',
        closeElements: [],
        containers: ['#otel-info-content-5'],
      },
    ],
    {
      initialActiveModal: 'info',
      urlState: {
        enabled: true,
        queryParam: 'view',
        modals: ['info', 'includes', 'rules', 'details'],
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

  new NavStickyManager({
    navId: '#otel-nav',
    contentId: '#otel-content',
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
  const mainSlider = new Slider({
    container: '#otel-slider-container',
    slideSelector: '.otel-slide',
    nextButtonSelector: '#slider-next',
    prevButtonSelector: '#slider-prev',
    defaultActiveIndex: 0,
    activeButtonClass: 'otel-slider-active-btn',
    activeButtonClassTarget: '.otel-slider-btn-item',
    counter: {
      enabled: true,
      containerSelector: '.counter',
      currentSelector: '.current',
      maxSelector: '.max',
    },
    ...mainConfig,
    ...config,
  })

  new TouchDirectionDetector('otel-slider-container', {
    threshold: 50,
    onSwipe: direction => {
      if (direction === 'right') {
        return mainSlider.prev()
      }
      if (direction === 'left') {
        return mainSlider.next()
      }
    },
  })

  const multiGroupGallery = new MultiGroupImageGallery({
    groups: [
      {
        containerId: 'otel-slider',
        slideItemClass: 'otel-slide',
      },
    ],
    ...galleryConfig,
  })

  new TouchDirectionDetector('multi-gallery-main-image-container', {
    threshold: 50,
    onSwipe: direction => {
      if (direction === 'right') {
        return multiGroupGallery.navigateGallery('prev')
      }
      if (direction === 'left') {
        return multiGroupGallery.navigateGallery('next')
      }
    },
  })
})

document.addEventListener('DOMContentLoaded', () => {
  const productSliderElement = document.getElementById('otel-slider')
  const childCount = productSliderElement
    ? productSliderElement.children.length
    : 0

  UpdateProductSliderDataItems('otel-slider', {
    min: 1,
    max: 5,
    childElements: childCount,
    dataItems: 'auto-detected',
  })
  UpdateElementInnerHTMLById('otel-slider-image-count', childCount.toString())
})

document.addEventListener('DOMContentLoaded', () => {
  const multiGroupGallery = new MultiGroupImageGallery({
    groups: [],
    dynamicGallery: {
      galleryGroupClass: 'dynamic-gallery',
      galleryItemClass: 'dynamic-gallery-item',
      galleryButtonClass: 'dynamic-gallery-button',
    },
    ...galleryConfig,
  })

  new TouchDirectionDetector('multi-gallery-main-image-container', {
    threshold: 50,
    onSwipe: direction => {
      if (direction === 'right') {
        return multiGroupGallery.navigateGallery('prev')
      }
      if (direction === 'left') {
        return multiGroupGallery.navigateGallery('next')
      }
    },
  })

  // Hidden gallery container'ı izleyen observer
  const createGalleryObserver = (gallery: MultiGroupImageGallery) => {
    const observer = new MutationObserver(mutations => {
      // DOM değişikliklerini kontrol et
      const hasRelevantChanges = mutations.some(mutation => {
        // Eğer yeni node'lar eklendiyse veya var olanlar değiştiyse
        return (
          mutation.type === 'childList' ||
          (mutation.type === 'attributes' &&
            (mutation.attributeName === 'data-src' ||
              mutation.attributeName === 'src'))
        )
      })

      if (hasRelevantChanges) {
        gallery.refreshGallery()
      }
    })

    // Observer'ı başlat
    const container = document.getElementById('multi-gallery-images-container')
    if (container) {
      observer.observe(container, {
        childList: true, // Yeni elementler eklendiğinde/silindiğinde
        subtree: true, // Alt elementlerdeki değişiklikleri de izle
        attributes: true, // Attribute değişikliklerini izle
        attributeFilter: ['data-src', 'src'], // Sadece bu attribute'ları izle
      })
    }

    return observer
  }

  createGalleryObserver(multiGroupGallery)
})

document.addEventListener('DOMContentLoaded', () => {
  const stickyPriceSection = document.getElementById('sticky-price-section')
  const whatsappButton = document.getElementById('whatsapp-button')

  if (!stickyPriceSection || !whatsappButton) {
    return
  }

  const updateWhatsappButtonPosition = (): void => {
    const hiddenMobile = stickyPriceSection.getAttribute('data-mobile')
    if (hiddenMobile === 'false') {
      whatsappButton.setAttribute('data-position', 'down')
    } else {
      whatsappButton.setAttribute('data-position', 'up')
    }
  }

  // Initial check
  updateWhatsappButtonPosition()

  // Observe changes to the attribute
  const observer = new MutationObserver(updateWhatsappButtonPosition)
  observer.observe(stickyPriceSection, {
    attributes: true,
    attributeFilter: ['data-hiddenMobile'],
  })
})

const config = {
  auto: true,
  autoInterval: 6000,
  animationConfig: {
    duration: 400,
    timingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
    transforms: {
      fromLeft: {
        enter: 'translate(-120%, 0%)',
        exit: 'translate(20%, 0%)',
      },
      fromRight: {
        enter: 'translate(120%, 0%)',
        exit: 'translate(-20%, 0%)',
      },
    },
    opacitySelected: 1,
    opacityNotSelected: 0.75,
    scaleSelected: 1,
    scaleNotSelected: 1,
  },
  options: {
    zIndex: {
      clone: 3,
      selected: 2,
      notSelected: 1,
    },
  },
}

const mainConfig = {
  responsive: {
    enabled: true,
    minWidth: 0,
    maxWidth: 1024,
  },
}

const galleryConfig = {
  elements: {
    modalId: 'multi-gallery',
    modalContentId: 'multi-gallery-content',
    mainImageContainerId: 'multi-gallery-main-image-container',
    thumbnailsContainerId: 'multi-gallery-thumbnails',
    prevButtonId: 'prev-multi-gallery',
    nextButtonId: 'next-multi-gallery',
    closeButtonId: 'close-multi-gallery',
  },
  thumbnailClass: 'thumbnail',
  activeThumbnailClass: 'thumbnail-active',
}
