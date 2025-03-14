/**
 * WheelScroll - Modern web uygulamaları için optimize edilmiş yatay scroll bileşeni
 * Y ekseni geçiş desteği eklenmiş versiyonu
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
  /** Y ekseni geçişini etkinleştir (varsayılan: true) */
  enableYAxisPassthrough?: boolean
  /** Touch yönü belirleme mesafesi (piksel) (varsayılan: 10) */
  touchDirectionThreshold?: number
  /** Debug modu (varsayılan: false) */
  debug?: boolean
}

// Container için gerekli tüm veri ve dinleyicileri tutan yapı
interface ContainerData {
  buttons: { left: HTMLElement; right: HTMLElement } | null
  listeners: {
    wheel: EventListener | null
    scroll: EventListener | null
    touchStart: EventListener | null
    touchMove: EventListener | null
    touchEnd: EventListener | null
  }
  touch: {
    startX: number
    startY: number
    lastX: number
    lastY: number
    isVerticalScroll: boolean | null // null = henüz belirlenmemiş
  }
}

class WheelScroll {
  private options: Required<WheelScrollOptions>
  // Aktif container'lar kümesi
  private scrollContainers: Set<HTMLElement> = new Set()
  // Container başına tüm verileri tutacak tek bir yapı
  private containerData: Map<HTMLElement, ContainerData> = new Map()
  private resizeObserver: ResizeObserver | null = null
  private mutationObserver: MutationObserver | null = null
  private domUpdateTimer: number | null = null
  private isMobileDevice: boolean

