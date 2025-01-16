type DeviceType = 'desktop' | 'mobile'

interface ViewConfig {
  desktopViewId: string
  mobileViewId: string
}

class DeviceViewManager {
  private desktopElement: HTMLElement | null
  private mobileElement: HTMLElement | null

  constructor(config: ViewConfig) {
    this.desktopElement = document.getElementById(config.desktopViewId)
    this.mobileElement = document.getElementById(config.mobileViewId)
  }

  private detectDevice(): DeviceType {
    const userAgent = navigator.userAgent.toLowerCase()

    // Mobil cihaz ve tablet kontrolü
    const mobileKeywords = [
      'android',
      'iphone',
      'ipad',
      'ipod',
      'webos',
      'windows phone',
      'blackberry',
      'nokia',
      'opera mini',
      'mobile safari',
      'instagram',
      'facebook',
    ]

    // Özel tarayıcı kontrolü
    const isMobileApp =
      'standalone' in window.navigator ||
      'mozApp' in window.navigator ||
      window.matchMedia('(display-mode: standalone)').matches

    // Platform kontrolü
    const isMobilePlatform = /android|ios|iphone|ipad|ipod/i.test(
      navigator.platform,
    )

    // Touch desteği kontrolü
    const hasTouchScreen =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - some browsers might not have msMaxTouchPoints
      navigator.msMaxTouchPoints > 0

    const isMobileDevice =
      mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
      isMobileApp ||
      isMobilePlatform ||
      hasTouchScreen

    return isMobileDevice ? 'mobile' : 'desktop'
  }

  public initializeView(): void {
    const deviceType = this.detectDevice()

    if (deviceType === 'mobile') {
      console.log('Mobile view rendered')
      this.desktopElement?.remove()
      this.mobileElement?.classList.remove('hidden')
    } else {
      console.log('Desktop view rendered')
      this.mobileElement?.remove()
      this.desktopElement?.classList.remove('hidden')
    }
  }
}

// Kullanımı
document.addEventListener('DOMContentLoaded', () => {
  const viewManager = new DeviceViewManager({
    desktopViewId: 'desktop-view',
    mobileViewId: 'mobile-view',
  })

  viewManager.initializeView()
})
