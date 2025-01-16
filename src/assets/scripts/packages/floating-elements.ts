interface FixedElement {
  id: string
  order: number
  watchSelector?: string
  position: Partial<CSSStyleDeclaration>
  showAnimation: Partial<CSSStyleDeclaration>
  hideAnimation: Partial<CSSStyleDeclaration>
  onClick?: () => void
}

export class ScrollManager {
  private elements: Map<
    string,
    {
      config: FixedElement
      element: HTMLElement
      height: number
      isVisible: boolean
    }
  > = new Map()

  private scrollTimeout: number | null = null
  private resizeTimeout: number | null = null
  private readonly startThreshold = 0.65 // Eski threshold.start değeri
  private readonly endThreshold = 0.1 // Eski threshold.end değeri

  constructor(elements: FixedElement[]) {
    this.initializeElements(elements)

    window.addEventListener('scroll', this.handleScroll)
    window.addEventListener('resize', this.handleResize)

    // Initial check
    this.checkElementsVisibility()
  }

  private initializeElements(elements: FixedElement[]) {
    elements.forEach(config => {
      const element = document.getElementById(config.id)
      if (!element) return

      Object.assign(element.style, {
        ...config.position,
      })

      this.elements.set(config.id, {
        config,
        element,
        height: element.offsetHeight,
        isVisible: false,
      })

      if (config.onClick) {
        element.addEventListener('click', config.onClick)
      }
    })
  }

  private handleScroll = () => {
    if (this.scrollTimeout) {
      window.clearTimeout(this.scrollTimeout)
    }

    this.scrollTimeout = window.setTimeout(() => {
      this.checkElementsVisibility()
    }, 100)
  }

  private handleResize = () => {
    if (this.resizeTimeout) {
      window.clearTimeout(this.resizeTimeout)
    }

    this.resizeTimeout = window.setTimeout(() => {
      this.elements.forEach(data => {
        // Store original styles
        const originalDisplay = data.element.style.display
        const originalVisibility = data.element.style.visibility
        const originalOpacity = data.element.style.opacity

        // Temporarily make element visible but hidden
        data.element.style.display = 'block'
        data.element.style.visibility = 'hidden'
        data.element.style.opacity = '0'

        // Force reflow and get height
        void data.element.offsetHeight
        data.height = data.element.getBoundingClientRect().height

        // Restore original styles
        data.element.style.display = originalDisplay
        data.element.style.visibility = originalVisibility
        data.element.style.opacity = originalOpacity
      })
      this.checkElementsVisibility()
    }, 250)
  }

  private checkElementsVisibility() {
    let hasVisibilityChanged = false

    this.elements.forEach((data, id) => {
      if (!data.config.watchSelector) {
        // Eğer izlenecek element yoksa her zaman görünür
        if (!data.isVisible) {
          data.isVisible = true
          hasVisibilityChanged = true
        }
        return
      }

      const watchElement = document.querySelector(data.config.watchSelector)
      if (!watchElement) return

      const rect = watchElement.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const elementVisibleHeight =
        Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0)
      const elementTotalVisibleHeight = rect.height
      const visibilityRatio = elementVisibleHeight / elementTotalVisibleHeight

      // Ana değişiklik burada: threshold mantığını düzelttik
      const shouldBeVisible = visibilityRatio <= this.endThreshold

      if (shouldBeVisible !== data.isVisible) {
        data.isVisible = shouldBeVisible
        hasVisibilityChanged = true
      }
    })

    if (hasVisibilityChanged) {
      this.updatePositions()
    }
  }

  private updatePositions() {
    const sortedElements = Array.from(this.elements.entries()).sort(
      (a, b) => a[1].config.order - b[1].config.order,
    )

    let currentBottom = 0

    sortedElements.forEach(([_, data]) => {
      // Her element için animasyon uygula, görünür olsun veya olmasın
      const animation = data.isVisible
        ? data.config.showAnimation
        : data.config.hideAnimation

      if (data.isVisible) {
        Object.assign(data.element.style, {
          ...data.config.position,
          ...animation,
          bottom: `${currentBottom}px`,
        })
        currentBottom += data.height
      } else {
        Object.assign(data.element.style, {
          ...data.config.position,
          ...animation,
        })
      }
    })
  }

  public destroy() {
    if (this.scrollTimeout) {
      window.clearTimeout(this.scrollTimeout)
    }
    if (this.resizeTimeout) {
      window.clearTimeout(this.resizeTimeout)
    }

    window.removeEventListener('scroll', this.handleScroll)
    window.removeEventListener('resize', this.handleResize)

    this.elements.forEach(data => {
      if (data.config.onClick) {
        data.element.removeEventListener('click', data.config.onClick)
      }
    })
  }
}
