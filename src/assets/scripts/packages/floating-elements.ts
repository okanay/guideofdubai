interface FixedElement {
  id: string
  order: number
  watchSelector?: string
  position: Partial<CSSStyleDeclaration>
  showAnimation: Partial<CSSStyleDeclaration>
  hideAnimation: Partial<CSSStyleDeclaration>
  onClick?: () => void
  // Medya sorguları için yeni özellikler
  breakpoints?: {
    mobile?: boolean // Mobil görünümde göster/gizle
    tablet?: boolean // Tablet görünümde göster/gizle
    desktop?: boolean // Masaüstü görünümde göster/gizle
    mobileOrder?: number // Mobil görünümde sıralama
    tabletOrder?: number // Tablet görünümde sıralama
    desktopOrder?: number // Masaüstü görünümde sıralama
  }
}

type DeviceType = 'mobile' | 'tablet' | 'desktop'

export class ScrollManager {
  private elements: Map<
    string,
    {
      config: FixedElement
      element: HTMLElement
      height: number
      isVisible: boolean
      isInViewport: boolean // Elemanın DOM'da görünür olup olmadığını kontrol eder
    }
  > = new Map()

  private scrollTimeout: number | null = null
  private resizeTimeout: number | null = null
  private readonly startThreshold = 0.65
  private readonly endThreshold = 0.1

  // Cihaz boyutu için breakpoint değerleri
  private readonly breakpoints = {
    mobile: 0,
    tablet: 768, // Tailwind'in md breakpoint'i
    desktop: 1024, // Tailwind'in lg breakpoint'i
  }

  private currentDevice: DeviceType = 'mobile'

  constructor(elements: FixedElement[]) {
    this.detectDeviceType()
    this.initializeElements(elements)

    window.addEventListener('scroll', this.handleScroll)
    window.addEventListener('resize', this.handleResize)

    // İlk kontrolü yap
    this.updateElementsVisibility()
    this.checkElementsVisibility()
  }

  // Cihaz tipini algıla
  private detectDeviceType(): void {
    const width = window.innerWidth

    if (width >= this.breakpoints.desktop) {
      this.currentDevice = 'desktop'
    } else if (width >= this.breakpoints.tablet) {
      this.currentDevice = 'tablet'
    } else {
      this.currentDevice = 'mobile'
    }
  }

  private initializeElements(elements: FixedElement[]) {
    elements.forEach(config => {
      const element = document.getElementById(config.id)
      if (!element) return

      // Temel pozisyon stillerini uygula
      Object.assign(element.style, {
        ...config.position,
      })

      // Varsayılan breakpoint konfigürasyonunu ayarla
      if (!config.breakpoints) {
        config.breakpoints = {
          mobile: true,
          tablet: true,
          desktop: true,
        }
      }

      this.elements.set(config.id, {
        config,
        element,
        height: element.offsetHeight,
        isVisible: false,
        isInViewport: this.isElementInViewport(element),
      })

      if (config.onClick) {
        element.addEventListener('click', config.onClick)
      }
    })
  }

  // Element'in DOM'da görünür olup olmadığını kontrol et (display: none, visibility: hidden vb. değil)
  private isElementInViewport(element: HTMLElement): boolean {
    // Element'in display computed style'ını kontrol et
    const computedStyle = window.getComputedStyle(element)
    return (
      computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden'
    )
  }

