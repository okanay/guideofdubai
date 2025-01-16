// prettier-ignore
import { ModalController } from './packages/modal.js'
import { NavStickyManager } from './packages/scroll-style.js'

document.addEventListener('DOMContentLoaded', () => {
  // Product Info Modal Controller
  new ModalController(
    [
      {
        id: 'terms',
        toggleElements: [],
        openElements: ['#terms-btn'],
        contentElement: '#terms',
        closeElements: [],
        containers: ['#terms'],
      },
      {
        id: 'conditions',
        toggleElements: [],
        openElements: ['#conditions-btn'],
        contentElement: '#conditions',
        closeElements: [],
        containers: ['#conditions'],
      },
      {
        id: 'contact',
        toggleElements: [],
        openElements: ['#contact-btn'],
        contentElement: '#contact',
        closeElements: [],
        containers: ['#contact'],
      },
    ],
    {
      initialActiveModal: 'terms',
      urlState: {
        enabled: true,
        queryParam: 'view',
        modals: ['terms', 'conditions', 'contact'],
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
    navId: '#terms-nav',
    contentId: '#terms-content',
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
