import { ModalController } from './packages/modal.js'
import { PictureLazyLoadController } from './packages/picture-lazy-load.js'
import { LazyImageLoadController } from './packages/lazy-load.js'

declare global {
  interface Window {
    modals: ModalController
    openCart: () => void
    callIcons: () => void
  }
}

document.addEventListener('DOMContentLoaded', async () => {
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

  const modals = new ModalController(
    [
      {
        id: 'language-menu',
        openElements: [],
        closeElements: ['#language-closed-button'],
        toggleElements: [
          '#language-toggle-button',
          '#language-toggle-button-mobile',
        ],
        contentElement: '#language-modal-container',
        containers: ['#language-modal-content'],
      },
      {
        id: 'mobile-menu',
        toggleElements: ['#mobile-menu-toggle'],
        openElements: [],
        contentElement: '#mobile-menu-container',
        closeElements: ['#mobile-menu-close-button'],
        containers: ['#mobile-menu-content'],
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

  window.modals = modals
})
