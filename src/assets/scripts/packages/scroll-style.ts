interface NavConfig {
  navId: string
  contentId: string
  mobileOnly?: boolean
  mobileBreakpoint?: number
  animationDuration?: number
  throttleDelay?: number
  threshold?: number
  fixedStyles: Partial<CSSStyleDeclaration>
}

class NavStickyManager {
  private observers: MutationObserver[] = []
  private originalNav: HTMLElement | null = null
  private clonedNav: HTMLElement | null = null
  private content: HTMLElement | null = null
  private isVisible: boolean = false
  private lastScrollY: number = 0
  private navInitialTop: number = 0
  private contentTop: number = 0
  private contentBottom: number = 0
  private resizeObserver: ResizeObserver | null = null

  constructor(private config: NavConfig) {
    this.config = {
      ...config,
      mobileOnly: config.mobileOnly ?? true,
      mobileBreakpoint: config.mobileBreakpoint ?? 1080,
      animationDuration: config.animationDuration ?? 500,
      throttleDelay: config.throttleDelay ?? 100,
      threshold: config.threshold ?? 50,
    }

    this.init()
  }

  private init(): void {
    this.originalNav = document.querySelector(this.config.navId)
    this.content = document.querySelector(this.config.contentId)

    if (!this.originalNav || !this.content) {
      console.error('Required elements not found')
      return
    }

    this.createClone()
    this.setupInitialState()
    this.setupEventListeners()
    this.checkPosition()
  }

