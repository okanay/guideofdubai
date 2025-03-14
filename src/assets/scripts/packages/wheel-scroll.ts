/**
 * WheelScroll - Modern web uygulamaları için optimize edilmiş yatay scroll bileşeni
 */

interface WheelScrollOptions {
  /** Scroll hassasiyeti çarpanı (varsayılan: 1.0) */
  sensitivity?: number
  /** Düğme tıklaması ile kaydırma mesafesi (piksel veya "view" - görünüm genişliği) (varsayılan: "view") */
  scrollDistance?: number | 'view'
  /** Düğme ile kaydırma animasyon süresi (ms) (varsayılan: 300) */
  scrollDuration?: number
  /** Scroll container sınıfı (CSS seçicisi) */
  containerSelector?: string
  /** Düğme sınıfları (CSS seçicileri) */
  buttonSelectors?: {
    left: string
    right: string
  }
  /** Debug modu (varsayılan: false) */
  debug?: boolean
}

class WheelScroll {
  private options: Required<WheelScrollOptions>
  private containers: Map<
    HTMLElement,
    {
      leftButton: HTMLElement | null
      rightButton: HTMLElement | null
    }
  > = new Map()
  private wheelHandlers: Map<HTMLElement, EventListener> = new Map()
  private scrollHandlers: Map<HTMLElement, EventListener> = new Map()
  private resizeObserver: ResizeObserver | null = null
  private mutationObserver: MutationObserver | null = null
  private isMobile: boolean

  /**
   * WheelScroll sınıfı yapıcı metodu
   * @param options WheelScroll seçenekleri
   */
  constructor(options: WheelScrollOptions = {}) {
    // Varsayılan seçenekler
    this.options = {
      sensitivity: options.sensitivity ?? 1.0,
      scrollDistance: options.scrollDistance ?? 'view',
      scrollDuration: options.scrollDuration ?? 300,
      containerSelector: options.containerSelector ?? '.wheel-container',
      buttonSelectors: options.buttonSelectors ?? {
        left: '.wheel-btn-left',
        right: '.wheel-btn-right',
      },
      debug: options.debug ?? false,
    }

    // Mobil cihaz tespiti
    this.isMobile = this.detectMobileDevice()
    this.log('Mobil cihaz:', this.isMobile)

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
    this.log('WheelScroll başlatılıyor...')

    // Scroll containerları bul
    this.findContainers()

    // DOM değişikliklerini izle
    this.observeDOMChanges()

    // Pencere yeniden boyutlandırmalarını izle
    this.observeResizeEvents()

    this.log('WheelScroll başlatıldı')
  }

  /**
   * Scroll containerlarını bul ve olayları ekle
   */
  private findContainers(): void {
    const containerElements = document.querySelectorAll<HTMLElement>(
      this.options.containerSelector,
    )

    containerElements.forEach(container => {
      // Eğer bu container zaten eklenmediyse
      if (!this.containers.has(container)) {
        // Container'ı kaydet
        this.containers.set(container, {
          leftButton: null,
          rightButton: null,
        })

        // Masaüstü cihazlarda wheel olayını ekle
        if (!this.isMobile) {
          this.addWheelListener(container)
        }

        // Scroll olayını ekle (buton durumlarını güncellemek için)
        this.addScrollListener(container)

        // Butonları bul ve bağla
        this.findAndBindButtons(container)

        this.log('Container eklendi:', container)
      }
    })
  }

