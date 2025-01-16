import { Carousel } from './packages/carousel.js'
import { Slider } from './packages/slider.js'
import { AccordionController } from './packages/accordion.js'
import { TouchDirectionDetector } from './packages/touch-event.js'

document.addEventListener('DOMContentLoaded', () => {
  new Carousel('most-popular', 'prev-most-popular', 'next-most-popular')
  new Carousel('popular-list', 'prev-popular-list', 'next-popular-list')
  new Carousel(
    'opportunity-list',
    'prev-opportunity-list',
    'next-opportunity-list',
  )

  new Carousel('holiday-list', 'prev-holiday-list', 'next-holiday-list')
  const sliderControlButtons = new Carousel(
    'hero-slider-btn-list',
    'prev-hero-slider-btn',
    'next-hero-slider-btn',
    {
      snapAlign: 'center',
      itemSpacing: 16,
      btnsDisableThreshold: 32,
      screenSizes: [
        { width: 1024, jumpVal: 3 },
        { width: 768, jumpVal: 2 },
        { width: 512, jumpVal: 1 },
      ],
    },
  )

  new Carousel('activity-list', 'activity-prev-btn', 'activity-next-btn', {
    snapAlign: 'center',
    itemSpacing: 16,
    btnsDisableThreshold: 32,
    screenSizes: [
      { width: 1024, jumpVal: 3 },
      { width: 768, jumpVal: 2 },
      { width: 512, jumpVal: 1 },
    ],
  })

  const slider = new Slider({
    container: '#hero-slider-container',
    slideSelector: '.hero-slide',
    buttonSelector: '.hero-slider-btn',
    defaultActiveIndex: 0,
    activeButtonClass: 'slider-active-btn',
    activeButtonClassTarget: '.hero-slider-btn-item',
    auto: true,
    autoInterval: 6000,
    animationConfig: {
      duration: 1000,
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
        selected: 30,
        clone: 40,
        notSelected: -10,
      },
    },
    onIndexChange: index => {
      if (!index && index !== 0) return
      sliderControlButtons?.scrollTo(index)
    },
  })

  new TouchDirectionDetector('hero-slider-container', {
    threshold: 50,
    onSwipe: direction => {
      if (direction === 'right') {
        return slider.prev()
      }

      if (direction === 'left') {
        return slider.next()
      }
    },
  })

  const hiddenFAQ = new AccordionController({
    container: '#faq-hidden-container',
    accordionSelector: '.faq-2',
    toggleButtonSelector: '.faq-toggle-2',
    contentSelector: '.faq-content-2',
    iconSelector: '.faq-icon-2',
    defaultOpenIndex: -1,
    closeOthersOnOpen: true,
    animation: {
      enabled: true,
      duration: 300,
      timingFunction: 'ease',
    },
    attributes: {
      stateAttribute: 'data-state',
    },
    classes: {
      activeClass: 'faq-active',
      inactiveClass: 'faq-inactive',
    },
  })

  new AccordionController({
    container: '#faq-container-1',
    accordionSelector: '.faq',
    toggleButtonSelector: '.faq-toggle',
    contentSelector: '.faq-content',
    iconSelector: '.faq-icon',
    defaultOpenIndex: 0,
    closeOthersOnOpen: true,
    animation: {
      enabled: true,
      duration: 300,
      timingFunction: 'ease',
    },
    attributes: {
      stateAttribute: 'data-state',
    },
    classes: {
      activeClass: 'faq-active',
      inactiveClass: 'faq-inactive',
    },
    onToggle: () => {
      hiddenFAQ.recalculate()
    },
  })
})
