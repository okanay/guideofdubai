const defaultConfig = {
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
} as const

class DynamicSlider {
  private sliders: Map<
    HTMLElement,
    {
      items: HTMLElement[]
      nextBtn: HTMLElement | null
      prevBtn: HTMLElement | null
      activeIndex: number
      isAnimating: boolean
      isVisible: boolean
    }
  > = new Map()

  private observer!: MutationObserver
  private intersectionObserver!: IntersectionObserver
  private loadedImages = new Set<string>()

  constructor() {
    this.setupIntersectionObserver()
    this.initializeSliders()
    this.setupObserver()

    if (!window.RefreshSlider) {
      window.RefreshSlider = this.refresh.bind(this)
    }
  }

  private initializeSliders(): void {
    const sliderElements = document.querySelectorAll('.dynamic-slider')
    sliderElements.forEach(container => {
      this.setupSlider(container as HTMLElement)
    })
  }

  private setupIntersectionObserver(): void {
    this.intersectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const slider = this.sliders.get(entry.target as HTMLElement)
          if (slider) {
            slider.isVisible = entry.isIntersecting
            if (entry.isIntersecting) {
              // Aktif görseli yükle
              this.loadImages(slider.items[slider.activeIndex])

              // Önceki ve sonraki görselleri yükle
              const prevIndex =
                (slider.activeIndex - 1 + slider.items.length) %
                slider.items.length
              const nextIndex = (slider.activeIndex + 1) % slider.items.length

              this.loadImages(slider.items[prevIndex])
              this.loadImages(slider.items[nextIndex])
            }
          }
        })
      },
      { threshold: 0.1, rootMargin: '50px' },
    )
  }

  private loadImages(element: HTMLElement): void {
    if (!element) return

    const slider = this.sliders.get(
      element.closest('.dynamic-slider') as HTMLElement,
    )
    if (!slider?.isVisible) return

    const images = element.querySelectorAll('img[data-src]')
    images.forEach(img => {
      const dataSrc = img.getAttribute('data-src')
      if (dataSrc && !this.loadedImages.has(dataSrc)) {
        img.setAttribute('src', dataSrc)
        this.loadedImages.add(dataSrc)
      }
    })
  }

  private setupObserver(): void {
    this.observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          const newSliders = document.querySelectorAll('.dynamic-slider')
          newSliders.forEach(container => {
            if (!this.sliders.has(container as HTMLElement)) {
              this.setupSlider(container as HTMLElement)
            }
          })

          // Silinen sliderları temizle
          this.sliders.forEach((_, container) => {
            if (!document.contains(container)) {
              this.sliders.delete(container)
            }
          })
        }
      })
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  private createCloneElement(
    sourceElement: HTMLElement,
    direction: 'left' | 'right',
  ): HTMLElement {
    const clone = sourceElement.cloneNode(true) as HTMLElement
    clone.dataset.clone = 'true'

    const initialTransform =
      direction === 'left' ? 'translate(-120%, 0%)' : 'translate(120%, 0%)'

    clone.style.transform = initialTransform
    clone.style.transition = 'none'
    clone.style.position = 'absolute'
    clone.style.left = '0'
    clone.style.top = '0'
    clone.style.width = '100%'
    clone.style.height = '100%'
    clone.style.opacity = '0'
    clone.style.zIndex = '3'

    return clone
  }

  private async animateSlide(
    currentSlide: HTMLElement,
    clone: HTMLElement,
    direction: 'left' | 'right',
  ): Promise<void> {
    const exitTransform =
      direction === 'left' ? 'translate(20%, 0%)' : 'translate(-20%, 0%)'

    return new Promise(resolve => {
      requestAnimationFrame(() => {
        // Set initial states with no transition
        currentSlide.style.transition = 'none'
        clone.style.transition = 'none'

        clone.style.transform =
          direction === 'left' ? 'translate(-120%, 0%)' : 'translate(120%, 0%)'
        clone.style.opacity = '0'

        // Force reflow
        void clone.offsetHeight

        // Apply transitions
        const transition =
          'transform 400ms cubic-bezier(0.4, 0, 0.2, 1), opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)'
        clone.style.transition = transition
        currentSlide.style.transition = transition

        // Animate
        clone.style.transform = 'translate(0%, 0%)'
        clone.style.opacity = '1'

        currentSlide.style.transform = exitTransform
        currentSlide.style.opacity = '0'

        setTimeout(() => {
          resolve()
        }, 400)
      })
    })
  }

  private setupSlider(container: HTMLElement): void {
    const items = Array.from(
      container.querySelectorAll('.slider-item'),
    ) as HTMLElement[]
    const nextBtn = container.querySelector('.next-btn') as HTMLElement | null
    const prevBtn = container.querySelector('.prev-btn') as HTMLElement | null

    this.sliders.set(container, {
      items,
      nextBtn,
      prevBtn,
      activeIndex: 0,
      isAnimating: false,
      isVisible: false,
    })

    this.setupButtons(container)
    this.initializeSliderItems(container)
    this.intersectionObserver.observe(container)
  }

  private setupButtons(container: HTMLElement): void {
    const slider = this.sliders.get(container)
    if (!slider) return

    if (slider.nextBtn) {
      slider.nextBtn.addEventListener('click', () => this.next(container))
    }
    if (slider.prevBtn) {
      slider.prevBtn.addEventListener('click', () => this.prev(container))
    }
  }

  private updateIndexIndicator(
    container: HTMLElement,
    activeIndex: number,
    totalItems: number,
  ): void {
    const indicator = container.querySelector('.slider-index-indicator')
    if (indicator) {
      indicator.textContent = `${activeIndex + 1}/${totalItems} Görsel`
    }
  }

  private initializeSliderItems(container: HTMLElement): void {
    const slider = this.sliders.get(container)
    if (!slider) return

    // Update index indicator
    this.updateIndexIndicator(
      container,
      slider.activeIndex,
      slider.items.length,
    )

    slider.items.forEach((item, index) => {
      item.style.position = 'absolute'
      item.style.left = '0'
      item.style.top = '0'
      item.style.width = '100%'
      item.style.height = '100%'

      if (index === slider.activeIndex) {
        item.style.transform = 'translate(0%, 0%)'
        item.style.opacity = '1'
        item.style.zIndex = '2'
        if (slider.isVisible) {
          // Aktif görseli ve komşularını yükle
          this.loadImages(item)
          const prevIndex =
            (index - 1 + slider.items.length) % slider.items.length
          const nextIndex = (index + 1) % slider.items.length
          this.loadImages(slider.items[prevIndex])
          this.loadImages(slider.items[nextIndex])
        }
      } else {
        item.style.transform = 'translate(100%, 0%)'
        item.style.opacity = '0'
        item.style.zIndex = '1'
      }
    })
  }

  public async next(container: HTMLElement): Promise<void> {
    const slider = this.sliders.get(container)
    if (!slider || slider.isAnimating || slider.items.length <= 1) return

    slider.isAnimating = true
    const currentIndex = slider.activeIndex
    slider.activeIndex = (slider.activeIndex + 1) % slider.items.length

    const currentSlide = slider.items[currentIndex]
    const nextSlide = slider.items[slider.activeIndex]
    const nextNextIndex = (slider.activeIndex + 1) % slider.items.length

    // Bir sonraki görseli önceden yükle
    this.loadImages(slider.items[nextNextIndex])

    const clone = this.createCloneElement(nextSlide, 'right')
    container.appendChild(clone)

    await this.animateSlide(currentSlide, clone, 'right')

    this.loadImages(nextSlide)
    nextSlide.style.transition = 'none'
    nextSlide.style.transform = 'translate(0%, 0%)'
    nextSlide.style.opacity = '1'
    nextSlide.style.zIndex = '2'

    currentSlide.style.zIndex = '1'
    clone.remove()

    slider.isAnimating = false
    this.updateIndexIndicator(
      container,
      slider.activeIndex,
      slider.items.length,
    )
    this.updateIndexIndicator(
      container,
      slider.activeIndex,
      slider.items.length,
    )
  }

  public async prev(container: HTMLElement): Promise<void> {
    const slider = this.sliders.get(container)
    if (!slider || slider.isAnimating || slider.items.length <= 1) return

    slider.isAnimating = true
    const currentIndex = slider.activeIndex
    slider.activeIndex =
      (slider.activeIndex - 1 + slider.items.length) % slider.items.length

    const currentSlide = slider.items[currentIndex]
    const prevSlide = slider.items[slider.activeIndex]
    const prevPrevIndex =
      (slider.activeIndex - 1 + slider.items.length) % slider.items.length

    // Bir önceki görseli önceden yükle
    this.loadImages(slider.items[prevPrevIndex])

    const clone = this.createCloneElement(prevSlide, 'left')
    container.appendChild(clone)

    await this.animateSlide(currentSlide, clone, 'left')

    this.loadImages(prevSlide)
    prevSlide.style.transition = 'none'
    prevSlide.style.transform = 'translate(0%, 0%)'
    prevSlide.style.opacity = '1'
    prevSlide.style.zIndex = '2'

    currentSlide.style.zIndex = '1'
    clone.remove()

    slider.isAnimating = false
  }

  public refresh(): void {
    this.sliders.clear()
    this.initializeSliders()
  }

  public destroy(): void {
    this.observer.disconnect()
    this.intersectionObserver.disconnect()
    this.sliders.forEach((slider, container) => {
      if (slider.nextBtn) {
        slider.nextBtn.removeEventListener('click', () => this.next(container))
      }
      if (slider.prevBtn) {
        slider.prevBtn.removeEventListener('click', () => this.prev(container))
      }
    })
    this.sliders.clear()
  }
}

// Global type definition for RefreshSlider
declare global {
  interface Window {
    RefreshSlider: () => void
  }
}

export { DynamicSlider }
