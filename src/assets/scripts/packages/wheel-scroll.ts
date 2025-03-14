/**
 * WheelScroll - Modern web uygulamaları için optimize edilmiş yatay scroll bileşeni
 *
 * Özellikler:
 * - Native scroll kullanarak yatay kaydırma
 * - Fare tekerleği ile dikey yerine yatay kaydırma
 * - Sağ/sol butonları ile navigasyon
 * - Scroll pozisyonuna göre butonların otomatik aktivasyonu/deaktivasyonu
 * - Smooth scroll animasyonları
 * - Scroll çubuğu gizleme
 * - Performans odaklı yaklaşım
 * - Mobil cihaz desteği
 */

interface WheelScrollOptions {
  /** Scroll hassasiyeti çarpanı (varsayılan: 1.0) */
  sensitivity?: number
  /** Düğme tıklaması ile kaydırma mesafesi (piksel veya "view" - görünüm genişliği) (varsayılan: "view") */
  scrollDistance?: number | 'view'
  /** Düğme ile kaydırma animasyon süresi (ms) (varsayılan: 300) */
  scrollDuration?: number
  /** Mobil cihazlarda aktif etme (varsayılan: true) */
  enableOnMobile?: boolean
  /** Düğme sınıfları (CSS seçicileri) */
  buttonSelectors?: {
    left: string
    right: string
  }
  /** Scroll container sınıfı (CSS seçicisi) */
  scrollSelector?: string
  /** Scroll durumunda otomatik buton güncelleme (varsayılan: true) */
  autoUpdateButtons?: boolean
  /** Debug modu (varsayılan: false) */
  debug?: boolean
}

class WheelScroll {
  private options: Required<WheelScrollOptions>
  private scrollContainers: Set<HTMLElement> = new Set()
  private buttonPairs: Map<
    HTMLElement,
    { left: HTMLElement; right: HTMLElement }
  > = new Map()
  private observers: Map<HTMLElement, IntersectionObserver> = new Map()
  private scrollListeners: Map<HTMLElement, EventListener> = new Map()
  private wheelListeners: Map<HTMLElement, EventListener> = new Map()
  private resizeObserver: ResizeObserver | null = null
  private mutationObserver: MutationObserver | null = null
  private isMobileDevice: boolean