  constructor(options: WheelScrollOptions = {}) {
    // Varsayılan seçenekler
    this.options = {
      sensitivity: options.sensitivity ?? 1.0,
      scrollDistance: options.scrollDistance ?? 'view',
      scrollDuration: options.scrollDuration ?? 50,
      enableOnMobile: options.enableOnMobile ?? false, // Varsayılanı false yapıyoruz
      buttonSelectors: options.buttonSelectors ?? {
        left: '.wheel-btn-left',
        right: '.wheel-btn-right',
      },
      scrollSelector: options.scrollSelector ?? '.wheel-scroll',
      autoUpdateButtons: options.autoUpdateButtons ?? true,
      enableYAxisPassthrough: options.enableYAxisPassthrough ?? true,
      touchDirectionThreshold: options.touchDirectionThreshold ?? 10,
      debug: options.debug ?? false,
    }

    // Mobil cihaz tespiti
    this.isMobileDevice = this.detectMobileDevice()

    // Mobil cihazda ve mobil desteği kapalıysa, sadece buton kontrolleri aktif olacak
    if (this.isMobileDevice) {
      this.log(
        'Mobil cihaz tespit edildi, sadece buton kontrolleri aktif edilecek',
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

        // Container verisi oluştur
        this.containerData.set(container, {
          buttons: null,
          listeners: {
            wheel: null,
            scroll: null,
            touchStart: null,
            touchMove: null,
            touchEnd: null,
          },
          touch: {
            startX: 0,
            startY: 0,
            lastX: 0,
            lastY: 0,
            isVerticalScroll: null,
          },
        })

        // Scroll bar'ı gizle
        this.hideScrollbar(container)

        // Butonları bul ve eşleştir
        this.findAndBindButtons(container)

        // Mobil cihaz kontrolü - Sadece mobil cihazda değilse wheel ve touch eventleri ekle
        if (!this.isMobileDevice || this.options.enableOnMobile) {
          // Wheel olayı ekleyici
          this.addWheelEventListener(container)

          // Touch olayları ekleyici (mobil cihazlar için)
          this.addTouchEventListeners(container)
        }

        // Scroll olayı ekleyici (butonları güncellemek için) - Bunlar her durumda gerekli
        if (this.options.autoUpdateButtons) {
          this.addScrollEventListener(container)
        }
      }
    })
  }

  /**
   * Container'a wheel olayı ekle - optimize edilmiş
   */
  private addWheelEventListener(container: HTMLElement): void {
    // Container verilerini al
    const containerInfo = this.containerData.get(container)!

    // Eğer zaten bir wheel olayı dinleyicisi varsa kaldır
    if (containerInfo.listeners.wheel) {
      container.removeEventListener('wheel', containerInfo.listeners.wheel)
    }

    // Wheel handler için optimizasyon değişkenleri
    let cachedScrollWidth = container.scrollWidth
    let cachedClientWidth = container.clientWidth
    let requestID: number | null = null

    // Scroll genişliği hesaplamalarını animasyon çerçevesinde yap
    const updateScrollDimensions = () => {
      cachedScrollWidth = container.scrollWidth
      cachedClientWidth = container.clientWidth
      requestID = null
    }

    // Yeni wheel olayı dinleyicisi oluştur
    const wheelHandler = (event: WheelEvent) => {
      // Erken çıkış koşulları
      if (
        (this.isMobileDevice && !this.options.enableOnMobile) ||
        event.ctrlKey
      ) {
        return
      }

      // Y ekseni geçişi kontrolü - daha verimli hesaplama
      if (this.options.enableYAxisPassthrough) {
        const scrollLeft = container.scrollLeft
        const isAtStart = scrollLeft <= 1
        const isAtEnd =
          Math.abs(cachedScrollWidth - cachedClientWidth - scrollLeft) <= 1

        // Dikey kaydırma yönünü tespit et
        const isScrollingUp = event.deltaY < 0
        const isScrollingDown = event.deltaY > 0

        // Geçiş için koşul kontrolü
        if ((isAtStart && isScrollingUp) || (isAtEnd && isScrollingDown)) {
          // Y ekseninde geçiş yapma
          return
        }
      }

      // Varsayılan davranışı engelle
      event.preventDefault()

      // Delta hesaplama optimizasyonu
      const primaryDelta =
        Math.abs(event.deltaY) > Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX

      // DeltaMode için optimize edilmiş faktör
      const factor =
        event.deltaMode === 1
          ? 20 // Satır modu
          : event.deltaMode === 2
            ? 400 // Sayfa modu
            : 1 // Piksel modu

      // Scroll miktarını hesapla ve uygula
      const scrollAmount = primaryDelta * factor * this.options.sensitivity
      container.scrollLeft += scrollAmount

      // Boyutları güncelle - ama sadece gerektiğinde
      if (!requestID) {
        requestID = requestAnimationFrame(updateScrollDimensions)
      }
    }

    // Wheel olayı ekle ve referansı sakla
    container.addEventListener('wheel', wheelHandler as EventListener, {
      passive: false,
    })
    containerInfo.listeners.wheel = wheelHandler as EventListener

    // İlk boyut hesaplamalarını yap
    updateScrollDimensions()
  }

  /**
   * Container'a scroll olayı ekle (butonları güncellemek için) - optimize edilmiş
   */
  private addScrollEventListener(container: HTMLElement): void {
    // Container verilerini al
    const containerInfo = this.containerData.get(container)!

    // Eğer zaten bir scroll olayı dinleyicisi varsa kaldır
    if (containerInfo.listeners.scroll) {
      container.removeEventListener('scroll', containerInfo.listeners.scroll)
    }

    // Scroll için throttling değişkenleri
    let lastScrollTime = 0
    const THROTTLE_MS = 100 // 100ms throttle
    let scrolling = false
    let lastKnownScrollLeft = container.scrollLeft

    // Yeni scroll olayı dinleyicisi oluştur - throttled
    const scrollHandler = () => {
      const now = Date.now()
      const currentScrollLeft = container.scrollLeft

      // Scroll pozisyonu değişmediyse hiçbir şey yapma
      if (currentScrollLeft === lastKnownScrollLeft) {
        return
      }

      // Pozisyonu güncelle
      lastKnownScrollLeft = currentScrollLeft

      // Throttling ile sadece belirli aralıklarla işlem yap
      if (now - lastScrollTime > THROTTLE_MS) {
        this.updateButtonStates(container)
        lastScrollTime = now
        scrolling = false
      } else if (!scrolling) {
        // Eğer zaten planlanmış bir güncelleme yoksa, planla
        scrolling = true
        setTimeout(() => {
          this.updateButtonStates(container)
          lastScrollTime = Date.now()
          scrolling = false
        }, THROTTLE_MS)
      }
    }

    // Scroll olayı ekle ve referansı sakla - passive: true ile performans artışı
    container.addEventListener('scroll', scrollHandler, { passive: true })
    containerInfo.listeners.scroll = scrollHandler

    // Başlangıç durumunu kontrol et
    this.updateButtonStates(container)
  }

  /**
   * DOM değişikliklerini izle - optimize edilmiş
   */
  private observeDOMChanges(): void {
    // Önceki observer'ı temizle
    if (this.mutationObserver) {
      this.mutationObserver.disconnect()
    }

    // Yeni MutationObserver oluştur
    this.mutationObserver = new MutationObserver(mutations => {
      let shouldUpdate = false

      // DOM değişikliklerini kontrol et - sadece gerekli değişiklikleri işle
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Eklenen node'lar içinde wheel-scroll class'ına sahip olanları veya içerenleri kontrol et
          const hasScrollNodes = Array.from(mutation.addedNodes).some(node => {
            if (node instanceof HTMLElement) {
              return (
                node.matches(this.options.scrollSelector) ||
                (node.querySelector &&
                  node.querySelector(this.options.scrollSelector))
              )
            }
            return false
          })

          if (hasScrollNodes) {
            shouldUpdate = true
            break
          }
        } else if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class' &&
          mutation.target instanceof HTMLElement
        ) {
          // Class değişikliği wheel-scroll ile ilgili mi kontrol et
          if (mutation.target.matches(this.options.scrollSelector)) {
            shouldUpdate = true
            break
          }
        }
      }

      // Güncelleme gerekiyorsa, debounce et
      if (shouldUpdate) {
        if (this.domUpdateTimer) {
          clearTimeout(this.domUpdateTimer)
        }

        this.domUpdateTimer = window.setTimeout(() => {
          this.findScrollContainers()
          this.domUpdateTimer = null
        }, 200) // 200ms bekle
      }
    })

    // Optimize edilmiş şekilde DOM'u izle - sadece gerekli kısmı
    const mainContent = document.querySelector('main') || document.body
    this.mutationObserver.observe(mainContent, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  /**
   * Pencere boyutu değişikliklerini izle
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
      // Container verilerini al
      const containerInfo = this.containerData.get(container)!

      // Buton çiftini kaydet
      containerInfo.buttons = { left: leftButton, right: rightButton }

      // Butonlara tıklama olayları ekle - önce onceki olayları kaldır (clone ile)
      const newLeftButton = leftButton.cloneNode(true) as HTMLElement
      const newRightButton = rightButton.cloneNode(true) as HTMLElement

      if (leftButton.parentNode) {
        leftButton.parentNode.replaceChild(newLeftButton, leftButton)
      }
      if (rightButton.parentNode) {
        rightButton.parentNode.replaceChild(newRightButton, rightButton)
      }

      // Yeni butonlara event listener ekle
      newLeftButton.addEventListener('click', () =>
        this.scrollContainerTo(container, 'left'),
      )
      newRightButton.addEventListener('click', () =>
        this.scrollContainerTo(container, 'right'),
      )

      // Container verisini güncelle
      containerInfo.buttons = { left: newLeftButton, right: newRightButton }

      // Başlangıç buton durumlarını ayarla
      this.updateButtonStates(container)

      this.log('Butonlar bağlandı', {
        container,
        left: newLeftButton,
        right: newRightButton,
      })
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
   * Belirtilen indeksteki elemana odaklanır ve onu görünüm alanının ortasına getirir
   * @param containerSelector Scroll container seçicisi veya elementi
   * @param index Odaklanılacak elemanın indeksi (sıfır tabanlı)
   * @param offset Merkeze hizalamadan sonra uygulanacak ilave piksel değeri (opsiyonel)
   * @returns İşlemin başarılı olup olmadığı
   */
  public focus(
    containerSelector: string | HTMLElement,
    index: number,
    offset: number = 0,
  ): boolean {
    // Container'ı bul
    let container: HTMLElement | null = null
    this.log('Focus işlemi için container seçicisi:', containerSelector)

    if (typeof containerSelector === 'string') {
      container = document.querySelector<HTMLElement>(containerSelector)
    } else if (containerSelector instanceof HTMLElement) {
      container = containerSelector
    }

    if (!container) {
      this.log('Focus işlemi için container bulunamadı', containerSelector)
      return false
    }

    // Container içindeki doğrudan çocuk elementleri al
    const children = Array.from(container.children) as HTMLElement[]

    // İndeks kontrol
    if (index < 0 || index >= children.length) {
      this.log('Geçersiz indeks değeri', { index, totalItems: children.length })
      return false
    }

    // Hedef elemanı bul
    const targetElement = children[index]
    if (!targetElement) {
      this.log('Hedef eleman bulunamadı', { index })
      return false
    }

    // Elemanın container içindeki pozisyonunu hesapla
    const containerRect = container.getBoundingClientRect()
    const elementRect = targetElement.getBoundingClientRect()

    // Container'ın sol kenarından elemana kadar olan mesafe
    const elementLeftRelativeToContainer =
      elementRect.left - containerRect.left + container.scrollLeft

    // Elemanın genişliği
    const elementWidth = elementRect.width

    // Container'ın görünen genişliği
    const containerVisibleWidth = container.clientWidth

    // Hedef scroll pozisyonu: Eleman ortada olacak şekilde
    const targetScrollPosition =
      elementLeftRelativeToContainer -
      containerVisibleWidth / 2 +
      elementWidth / 2 +
      offset

    // Smooth scroll ile hedef pozisyona git
    this.smoothScrollTo(container, targetScrollPosition)

    this.log('Odaklanıldı', {
      container,
      index,
      element: targetElement,
      scrollPos: targetScrollPosition,
    })
    return true
  }

  /**
   * Smooth scroll animasyonu - optimize edilmiş
   */
  private smoothScrollTo(element: HTMLElement, targetPosition: number): void {
    // Scroll sınırlarını kontrol et
    const maxScrollLeft = element.scrollWidth - element.clientWidth
    targetPosition = Math.max(0, Math.min(targetPosition, maxScrollLeft))

    // Başlangıç değerlerini al
    const startPosition = element.scrollLeft
    const distance = targetPosition - startPosition
    const duration = this.options.scrollDuration
    const startTime = performance.now()

    // Containerı temin et
    const containerInfo = this.containerData.get(element)
    if (!containerInfo) return

    // Eski scroll dinleyiciyi sakla
    const oldScrollListener = containerInfo.listeners.scroll

    // Geçici olarak scroll dinleyiciyi kaldır (animasyon süresince)
    if (oldScrollListener) {
      element.removeEventListener('scroll', oldScrollListener)
      containerInfo.listeners.scroll = null
    }

    // Animasyon kontrolü için zamanlayıcı ID
    let animFrameId: number

    // Scroll animasyonu
    const animateScroll = (currentTime: number) => {
      const elapsedTime = currentTime - startTime

      if (elapsedTime < duration) {
        // Easing fonksiyonu (ease-out)
        const progress = this.easeOutCubic(elapsedTime / duration)
        element.scrollLeft = startPosition + distance * progress
        animFrameId = requestAnimationFrame(animateScroll)
      } else {
        // Animasyon tamamlandı, kesin pozisyona git
        element.scrollLeft = targetPosition

        // Buton durumlarını güncelle
        if (this.options.autoUpdateButtons) {
          this.updateButtonStates(element)
        }

        // Animasyon bitti, eski scroll dinleyiciyi geri ekle (varsa)
        if (oldScrollListener) {
          element.addEventListener('scroll', oldScrollListener, {
            passive: true,
          })
          containerInfo.listeners.scroll = oldScrollListener
        }
      }
    }

    // Animasyonu başlat
    animFrameId = requestAnimationFrame(animateScroll)
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
    const containerInfo = this.containerData.get(container)
    if (!containerInfo || !containerInfo.buttons) return

    const { left: leftButton, right: rightButton } = containerInfo.buttons

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
    const styleId = 'wheel-scroll-style'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        ${this.options.scrollSelector}::-webkit-scrollbar {
          display: none;
        }
      `
      document.head.appendChild(style)
    }
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
   * Container'a dokunmatik olayları ekle (mobil cihazlar için) - optimize edilmiş
   */
  private addTouchEventListeners(container: HTMLElement): void {
    // Mobil cihazda ve mobil desteği kapalıysa, touch event'leri ekleme
    if (this.isMobileDevice && !this.options.enableOnMobile) {
      return
    }

    // Container verilerini al
    const containerInfo = this.containerData.get(container)!

    // Önceki touch event listener'ları kaldır
    if (containerInfo.listeners.touchStart) {
      container.removeEventListener(
        'touchstart',
        containerInfo.listeners.touchStart,
      )
    }
    if (containerInfo.listeners.touchMove) {
      container.removeEventListener(
        'touchmove',
        containerInfo.listeners.touchMove,
      )
    }
    if (containerInfo.listeners.touchEnd) {
      container.removeEventListener(
        'touchend',
        containerInfo.listeners.touchEnd,
      )
    }

    // TouchStart olay işleyicisi
    const touchStartHandler = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0]

        // Touch bilgilerini kaydet
        containerInfo.touch.startX = touch.clientX
        containerInfo.touch.startY = touch.clientY
        containerInfo.touch.lastX = touch.clientX
        containerInfo.touch.lastY = touch.clientY
        containerInfo.touch.isVerticalScroll = null // Yön henüz belli değil
      }
    }

    // TouchMove olay işleyicisi - optimize edilmiş
    const touchMoveHandler = (event: TouchEvent) => {
      // Erken çıkış kontrolü
      if (event.touches.length !== 1) {
        return
      }

      const touch = event.touches[0]
      const currentX = touch.clientX
      const currentY = touch.clientY
      const startX = containerInfo.touch.startX
      const startY = containerInfo.touch.startY

      // X ve Y eksenindeki hareketleri hesapla
      const deltaX = startX - currentX
      const deltaY = startY - currentY

      // Yön henüz belirlenmedi ve yeterli mesafe kat edildi mi?
      if (containerInfo.touch.isVerticalScroll === null) {
        const absX = Math.abs(deltaX)
        const absY = Math.abs(deltaY)

        // Yön belirleme eşik değerini aştık mı?
        if (
          absX > this.options.touchDirectionThreshold ||
          absY > this.options.touchDirectionThreshold
        ) {
          // Yönü belirle
          containerInfo.touch.isVerticalScroll = absY > absX
        } else {
          // Henüz eşik aşılmadı, işlem yapma
          return
        }
      }

      // Dikey mi yatay mı?
      const isVertical = containerInfo.touch.isVerticalScroll

      // Y ekseni geçişi aktif ve dikey kaydırma ise, sayfanın doğal davranışını kullan
      if (this.options.enableYAxisPassthrough && isVertical) {
        return // Olayı işleme - doğal scroll davranışı
      }

      // Yatay kaydırma ise
      if (!isVertical) {
        // Son konum kaydet
        containerInfo.touch.lastX = currentX
        containerInfo.touch.lastY = currentY

        // Yatay scroll için durumu güncelle
        container.scrollLeft += deltaX * 0.5 // Daha yumuşak bir scroll için çarpan

        // Touch hareket başlangıç noktasını güncelle
        containerInfo.touch.startX = currentX
        containerInfo.touch.startY = currentY
      }
    }

    // TouchEnd olay işleyicisi
    const touchEndHandler = () => {
      // Touch hareketinin sonunda, yön bilgisini sıfırla
      containerInfo.touch.isVerticalScroll = null
    }

    // Touch olaylarını ekle ve referansları sakla - Her zaman passive: true ile performansı artır
    container.addEventListener(
      'touchstart',
      touchStartHandler as EventListener,
      { passive: true },
    )
    container.addEventListener('touchmove', touchMoveHandler as EventListener, {
      passive: true,
    })
    container.addEventListener('touchend', touchEndHandler as EventListener, {
      passive: true,
    })

    // Listener referanslarını sakla
    containerInfo.listeners.touchStart = touchStartHandler as EventListener
    containerInfo.listeners.touchMove = touchMoveHandler as EventListener
    containerInfo.listeners.touchEnd = touchEndHandler as EventListener
  }

  /**
   * Cihazın mobil olup olmadığını tespit et
   */
  private detectMobileDevice(): boolean {
    // UserAgent kontrolü - optimize edilmiş
    const userAgent =
      navigator.userAgent || navigator.vendor || (window as any).opera

    // Mobil işletim sistemi kontrolü - tek bir regex ile birleştirilmiş
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
        this.addSingleContainer(element)
      })
    } else if (container instanceof HTMLElement) {
      this.addSingleContainer(container)
    }
  }

  /**
   * Tek bir container'ı ekle (addContainer yardımcı metodu)
   */
  private addSingleContainer(container: HTMLElement): void {
    if (!this.scrollContainers.has(container)) {
      this.scrollContainers.add(container)

      // Container verisi oluştur
      this.containerData.set(container, {
        buttons: null,
        listeners: {
          wheel: null,
          scroll: null,
          touchStart: null,
          touchMove: null,
          touchEnd: null,
        },
        touch: {
          startX: 0,
          startY: 0,
          lastX: 0,
          lastY: 0,
          isVerticalScroll: null,
        },
      })

      this.hideScrollbar(container)
      this.findAndBindButtons(container)

      // Mobil cihaz kontrolü
      if (!this.isMobileDevice || this.options.enableOnMobile) {
        this.addWheelEventListener(container)
        this.addTouchEventListeners(container)
      }

      if (this.options.autoUpdateButtons) {
        this.addScrollEventListener(container)
      }

      // ResizeObserver'a ekle
      this.resizeObserver?.observe(container)
    }
  }

  /**
   * Y ekseni geçişini etkinleştir/devre dışı bırak
   * @param enabled Etkin olup olmadığı
   */
  public setYAxisPassthrough(enabled: boolean): void {
    this.options.enableYAxisPassthrough = enabled

    // Tüm scroll container'larını güncelle
    this.scrollContainers.forEach(container => {
      // Wheel event listener'ı yeniden ekle (yeni ayarla)
      this.addWheelEventListener(container)
      // Touch event listener'ları yeniden ekle
      this.addTouchEventListeners(container)
    })

    this.log('Y ekseni geçişi ayarlandı:', enabled)
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
      this.addTouchEventListeners(container)

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
   * Mobil desteğini ayarla
   */
  public setMobileSupport(enabled: boolean): void {
    this.options.enableOnMobile = enabled

    this.scrollContainers.forEach(container => {
      if (this.isMobileDevice) {
        // Container verilerini al
        const containerInfo = this.containerData.get(container)
        if (!containerInfo) return

        if (enabled) {
          // Mobil cihazda ve destek etkinleştirildi, event listener'ları ekle
          this.addWheelEventListener(container)
          this.addTouchEventListeners(container)
        } else {
          // Mobil cihazda ve destek devre dışı, event listener'ları kaldır
          if (containerInfo.listeners.wheel) {
            container.removeEventListener(
              'wheel',
              containerInfo.listeners.wheel,
            )
            containerInfo.listeners.wheel = null
          }

          if (containerInfo.listeners.touchStart) {
            container.removeEventListener(
              'touchstart',
              containerInfo.listeners.touchStart,
            )
            containerInfo.listeners.touchStart = null
          }

          if (containerInfo.listeners.touchMove) {
            container.removeEventListener(
              'touchmove',
              containerInfo.listeners.touchMove,
            )
            containerInfo.listeners.touchMove = null
          }

          if (containerInfo.listeners.touchEnd) {
            container.removeEventListener(
              'touchend',
              containerInfo.listeners.touchEnd,
            )
            containerInfo.listeners.touchEnd = null
          }
        }
      }
    })

    this.log('Mobil cihaz desteği ayarlandı:', enabled)
  }

  /**
   * Bileşeni yok et ve tüm event listener'ları temizle
   */
  public destroy(): void {
    // Tüm containerlar için event listener'ları kaldır
    this.scrollContainers.forEach(container => {
      const containerInfo = this.containerData.get(container)
      if (!containerInfo) return

      // Wheel olayı dinleyicisini kaldır
      if (containerInfo.listeners.wheel) {
        container.removeEventListener('wheel', containerInfo.listeners.wheel)
      }

      // Touch olayı dinleyicilerini kaldır
      if (containerInfo.listeners.touchStart) {
        container.removeEventListener(
          'touchstart',
          containerInfo.listeners.touchStart,
        )
      }
      if (containerInfo.listeners.touchMove) {
        container.removeEventListener(
          'touchmove',
          containerInfo.listeners.touchMove,
        )
      }
      if (containerInfo.listeners.touchEnd) {
        container.removeEventListener(
          'touchend',
          containerInfo.listeners.touchEnd,
        )
      }

      // Scroll olayı dinleyicisini kaldır
      if (containerInfo.listeners.scroll) {
        container.removeEventListener('scroll', containerInfo.listeners.scroll)
      }
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

    // Zamanlayıcıyı temizle
    if (this.domUpdateTimer) {
      clearTimeout(this.domUpdateTimer)
      this.domUpdateTimer = null
    }

    // Tüm koleksiyonları temizle
    this.scrollContainers.clear()
    this.containerData.clear()
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
