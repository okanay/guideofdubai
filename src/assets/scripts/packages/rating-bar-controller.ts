interface RatingAnimatorConfig {
  containerSelector: string
  barSelector: string
  totalAttribute?: string
  rateAttribute?: string
  animationDuration?: number
}

class RatingAnimator {
  private config: Required<RatingAnimatorConfig>
  private container: HTMLElement | null = null
  private bars: HTMLElement[] = []
  private totalValue: number = 0
  private hasAnimated: boolean = false
  private isInitialized: boolean = false

  constructor(config: RatingAnimatorConfig) {
    this.config = {
      containerSelector: config.containerSelector,
      barSelector: config.barSelector,
      totalAttribute: config.totalAttribute || 'data-total-comments',
      rateAttribute: config.rateAttribute || 'data-rate',
      animationDuration: config.animationDuration || 500,
    }

    // DOM yüklendikten sonra initialize et
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init())
    } else {
      this.init()
    }
  }

  private init(): void {
    if (this.isInitialized) return

    const container = document.querySelector(this.config.containerSelector)
    if (!container || !(container instanceof HTMLElement)) {
      console.warn(`Container not found: ${this.config.containerSelector}`)
      return
    }

    this.container = container
    this.totalValue = Number(
      container.getAttribute(this.config.totalAttribute) || 0,
    )
    this.bars = Array.from(
      container.querySelectorAll(this.config.barSelector),
    ).filter((el): el is HTMLElement => el instanceof HTMLElement)

    // Set initial state with opacity 0
    this.bars.forEach(bar => {
      bar.style.opacity = '0'
      bar.style.width = '0%'
      bar.style.transition = `width ${this.config.animationDuration}ms ease-out, opacity ${this.config.animationDuration / 2}ms ease-out`
    })

    this.isInitialized = true
  }

  private resetBars(): void {
    if (!this.bars.length) return
    this.bars.forEach(bar => {
      bar.style.width = '0%'
      bar.style.opacity = '0'
    })
  }

  private updateBars(): void {
    if (!this.container || !this.bars.length || this.totalValue === 0) return

    // Önce opacity'yi ayarla
    this.bars.forEach(bar => {
      bar.style.opacity = '1'
    })

    // Küçük bir gecikmeyle width animasyonunu başlat
    setTimeout(() => {
      this.bars.forEach(bar => {
        const rate = Number(bar.getAttribute(this.config.rateAttribute) || 0)
        const percentage = (rate / this.totalValue) * 100
        bar.style.width = `${percentage}%`
      })
    }, 50)
  }

  public animate(): void {
    if (this.hasAnimated) return
    if (!this.isInitialized) {
      this.init()
    }

    requestAnimationFrame(() => {
      this.updateBars()
      this.hasAnimated = true
    })
  }

  public reset(): void {
    this.hasAnimated = false
    this.resetBars()
  }

  public destroy(): void {
    this.reset()
    this.container = null
    this.bars = []
    this.isInitialized = false
  }
}

export { RatingAnimator }
