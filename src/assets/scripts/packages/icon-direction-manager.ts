interface RTLIconConfig {
  patterns: string[]
  lucideIcons?: string[]
}

export class RTLIconManager {
  private isRTL: boolean = false
  private observer: MutationObserver | null = null
  private config: RTLIconConfig
  private isInitialized: boolean = false

  constructor(config: RTLIconConfig) {
    this.config = config

    // HTML elementini kontrol et
    const htmlElement = document.documentElement
    if (!htmlElement) {
      console.warn('RTLIconManager: document.documentElement not found')
      return
    }

    const direction = htmlElement.getAttribute('dir')
    if (!direction) {
      console.warn('RTLIconManager: dir attribute not found on html element')
      return
    }

    this.isRTL = direction === 'rtl'
    this.isInitialized = true

    this.updateAllIcons()
    this.setupDirectionObserver()
  }

  private setupDirectionObserver(): void {
    const htmlElement = document.documentElement
    if (!htmlElement || !this.isInitialized) return

    this.observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'dir'
        ) {
          const direction = (mutation.target as HTMLElement).getAttribute('dir')
          if (!direction) return

          this.isRTL = direction === 'rtl'
          this.updateAllIcons()
        }
      })
    })

    this.observer.observe(htmlElement, {
      attributes: true,
      attributeFilter: ['dir'],
    })
  }

  private shouldRotateImage(src: string): boolean {
    if (!src) return false
    return this.config.patterns.some(pattern => src.includes(pattern))
  }

  private shouldRotateLucideIcon(iconName: string | null): boolean {
    if (!iconName || !this.config.lucideIcons) return false
    return this.config.lucideIcons.includes(iconName)
  }

  private updateAllIcons(): void {
    if (!this.isInitialized) return

    // Handle regular images
    const images = document.querySelectorAll('img')
    images.forEach(img => {
      const src = img.getAttribute('src')
      if (src && this.shouldRotateImage(src)) {
        img.style.transform = this.isRTL ? 'rotate(180deg)' : ''
      }
    })

    // Handle Lucide icons
    const lucideIcons = document.querySelectorAll('[data-lucide]')
    lucideIcons.forEach(icon => {
      const iconName = icon.getAttribute('data-lucide')
      if (this.shouldRotateLucideIcon(iconName)) {
        ;(icon as HTMLElement).style.transform = this.isRTL
          ? 'rotate(180deg)'
          : ''
      }
    })
  }

  public checkNewIcons(containerElement?: HTMLElement): void {
    if (!containerElement || !this.isInitialized) {
      console.warn('RTLIconManager: Invalid container or not initialized')
      return
    }

    // Check new images
    const images = containerElement.querySelectorAll('img')
    images.forEach(img => {
      const src = img.getAttribute('src')
      if (src && this.shouldRotateImage(src)) {
        img.style.transform = this.isRTL ? 'rotate(180deg)' : ''
      }
    })

    // Check new Lucide icons
    const lucideIcons = containerElement.querySelectorAll('[data-lucide]')
    lucideIcons.forEach(icon => {
      const iconName = icon.getAttribute('data-lucide')
      if (this.shouldRotateLucideIcon(iconName)) {
        ;(icon as HTMLElement).style.transform = this.isRTL
          ? 'rotate(180deg)'
          : ''
      }
    })
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
  }
}