  /**
   * Container için butonları bul ve bağla
   */
  private findAndBindButtons(container: HTMLElement): void {
    // Butonu içeren üst elementi bul (genelde container'ın parent'ı)
    const parentSection = this.findParentSection(container)
    if (!parentSection) {
      this.log('Butonlar için üst section bulunamadı')
      return
    }

    // Butonları bul
    const leftButton = parentSection.querySelector<HTMLElement>(
      this.options.buttonSelectors.left,
    )
    const rightButton = parentSection.querySelector<HTMLElement>(
      this.options.buttonSelectors.right,
    )

    // Butonları kaydet
    const containerInfo = this.containers.get(container)
    if (containerInfo) {
      containerInfo.leftButton = leftButton
      containerInfo.rightButton = rightButton
    }

    // Sol buton olayı
    if (leftButton) {
      leftButton.addEventListener('click', () =>
        this.scrollTo(container, 'left'),
      )
    }

    // Sağ buton olayı
    if (rightButton) {
      rightButton.addEventListener('click', () =>
        this.scrollTo(container, 'right'),
      )
    }

    // Başlangıç buton durumlarını ayarla
    this.updateButtonStates(container)

    this.log('Butonlar bağlandı:', { leftButton, rightButton })
  }

  /**
   * Wheel olayı ekleyici
   */
  private addWheelListener(container: HTMLElement): void {
    // Eğer zaten bir wheel olayı varsa kaldır
    if (this.wheelHandlers.has(container)) {
      container.removeEventListener('wheel', this.wheelHandlers.get(container)!)
    }

    // Yeni wheel olayı oluştur
    const wheelHandler = (event: WheelEvent) => {
      // Ctrl tuşu ile zoom yapılıyorsa karışma
      if (event.ctrlKey) {
        return
      }

      // Yatay scroll limitleri kontrol et
      const isAtStart = container.scrollLeft <= 0
      const isAtEnd =
        container.scrollLeft + container.clientWidth >=
        container.scrollWidth - 1

      // Scroll yönünü belirle
      const isScrollingUp = event.deltaY < 0
      const isScrollingDown = event.deltaY > 0

      // Eğer container'ın sınırlarındaysak ve o yöne doğru scroll yapılıyorsa
      // Tarayıcının normal dikey scroll davranışını engelleme
      if ((isAtStart && isScrollingUp) || (isAtEnd && isScrollingDown)) {
        return
      }

      // Sayfanın dikey scroll olmasını engelle
      event.preventDefault()

      // Dikey hareketi yatay scroll'a çevir
      let deltaX = event.deltaX
      let deltaY = event.deltaY

      // Eğer dikey hareket daha güçlüyse onu kullan
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        deltaX = deltaY
      }

      // Hassasiyet çarpanını uygula
      const scrollAmount = deltaX * this.options.sensitivity

      // Scroll yap
      container.scrollLeft += scrollAmount
    }

    // Wheel olayını ekle
    container.addEventListener('wheel', wheelHandler, { passive: false })

