/**
 * WheelScroll sınıfı, mouse tekerleği ile dikey scroll hareketlerini
 * belirli elementlerde yatay scroll hareketine dönüştürür.
 */
/**
 * WheelScroll sınıfı, mouse tekerleği ile dikey scroll hareketlerini
 * belirli elementlerde yumuşak (smooth) yatay scroll hareketine dönüştürür.
 */
class WheelScroll {
  private scrollElements: HTMLElement[] = []
  private scrollOptions: ScrollOptions = {
    sensitivity: 1.5, // Hassasiyet çarpanı
    smoothness: 0.15, // Yumuşaklık faktörü (0-1 arası, düşük değer daha yumuşak)
    acceleration: 0.95, // İvmelenme faktörü (0-1 arası)
    maxSpeed: 30, // Maksimum piksel hızı
  }

  // Animasyon değişkenleri
  private animationFrames: Map<HTMLElement, number> = new Map()
  private velocities: Map<HTMLElement, number> = new Map()
  private isScrolling: Map<HTMLElement, boolean> = new Map()

  /**
   * WheelScroll sınıfı yapılandırıcısı
   * @param {Partial<ScrollOptions>} options - Opsiyonel: Scroll ayarları
   */
  constructor(options?: Partial<ScrollOptions>) {
    if (options) {
      this.scrollOptions = { ...this.scrollOptions, ...options }
    }

    this.init()
  }

