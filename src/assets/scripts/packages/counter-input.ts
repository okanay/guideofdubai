/**
 * CounterInput sınıfı - HTML sayfasında sayı girişi yapabilen arayüz elemanları için.
 * Belirtilen container içindeki butonlarla sayı değerini artırıp azaltabilir.
 */
interface CounterInputOptions {
  container: string // CSS selektör - counter input container'ları için
  autoRefresh?: boolean // DOM'daki değişiklikleri izleyip otomatik güncelleme yapıp yapmayacağı
}

interface CounterInputElement {
  container: HTMLElement
  minusBtn: HTMLElement
  plusBtn: HTMLElement
  input: HTMLInputElement
  observer?: MutationObserver
}

class CounterInput {
  private containers: CounterInputElement[] = []
  private options: CounterInputOptions

  /**
   * CounterInput constructor
   * @param options Başlangıç ayarları
   */
  constructor(options: CounterInputOptions) {
    // Varsayılan ayarlar ile kullanıcı ayarlarını birleştir
    this.options = {
      container: options.container,
      autoRefresh: options.autoRefresh || false,
    }

    // İlk yükleme
    this.init()
  }

  /**
   * Başlangıç işlemleri
   */
  private init(): void {
    // DOM'dan elemanları yakala
    this.refresh()
  }

  /**
   * DOM'u yeniden tarayıp güncelleyen fonksiyon
   */
  public refresh(): void {
    // Önce mevcut observer'ları temizle
    this.clearObservers()

    // Containers'ı sıfırla
    this.containers = []

    // Tüm counter input container'larını bul
    const containerElements = document.querySelectorAll<HTMLElement>(
      this.options.container,
    )

    // Her bir container için elemanları ve event listener'ları ayarla
    containerElements.forEach((container: HTMLElement) => {
      const minusBtn = container.querySelector<HTMLElement>(
        '.counter-input-minus-btn',
      )
      const plusBtn = container.querySelector<HTMLElement>(
        '.counter-input-plus-btn',
      )
      const input = container.querySelector<HTMLInputElement>('.counter-input')

      if (minusBtn && plusBtn && input) {
        // data attributelerini container'dan input'a transfer et (eğer input'ta yoksa)
        this.transferDataAttributes(container, input)

        const counterElement: CounterInputElement = {
          container,
          minusBtn,
          plusBtn,
          input,
        }

        // Event listener'ları ekle
        this.setupEventListeners(counterElement)

        // AutoRefresh aktifse, observer ekle
        if (this.options.autoRefresh) {
          this.setupObserver(counterElement)
        }

        // Container'ı listeye ekle
        this.containers.push(counterElement)

        // Butonları ilk durum için kontrol et
        this.updateButtonStates(counterElement)
      }
    })
  }

  /**
   * Data attributelerini container'dan input'a taşı
   */
  private transferDataAttributes(
    container: HTMLElement,
    input: HTMLInputElement,
  ): void {
    // Min değeri
    if (container.hasAttribute('data-min') && !input.hasAttribute('data-min')) {
      input.setAttribute('data-min', container.getAttribute('data-min') || '0')
    }

    // Max değeri
    if (container.hasAttribute('data-max') && !input.hasAttribute('data-max')) {
      input.setAttribute(
        'data-max',
        container.getAttribute('data-max') || 'Infinity',
      )
    }

    // Step değeri
    if (
      container.hasAttribute('data-step') &&
      !input.hasAttribute('data-step')
    ) {
      input.setAttribute(
        'data-step',
        container.getAttribute('data-step') || '1',
      )
    }
  }

  /**
   * Event listener'ları ayarlar
   */
  private setupEventListeners(element: CounterInputElement): void {
    // Artırma butonu tıklama olayı
    element.plusBtn.addEventListener('click', () => {
      this.increment(element)
    })

    // Azaltma butonu tıklama olayı
    element.minusBtn.addEventListener('click', () => {
      this.decrement(element)
    })
  }

  /**
   * Değeri artır
   */
  private increment(element: CounterInputElement): void {
    const currentValue = parseFloat(element.input.value) || 0
    const step = parseFloat(element.input.dataset.step || '1')
    const max = parseFloat(element.input.dataset.max || Infinity.toString())

    let newValue = currentValue + step

    // Maximum değeri aşmamasını sağla
    if (newValue > max) {
      newValue = max
    }

    // Değeri güncelle
    this.setInputValue(element, newValue)

    // Buton durumlarını güncelle
    this.updateButtonStates(element)
  }

