interface CarouselOptions {
  snapAlign?: 'start' | 'center' | 'end'
  itemSpacing?: number
  screenSizes?: { width: number; jumpVal: number }[]
  btnsDisableThreshold?: number
}

export class Carousel {
  private carouselList: HTMLElement
  private items: HTMLElement[]
  private options: Required<CarouselOptions>
  private state: {
    currentIndex: number
    isScrolling: boolean
  }
  private prevButton: HTMLButtonElement
  private nextButton: HTMLButtonElement
  private resizeTimeout: number | null = null
  private isHorizontalSwipe: boolean = false
  private isRTL: boolean

  constructor(
    listId: string,
    prevButtonId: string,
    nextButtonId: string,
    options: CarouselOptions = {},
  ) {
    // Element selections
    const list = document.getElementById(listId) as HTMLElement
    const prevBtn = document.getElementById(prevButtonId) as HTMLButtonElement
    const nextBtn = document.getElementById(nextButtonId) as HTMLButtonElement

    if (!list || !prevBtn || !nextBtn) {
      throw new Error(`Carousel setup failed for ${listId}. Missing elements.`)
    }

    this.carouselList = list
    this.prevButton = prevBtn
    this.nextButton = nextBtn

    // Daha güvenli versiyon
    const htmlDir = document.documentElement.dir
    this.isRTL = htmlDir === 'rtl'

    if (this.isRTL && this.carouselList) {
      this.carouselList.style.direction = 'rtl'

      // Initial scroll'u requestAnimationFrame ile geciktir
      requestAnimationFrame(() => {
        const maxScroll =
          this.carouselList.scrollWidth - this.carouselList.clientWidth
        if (maxScroll > 0) {
          // Smooth scroll behavior'u geçici olarak devre dışı bırak
          this.carouselList.style.scrollBehavior = 'auto'
          this.carouselList.scrollLeft = -maxScroll

          // Smooth scroll'u geri aç
          requestAnimationFrame(() => {
            this.carouselList.style.scrollBehavior = 'smooth'
          })
        }
      })
    }

    // Initialize options with defaults
    this.options = {
      snapAlign: options.snapAlign ?? 'center',
      itemSpacing: options.itemSpacing ?? 16,
      btnsDisableThreshold: options.btnsDisableThreshold ?? 32,
      screenSizes: options.screenSizes ?? [
        { width: 1024, jumpVal: 3 },
        { width: 768, jumpVal: 2 },
        { width: 512, jumpVal: 1 },
      ],
    }

    // Initialize state
    this.state = {
      currentIndex: 0,
      isScrolling: false,
    }

    // Get carousel items
    this.items = Array.from(this.carouselList.children) as HTMLElement[]

    // Sadece yatay kaydırmayı engelle, dikey scroll'a izin ver
    this.carouselList.style.touchAction = 'pan-y'
    this.carouselList.style.userSelect = 'none'
    this.carouselList.style.scrollBehavior = 'smooth'

    // Setup event listeners
    this.setupNavigationButtons()
    this.setupMomentumScroll()
    this.setupTouchInteraction()
    this.setupResizeHandler()

    // Initial button state update
    this.updateButtonStates()

    // Add scroll event listener for button states
    this.carouselList.addEventListener('scroll', () => {
      this.updateButtonStates()
    })
  }

  private setupResizeHandler(): void {
    window.addEventListener('resize', () => {
      if (this.resizeTimeout) {
        window.clearTimeout(this.resizeTimeout)
      }

      this.resizeTimeout = window.setTimeout(() => {
        this.updateButtonStates()

        const metrics = this.calculateMetrics()
        const maxScroll = this.getMaxScroll(metrics)
        const currentScroll = Math.abs(this.carouselList.scrollLeft)

        if (currentScroll > maxScroll) {
          const scrollPosition = this.isRTL ? -maxScroll : maxScroll
          this.carouselList.scrollTo({
            left: scrollPosition,
            behavior: 'smooth',
          })
        }

        this.resizeTimeout = null
      }, 50)
    })
  }

  private getMaxScroll(
    metrics: ReturnType<typeof this.calculateMetrics>,
  ): number {
    return metrics.totalWidth - metrics.containerWidth
  }

  private getNormalizedScrollLeft(): number {
    const rawScrollLeft = this.carouselList.scrollLeft
    return this.isRTL
      ? Math.abs(Math.min(0, rawScrollLeft)) // RTL için pozitif değere çevir
      : rawScrollLeft // LTR için olduğu gibi bırak
  }

  private updateButtonStates(): void {
    const metrics = this.calculateMetrics()
    const maxScroll = this.getMaxScroll(metrics)
    const currentScroll = this.getNormalizedScrollLeft()
    const threshold = this.options.btnsDisableThreshold

    // RTL ve LTR için aynı mantık kullanılabilir çünkü getNormalizedScrollLeft
    // RTL için değerleri normalize ediyor
    this.prevButton.disabled = currentScroll <= threshold
    this.nextButton.disabled = maxScroll - currentScroll <= threshold
  }

