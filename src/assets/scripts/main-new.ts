import { Slider } from './packages/slider.js'
import { AccordionController } from './packages/accordion.js'
import { TouchDirectionDetector } from './packages/touch-event.js'
import { WheelScroll } from './packages/wheel-scroll.js'

document.addEventListener('DOMContentLoaded', () => {
  new WheelScroll({ debugMode: false })

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
      // #hero-slider-btn-list
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
})
