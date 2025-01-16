// prettier-ignore
import { ModalController } from './packages/modal.js'
import { NavStickyManager } from './packages/scroll-style.js'

document.addEventListener('DOMContentLoaded', () => {
  // Product Info Modal Controller
  new ModalController(
    [
      {
        id: 'about',
        toggleElements: [],
        openElements: ['#about-btn'],
        contentElement: '#about',
        closeElements: [],
        containers: ['#about'],
      },
      {
        id: 'visions',
        toggleElements: [],
        openElements: ['#visions-btn'],
        contentElement: '#visions',
        closeElements: [],
        containers: ['#visions'],
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
      initialActiveModal: 'about',
      urlState: {
        enabled: true,
        queryParam: 'view',
        modals: ['about', 'visions', 'contact'],
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
    navId: '#about-nav',
    contentId: '#about-content',
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