  // Tüm elementlerin DOM'da görünürlüğünü güncelle
  private updateElementsVisibility(): void {
    this.elements.forEach(data => {
      data.isInViewport = this.isElementInViewport(data.element)

      // Geçerli cihaz tipine göre element'in görünür olması gerekip gerekmediğini kontrol et
      if (data.config.breakpoints) {
        const shouldBeVisibleOnDevice =
          data.config.breakpoints[this.currentDevice]

        // Eğer bu cihaz tipinde görünmemesi gerekiyorsa, isInViewport'u false yap
        if (shouldBeVisibleOnDevice === false) {
          data.isInViewport = false
        }
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

  // Yükseklikleri güncelleyen metot
  private updateElementHeights() {
    this.elements.forEach(data => {
      if (!data.isInViewport) return // DOM'da görünür değilse atla

      // Stili geçici olarak değiştir ve yüksekliği ölç
      const originalStyles = {
        display: data.element.style.display,
        visibility: data.element.style.visibility,
        opacity: data.element.style.opacity,
        position: data.element.style.position,
        transform: data.element.style.transform,
      }

      // Elemanı ölçüm için hazırla
      data.element.style.display = 'block'
      data.element.style.visibility = 'visible'
      data.element.style.opacity = '1'
      data.element.style.position = 'fixed'
      data.element.style.transform = 'none'

      // Yüksekliği al
      void data.element.offsetHeight
      data.height = data.element.getBoundingClientRect().height

      // Orijinal stillere geri dön
      data.element.style.display = originalStyles.display
      data.element.style.visibility = originalStyles.visibility
      data.element.style.opacity = originalStyles.opacity
      data.element.style.position = originalStyles.position
      data.element.style.transform = originalStyles.transform
    })
  }

  public handleResize = () => {
    if (this.resizeTimeout) {
      window.clearTimeout(this.resizeTimeout)
    }

    this.resizeTimeout = window.setTimeout(() => {
      // Cihaz tipini yeniden algıla
      const oldDevice = this.currentDevice
      this.detectDeviceType()

      // Eğer cihaz tipi değiştiyse, elementlerin DOM görünürlüğünü güncelle
      if (oldDevice !== this.currentDevice) {
        this.updateElementsVisibility()
      }

      // Yükseklikleri güncelle ve görünürlüğü kontrol et
      this.updateElementHeights()
      this.checkElementsVisibility()
    }, 250)
  }

  private checkElementsVisibility() {
    let hasVisibilityChanged = false

    this.elements.forEach(data => {
      // Eğer element DOM'da görünür değilse, isVisible'ı false yap ve devam et
      if (!data.isInViewport) {
        if (data.isVisible) {
          data.isVisible = false
          hasVisibilityChanged = true
        }
        return
      }

      if (!data.config.watchSelector) {
        // İzlenecek element yoksa her zaman görünür
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

      // Threshold mantığı kontrolü
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

  public updatePositions() {
    // Görünür öğeleri mevcut cihaz tipine göre sırala
    const visibleElements = Array.from(this.elements.entries())
      .filter(([_, data]) => data.isVisible && data.isInViewport)
      .sort((a, b) => {
        // Geçerli cihaz tipine göre order değerini al
        const orderA = this.getOrderForCurrentDevice(a[1].config)
        const orderB = this.getOrderForCurrentDevice(b[1].config)
        return orderA - orderB
      })

    let currentBottom = 0

    // Görünür elemanları işle
    visibleElements.forEach(([_, data]) => {
      Object.assign(data.element.style, {
        ...data.config.position,
        ...data.config.showAnimation,
        bottom: `${currentBottom}px`,
      })
      currentBottom += data.height + 0 // 16px ekstra boşluk
    })

    // Görünmez elemanları işle
    this.elements.forEach(data => {
      if (!data.isVisible || !data.isInViewport) {
        Object.assign(data.element.style, {
          ...data.config.position,
          ...data.config.hideAnimation,
        })
      }
    })
  }

  // Geçerli cihaz tipine göre order değerini al
  private getOrderForCurrentDevice(config: FixedElement): number {
    if (!config.breakpoints) return config.order

    switch (this.currentDevice) {
      case 'mobile':
        return config.breakpoints.mobileOrder !== undefined
          ? config.breakpoints.mobileOrder
          : config.order
      case 'tablet':
        return config.breakpoints.tabletOrder !== undefined
          ? config.breakpoints.tabletOrder
          : config.order
      case 'desktop':
        return config.breakpoints.desktopOrder !== undefined
          ? config.breakpoints.desktopOrder
          : config.order
      default:
        return config.order
    }
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
