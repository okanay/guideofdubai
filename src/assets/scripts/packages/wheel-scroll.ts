// Arayüz tanımlamaları
interface ScrollInfo {
  contentWidth: number
  viewportWidth: number
  hiddenAreaWidth: number
}

interface WheelScrollOptions {
  debugMode?: boolean
  scrollStep?: number // Kaydırma miktarı (piksel)
  scrollDuration?: number // Kaydırma animasyon süresi (ms)
  disableTouchInterception?: boolean // Mobil dokunma olaylarının araya girip girmeyeceğini kontrol eder
}

// Her container için alt elementleri ve bilgileri saklayan arayüz
interface ContainerElements {
  container: HTMLElement
  scrollElement: HTMLElement
  leftButton: HTMLElement | null
  rightButton: HTMLElement | null
  scrollInfo: ScrollInfo
}

class WheelScroll {
  private containers: HTMLElement[] = []
  private isMobile: boolean = false
  private containerIdMap: Map<string, HTMLElement> = new Map()
  private debugMode: boolean = true
  private scrollInfoMap: Map<HTMLElement, ScrollInfo> = new Map()
  private options: Required<WheelScrollOptions>
  // Container elementleri önbelleğe almak için yeni map
  private containerElementsCache: Map<HTMLElement, ContainerElements> =
    new Map()

  constructor(options: WheelScrollOptions = {}) {
    // Varsayılan değerlerle birleştir
    this.options = {
      debugMode: options.debugMode ?? true,
      scrollStep: options.scrollStep ?? 300,
      scrollDuration: options.scrollDuration ?? 300,
      disableTouchInterception: options.disableTouchInterception ?? true, // Varsayılan olarak mobilde native scroll kullan
    }

    this.debugMode = this.options.debugMode

    // Debounce ile resize olayını optimize etme (150ms)
    const debouncedResize = this.debounce(() => {
      this.checkMobileState()
      this.updateAllScrollInfo()
      this.updateAllButtonStates()
    }, 150)

    // Throttle ile scroll olayına tepki vermeyi optimize et (16ms - yaklaşık 60fps)
    this.throttledUpdateButtonStates = this.throttle(
      (container: HTMLElement) => {
        this.updateButtonStates(container)
      },
      16,
    )

    window.addEventListener('resize', debouncedResize)

    // Başlangıç işlemlerini çalıştır
    this.init()
  }

  // Class seviyesinde throttled fonksiyon tanımla
  private throttledUpdateButtonStates: (container: HTMLElement) => void

  /**
   * Başlangıç işlemleri
   */
  private init(): void {
    // Mobil durumu kontrol et
    this.checkMobileState()

    // Wheel container'ları bul ve bilgilerini hesapla
    this.findWheelContainers()

    // Event'leri ekle
    this.setupEventListeners()

    // Buton durumlarını güncelle
    this.updateAllButtonStates()

    this.debug(
      `${this.containers.length} adet wheel-container bulundu. Mobil: ${this.isMobile ? 'Evet' : 'Hayır'}`,
    )
  }

  /**
   * Debug mesajlarını kontrol eder ve gösterir
   * @param message Debug mesajı
   * @param data İsteğe bağlı ek veri
   */
  private debug(message: string, data?: any): void {
    if (!this.debugMode) return

    if (data) {
      console.log(`[WheelScroll] ${message}`, data)
    } else {
      console.log(`[WheelScroll] ${message}`)
    }
  }

  // Debounce fonksiyonu - olayın en son tetiklenmesinden belli süre sonra çalışır
  private debounce(func: Function, wait: number): (...args: any[]) => void {
    let timeout: number | null = null

    return (...args: any[]) => {
      const later = () => {
        timeout = null
        func(...args)
      }

      if (timeout !== null) {
        clearTimeout(timeout)
      }
      timeout = window.setTimeout(later, wait)
    }
  }

