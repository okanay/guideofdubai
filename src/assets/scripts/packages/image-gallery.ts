interface GalleryElements {
  modalId: string
  mainImageContainerId: string
  thumbnailsContainerId: string
  sourceContainerId: string
  prevButtonId: string
  nextButtonId: string
}

interface GalleryOptions {
  elements?: Partial<GalleryElements>
  dataSrcAttribute?: string
  thumbnailClass?: string
  activeThumbnailClass?: string
  sourceImageSelector?: string
  onImageCount?: (count: number) => void
}

class ImageGalleryTracker {
  private modal: HTMLElement
  private mainImageContainer: HTMLElement
  private thumbnailsContainer: HTMLElement
  private sourceContainer: HTMLElement
  private prevButton: HTMLElement
  private nextButton: HTMLElement

  private images: {
    src: string
    dataSrc: string
    alt: string
    index: number
  }[] = []
  private currentIndex: number = 0
  private dataSrcAttribute: string
  private thumbnailClass: string
  private activeThumbnailClass: string
  private sourceImageSelector: string

  private onImageCountCallback?: (count: number) => void

  constructor(options: GalleryOptions = {}) {
    const defaultElements: GalleryElements = {
      modalId: 'gallery-modal',
      mainImageContainerId: 'gallery-modal-main-image-container',
      thumbnailsContainerId: 'gallery-modal-thumbnails',
      sourceContainerId: 'product-slider',
      prevButtonId: 'prev-image-gallery',
      nextButtonId: 'next-image-gallery',
    }

    const elements = { ...defaultElements, ...options.elements }

    this.modal = document.getElementById(elements.modalId)!
    this.mainImageContainer = document.getElementById(
      elements.mainImageContainerId,
    )!
    this.thumbnailsContainer = document.getElementById(
      elements.thumbnailsContainerId,
    )!
    this.sourceContainer = document.getElementById(elements.sourceContainerId)!
    this.prevButton = document.getElementById(elements.prevButtonId)!
    this.nextButton = document.getElementById(elements.nextButtonId)!

    this.dataSrcAttribute = options.dataSrcAttribute || 'data-src'
    this.thumbnailClass = options.thumbnailClass || 'thumbnail'
    this.activeThumbnailClass =
      options.activeThumbnailClass || 'thumbnail-active'
    this.sourceImageSelector =
      options.sourceImageSelector || '.product-slide img'

    this.onImageCountCallback = options.onImageCount

    this.initializeGallery()
    this.bindEvents()
  }