  /**
   * Değeri azalt
   */
  private decrement(element: CounterInputElement): void {
    const currentValue = parseFloat(element.input.value) || 0
    const step = parseFloat(element.input.dataset.step || '1')
    const min = parseFloat(element.input.dataset.min || '0')

    let newValue = currentValue - step

    // Minimum değerin altına düşmemesini sağla
    if (newValue < min) {
      newValue = min
    }

    // Değeri güncelle
    this.setInputValue(element, newValue)

    // Buton durumlarını güncelle
    this.updateButtonStates(element)
  }

  /**
   * Artırma/azaltma butonlarının durumlarını güncelle
   */
  private updateButtonStates(element: CounterInputElement): void {
    const currentValue = parseFloat(element.input.value) || 0
    const min = parseFloat(element.input.dataset.min || '0')
    const max = parseFloat(element.input.dataset.max || Infinity.toString())

    // Minimum değere ulaşıldığında azaltma butonunu devre dışı bırak
    if (currentValue <= min) {
      element.minusBtn.setAttribute('disabled', 'disabled')
    } else {
      element.minusBtn.removeAttribute('disabled')
    }

    // Maximum değere ulaşıldığında artırma butonunu devre dışı bırak
    if (currentValue >= max) {
      element.plusBtn.setAttribute('disabled', 'disabled')
    } else {
      element.plusBtn.removeAttribute('disabled')
    }
  }

  /**
   * Değeri güncelle ve sınırları kontrol et
   */
  private updateValue(element: CounterInputElement): void {
    let currentValue = parseFloat(element.input.value) || 0
    const min = parseFloat(element.input.dataset.min || '0')
    const max = parseFloat(element.input.dataset.max || Infinity.toString())

    // Değerin min-max aralığında olmasını sağla
    if (currentValue < min) {
      currentValue = min
    } else if (currentValue > max) {
      currentValue = max
    }

    // Değeri güncelle
    this.setInputValue(element, currentValue)

    // Buton durumlarını güncelle
    this.updateButtonStates(element)
  }

  /**
   * Input değerini güncelle ve change event tetikle
   */
  private setInputValue(element: CounterInputElement, value: number): void {
    // Görsel değeri güncelle
    element.input.value = value.toString()

    // Form değerini güncelle (programmatic olarak değiştirildiğinde değer değişmiyor olabilir)
    element.input.setAttribute('value', value.toString())

    // Change event tetikle (diğer kodların bu değişiklikten haberdar olması için)
    const event = new Event('change', { bubbles: true })
    element.input.dispatchEvent(event)

    // Input event tetikle (kullanıcı değişikliği takip eden kütüphaneler için)
    const inputEvent = new Event('input', { bubbles: true })
    element.input.dispatchEvent(inputEvent)
  }

  /**
   * AutoRefresh için observer kurar
   */
  private setupObserver(element: CounterInputElement): void {
    // Daha önce bir observer varsa temizle
    if (element.observer) {
      element.observer.disconnect()
    }

    // Yeni bir MutationObserver oluştur
    const observer = new MutationObserver(mutations => {
      let needsUpdate = false

      mutations.forEach(mutation => {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'data-min' ||
            mutation.attributeName === 'data-max' ||
            mutation.attributeName === 'data-step')
        ) {
          needsUpdate = true
        }
      })

      if (needsUpdate) {
        this.updateValue(element)
      }
    })

    // Observer'ı başlat ve input'taki data attribute'larını izle
    observer.observe(element.input, {
      attributes: true,
      attributeFilter: ['data-min', 'data-max', 'data-step'],
    })

    // Observer'ı element'e kaydet
    element.observer = observer
  }

  /**
   * Tüm observer'ları temizler
   */
  private clearObservers(): void {
    this.containers.forEach(element => {
      if (element.observer) {
        element.observer.disconnect()
      }
    })
  }

  /**
   * Sınıfı temizler
   */
  public destroy(): void {
    // Observer'ları temizle
    this.clearObservers()

    // Containers'ı temizle
    this.containers = []
  }
}

export { CounterInput }