  // Throttle fonksiyonu - olayı belirli aralıklarla sınırlandırır
  private throttle(func: Function, limit: number): (...args: any[]) => void {
    let inThrottle = false

    return (...args: any[]) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => {
          inThrottle = false
        }, limit)
      }
    }
  }

  // RequestAnimationFrame throttle - ekran yenileme hızıyla sınırlar
  private rafThrottle(func: Function): (...args: any[]) => void {
    let rafId: number | null = null

    return (...args: any[]) => {
      if (rafId) return

      rafId = requestAnimationFrame(() => {
        func(...args)
        rafId = null
      })
    }
  }

  /**
   * Mobil cihaz kontrolü yapar
   */
  private checkMobileState(): void {
    this.isMobile =
      window.innerWidth <= 768 ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
  }

  /**
   * Container alt elementlerini bulur ve önbelleğe alır
   */
  private cacheContainerElements(
    container: HTMLElement,
  ): ContainerElements | null {
    // Scroll elementi bul
    const scrollElement = container.querySelector(
      '.wheel-scroll',
    ) as HTMLElement
    if (!scrollElement) {
      this.debug(
        `Hata: Container içinde .wheel-scroll elementi bulunamadı: ${container.dataset.wheelScroll || container.className}`,
      )
      return null
    }

    // Butonları bul
    const leftButton = container.querySelector(
      '.wheel-btn-left',
    ) as HTMLElement | null
    const rightButton = container.querySelector(
      '.wheel-btn-right',
    ) as HTMLElement | null

    // Scroll bilgilerini hesapla
    const contentWidth = scrollElement.scrollWidth
    const viewportWidth = scrollElement.clientWidth
    const hiddenAreaWidth = Math.max(0, contentWidth - viewportWidth)

    const scrollInfo: ScrollInfo = {
      contentWidth,
      viewportWidth,
      hiddenAreaWidth,
    }

    // Container elementlerini önbelleğe al
    const elements: ContainerElements = {
      container,
      scrollElement,
      leftButton,
      rightButton,
      scrollInfo,
    }

    this.containerElementsCache.set(container, elements)
    this.scrollInfoMap.set(container, scrollInfo)

    return elements
  }

  /**
   * Container yapısının doğru olduğunu kontrol eder
   */
  private validateStructure(container: HTMLElement): boolean {
    const scrollContent = container.querySelector('.wheel-scroll')

    if (!scrollContent) {
      this.debug(
        `Hata: Container içinde '.wheel-scroll' elementi bulunamadı: ${container.dataset.wheelScroll || container.className}`,
      )
      return false
    }

    const leftBtn = container.querySelector('.wheel-btn-left')
    const rightBtn = container.querySelector('.wheel-btn-right')

    if (!leftBtn) {
      this.debug(
        `Uyarı: Container içinde '.wheel-btn-left' butonu bulunamadı: ${container.dataset.wheelScroll || container.className}`,
      )
    }

    if (!rightBtn) {
      this.debug(
        `Uyarı: Container içinde '.wheel-btn-right' butonu bulunamadı: ${container.dataset.wheelScroll || container.className}`,
      )
    }

    return true
  }

  /**
   * Wheel container'ları bulur ve scroll bilgilerini hesaplar
   */
  private findWheelContainers(): void {
    this.containers = []
    this.scrollInfoMap.clear()
    this.containerIdMap.clear()
    this.containerElementsCache.clear()

    const elements = document.querySelectorAll('.wheel-container')
    this.debug(`DOM'da bulunan wheel-container sayısı: ${elements.length}`)

    elements.forEach((el, index) => {
      const container = el as HTMLElement

      // Yapı kontrolü yap
      if (!this.validateStructure(container)) {
        this.debug(
          `Container yapısı geçersiz, atlanıyor: ${container.className}`,
        )
        return
      }

      // Eğer data-wheel-scroll özelliği yoksa, oluştur
      if (!container.dataset.wheelScroll) {
        const uniqueId = `wheel-${index}`
        container.setAttribute('data-wheel-scroll', uniqueId)
        this.debug(`Container için unique ID oluşturuldu: ${uniqueId}`)
      }

      // Container'ı ID'si ile eşleştir ve depola
      const containerId = container.dataset.wheelScroll as string
      this.containerIdMap.set(containerId, container)

      this.containers.push(container)

      // Container elementlerini önbelleğe al
      this.cacheContainerElements(container)
    })
  }

  /**
   * ID ile container'ı bul
   * @param id Container data-wheel-scroll ID değeri
   * @returns Container elementi veya null
   */
  public getContainerById(id: string): HTMLElement | null {
    return this.containerIdMap.get(id) || null
  }

  /**
   * Tüm container'lar için event'leri ayarlar
   */
  private setupEventListeners(): void {
    this.containers.forEach(container => {
      const elements = this.containerElementsCache.get(container)
      if (!elements) return

      // Masaüstü cihazlarda wheel event'i - mobil cihazlarda UYGULANMAZ
      if (!this.isMobile) {
        this.attachWheelEvent(elements)
      } else if (!this.options.disableTouchInterception) {
        // Sadece disableTouchInterception false ise touch olaylarını ekle
        this.setupTouchEvents(elements)
      }

      // Hem masaüstü hem mobil için buton event'leri
      this.attachButtonEvents(elements)

      // Scroll olayını scroll elementi için dinle - rafThrottle ile optimize edildi
      const throttledScrollHandler = this.rafThrottle(() => {
        const containerId = container.dataset.wheelScroll
        // Debug logları daha az göster
        if (this.debugMode && Math.random() < 0.1) {
          // Sadece %10 olasılıkla göster
          this.debug(
            `Container scroll eventi: ${containerId || container.className}`,
          )
        }
        this.updateButtonStates(container)
      })

      elements.scrollElement.addEventListener('scroll', throttledScrollHandler)
    })
  }

  private setupTouchEvents(elements: ContainerElements): void {
    // Eğer options.disableTouchInterception true ise veya mobil değilse, touch olaylarını ekleme
    if (this.options.disableTouchInterception || !this.isMobile) return

    const { scrollElement } = elements
    let startX: number
    let startY: number
    let initialScrollLeft: number
    let isScrollingHorizontally = false
    let isTouchActive = false
    let lastTouchX = 0
    let lastTouchY = 0
    let preventNextTouchmove = false

    // touchstart - kaydırma işleminin başlangıcı
    scrollElement.addEventListener(
      'touchstart',
      e => {
        startX = e.touches[0].clientX
        startY = e.touches[0].clientY
        lastTouchX = startX
        lastTouchY = startY
        initialScrollLeft = scrollElement.scrollLeft
        isScrollingHorizontally = false
        isTouchActive = true
        preventNextTouchmove = false
      },
      { passive: true },
    )

    // touchmove - kaydırma işlemi devam ediyor
    scrollElement.addEventListener(
      'touchmove',
      e => {
        if (!isTouchActive) return

        const currentX = e.touches[0].clientX
        const currentY = e.touches[0].clientY

        // Hareket mesafelerini hesapla
        const deltaX = lastTouchX - currentX
        const deltaY = lastTouchY - currentY

        // Başlangıçtan toplam mesafeler
        const totalDeltaX = startX - currentX
        const totalDeltaY = startY - currentY

        // Son pozisyonu güncelle
        lastTouchX = currentX
        lastTouchY = currentY

        // Kaydırma yönünü belirle (hareketin ilk 10px'i önemli)
        if (
          !isScrollingHorizontally &&
          Math.abs(totalDeltaX) + Math.abs(totalDeltaY) > 10
        ) {
          // Yön belirleme eşiği (1.5x daha fazla yatay hareket = yatay scroll)
          isScrollingHorizontally =
            Math.abs(totalDeltaX) > Math.abs(totalDeltaY) * 1.5

          // İlk hareket dikey ise, preventDefault yapmayı deneme
          if (!isScrollingHorizontally) {
            return
          }

          // İlk hareket yatay ise ve preventDefault hala yapılabiliyorsa
          if (e.cancelable && isScrollingHorizontally) {
            preventNextTouchmove = true
            e.preventDefault()
          }
        }

        // Eğer yatay kaydırma yapıyorsak ve hareket yatay olarak devam ediyorsa
        if (isScrollingHorizontally) {
          // Manuel kaydırma işlemi
          scrollElement.scrollLeft += deltaX

          // Eğer hareketi durdurabiliyorsak ve belli bir eşiği geçtiysek
          if (
            e.cancelable &&
            preventNextTouchmove &&
            Math.abs(deltaX) > Math.abs(deltaY) * 1.2
          ) {
            try {
              e.preventDefault()
            } catch (error) {
              // Önleme başarısız olursa, sessizce devam et
            }
          }
        }
      },
      { passive: false }, // preventDefault kullanabilmek için passive: false
    )

    // touchend / touchcancel - dokunma işlemi bitti
    const endTouchHandler = () => {
      isTouchActive = false
      isScrollingHorizontally = false
      preventNextTouchmove = false
    }

    scrollElement.addEventListener('touchend', endTouchHandler, {
      passive: true,
    })
    scrollElement.addEventListener('touchcancel', endTouchHandler, {
      passive: true,
    })
  }

  /**
   * Container için scroll bilgilerini hesaplar
   * Bu fonksiyon sadece resize olayında ve başlangıçta çağrılmalı
   */
  private calculateScrollInfo(container: HTMLElement): void {
    const elements = this.containerElementsCache.get(container)
    if (!elements) {
      // Önbellekte yoksa, yeniden oluştur
      this.cacheContainerElements(container)
      return
    }

    const { scrollElement } = elements

    // Eğer DOM tamamen yüklenmemişse, doğru ölçümleri alamayabiliriz
    // 0 genişliği kontrolü yapıyoruz
    if (scrollElement.scrollWidth === 0 || scrollElement.clientWidth === 0) {
      // DOM henüz hazır değil, biraz bekleyip tekrar deneyelim
      setTimeout(() => this.calculateScrollInfo(container), 100)
      return
    }

    // İçerik genişliğini hesapla
    const contentWidth = scrollElement.scrollWidth

    // Görünür alan genişliğini al
    const viewportWidth = scrollElement.clientWidth

    // Görünmeyen (kaydırılabilir) alan genişliğini hesapla
    const hiddenAreaWidth = Math.max(0, contentWidth - viewportWidth)

    // Değişiklik olup olmadığını kontrol et (gereksiz güncellemeleri önle)
    const oldInfo = elements.scrollInfo
    if (
      oldInfo &&
      oldInfo.contentWidth === contentWidth &&
      oldInfo.viewportWidth === viewportWidth
    ) {
      // Değişiklik yok, güncelleme yapma
      return
    }

    // Bilgileri güncelle
    elements.scrollInfo = {
      contentWidth,
      viewportWidth,
      hiddenAreaWidth,
    }

    // Bilgileri sakla
    this.scrollInfoMap.set(container, elements.scrollInfo)

    this.debug(`Scroll bilgileri hesaplandı:`, {
      containerId: container.dataset.wheelScroll,
      container: container.className,
      contentWidth,
      viewportWidth,
      hiddenAreaWidth,
    })
  }

  /**
   * Tüm container'ların scroll bilgilerini günceller
   */
  private updateAllScrollInfo(): void {
    this.containers.forEach(container => {
      this.calculateScrollInfo(container)
    })
  }

  /**
   * Buton event'lerini container'a ekler
   */
  private attachButtonEvents(elements: ContainerElements): void {
    const { container, leftButton, rightButton } = elements

    if (leftButton) {
      // Mevcut event listener'ları temizle
      const newLeftBtn = leftButton.cloneNode(true) as HTMLElement
      leftButton.parentNode?.replaceChild(newLeftBtn, leftButton)

      // Önbelleği güncelle
      elements.leftButton = newLeftBtn

      newLeftBtn.addEventListener('click', e => {
        e.preventDefault() // Varsayılan davranışı engelle
        this.debug(
          `Sol buton tıklandı: ${container.dataset.wheelScroll || container.className}`,
        )
        this.scrollContainer(container, 'left')
      })
    } else {
      this.debug(
        `Sol buton bulunamadı: ${container.dataset.wheelScroll || container.className}`,
      )
    }

    if (rightButton) {
      // Mevcut event listener'ları temizle
      const newRightBtn = rightButton.cloneNode(true) as HTMLElement
      rightButton.parentNode?.replaceChild(newRightBtn, rightButton)

      // Önbelleği güncelle
      elements.rightButton = newRightBtn

      newRightBtn.addEventListener('click', e => {
        e.preventDefault() // Varsayılan davranışı engelle
        this.debug(
          `Sağ buton tıklandı: ${container.dataset.wheelScroll || container.className}`,
        )
        this.scrollContainer(container, 'right')
      })
    } else {
      this.debug(
        `Sağ buton bulunamadı: ${container.dataset.wheelScroll || container.className}`,
      )
    }
  }

  /**
   * Tüm container'lar için buton durumlarını günceller
   * Debounce ile çağrılırsa, performans sorunu olmaz
   */
  private updateAllButtonStates(): void {
    // requestAnimationFrame içinde çalıştırarak tarayıcının yenileme döngüsüne uyum sağlıyoruz
    requestAnimationFrame(() => {
      this.containers.forEach(container => {
        this.updateButtonStates(container)
      })
    })
  }

  /**
   * Container için buton durumlarını günceller
   * Scroll eventi sırasında sık çağrılır, bu yüzden optimize edilmelidir
   */
  private updateButtonStates(container: HTMLElement): void {
    const elements = this.containerElementsCache.get(container)
    if (!elements) return

    const { scrollElement, leftButton, rightButton, scrollInfo } = elements

    if (!leftButton || !rightButton) return

    // Güncel scroll pozisyonu
    const scrollLeft = scrollElement.scrollLeft

    // Sadece rastgele örnekleme ile debug logları (performans için)
    if (this.debugMode && Math.random() < 0.05) {
      this.debug(`Scroll durumu:`, {
        containerId: container.dataset.wheelScroll,
        scrollLeft,
        hiddenAreaWidth: scrollInfo.hiddenAreaWidth,
      })
    }

    // Buton durumları için önceki değerleri kontrol etme
    // Bu şekilde DOM'a gereksiz yazma işlemi yapmıyoruz
    const leftDisabled = leftButton.hasAttribute('disabled')
    const rightDisabled = rightButton.hasAttribute('disabled')

    // İçerik kaydırılabilir değilse iki butonu da devre dışı bırak
    if (scrollInfo.hiddenAreaWidth <= 5) {
      if (!leftDisabled) this.disableButton(leftButton)
      if (!rightDisabled) this.disableButton(rightButton)
      return
    }

    // Sol buton durumu - sadece değişiklik varsa güncelle
    const shouldLeftBeDisabled = scrollLeft <= 5
    if (shouldLeftBeDisabled !== leftDisabled) {
      if (shouldLeftBeDisabled) {
        this.disableButton(leftButton)
      } else {
        this.enableButton(leftButton)
      }
    }

    // Sağ buton durumu - sadece değişiklik varsa güncelle
    const shouldRightBeDisabled = scrollLeft >= scrollInfo.hiddenAreaWidth - 5
    if (shouldRightBeDisabled !== rightDisabled) {
      if (shouldRightBeDisabled) {
        this.disableButton(rightButton)
      } else {
        this.enableButton(rightButton)
      }
    }
  }

  /**
   * Butonu devre dışı bırakır
   */
  private disableButton(button: HTMLElement): void {
    button.setAttribute('disabled', 'true')
    button.classList.add('disabled')
  }

  /**
   * Butonu etkinleştirir
   */
  private enableButton(button: HTMLElement): void {
    button.removeAttribute('disabled')
    button.classList.remove('disabled')
  }

  /**
   * Wheel event'ini container'a ekler (sadece masaüstü)
   */
  private attachWheelEvent(elements: ContainerElements): void {
    const { scrollElement } = elements

    scrollElement.addEventListener('wheel', e => {
      e.preventDefault()
      const delta = e.deltaY

      // Scroll elementi kaydır
      scrollElement.scrollBy({
        left: delta,
        behavior: 'smooth',
      })

      this.debug(
        `Wheel event: ${elements.container.dataset.wheelScroll || elements.container.className}`,
      )
    })
  }

  /**
   * İyileştirilmiş scroll işlevi
   * Mobil vs masaüstü ayrımı daha net yapılıyor
   */
  private scrollContainer(
    container: HTMLElement,
    direction: 'left' | 'right',
  ): void {
    const elements = this.containerElementsCache.get(container)
    if (!elements) {
      this.debug(`Container elementleri bulunamadı`)
      return
    }

    const { scrollElement, scrollInfo } = elements

    this.debug(`Button click: ${direction}`, {
      containerId: container.dataset.wheelScroll,
      container: container.className,
    })

    // Hedef scroll pozisyonu
    let targetScrollLeft: number

    if (direction === 'left') {
      // Sol buton: scrollStep kadar veya başlangıca kadar kaydır
      targetScrollLeft = Math.max(
        0,
        scrollElement.scrollLeft - this.options.scrollStep,
      )
    } else {
      // Sağ buton: scrollStep kadar veya sona kadar kaydır
      targetScrollLeft = Math.min(
        scrollInfo.hiddenAreaWidth,
        scrollElement.scrollLeft + this.options.scrollStep,
      )
    }

    this.debug(
      `Scroll hedefi: ${targetScrollLeft}, mevcut: ${scrollElement.scrollLeft}`,
    )

    // Mobil vs masaüstü için farklı scroll davranışları
    if (this.isMobile) {
      // Mobil cihazlar için basit scroll
      this.scrollToWithAnimation(scrollElement, targetScrollLeft)
    } else {
      // Masaüstü için smooth scroll
      this.smoothScrollTo(scrollElement, targetScrollLeft)
    }
  }

  /**
   * Mobil cihazlar için daha uygun scroll animasyonu
   * Özellikle iOS için daha iyi çalışır
   */
  private scrollToWithAnimation(
    element: HTMLElement,
    targetScrollLeft: number,
  ): void {
    // İlk olarak CSS tabanlı scroll-behavior'u kaldır (iOS uyumluluk için)
    const originalScrollBehavior = element.style.scrollBehavior
    element.style.scrollBehavior = 'auto'

    // requestAnimationFrame ile scroll işlemini yap
    const startScrollLeft = element.scrollLeft
    const distance = targetScrollLeft - startScrollLeft
    const duration = 300 // ms
    const startTime = performance.now()

    const animateScroll = (currentTime: number) => {
      const elapsedTime = currentTime - startTime
      const progress = Math.min(elapsedTime / duration, 1)

      // Easing fonksiyonu (ease-out cubic)
      const easedProgress = 1 - Math.pow(1 - progress, 3)

      element.scrollLeft = startScrollLeft + distance * easedProgress

      if (progress < 1) {
        requestAnimationFrame(animateScroll)
      } else {
        // Animasyon tamamlandıktan sonra orijinal scroll davranışını geri yükle
        element.style.scrollBehavior = originalScrollBehavior
      }
    }

    requestAnimationFrame(animateScroll)
  }

  private smoothScrollTo(element: HTMLElement, targetScrollLeft: number): void {
    try {
      // İlk olarak native smooth scrollTo deneyelim
      element.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth',
      })

      // Native scrollTo sonrasında bir animasyon kontrolü yapalım
      // Bazı tarayıcılar smooth behavior'u desteklemeyebilir
      const initialScrollLeft = element.scrollLeft

      // Timeout ile native scrollTo'nun çalışıp çalışmadığını kontrol et
      setTimeout(() => {
        // Eğer scroll pozisyonu değişmediyse, manuel animasyon uygula
        if (Math.abs(element.scrollLeft - initialScrollLeft) < 5) {
          this.debug(
            `Native smooth scroll çalışmadı, manuel animasyon başlıyor`,
          )
          this.animateScroll(element, initialScrollLeft, targetScrollLeft)
        }
      }, 50)
    } catch (error) {
      this.debug(`Smooth scroll hatası, manuel animasyona geçiliyor`, error)
      this.animateScroll(element, element.scrollLeft, targetScrollLeft)
    }
  }

  private animateScroll(
    element: HTMLElement,
    startScrollLeft: number,
    targetScrollLeft: number,
  ): void {
    const distance = targetScrollLeft - startScrollLeft

    // Mesafe çok azsa doğrudan atla
    if (Math.abs(distance) < 5) {
      element.scrollLeft = targetScrollLeft
      return
    }

    const duration = this.options.scrollDuration
    let startTime: number | null = null

    const step = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing fonksiyonu (ease-out)
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 2)
      const easedProgress = easeOut(progress)

      element.scrollLeft = startScrollLeft + distance * easedProgress

      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }

    window.requestAnimationFrame(step)
  }

  /**
   * ID ile container'ı yatay olarak kaydır
   * @param containerId Container ID değeri
   * @param direction Kaydırma yönü ('left' veya 'right')
   */
  public scrollContainerById(
    containerId: string,
    direction: 'left' | 'right',
  ): void {
    const container = this.getContainerById(containerId)
    if (container) {
      this.scrollContainer(container, direction)
    } else {
      this.debug(`Hata: '${containerId}' ID'li container bulunamadı`)
    }
  }
}

export { WheelScroll }