  private bindEvents(): void {
    // Source container click event
    this.sourceContainer.addEventListener('click', e => {
      const target = e.target as HTMLElement
      const slide = target.closest('.product-slide')

      if (slide) {
        const index = parseInt(slide.getAttribute('data-index') || '0')
        this.openGallery(index)
      }
    })

    // Thumbnail click event
    this.thumbnailsContainer.addEventListener('click', e => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG') {
        const index = Array.from(this.thumbnailsContainer.children).indexOf(
          target,
        )
        this.updateMainImage(index)
      }
    })

    // Navigation button events
    this.prevButton.addEventListener('click', () =>
      this.navigateGallery('prev'),
    )
    this.nextButton.addEventListener('click', () =>
      this.navigateGallery('next'),
    )

    // Arrow key navigation
    document.addEventListener('keydown', e => {
      if (this.modal.getAttribute('data-state') === 'open') {
        if (e.key === 'ArrowRight') {
          this.navigateGallery('next')
        } else if (e.key === 'ArrowLeft') {
          this.navigateGallery('prev')
        }
      }
    })
  }

  public openGallery(index: number): void {
    this.currentIndex = index
    this.updateMainImage(index)
  }

  public updateMainImage(index: number): void {
    this.currentIndex = index
    const mainImage = this.mainImageContainer.querySelector('img')
    if (mainImage && this.images[index]) {
      mainImage.src = this.images[index].src
      mainImage.alt = this.images[index].alt
    }
    this.updateThumbnailStates()
    this.updateNavigationState()
  }

  private updateNavigationState(): void {
    // const totalImages = this.images.length
    // // Update button states based on current position
    // this.prevButton.style.visibility =
    //   this.currentIndex === 0 ? 'hidden' : 'visible'
    // this.nextButton.style.visibility =
    //   this.currentIndex === totalImages - 1 ? 'hidden' : 'visible'
  }

  public renderThumbnails(): void {
    this.thumbnailsContainer.innerHTML = this.images
      .map(
        (img, index) => `
        <img
          src="${img.src}"
          alt="${img.alt}"
          class="${this.thumbnailClass} ${index === this.currentIndex ? this.activeThumbnailClass : ''}"
        />
      `,
      )
      .join('')
  }

  public updateThumbnailStates(): void {
    const thumbnails = this.thumbnailsContainer.querySelectorAll('img')
    thumbnails.forEach((thumb, index) => {
      if (index === this.currentIndex) {
        thumb.classList.add(this.activeThumbnailClass)
        this.scrollToActiveThumbnail(thumb)
      } else {
        thumb.classList.remove(this.activeThumbnailClass)
      }
    })
  }

  private scrollToActiveThumbnail(activeThumbnail: Element): void {
    const container = this.thumbnailsContainer
    const thumbLeft = activeThumbnail.getBoundingClientRect().left
    const containerLeft = container.getBoundingClientRect().left
    const scrollLeft = container.scrollLeft
    const thumbnailWidth = activeThumbnail.clientWidth
    const containerWidth = container.clientWidth

    const offsetLeft =
      thumbLeft -
      containerLeft +
      scrollLeft -
      containerWidth / 2 +
      thumbnailWidth / 2

    container.scrollTo({
      left: offsetLeft,
      behavior: 'smooth',
    })
  }

  private initializeGallery(): void {
    const sourceImages = this.sourceContainer.querySelectorAll(
      this.sourceImageSelector,
    )

    this.images = Array.from(sourceImages).map((img, index) => {
      const image = img as HTMLImageElement
      const imageSrc = image.getAttribute(this.dataSrcAttribute) || image.src

      // Debug için kontrol edelim
      console.log('Image source:', imageSrc)

      return {
        src: imageSrc,
        dataSrc: image.getAttribute(this.dataSrcAttribute) || '',
        alt: image.alt,
        index: index,
      }
    })

    if (this.onImageCountCallback) {
      this.onImageCountCallback(this.images.length)
    }

    this.renderThumbnails()
    this.updateNavigationState()
  }

  private navigateGallery(direction: 'next' | 'prev'): void {
    const totalImages = this.images.length
    let newIndex = this.currentIndex

    if (direction === 'next') {
      newIndex = (this.currentIndex + 1) % totalImages
    } else {
      newIndex = (this.currentIndex - 1 + totalImages) % totalImages
    }

    this.updateMainImage(newIndex)
  }

  public nextImage(): void {
    this.navigateGallery('next')
  }

  public prevImage(): void {
    this.navigateGallery('prev')
  }

  public refreshGallery(): void {
    this.initializeGallery()
  }
}

function UpdateProductSliderDataItems(
  sliderId: string,
  options: {
    min: number
    max: number
    childElements: number
    dataItems: string
  },
) {
  const productSlider = document.getElementById(sliderId)
  if (productSlider) {
    const dataItems = productSlider.getAttribute('data-items')

    if (dataItems === options.dataItems) {
      const newItemsValue = Math.max(
        options.min,
        Math.min(options.childElements, options.max),
      )
      productSlider.setAttribute('data-items', newItemsValue.toString())
    }
  }
}

function UpdateElementInnerHTMLById(elementId: string, newValue: string): void {
  const element = document.getElementById(elementId)
  if (element) {
    element.innerHTML = newValue
  }
}

export {
  ImageGalleryTracker,
  UpdateProductSliderDataItems,
  UpdateElementInnerHTMLById,
}