  private syncEventListeners(source: HTMLElement, target: HTMLElement): void {
    const sourceButtons = source.querySelectorAll('button, a')
    const targetButtons = target.querySelectorAll('button, a')

    // MutationObserver ile data-state değişimlerini izle
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-state'
        ) {
          const sourceButton = mutation.target as HTMLElement
          const sourceIndex = Array.from(sourceButtons).indexOf(sourceButton)
          const targetButton = targetButtons[sourceIndex]

          if (targetButton) {
            const state = sourceButton.getAttribute('data-state')
            targetButton.setAttribute('data-state', state || '')
          }
        }
      })
    })

    // Her bir butonu gözlemle ve click event'lerini ekle
    sourceButtons.forEach((btn, index) => {
      const targetBtn = targetButtons[index]
      if (!targetBtn) return

      // Her bir kaynak butonu gözlemle
      observer.observe(btn, {
        attributes: true,
        attributeFilter: ['data-state'],
      })

      const cloneClick = (e: Event) => {
        e.preventDefault()
        ;(btn as HTMLElement).click()
      }

      targetBtn.addEventListener('click', cloneClick)
    })

    // Cleanup için observer'ı sakla
    if (!this.observers) this.observers = []
    this.observers.push(observer)
  }

  private setupInitialState(): void {
    this.saveInitialPositions()
  }

  private setupEventListeners(): void {
    let scrollTimeout: number | undefined

    window.addEventListener(
      'scroll',
      () => {
        if (scrollTimeout !== undefined) {
          window.cancelAnimationFrame(scrollTimeout)
        }
        scrollTimeout = window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY
          if (Math.abs(currentScrollY - this.lastScrollY) < 50) {
            this.checkPosition()
          }
          this.lastScrollY = currentScrollY
        })
      },
      { passive: true },
    )

    this.resizeObserver = new ResizeObserver(
      this.throttle(() => {
        this.recalculate()
      }, 250),
    )

    if (this.content) {
      this.resizeObserver.observe(this.content)
    }

    window.addEventListener('load', () => this.recalculate())
  }

  private throttle(func: Function, limit: number): () => void {
    let inThrottle: boolean
    return () => {
      if (!inThrottle) {
        func()
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }

  private saveInitialPositions(): void {
    if (!this.originalNav || !this.content) return

    const navRect = this.originalNav.getBoundingClientRect()
    const contentRect = this.content.getBoundingClientRect()

    this.navInitialTop = navRect.top + window.scrollY
    this.contentTop = contentRect.top + window.scrollY
    this.contentBottom = contentRect.bottom + window.scrollY
  }

  private shouldActivate(): boolean {
    if (
      this.config.mobileOnly &&
      window.innerWidth > this.config.mobileBreakpoint!
    ) {
      return false
    }

    const scrollY = window.scrollY
    const viewportHeight = window.innerHeight
    const navHeight = this.originalNav?.offsetHeight || 0

    const passedThreshold =
      scrollY > this.navInitialTop + this.config.threshold!
    const isContentVisible =
      this.contentTop <= scrollY + viewportHeight &&
      scrollY <= this.contentBottom
    const isWithinContainer = scrollY + navHeight <= this.contentBottom

    return passedThreshold && isContentVisible && isWithinContainer
  }

  private checkPosition(): void {
    if (!this.clonedNav) return

    const shouldBeVisible = this.shouldActivate()

    if (shouldBeVisible && !this.isVisible) {
      this.showClone()
    } else if (!shouldBeVisible && this.isVisible) {
      this.hideClone()
    }
  }

  private createClone(): void {
    if (!this.originalNav) return

    // Derin klon oluştur
    this.clonedNav = this.originalNav.cloneNode(true) as HTMLElement

    // Ana nav'ın clone ID'sini ayarla
    this.clonedNav.id = `${this.originalNav.id}-clone`
    // this.clonedNav.setAttribute('aria-hidden', 'true')

    // Tüm alt elementlerdeki ID'leri güncelle
    const elementsWithId = this.clonedNav.querySelectorAll('[id]')
    elementsWithId.forEach(element => {
      const originalId = element.id
      element.id = `${originalId}-clone`
    })

    // Fixed stilleri uygula
    Object.assign(this.clonedNav.style, {
      ...this.config.fixedStyles,
      position: 'fixed',
      visibility: 'hidden',
      opacity: '0',
      top: '0',
      left: '0',
      width: '100%',
      transform: 'translateY(-100%)',
      transition: `
          transform ${this.config.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1),
          opacity ${this.config.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)
        `,
      willChange: 'transform, opacity',
    })

    // Event listener'ları klona da ekle
    this.syncEventListeners(this.originalNav, this.clonedNav)

    // Klonu orijinal nav'ın hemen altına ekle
    this.originalNav.parentNode?.insertBefore(
      this.clonedNav,
      this.originalNav.nextSibling,
    )
  }

  private showClone(): void {
    if (!this.clonedNav) return

    requestAnimationFrame(() => {
      if (!this.clonedNav) return

      this.clonedNav.style.visibility = 'visible'
      this.clonedNav.style.opacity = '1'
      this.clonedNav.style.transform = 'translateY(0)' // Aşağı in

      this.isVisible = true
    })
  }

  private hideClone(): void {
    if (!this.clonedNav) return

    requestAnimationFrame(() => {
      if (!this.clonedNav) return

      this.clonedNav.style.opacity = '0'
      this.clonedNav.style.transform = 'translateY(-100%)' // Yukarı çık

      // Opacity animasyonu bitince visibility'yi gizle
      setTimeout(() => {
        if (!this.clonedNav) return
        this.clonedNav.style.visibility = 'hidden'
      }, this.config.animationDuration)

      this.isVisible = false
    })
  }

  public recalculate(): void {
    this.saveInitialPositions()
    this.checkPosition()

    // Klon varsa boyutları güncelle
    if (this.clonedNav && this.originalNav) {
      const rect = this.originalNav.getBoundingClientRect()
      Object.assign(this.clonedNav.style, {
        width: `100vw`,
        height: `${rect.height}px`,
      })
    }
  }

  public destroy(): void {
    this.resizeObserver?.disconnect()
    this.observers?.forEach(observer => observer.disconnect())
    this.clonedNav?.remove()
    this.clonedNav = null
  }
}

export { NavStickyManager, type NavConfig }