  private calculatePreciseScroll(targetIndex: number): number {
    const metrics = this.calculateMetrics()
    let scrollPosition = 0

    for (let i = 0; i < targetIndex; i++) {
      scrollPosition +=
        this.items[i].getBoundingClientRect().width + this.options.itemSpacing
    }

    switch (this.options.snapAlign) {
      case 'center':
        scrollPosition -=
          metrics.containerWidth / 2 - metrics.itemWidths[targetIndex] / 2
        break
      case 'end':
        scrollPosition -=
          metrics.containerWidth - metrics.itemWidths[targetIndex]
        break
    }

    return this.isRTL ? -scrollPosition : scrollPosition
  }

  private scrollToPrecise(index: number): void {
    if (this.state.isScrolling || index < 0 || index >= this.items.length)
      return

    this.state.isScrolling = true
    this.state.currentIndex = index

    const scrollPosition = this.calculatePreciseScroll(index)

    this.carouselList.scrollTo({
      left: scrollPosition,
      behavior: 'smooth',
    })

    setTimeout(() => {
      this.state.isScrolling = false
      this.updateButtonStates()
    }, 300)
  }

  private setupTouchInteraction(): void {
    let startX = 0
    let startY = 0
    let isDragging = false

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      isDragging = true
      this.isHorizontalSwipe = false
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return

      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      const deltaX = startX - currentX
      const deltaY = startY - currentY

      if (!this.isHorizontalSwipe) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          this.isHorizontalSwipe = true
        }
      }

      if (this.isHorizontalSwipe) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return

      const endX = e.changedTouches[0].clientX
      const diffX = startX - endX
      const adjustedDiffX = this.isRTL ? -diffX : diffX

      if (this.isHorizontalSwipe) {
        const metrics = this.calculateMetrics()
        const swipeThreshold = metrics.averageItemWidth / 4

        if (Math.abs(adjustedDiffX) > swipeThreshold) {
          const direction = adjustedDiffX > 0 ? 1 : -1
          const newIndex =
            this.state.currentIndex + direction * this.getItemsPerPage()
          const clampedIndex = Math.max(
            0,
            Math.min(newIndex, this.items.length - 1),
          )
          this.scrollToPrecise(clampedIndex)
        }
      }

      isDragging = false
    }

    this.carouselList.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    })
    this.carouselList.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    })
    this.carouselList.addEventListener('touchend', handleTouchEnd, {
      passive: true,
    })
  }

  private setupNavigationButtons(): void {
    this.prevButton.addEventListener('click', () => {
      if (!this.prevButton.disabled) {
        const newIndex = Math.max(
          this.state.currentIndex - this.getItemsPerPage(),
          0,
        )
        this.scrollToPrecise(newIndex)
      }
    })

    this.nextButton.addEventListener('click', () => {
      if (!this.nextButton.disabled) {
        const newIndex = Math.min(
          this.state.currentIndex + this.getItemsPerPage(),
          this.items.length - 1,
        )
        this.scrollToPrecise(newIndex)
      }
    })
  }

  private setupMomentumScroll(): void {
    let startX = 0
    let startTime = 0
    let velocityX = 0

    this.carouselList.addEventListener(
      'touchstart',
      e => {
        startX = e.touches[0].clientX
        startTime = Date.now()
        velocityX = 0
      },
      { passive: true },
    )

    this.carouselList.addEventListener(
      'touchmove',
      e => {
        if (!this.isHorizontalSwipe) return

        const currentX = e.touches[0].clientX
        const currentTime = Date.now()
        const timeDiff = currentTime - startTime

        if (timeDiff > 0) {
          velocityX = (currentX - startX) / timeDiff
          velocityX = this.isRTL ? -velocityX : velocityX
        }

        startX = currentX
        startTime = currentTime
      },
      { passive: true },
    )

    this.carouselList.addEventListener(
      'touchend',
      () => {
        if (!this.isHorizontalSwipe) return

        if (Math.abs(velocityX) > 0.1) {
          const momentumDistance = velocityX * 100
          this.carouselList.scrollBy({
            left: this.isRTL ? -momentumDistance : momentumDistance,
            behavior: 'smooth',
          })
        }
      },
      { passive: true },
    )
  }

  private calculateMetrics() {
    const containerWidth = this.carouselList.clientWidth
    const itemWidths = this.items.map(
      item => item.getBoundingClientRect().width,
    )
    const averageItemWidth =
      itemWidths.reduce((a, b) => a + b, 0) / itemWidths.length
    const totalWidth = this.items.reduce((total, item, index) => {
      const width = item.getBoundingClientRect().width
      const spacing =
        index === this.items.length - 1 ? 0 : this.options.itemSpacing
      return total + width + spacing
    }, 0)

    return {
      containerWidth,
      itemWidths,
      averageItemWidth,
      totalWidth,
    }
  }

  private getItemsPerPage(): number {
    const width = window.innerWidth
    const sortedSizes = [...this.options.screenSizes].sort(
      (a, b) => b.width - a.width,
    )

    for (const size of sortedSizes) {
      if (width >= size.width) {
        return size.jumpVal
      }
    }

    return sortedSizes[sortedSizes.length - 1].jumpVal
  }

  public scrollTo(index: number): void {
    this.scrollToPrecise(index)
  }

  public destroy(): void {
    window.removeEventListener('resize', this.setupResizeHandler)
    if (this.resizeTimeout) {
      window.clearTimeout(this.resizeTimeout)
    }
  }

  public getCurrentState() {
    return {
      currentIndex: this.state.currentIndex,
      totalItems: this.items.length,
      isRTL: this.isRTL,
      ...this.calculateMetrics(),
    }
  }
}
