import { MultiGroupImageGallery } from '../packages/multi-group-gallery.js'
import { UpdateElementInnerHTMLById } from '../packages/multi-group-gallery.js'
import { UpdateProductSliderDataItems } from '../packages/multi-group-gallery.js'
import { Slider } from '../packages/slider.js'
import { TouchDirectionDetector } from '../packages/touch-event.js'

// Görseldeki ürünlerin sayısını otomatik olarak hesaplar ve slider'ın data-items değerini günceller
document.addEventListener('DOMContentLoaded', () => {
  const productSliderElement = document.getElementById('product-slider')
  const childCount = productSliderElement
    ? productSliderElement.children.length
    : 0

  UpdateProductSliderDataItems('product-slider', {
    min: 1,
    max: 5,
    childElements: childCount,
    dataItems: 'auto-detected',
  })
  UpdateElementInnerHTMLById(
    'product-slider-image-count',
    childCount.toString(),
  )
})

// Main slider
document.addEventListener('DOMContentLoaded', () => {
  const mainSlider = new Slider({
    container: '#product-slider-container',
    slideSelector: '.product-slide',
    buttonSelector: '.product-slider-btn',
    nextButtonSelector: '#slider-next',
    prevButtonSelector: '#slider-prev',
    defaultActiveIndex: 0,
    activeButtonClass: 'product-slider-active-btn',
    activeButtonClassTarget: '.product-slider-btn-item',
    ...mainConfig,
    ...config,
  })

  new TouchDirectionDetector('product-slider-container', {
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
        containerId: 'product-slider',
        slideItemClass: 'product-slide',
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