  /**
   * WheelScroll bileşenini oluşturur
   * @param options Seçenekler
   */
  constructor(options: WheelScrollOptions = {}) {
    // Varsayılan seçenekler
    this.options = {
      sensitivity: options.sensitivity ?? 1.0,
      scrollDistance: options.scrollDistance ?? 'view',
      scrollDuration: options.scrollDuration ?? 300,
      enableOnMobile: options.enableOnMobile ?? true,
      buttonSelectors: options.buttonSelectors ?? {
        left: '.wheel-btn-left',
        right: '.wheel-btn-right',
      },
      scrollSelector: options.scrollSelector ?? '.wheel-scroll',
      autoUpdateButtons: options.autoUpdateButtons ?? true,
      debug: options.debug ?? false,
    }

    // Mobil cihaz tespiti
    this.isMobileDevice = this.detectMobileDevice()

    // Mobil cihazda ve mobil desteği kapalıysa, sadece buton kontrolleri aktif olacak
    if (this.isMobileDevice && !this.options.enableOnMobile) {
      this.log(
        'Mobil cihaz tespit edildi ve enableOnMobile kapalı, sadece buton kontrolleri aktif edilecek',
      )
    }

    // DOM hazır olduğunda başlat
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init())
    } else {
      this.init()
    }
  }

  /**
   * Bileşeni başlat
   */
  private init(): void {
    // Scroll containerları bul
    this.findScrollContainers()

    // DOM değişikliklerini izle
    this.observeDOMChanges()

    // Pencere yeniden boyutlandırmalarını izle
    this.observeResizeEvents()

    this.log('WheelScroll başlatıldı', this.scrollContainers)
  }

  /**
   * Scroll containerları bul ve olayları ekle
   */
  private findScrollContainers(): void {
    const containers = document.querySelectorAll<HTMLElement>(
      this.options.scrollSelector,
    )

    containers.forEach(container => {
      // Eğer bu container zaten eklenmediyse
      if (!this.scrollContainers.has(container)) {
        this.scrollContainers.add(container)

        // Scroll bar'ı gizle
        this.hideScrollbar(container)

        // Butonları bul ve eşleştir
        this.findAndBindButtons(container)

        // Wheel olayı ekleyici
        this.addWheelEventListener(container)

        // Scroll olayı ekleyici (butonları güncellemek için)
        if (this.options.autoUpdateButtons) {
          this.addScrollEventListener(container)
        }
      }
    })
  }

  /**
   * Container'a wheel olayı ekle
   */
  private addWheelEventListener(container: HTMLElement): void {
    // Eğer zaten bir wheel olayı dinleyicisi varsa kaldır
    if (this.wheelListeners.has(container)) {
      container.removeEventListener(
        'wheel',
        this.wheelListeners.get(container)!,
      )
    }

    // Yeni wheel olayı dinleyicisi oluştur
    const wheelHandler = (event: WheelEvent) => {
      // Mobil cihazda ve mobil desteği kapalıysa, işlem yapma
      if (this.isMobileDevice && !this.options.enableOnMobile) return

      // Ctrl tuşu basılıyken yakınlaştırma/uzaklaştırma işlemine izin ver
      if (event.ctrlKey) return

      // Varsayılan davranışı engelle
      event.preventDefault()

      // Delta hesapla (tarayıcı farklılıklarını yönet)
      let deltaX = event.deltaX
      let deltaY = event.deltaY

      // DeltaMode kontrolü (satır/sayfa bazlı scroll için)
      const factor =
        event.deltaMode === 1 ? 20 : event.deltaMode === 2 ? 400 : 1

      // Dikey hareketi yataya çevir (dikey scroll > yatay scroll)
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        deltaX = deltaY
      }

      // Hassasiyet ve faktörü uygula
      const scrollAmount = deltaX * factor * this.options.sensitivity

      // Scroll yap
      container.scrollLeft += scrollAmount
    }

    // Wheel olayı ekle ve referansı sakla
    container.addEventListener('wheel', wheelHandler as EventListener, {
      passive: false,
    })
  }

  /**
   * Container'a scroll olayı ekle (butonları güncellemek için)
   */
  private addScrollEventListener(container: HTMLElement): void {
    // Eğer zaten bir scroll olayı dinleyicisi varsa kaldır
    if (this.scrollListeners.has(container)) {
      container.removeEventListener(
        'scroll',
        this.scrollListeners.get(container)!,
      )
    }

    // Yeni scroll olayı dinleyicisi oluştur
    const scrollHandler = () => {
      this.updateButtonStates(container)
    }

    // Scroll olayı ekle ve referansı sakla
    container.addEventListener('scroll', scrollHandler, { passive: true })
    this.scrollListeners.set(container, scrollHandler)

    // Başlangıç durumunu kontrol et
    this.updateButtonStates(container)
  }

  /**
   * DOM değişikliklerini izle
   */
  private observeDOMChanges(): void {
    // Önceki observer'ı temizle
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
    }

    // Yeni MutationObserver oluştur
    this.mutationObserver = new MutationObserver(mutations => {
      let shouldUpdate = false

      // DOM değişikliklerini kontrol et
      mutations.forEach(mutation => {
        if (
          mutation.type === 'childList' ||
          (mutation.type === 'attributes' && mutation.attributeName === 'class')
        ) {
          shouldUpdate = true
        }
      })

      // Güncelleme gerekiyorsa
      if (shouldUpdate) {
        this.findScrollContainers()
      }
    })

    // DOM ağacını izle
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  /**
   * Boyut değişikliklerini izle
   */
  private observeResizeEvents(): void {
    // Önceki observer'ı temizle
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }

    // Yeni ResizeObserver oluştur
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const container = entry.target as HTMLElement

        // Scroll container'ı mı kontrol et
        if (this.scrollContainers.has(container)) {
          // Buton durumlarını güncelle
          if (this.options.autoUpdateButtons) {
            this.updateButtonStates(container)
          }
        }
      }
    })

    // Tüm scroll containerları izle
    this.scrollContainers.forEach(container => {
      this.resizeObserver?.observe(container)
    })
  }

  /**
   * Container için butonları bul ve bağla
   */
  private findAndBindButtons(container: HTMLElement): void {
    // Container'ın üst öğesini (ana container) bul
    const parentSection = this.findParentByTagName(container, 'section')
    if (!parentSection) {
      this.log('Butonlar için üst section bulunamadı', container)
      return
    }

    // Butonları bul
    const leftButton = parentSection.querySelector<HTMLElement>(
      this.options.buttonSelectors.left,
    )
    const rightButton = parentSection.querySelector<HTMLElement>(
      this.options.buttonSelectors.right,
    )

    // Her iki buton da mevcutsa
    if (leftButton && rightButton) {
      // Buton çiftini kaydet
      this.buttonPairs.set(container, { left: leftButton, right: rightButton })

      // Butonlara tıklama olayları ekle
      leftButton.addEventListener('click', () =>
        this.scrollContainerTo(container, 'left'),
      )
      rightButton.addEventListener('click', () =>
        this.scrollContainerTo(container, 'right'),
      )

      // Başlangıç buton durumlarını ayarla
      this.updateButtonStates(container)

      this.log('Butonlar bağlandı', { container, leftButton, rightButton })
    } else {
      this.log('Bazı butonlar bulunamadı', {
        container,
        leftButton,
        rightButton,
      })
    }
  }

  /**
   * Belirli yönde smooth scroll yap
   */
  private scrollContainerTo(
    container: HTMLElement,
    direction: 'left' | 'right',
  ): void {
    // Scroll mesafesini hesapla
    let scrollDistance: number

    if (this.options.scrollDistance === 'view') {
      // Container genişliğini kullan
      scrollDistance = container.clientWidth * 0.8 // %80 ekran genişliği
    } else {
      // Belirtilen piksel değerini kullan
      scrollDistance = this.options.scrollDistance
    }

    // Yöne göre işaret belirle
    const sign = direction === 'left' ? -1 : 1

    // Hedef scroll pozisyonunu hesapla
    const targetPosition = container.scrollLeft + sign * scrollDistance

    // Smooth scroll yap
    this.smoothScrollTo(container, targetPosition)
  }

  /**
   * Smooth scroll animasyonu
   */
  private smoothScrollTo(element: HTMLElement, targetPosition: number): void {
    const startPosition = element.scrollLeft
    const distance = targetPosition - startPosition
    const duration = this.options.scrollDuration
    const startTime = performance.now()

    // Scroll animasyonu
    const animateScroll = (currentTime: number) => {
      const elapsedTime = currentTime - startTime

      if (elapsedTime < duration) {
        // Easing fonksiyonu (ease-out)
        const progress = this.easeOutCubic(elapsedTime / duration)
        element.scrollLeft = startPosition + distance * progress
        requestAnimationFrame(animateScroll)
      } else {
        // Animasyon tamamlandı, kesin pozisyona git
        element.scrollLeft = targetPosition

        // Buton durumlarını güncelle
        if (this.options.autoUpdateButtons) {
          this.updateButtonStates(element)
        }
      }
    }

    requestAnimationFrame(animateScroll)
  }

  /**
   * Ease-out cubic easing fonksiyonu (smooth scroll için)
   */
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
  }

  /**
   * Buton durumlarını güncelle (scroll pozisyonuna göre)
   */
  private updateButtonStates(container: HTMLElement): void {
    const buttonPair = this.buttonPairs.get(container)
    if (!buttonPair) return

    const { left: leftButton, right: rightButton } = buttonPair

    // Scroll durumunu hesapla
    const isAtStart = container.scrollLeft <= 1
    const isAtEnd =
      Math.abs(
        container.scrollWidth - container.clientWidth - container.scrollLeft,
      ) <= 1

    // Buton durumlarını ayarla
    this.setButtonState(leftButton, !isAtStart)
    this.setButtonState(rightButton, !isAtEnd)
  }

  /**
   * Buton durumunu ayarla (aktif/deaktif)
   */
  private setButtonState(button: HTMLElement, enabled: boolean): void {
    if (enabled) {
      button.removeAttribute('disabled')
    } else {
      button.setAttribute('disabled', '')
    }
  }

  /**
   * Scroll çubuğunu gizle
   */
  private hideScrollbar(container: HTMLElement): void {
    container.style.scrollbarWidth = 'none' // Firefox

    // WebKit tarayıcılar için CSS
    const style = document.createElement('style')
    style.textContent = `
      ${this.options.scrollSelector}::-webkit-scrollbar {
        display: none;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * Belirli bir tag ile ebeveyn elementi bul
   */
  private findParentByTagName(
    element: HTMLElement,
    tagName: string,
  ): HTMLElement | null {
    let parent = element.parentElement

    while (parent) {
      if (parent.tagName.toLowerCase() === tagName.toLowerCase()) {
        return parent
      }
      parent = parent.parentElement
    }

    return null
  }

  /**
   * Cihazın mobil olup olmadığını tespit et
   */
  private detectMobileDevice(): boolean {
    // UserAgent kontrolü
    const userAgent =
      navigator.userAgent || navigator.vendor || (window as any).opera

    // Mobil işletim sistemi kontrolü
    if (
      /android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    ) {
      return true
    }

    // iOS ve iPad OS tespiti için ekstra kontroller
    if (
      (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) ||
      (/Mac/.test(userAgent) &&
        navigator.maxTouchPoints &&
        navigator.maxTouchPoints > 2)
    ) {
      return true
    }

    // Dokunmatik özellikler ve ekran boyutu kontrolü
    const hasTouchScreen =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0

    // Ekran boyutu küçükse ve dokunmatik ekran varsa muhtemelen mobil
    const isSmallScreen = window.innerWidth < 768

    return hasTouchScreen && isSmallScreen
  }

  /**
   * Belirtilen container'ı manuel olarak ekle
   */
  public addContainer(container: HTMLElement | string): void {
    if (typeof container === 'string') {
      document.querySelectorAll<HTMLElement>(container).forEach(element => {
        if (!this.scrollContainers.has(element)) {
          this.scrollContainers.add(element)
          this.hideScrollbar(element)
          this.findAndBindButtons(element)
          this.addWheelEventListener(element)

          if (this.options.autoUpdateButtons) {
            this.addScrollEventListener(element)
          }

          // ResizeObserver'a ekle
          this.resizeObserver?.observe(element)
        }
      })
    } else if (container instanceof HTMLElement) {
      if (!this.scrollContainers.has(container)) {
        this.scrollContainers.add(container)
        this.hideScrollbar(container)
        this.findAndBindButtons(container)
        this.addWheelEventListener(container)

        if (this.options.autoUpdateButtons) {
          this.addScrollEventListener(container)
        }

        // ResizeObserver'a ekle
        this.resizeObserver?.observe(container)
      }
    }
  }

  /**
   * Seçenekleri güncelle
   */
  public updateOptions(newOptions: Partial<WheelScrollOptions>): void {
    // Seçenekleri birleştir
    this.options = { ...this.options, ...newOptions }

    // Tüm event listener'ları yeniden ekle (yeni seçeneklerle)
    this.scrollContainers.forEach(container => {
      this.addWheelEventListener(container)

      if (this.options.autoUpdateButtons) {
        this.addScrollEventListener(container)
      }

      this.updateButtonStates(container)
    })
  }

  /**
   * Belirli bir container'ı baştan başlat
   */
  public refreshContainer(container: HTMLElement): void {
    if (this.scrollContainers.has(container)) {
      // Event listener'ları yeniden ekle
      this.addWheelEventListener(container)

      if (this.options.autoUpdateButtons) {
        this.addScrollEventListener(container)
      }

      // Buton durumlarını güncelle
      this.updateButtonStates(container)
    }
  }

  /**
   * Tüm bileşeni baştan başlat
   */
  public refresh(): void {
    // Tüm event listener'ları kaldır
    this.destroy()

    // Yeniden başlat
    this.init()
  }

  /**
   * Bileşeni yok et ve tüm event listener'ları temizle
   */
  public destroy(): void {
    // Wheel olayı dinleyicilerini kaldır
    this.wheelListeners.forEach((listener, container) => {
      container.removeEventListener('wheel', listener)
    })

    // Scroll olayı dinleyicilerini kaldır
    this.scrollListeners.forEach((listener, container) => {
      container.removeEventListener('scroll', listener)
    })

    // ResizeObserver temizle
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    // MutationObserver temizle
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
      this.mutationObserver = null
    }

    // Buton event listener'ları kaldır
    this.buttonPairs.forEach(({ left, right }, container) => {
      const newLeft = left.cloneNode(true) as HTMLElement
      const newRight = right.cloneNode(true) as HTMLElement

      left.parentNode?.replaceChild(newLeft, left)
      right.parentNode?.replaceChild(newRight, right)
    })

    // Tüm koleksiyonları temizle
    this.scrollContainers.clear()
    this.buttonPairs.clear()
    this.wheelListeners.clear()
    this.scrollListeners.clear()
    this.observers.clear()
  }

  /**
   * Debug modunda log çıktısı
   */
  private log(...args: any[]): void {
    if (this.options.debug) {
      console.log('[WheelScroll]', ...args)
    }
  }
}

export { WheelScroll }
