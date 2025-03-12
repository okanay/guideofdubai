/**
 * CounterInput sınıfı - HTML sayfasında sayı girişi yapabilen arayüz elemanları için.
 * Belirtilen container içindeki butonlarla sayı değerini artırıp azaltabilir.
 * Klavye ile direkt değer girişi de destekler.
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

        // Readonly özelliğini kaldır
        input.removeAttribute('readonly')

        // Mobil giriş için gerekli attributeleri ekle
        input.setAttribute('inputmode', 'numeric')
        input.setAttribute('pattern', '[0-9]*')

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

    // Input klavye işlemleri
    element.input.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleKeyInput(e, element.input)
    })

    // Input değer değişimi
    element.input.addEventListener('input', e => {
      // Input öncesi değer
      const oldValue = element.input.value

      // Sadece sayı ve nokta karakterlerine izin ver
      let newValue = element.input.value.replace(/[^\d.]/g, '')

      // Birden fazla nokta olmamasını sağla
      const parts = newValue.split('.')
      if (parts.length > 2) {
        newValue = parts[0] + '.' + parts.slice(1).join('')
      }

      // Sınırları kontrol et
      if (newValue !== '') {
        const numValue = parseFloat(newValue)
        const max = parseFloat(element.input.dataset.max || 'Infinity')
        const min = parseFloat(element.input.dataset.min || '0')

        // Maksimum değeri aşıyorsa, maksimuma sabitle
        if (!isNaN(numValue) && numValue > max) {
          newValue = max.toString()
        }

        // Minimum değerin altındaysa, minimuma sabitle
        if (!isNaN(numValue) && numValue < min) {
          newValue = min.toString()
        }
      }

      // Değer değiştiyse güncelle
      if (oldValue !== newValue) {
        element.input.value = newValue

        // Buton durumlarını güncelle
        this.updateButtonStates(element)
      }
    })

    // Focus işlemi
    element.input.addEventListener('focus', () => {
      // Odaklanınca tüm metni seç
      element.input.select()

      // Orijinal değeri sakla (blur sonrası değişiklik kontrolü için)
      element.input.setAttribute('data-original-value', element.input.value)
    })

    // Blur işlemi
    element.input.addEventListener('blur', () => {
      // Boş ise veya geçersiz sayı ise min değere ayarla
      if (
        element.input.value === '' ||
        isNaN(parseFloat(element.input.value))
      ) {
        const min = parseFloat(element.input.dataset.min || '0')
        this.setInputValue(element, min)
        return
      }

      // Değeri doğrula ve güncelle
      this.validateAndUpdateValue(element)
    })

    // Enter tuşu ile blur'a neden ol
    element.input.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        element.input.blur()
      }
    })

    // Mobil cihazlarda dokunma desteği
    element.input.addEventListener('touchstart', (e: TouchEvent) => {
      // Readonly özelliğini kontrol et ve varsa kaldır
      if (element.input.hasAttribute('readonly')) {
        element.input.removeAttribute('readonly')
      }
      element.input.focus()
      setTimeout(() => {
        element.input.select()
      }, 0)
    })
  }

  /**
   * Klavye girişlerini işler
   */
  private handleKeyInput(event: KeyboardEvent, input: HTMLInputElement): void {
    // Sayı, nokta ve temel tuşlara izin ver
    const allowedKeys = [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '.',
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Enter',
    ]

    // CTRL+A, CTRL+C, CTRL+V gibi kombinasyonlara izin ver
    if (event.ctrlKey || event.metaKey) {
      return
    }

    // Sadece izin verilen karakterlere izin ver
    if (!allowedKeys.includes(event.key)) {
      event.preventDefault()
      return
    }

    // Birden fazla nokta olmamasını sağla
    if (event.key === '.' && input.value.includes('.')) {
      event.preventDefault()
      return
    }

    // Minimum ve maksimum değer kontrolü
    if (
      ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(event.key)
    ) {
      const selectionStart = input.selectionStart || 0
      const selectionEnd = input.selectionEnd || 0
      const currentValue = input.value

      // Seçim varsa değer farklı olacak, yoksa karakter eklenecek
      let newValueStr = ''
      if (selectionStart !== selectionEnd) {
        // Seçili kısmı yeni değerle değiştir
        newValueStr =
          currentValue.substring(0, selectionStart) +
          event.key +
          currentValue.substring(selectionEnd)
      } else {
        // İmleç pozisyonuna karakter ekle
        newValueStr =
          currentValue.substring(0, selectionStart) +
          event.key +
          currentValue.substring(selectionStart)
      }

      // Yeni değer oluşacak mı kontrol et
      if (newValueStr !== '') {
        const newValue = parseFloat(newValueStr)
        const max = parseFloat(input.dataset.max || 'Infinity')
        const min = parseFloat(input.dataset.min || '0')

        // Eğer yeni değer max değeri aşacaksa tuşa basılmasını engelle
        if (!isNaN(newValue) && newValue > max) {
          event.preventDefault()
          return
        }

        // Eğer değer minimum değerin altına düşecekse ve başka karakter yoksa
        // (yani tamamen yeni bir değer giriliyor)
        if (
          !isNaN(newValue) &&
          newValue < min &&
          selectionStart === 0 &&
          selectionEnd === currentValue.length
        ) {
          event.preventDefault()
          return
        }
      }
    }
  }

  /**
   * Değeri doğrulayıp güncelleyen metod
   */
  private validateAndUpdateValue(element: CounterInputElement): void {
    const inputValue = element.input.value.trim()

    // Boş ise min değerine ayarla
    if (inputValue === '') {
      const min = parseFloat(element.input.dataset.min || '0')
      this.setInputValue(element, min)
      return
    }

    let currentValue = parseFloat(inputValue)

    // Geçersiz sayı girildiyse min değerine ayarla
    if (isNaN(currentValue)) {
      const min = parseFloat(element.input.dataset.min || '0')
      this.setInputValue(element, min)
      return
    }

    const min = parseFloat(element.input.dataset.min || '0')
    const max = parseFloat(element.input.dataset.max || 'Infinity')

    // Değerin min-max aralığında olmasını sağla
    if (currentValue < min) {
      currentValue = min
    } else if (currentValue > max) {
      currentValue = max
    }

    // Değeri güncelle
    this.setInputValue(element, currentValue)
  }

  /**
   * Değeri artır
   */
  private increment(element: CounterInputElement): void {
    const currentValue = parseFloat(element.input.value) || 0
    const step = parseFloat(element.input.dataset.step || '1')
    const max = parseFloat(element.input.dataset.max || 'Infinity')

    let newValue = currentValue + step

    // Maximum değeri aşmamasını sağla
    if (newValue > max) {
      newValue = max
    }

    // Değeri güncelle
    this.setInputValue(element, newValue)
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
  }

  /**
   * Artırma/azaltma butonlarının durumlarını güncelle
   */
  private updateButtonStates(element: CounterInputElement): void {
    const currentValue = parseFloat(element.input.value) || 0
    const min = parseFloat(element.input.dataset.min || '0')
    const max = parseFloat(element.input.dataset.max || 'Infinity')

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
   * Input değerini güncelle ve change event tetikle
   */
  private setInputValue(element: CounterInputElement, value: number): void {
    // Min-max sınırlarını kontrol et
    const min = parseFloat(element.input.dataset.min || '0')
    const max = parseFloat(element.input.dataset.max || 'Infinity')

    // Değeri sınırlar içinde tut
    let finalValue = value
    if (finalValue < min) finalValue = min
    if (finalValue > max) finalValue = max

    // Tam sayı ise nokta sonrası gösterme
    const formattedValue = Number.isInteger(finalValue)
      ? finalValue.toString()
      : finalValue.toString()

    // Önceki değer ile yeni değeri karşılaştır
    const currentValue = element.input.value

    // Değer değişmediyse işlem yapma
    if (currentValue === formattedValue) {
      return
    }

    // Görsel değeri güncelle
    element.input.value = formattedValue

    // Form değerini güncelle (programmatic olarak değiştirildiğinde değer değişmiyor olabilir)
    element.input.setAttribute('value', formattedValue)

    // Change event tetikle (diğer kodların bu değişiklikten haberdar olması için)
    const event = new Event('change', { bubbles: true })
    element.input.dispatchEvent(event)

    // Input event tetikle (kullanıcı değişikliği takip eden kütüphaneler için)
    const inputEvent = new Event('input', { bubbles: true })
    element.input.dispatchEvent(inputEvent)

    // Buton durumlarını güncelle
    this.updateButtonStates(element)
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
        this.validateAndUpdateValue(element)
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
