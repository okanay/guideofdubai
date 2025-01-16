import { ModalController } from './packages/modal.js'
import { RatingAnimator } from './packages/rating-bar-controller.js'
import { URLMatcher } from './packages/url-matcher.js'
import { ScrollManager } from './packages/floating-elements.js'
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
        id: 'reviews',
        toggleElements: [],
        openElements: ['#product-info-btn-3'],
        contentElement: '#product-info-content-3',
        closeElements: [],
        containers: ['#product-info-content-3'],
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

  // Rating Animator Instance
  const ratingAnimator = new RatingAnimator({
    containerSelector: '#rating-container',
    barSelector: '.rating-bar',
    animationDuration: 1000,
  })

  // Rating Animator URL Listener
  const urlMatcher = new URLMatcher({
    queryParam: 'view',
    targetValues: ['reviews'],
  })

  // Rating Animator URL Listener
  urlMatcher.on('onFirstMatch', 'reviews', () => {
    ratingAnimator.animate()
  })

  new ScrollManager([
    {
      id: 'complete-purchase-container',
      watchSelector: '#purchase-submit-btn',
      order: 1,
      position: {
        position: 'fixed',
        right: '0px',
        bottom: '0px',
        width: '100%',
        zIndex: '50',
        visibility: 'hidden',
        opacity: '0',
        transform: 'translateY(0%)',
        transition:
          'transform 500ms cubic-bezier(0.4, 0, 0.2, 1), opacity 500ms cubic-bezier(0.4, 0, 0.2, 1)',
        willChange: 'transform, opacity',
      },
      showAnimation: {
        visibility: 'visible',
        opacity: '1',
        transform: 'translateY(0%)',
      },
      hideAnimation: {
        visibility: 'hidden',
        opacity: '0',
        transform: 'translateY(100%)',
      },
      onClick: () => {
        document.querySelector('#purchase-submit-btn')?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })
      },
    },
    {
      id: 'whatsapp-button',
      order: 2,
      position: {
        position: 'fixed',
        right: '16px',
        bottom: '84px',
        visibility: 'hidden',
        opacity: '0%',
        transform: 'translateY(100%)',
        transition: 'all 0.3s ease-in-out',
        zIndex: '60',
      },
      showAnimation: {
        transition: 'all 0.3s ease-in-out',
        transform: 'translateY(-12px)',
        visibility: 'visible',
        opacity: '100%',
      },
      hideAnimation: {
        transition: 'all 0.3s ease-in-out',
        transform: 'translateY(120%)',
        visibility: 'hidden',
        opacity: '0%',
      },
    },
  ])

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