    this.log('Wheel olayı eklendi')
  }

  /**
   * Scroll olayı ekleyici (buton durumlarını güncellemek için)
   */
  private addScrollListener(container: HTMLElement): void {
    // Eğer zaten bir scroll olayı varsa kaldır
    if (this.scrollHandlers.has(container)) {
      container.removeEventListener(
        'scroll',
        this.scrollHandlers.get(container)!,
      )
    }

    // Yeni scroll olayı oluştur
    const scrollHandler = () => {
      this.updateButtonStates(container)
    }

    // Scroll olayını ekle
    container.addEventListener('scroll', scrollHandler, { passive: true })
    this.scrollHandlers.set(container, scrollHandler)

    this.log('Scroll olayı eklendi')
  }

  /**
   * Belirli bir yönde scroll yap
   */
  private scrollTo(container: HTMLElement, direction: 'left' | 'right'): void {
    // Scroll mesafesini hesapla
    let distance: number

    if (this.options.scrollDistance === 'view') {
      // Container genişliğini kullan (%80)
      distance = container.clientWidth * 0.8
    } else {
      // Belirlenen piksel değerini kullan
      distance = this.options.scrollDistance
    }

    // Yöne göre işaret belirle
    const sign = direction === 'left' ? -1 : 1

    // Hedef scroll pozisyonunu hesapla
    const targetScrollLeft = container.scrollLeft + sign * distance

    // Animasyonlu scroll yap
    this.smoothScrollTo(container, targetScrollLeft)
  }

  /**
   * Animasyonlu scroll
   */
  private smoothScrollTo(
    container: HTMLElement,
    targetScrollLeft: number,
  ): void {
    // Scroll sınırlarını kontrol et
    const maxScrollLeft = container.scrollWidth - container.clientWidth
    targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft))

    // Şu anki pozisyon
    const startScrollLeft = container.scrollLeft
    const distance = targetScrollLeft - startScrollLeft

    // Eğer mesafe çok kısaysa ani scroll yap
    if (Math.abs(distance) < 10) {
      container.scrollLeft = targetScrollLeft
      this.updateButtonStates(container)
      return
    }

    // Animasyon parametreleri
    const duration = this.options.scrollDuration
    const startTime = performance.now()

    // Animasyon fonksiyonu
    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime

      if (elapsedTime < duration) {
        // Easing fonksiyonu (ease-out-cubic)
        const progress = 1 - Math.pow(1 - elapsedTime / duration, 3)
        container.scrollLeft = startScrollLeft + distance * progress
        requestAnimationFrame(animate)
      } else {
        // Animasyon bitti
        container.scrollLeft = targetScrollLeft
        this.updateButtonStates(container)
      }
    }

    // Animasyonu başlat
    requestAnimationFrame(animate)
  }

  /**
   * Buton durumlarını güncelle
   */
  private updateButtonStates(container: HTMLElement): void {
    const containerInfo = this.containers.get(container)
    if (!containerInfo) return

    const { leftButton, rightButton } = containerInfo

    // Scroll durumlarını hesapla
    const isAtStart = container.scrollLeft <= 1
    const isAtEnd =
      container.scrollLeft + container.clientWidth >= container.scrollWidth - 1

    // Buton durumlarını ayarla
    if (leftButton) {
      this.setButtonState(leftButton, !isAtStart)
    }

    if (rightButton) {
      this.setButtonState(rightButton, !isAtEnd)
    }
  }

  /**
   * Buton durumunu ayarla
   */
  private setButtonState(button: HTMLElement, enabled: boolean): void {
    if (enabled) {
      button.removeAttribute('disabled')
      button.classList.remove('disabled')
    } else {
      button.setAttribute('disabled', '')
      button.classList.add('disabled')
    }
  }

  /**
   * DOM değişikliklerini izle
   */
  private observeDOMChanges(): void {
    // Önceki observer'ı temizle
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
    }

    // Yeni observer oluştur
    this.mutationObserver = new MutationObserver(mutations => {
      let shouldRefresh = false

      mutations.forEach(mutation => {
        if (
          mutation.type === 'childList' ||
          (mutation.type === 'attributes' && mutation.attributeName === 'class')
        ) {
          shouldRefresh = true
        }
      })

      if (shouldRefresh) {
        this.findContainers()
      }
    })

    // DOM'u izle
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    })

    this.log('DOM değişiklikleri izleniyor')
  }

  /**
   * Boyut değişikliklerini izle
   */
  private observeResizeEvents(): void {
    // Önceki observer'ı temizle
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }

    // Yeni observer oluştur
    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const container = entry.target as HTMLElement

        // Container'ımız mı kontrol et
        if (this.containers.has(container)) {
          // Buton durumlarını güncelle
          this.updateButtonStates(container)
        }
      }
    })

    // Containerları izle
    this.containers.forEach((_, container) => {
      this.resizeObserver?.observe(container)
    })

    this.log('Yeniden boyutlandırma olayları izleniyor')
  }

  /**
   * Container'ın üst section elementini bul
   */
  private findParentSection(element: HTMLElement): HTMLElement | null {
    let parent = element.parentElement

    while (parent) {
      if (parent.tagName.toLowerCase() === 'section') {
        return parent
      }
      parent = parent.parentElement
    }

    // Section bulunamadıysa üst elementi döndür
    return element.parentElement
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

    // iOS ve iPad OS tespiti
    if (
      (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) ||
      (/Mac/.test(userAgent) &&
        navigator.maxTouchPoints &&
        navigator.maxTouchPoints > 2)
    ) {
      return true
    }

    // Dokunmatik ekran ve boyut kontrolü
    const hasTouchScreen =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      (navigator as any).msMaxTouchPoints > 0

    // Ekran boyutu küçükse ve dokunmatik ekran varsa, muhtemelen mobil
    const isSmallScreen = window.innerWidth < 768

    return hasTouchScreen && isSmallScreen
  }

  /**
   * Bileşeni yenile
   */
  public refresh(): void {
    this.log('Bileşen yenileniyor...')

    // Tüm containerları güncelle
    this.containers.forEach((_, container) => {
      // Buton durumlarını güncelle
      this.updateButtonStates(container)
    })

    // Yeni containerları bul
    this.findContainers()

    this.log('Bileşen yenilendi')
  }

  /**
   * Belirli bir elemana odaklan
   * @param containerSelector Container seçicisi
   * @param index Odaklanılacak elemanın indeksi
   * @param offset İlave offset (px)
   */
  public focus(
    containerSelector: string | HTMLElement,
    index: number,
    offset: number = 0,
  ): boolean {
    // Container'ı bul
    let container: HTMLElement | null = null

    if (typeof containerSelector === 'string') {
      container = document.querySelector<HTMLElement>(containerSelector)
    } else if (containerSelector instanceof HTMLElement) {
      container = containerSelector
    }

    if (!container) {
      this.log('Container bulunamadı')
      return false
    }

    // Container içindeki doğrudan çocuk elementleri al
    const children = Array.from(container.children) as HTMLElement[]

    // İndeks kontrolü
    if (index < 0 || index >= children.length) {
      this.log('Geçersiz indeks:', { index, totalChildren: children.length })
      return false
    }

    // Hedef elemanı al
    const targetElement = children[index]

    // Elemanın pozisyonunu hesapla
    const containerRect = container.getBoundingClientRect()
    const elementRect = targetElement.getBoundingClientRect()

    // Scroll pozisyonunu hesapla (elemanı ortala)
    const scrollLeft =
      elementRect.left -
      containerRect.left +
      container.scrollLeft -
      (containerRect.width - elementRect.width) / 2 +
      offset

    // Scroll yap
    this.smoothScrollTo(container, scrollLeft)

    this.log('Elemana odaklanıldı:', {
      index,
      element: targetElement,
      scrollLeft,
    })
    return true
  }

  /**
   * Bileşeni yok et
   */
  public destroy(): void {
    this.log('Bileşen yok ediliyor...')

    // Wheel olaylarını kaldır
    this.wheelHandlers.forEach((handler, container) => {
      container.removeEventListener('wheel', handler)
    })

    // Scroll olaylarını kaldır
    this.scrollHandlers.forEach((handler, container) => {
      container.removeEventListener('scroll', handler)
    })

    // Buton olaylarını kaldır
    this.containers.forEach(({ leftButton, rightButton }, container) => {
      if (leftButton) {
        const newLeftButton = leftButton.cloneNode(true) as HTMLElement
        leftButton.parentNode?.replaceChild(newLeftButton, leftButton)
      }

      if (rightButton) {
        const newRightButton = rightButton.cloneNode(true) as HTMLElement
        rightButton.parentNode?.replaceChild(newRightButton, rightButton)
      }
    })

    // Observer'ları kaldır
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
      this.mutationObserver = null
    }

    // Koleksiyonları temizle
    this.containers.clear()
    this.wheelHandlers.clear()
    this.scrollHandlers.clear()

    this.log('Bileşen yok edildi')
  }

  /**
   * Debug log
   */
  private log(...args: any[]): void {
    if (this.options.debug) {
      console.log('[WheelScroll]', ...args)
    }
  }
}

export { WheelScroll }