  /**
   * Sınıfı başlatır ve gerekli event listener'ları ekler
   */
  private init(): void {
    // Sayfanın yüklenmesini bekle
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupElements())
    } else {
      this.setupElements()
    }

    // MutationObserver ile DOM değişikliklerini izle
    const observer = new MutationObserver(() => {
      this.updateElements()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  /**
   * İlk eleman kurulumunu yapar
   */
  private setupElements(): void {
    this.scrollElements = Array.from(
      document.querySelectorAll('.wheel-scroll'),
    ) as HTMLElement[]
    this.scrollElements.forEach(element => this.setupElement(element))
  }

  /**
   * Tekil eleman için gereken kurulumu yapar
   */
  private setupElement(element: HTMLElement): void {
    // Passive: false kullanarak daha iyi performans sağlar
    element.addEventListener('wheel', this.handleWheelEvent.bind(this), {
      passive: false,
    })

    // Smooth scrolling için CSS özelliklerini ayarla
    element.style.scrollBehavior = 'auto'

    // Yeni bir element eklendiğinde animasyon durumlarını başlat
    this.velocities.set(element, 0)
    this.isScrolling.set(element, false)

    // Touch desteği ekle
    this.setupTouchSupport(element)
  }

  /**
   * Touch ekranlar için kaydırma desteği ekler
   */
  private setupTouchSupport(element: HTMLElement): void {
    let startX: number
    let currentX: number
    let touchVelocity = 0
    let lastMoveTime = 0

    element.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        startX = e.touches[0].clientX
        currentX = startX
        touchVelocity = 0
        lastMoveTime = Date.now()
      },
      { passive: true },
    )

    element.addEventListener(
      'touchmove',
      (e: TouchEvent) => {
        const previousX = currentX
        currentX = e.touches[0].clientX

        const currentTime = Date.now()
        const timeElapsed = currentTime - lastMoveTime

        // Hız hesabı
        if (timeElapsed > 0) {
          touchVelocity = ((previousX - currentX) / timeElapsed) * 30 // Hız faktörü
        }

        lastMoveTime = currentTime
        element.scrollLeft += previousX - currentX
      },
      { passive: true },
    )

    element.addEventListener(
      'touchend',
      () => {
        // Touchend sonrası momentum scrolling aktivasyonu
        this.velocities.set(element, touchVelocity)
        this.startSmoothScrolling(element)
      },
      { passive: true },
    )
  }

  /**
   * DOM'daki wheel-scroll elementlerini günceller
   */
  private updateElements(): void {
    const currentElements = Array.from(
      document.querySelectorAll('.wheel-scroll'),
    ) as HTMLElement[]

    // Yeni eklenen elementlere event listener ekle
    currentElements.forEach(element => {
      if (!this.scrollElements.includes(element)) {
        this.setupElement(element)
        this.scrollElements.push(element)
      }
    })
  }

  /**
   * Wheel olayını işler ve yatay scrollu gerçekleştirir
   * @param {WheelEvent} event - Wheel olayı
   */
  private handleWheelEvent(event: WheelEvent): void {
    // Varsayılan dikey scroll davranışını engelle
    event.preventDefault()

    const target = event.currentTarget as HTMLElement

    // Hassasiyeti ve yönü hesapla (deltaMode'a göre ayarlama)
    let delta = event.deltaY

    // Farklı tarayıcılar için deltaMode kontrolü
    if (event.deltaMode === 1) {
      // 1 = satır bazlı
      delta *= 40 // Tahmini satır yüksekliği
    } else if (event.deltaMode === 2) {
      // 2 = sayfa bazlı
      delta *= 800 // Tahmini sayfa yüksekliği
    }

    // Hassasiyeti uygula
    delta *= this.scrollOptions.sensitivity

    // Hız hesabı
    const velocity = this.velocities.get(target) || 0
    this.velocities.set(target, velocity + delta * 0.05)

    // Smooth scrolling başlat
    this.startSmoothScrolling(target)
  }

  /**
   * Yumuşak kaydırma animasyonunu başlatır
   */
  private startSmoothScrolling(element: HTMLElement): void {
    // Zaten animasyon çalışıyorsa tekrar başlatma
    if (this.isScrolling.get(element)) return

    this.isScrolling.set(element, true)
    this.animateScroll(element)
  }

  /**
   * Scroll animasyonunu gerçekleştirir
   */
  private animateScroll(element: HTMLElement): void {
    let velocity = this.velocities.get(element) || 0

    // Hız çok küçükse animasyonu durdur
    if (Math.abs(velocity) < 0.1) {
      this.isScrolling.set(element, false)
      this.velocities.set(element, 0)
      return
    }

    // Maksimum hız sınırlaması
    velocity =
      Math.sign(velocity) *
      Math.min(Math.abs(velocity), this.scrollOptions.maxSpeed)

    // Scroll pozisyonunu güncelle
    element.scrollLeft += velocity

    // Yeni hızı hesapla (sönümleme)
    this.velocities.set(element, velocity * this.scrollOptions.acceleration)

    // Bir sonraki animasyon karesini zamanla
    const frame = requestAnimationFrame(() => this.animateScroll(element))
    this.animationFrames.set(element, frame)
  }

  /**
   * Scroll seçeneklerini günceller
   * @param {Partial<ScrollOptions>} options - Güncellenecek seçenekler
   */
  public updateOptions(options: Partial<ScrollOptions>): void {
    this.scrollOptions = { ...this.scrollOptions, ...options }
  }

  /**
   * Belirli bir elementi manuel olarak sınıfa ekler
   * @param {HTMLElement|string} element - Eklenecek element veya seçici
   */
  public addElement(element: HTMLElement | string): void {
    if (typeof element === 'string') {
      const elements = Array.from(
        document.querySelectorAll(element),
      ) as HTMLElement[]
      elements.forEach(el => {
        if (!this.scrollElements.includes(el)) {
          this.setupElement(el)
          this.scrollElements.push(el)
        }
      })
    } else if (
      element instanceof HTMLElement &&
      !this.scrollElements.includes(element)
    ) {
      this.setupElement(element)
      this.scrollElements.push(element)
    }
  }

  /**
   * Tüm event listener'ları kaldırır ve sınıfı temizler
   */
  public destroy(): void {
    this.scrollElements.forEach(element => {
      element.removeEventListener('wheel', this.handleWheelEvent.bind(this))

      // Animasyonları durdur
      const frame = this.animationFrames.get(element)
      if (frame) {
        cancelAnimationFrame(frame)
      }
    })

    this.scrollElements = []
    this.velocities.clear()
    this.isScrolling.clear()
    this.animationFrames.clear()
  }
}

/**
 * Scroll seçenekleri arayüzü
 */
interface ScrollOptions {
  sensitivity: number // Scroll hassasiyeti (1.0 = normal)
  smoothness: number // Yumuşaklık faktörü (0-1 arası, düşük değer daha yumuşak)
  acceleration: number // İvmelenme faktörü (0-1 arası)
  maxSpeed: number // Maksimum piksel hızı
}

export { WheelScroll }
