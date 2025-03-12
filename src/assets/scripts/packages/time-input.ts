/**
 * TimeInput sınıfı - Mobil uyumlu saat-dakika girişi için özel bir arayüz bileşeni.
 * Tüm özellikler data-attribute'lar ile yönetilir.
 */
interface TimeInputOptions {
  container: string // CSS selektör - time input container'ları için
  autoRefresh?: boolean // DOM'daki değişiklikleri izleyip otomatik güncelleme yapıp yapmayacağı
  onChange?: (
    time: { hours: number; minutes: number; formatted: string },
    element: HTMLElement,
  ) => void // Değişiklik olduğunda çalışacak callback
}

interface TimeInputElement {
  container: HTMLElement
  hoursInput: HTMLInputElement
  minutesInput: HTMLInputElement
  minutesPlusBtn: HTMLElement
  minutesMinusBtn: HTMLElement
  observer?: MutationObserver
}

class TimeInput {
  private containers: TimeInputElement[] = []
  private options: TimeInputOptions

  /**
   * TimeInput constructor
   * @param options Başlangıç ayarları
   */
  constructor(options: TimeInputOptions) {
    // Varsayılan ayarlar ile kullanıcı ayarlarını birleştir
    this.options = {
      container: options.container,
      autoRefresh: options.autoRefresh || false,
      onChange: options.onChange,
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

    // Tüm time input container'larını bul
    const containerElements = document.querySelectorAll<HTMLElement>(
      this.options.container,
    )

    // Her bir container için elemanları ve event listener'ları ayarla
    containerElements.forEach((container: HTMLElement) => {
      // Gerekli elementleri bul
      const hoursInput =
        container.querySelector<HTMLInputElement>('.time-input-hours')
      const minutesInput = container.querySelector<HTMLInputElement>(
        '.time-input-minutes',
      )
      const minutesPlusBtn = container.querySelector<HTMLElement>(
        '.time-input-minutes-plus-btn',
      )
      const minutesMinusBtn = container.querySelector<HTMLElement>(
        '.time-input-minutes-minus-btn',
      )

      if (hoursInput && minutesInput && minutesPlusBtn && minutesMinusBtn) {
        const timeElement: TimeInputElement = {
          container,
          hoursInput,
          minutesInput,
          minutesPlusBtn,
          minutesMinusBtn,
        }

        // Mobil uyumluluk için input ayarları
        this.setupInputDefaults(timeElement)

        // Event listener'ları ekle
        this.setupEventListeners(timeElement)

        // AutoRefresh aktifse, observer ekle
        if (this.options.autoRefresh) {
          this.setupObserver(timeElement)
        }

        // Container'ı listeye ekle
        this.containers.push(timeElement)

        // İlk değeri ve durumları ayarla
        this.updateInputValues(timeElement)
      }
    })
  }

  /**
   * Input ve buton varsayılan değerlerini ayarla
   */
  private setupInputDefaults(element: TimeInputElement): void {
    const { hoursInput, minutesInput } = element

    // Readonly özelliğini kaldır
    hoursInput.removeAttribute('readonly')
    minutesInput.removeAttribute('readonly')

    // Mobil uyumluluk için gerekli attribute'ları ekle
    hoursInput.setAttribute('inputmode', 'numeric')
    minutesInput.setAttribute('inputmode', 'numeric')
    hoursInput.setAttribute('pattern', '[0-9]*')
    minutesInput.setAttribute('pattern', '[0-9]*')
    hoursInput.setAttribute('maxlength', '2')
    minutesInput.setAttribute('maxlength', '2')

    // Hours input için min-max-step değerlerini ayarla (eğer yoksa)
    if (!hoursInput.hasAttribute('data-min')) {
      hoursInput.setAttribute('data-min', '0')
    }

    if (!hoursInput.hasAttribute('data-max')) {
      hoursInput.setAttribute('data-max', '23')
    }

    if (!hoursInput.hasAttribute('data-step')) {
      hoursInput.setAttribute('data-step', '1')
    }

    // Minutes input için min-max-step değerlerini ayarla (eğer yoksa)
    if (!minutesInput.hasAttribute('data-min')) {
      minutesInput.setAttribute('data-min', '0')
    }

    if (!minutesInput.hasAttribute('data-max')) {
      minutesInput.setAttribute('data-max', '59')
    }

    if (!minutesInput.hasAttribute('data-step')) {
      minutesInput.setAttribute('data-step', '5')
    }

    // Başlangıç değerlerini ayarla (eğer yoksa)
    if (!hoursInput.value) {
      hoursInput.value = '00'
    }

    if (!minutesInput.value) {
      minutesInput.value = '00'
    }

    // Değerleri formatla
    this.formatInputValue(hoursInput)
    this.formatInputValue(minutesInput)
  }

  /**
   * Event listener'ları ayarlar
   */
  private setupEventListeners(element: TimeInputElement): void {
    const { hoursInput, minutesInput, minutesPlusBtn, minutesMinusBtn } =
      element

    // Dakika artırma butonu
    minutesPlusBtn.addEventListener('click', () => {
      this.incrementMinutes(element)
    })

    // Dakika azaltma butonu
    minutesMinusBtn.addEventListener('click', () => {
      this.decrementMinutes(element)
    })

    // Saat inputu için event'ler
    hoursInput.addEventListener('focus', () => {
      // Odaklanınca tüm metni seç
      hoursInput.select()
    })

    hoursInput.addEventListener('blur', () => {
      // Değeri doğrula ve güncelle
      this.validateInput(hoursInput, 'hours')
      this.updateInputValues(element)
    })

    hoursInput.addEventListener('input', e => {
      // Input öncesi değer
      const oldValue = hoursInput.value

      // Sadece sayı karakterlerine izin ver
      let newValue = hoursInput.value.replace(/[^\d]/g, '')

      // Sınırları kontrol et
      if (newValue !== '') {
        const numValue = parseInt(newValue, 10)
        const max = parseInt(hoursInput.getAttribute('data-max') || '23', 10)

        // Maksimum değeri aşıyorsa, maksimuma sabitle
        if (!isNaN(numValue) && numValue > max) {
          newValue = max.toString()
        }
      }

      // Değer değiştiyse güncelle
      if (oldValue !== newValue) {
        hoursInput.value = newValue
      }
    })

    hoursInput.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleKeyInput(e, hoursInput, 'hours')
      if (e.key === 'Enter') {
        hoursInput.blur()
      }
    })

    // Dakika inputu için event'ler
    minutesInput.addEventListener('focus', () => {
      // Odaklanınca tüm metni seç
      minutesInput.select()
    })

    minutesInput.addEventListener('blur', () => {
      // Değeri doğrula ve güncelle
      this.validateInput(minutesInput, 'minutes')
      this.updateInputValues(element)
    })

    minutesInput.addEventListener('input', e => {
      // Input öncesi değer
      const oldValue = minutesInput.value

      // Sadece sayı karakterlerine izin ver
      let newValue = minutesInput.value.replace(/[^\d]/g, '')

      // Sınırları kontrol et
      if (newValue !== '') {
        const numValue = parseInt(newValue, 10)
        const max = parseInt(minutesInput.getAttribute('data-max') || '59', 10)

        // Maksimum değeri aşıyorsa, maksimuma sabitle
        if (!isNaN(numValue) && numValue > max) {
          newValue = max.toString()
        }
      }

      // Değer değiştiyse güncelle
      if (oldValue !== newValue) {
        minutesInput.value = newValue
      }
    })

    minutesInput.addEventListener('keydown', (e: KeyboardEvent) => {
      this.handleKeyInput(e, minutesInput, 'minutes')
      if (e.key === 'Enter') {
        minutesInput.blur()
      }
    })

    // Mobil cihazlarda dokunma desteği
    hoursInput.addEventListener('touchstart', (e: TouchEvent) => {
      // Readonly özelliğini kontrol et ve varsa kaldır
      if (hoursInput.hasAttribute('readonly')) {
        hoursInput.removeAttribute('readonly')
      }
      hoursInput.focus()
      setTimeout(() => {
        hoursInput.select()
      }, 0)
    })

    minutesInput.addEventListener('touchstart', (e: TouchEvent) => {
      // Readonly özelliğini kontrol et ve varsa kaldır
      if (minutesInput.hasAttribute('readonly')) {
        minutesInput.removeAttribute('readonly')
      }
      minutesInput.focus()
      setTimeout(() => {
        minutesInput.select()
      }, 0)
    })
  }

  /**
   * AutoRefresh için observer kurar
   */
  private setupObserver(element: TimeInputElement): void {
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
        this.updateInputValues(element)
      }
    })

    // Observer'ı başlat ve input'taki data attribute'larını izle
    observer.observe(element.hoursInput, {
      attributes: true,
      attributeFilter: ['data-min', 'data-max', 'data-step'],
    })

    observer.observe(element.minutesInput, {
      attributes: true,
      attributeFilter: ['data-min', 'data-max', 'data-step'],
    })

    // Observer'ı element'e kaydet
    element.observer = observer
  }

  /**
   * Klavye tuş girişlerini işler
   */
  private handleKeyInput(
    event: KeyboardEvent,
    input: HTMLInputElement,
    type: 'hours' | 'minutes',
  ): void {
    // Sadece izin verilen tuşlara izin ver
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

    // Maksimum 2 karakter sınırlaması
    if (
      input.value.length >= 2 &&
      ![
        'Backspace',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        'Tab',
        'Enter',
      ].includes(event.key)
    ) {
      // Eğer seçili metin varsa, değiştirmeye izin ver
      if (input.selectionStart === input.selectionEnd) {
        event.preventDefault()
        return
      }
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
        const newValue = parseInt(newValueStr, 10)
        const max = parseInt(
          input.getAttribute('data-max') || (type === 'hours' ? '23' : '59'),
          10,
        )
        const min = parseInt(input.getAttribute('data-min') || '0', 10)

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
   * Dakika değerini artırır ve gerekirse saati de artırır
   */
  private incrementMinutes(element: TimeInputElement): void {
    const { hoursInput, minutesInput } = element

    const minutesValue = parseInt(minutesInput.value, 10) || 0
    const step = parseInt(minutesInput.getAttribute('data-step') || '5', 10)
    const max = parseInt(minutesInput.getAttribute('data-max') || '59', 10)

    let newMinutesValue = minutesValue + step

    // Dakika sınırını aştıysa saati artır
    if (newMinutesValue > max) {
      const overflow = Math.floor(newMinutesValue / (max + 1))
      newMinutesValue = newMinutesValue % (max + 1)

      // Saati artır
      const hoursValue = parseInt(hoursInput.value, 10) || 0
      const hoursMax = parseInt(hoursInput.getAttribute('data-max') || '23', 10)
      const hoursMin = parseInt(hoursInput.getAttribute('data-min') || '0', 10)

      let newHoursValue = hoursValue + overflow

      // Saat sınırlarını aşarsa döngüsel olarak başa dön
      if (newHoursValue > hoursMax) {
        newHoursValue =
          hoursMin + ((newHoursValue - hoursMin) % (hoursMax - hoursMin + 1))
      }

      // Saati güncelle
      hoursInput.value = newHoursValue.toString().padStart(2, '0')
    }

    // Dakikayı güncelle
    minutesInput.value = newMinutesValue.toString().padStart(2, '0')

    // Input değerlerini güncelle
    this.updateInputValues(element)
  }

  /**
   * Dakika değerini azaltır ve gerekirse saati de azaltır
   */
  private decrementMinutes(element: TimeInputElement): void {
    const { hoursInput, minutesInput } = element

    const minutesValue = parseInt(minutesInput.value, 10) || 0
    const step = parseInt(minutesInput.getAttribute('data-step') || '5', 10)
    const min = parseInt(minutesInput.getAttribute('data-min') || '0', 10)
    const max = parseInt(minutesInput.getAttribute('data-max') || '59', 10)

    let newMinutesValue = minutesValue - step

    // Dakika sınırının altına düştüyse saati azalt
    if (newMinutesValue < min) {
      // Kaç saat azaltılacak
      const overflow = Math.ceil(Math.abs(newMinutesValue) / (max + 1))

      // Yeni dakika değeri
      newMinutesValue = max - (Math.abs(newMinutesValue) % (max + 1))
      if (newMinutesValue === max + 1) newMinutesValue = 0

      // Saati azalt
      const hoursValue = parseInt(hoursInput.value, 10) || 0
      const hoursMax = parseInt(hoursInput.getAttribute('data-max') || '23', 10)
      const hoursMin = parseInt(hoursInput.getAttribute('data-min') || '0', 10)

      let newHoursValue = hoursValue - overflow

      // Saat sınırlarının altına düşerse döngüsel olarak sona git
      if (newHoursValue < hoursMin) {
        newHoursValue =
          hoursMax -
          ((hoursMin - newHoursValue - 1) % (hoursMax - hoursMin + 1))
      }

      // Saati güncelle
      hoursInput.value = newHoursValue.toString().padStart(2, '0')
    }

    // Dakikayı güncelle
    minutesInput.value = newMinutesValue.toString().padStart(2, '0')

    // Input değerlerini güncelle
    this.updateInputValues(element)
  }

  /**
   * Input değerini doğrula ve formatla (sınır kontrolü yapar)
   */
  private validateInput(
    input: HTMLInputElement,
    type: 'hours' | 'minutes',
  ): void {
    // Sayısal olmayan karakterleri temizle
    let value = input.value.replace(/[^\d]/g, '')

    // Boş ise 0 olarak ayarla
    if (value === '') {
      value = '0'
    }

    let numValue = parseInt(value, 10)

    // Sınırları kontrol et
    const min = parseInt(input.getAttribute('data-min') || '0', 10)
    const max = parseInt(
      input.getAttribute('data-max') || (type === 'hours' ? '23' : '59'),
      10,
    )

    // Sınırlar içinde olmasını sağla
    if (numValue < min) {
      numValue = min
    } else if (numValue > max) {
      numValue = max
    }

    // Değeri formatla (2 basamaklı)
    input.value = numValue.toString().padStart(2, '0')

    // Form değerini de güncelle
    input.setAttribute('value', input.value)
  }

  /**
   * Input değerini formatlar (başına sıfır ekler)
   */
  private formatInputValue(input: HTMLInputElement): void {
    // Sayısal olmayan karakterleri temizle
    let value = input.value.replace(/[^\d]/g, '')

    // Boş ise 0 olarak ayarla
    if (value === '') {
      value = '0'
    }

    const numValue = parseInt(value, 10)

    // 2 basamaklı formatta göster
    input.value = numValue.toString().padStart(2, '0')

    // Form değerini de güncelle
    input.setAttribute('value', input.value)
  }

  /**
   * Tüm inputları ve container durumunu günceller
   */
  private updateInputValues(element: TimeInputElement): void {
    const { container, hoursInput, minutesInput } = element

    // Input'ları doğrula ve formatla
    this.validateInput(hoursInput, 'hours')
    this.validateInput(minutesInput, 'minutes')

    const hours = parseInt(hoursInput.value, 10) || 0
    const minutes = parseInt(minutesInput.value, 10) || 0
    const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`

    // Container'daki data attribute'ları güncelle
    container.setAttribute('data-hours', hours.toString())
    container.setAttribute('data-minutes', minutes.toString())
    container.setAttribute('data-formatted-time', formattedTime)

    // Custom event oluştur
    const timeChangeEvent = new CustomEvent('time-change', {
      bubbles: true,
      detail: {
        hours,
        minutes,
        formatted: formattedTime,
      },
    })

    // Event'i gönder
    container.dispatchEvent(timeChangeEvent)

    // Native change event tetikle (input'lar için)
    const changeEvent = new Event('change', { bubbles: true })
    hoursInput.dispatchEvent(changeEvent)
    minutesInput.dispatchEvent(changeEvent)

    // Native input event tetikle
    const inputEvent = new Event('input', { bubbles: true })
    hoursInput.dispatchEvent(inputEvent)
    minutesInput.dispatchEvent(inputEvent)

    // Callback fonksiyonu varsa çağır
    if (typeof this.options.onChange === 'function') {
      this.options.onChange(
        {
          hours,
          minutes,
          formatted: formattedTime,
        },
        container,
      )
    }
  }

  /**
   * Belirli bir index veya container için formatlanmış saat değerini döndürür
   * @param indexOrContainer Container dizisindeki index veya doğrudan container elementi
   * @returns HH:MM formatında zaman
   */
  public getFormattedTime(indexOrContainer: number | HTMLElement = 0): string {
    const element = this.getElement(indexOrContainer)

    if (!element) {
      return '00:00'
    }

    return element.container.getAttribute('data-formatted-time') || '00:00'
  }

  /**
   * Belirli bir index veya container için saat ve dakika değerlerini döndürür
   * @param indexOrContainer Container dizisindeki index veya doğrudan container elementi
   * @returns {hours, minutes} şeklinde bir nesne
   */
  public getTimeValues(indexOrContainer: number | HTMLElement = 0): {
    hours: number
    minutes: number
  } {
    const element = this.getElement(indexOrContainer)

    if (!element) {
      return { hours: 0, minutes: 0 }
    }

    const hours = parseInt(
      element.container.getAttribute('data-hours') || '0',
      10,
    )
    const minutes = parseInt(
      element.container.getAttribute('data-minutes') || '0',
      10,
    )

    return { hours, minutes }
  }

  /**
   * Belirli bir index veya container için saati ayarlar
   * @param time HH:MM formatında saat (örn: "09:30") veya {hours, minutes} nesnesi
   * @param indexOrContainer Container dizisindeki index veya doğrudan container elementi
   */
  public setTime(
    time: string | { hours: number; minutes: number },
    indexOrContainer: number | HTMLElement = 0,
  ): void {
    const element = this.getElement(indexOrContainer)

    if (!element) {
      return
    }

    // Hours ve minutes değerlerini al
    let hours = 0
    let minutes = 0

    if (typeof time === 'string') {
      // HH:MM formatını parçala
      const parts = time.split(':')

      if (parts.length >= 2) {
        hours = parseInt(parts[0], 10) || 0
        minutes = parseInt(parts[1], 10) || 0
      }
    } else {
      hours = time.hours
      minutes = time.minutes
    }

    // Değerleri güncelle
    element.hoursInput.value = hours.toString().padStart(2, '0')
    element.minutesInput.value = minutes.toString().padStart(2, '0')

    // Değişikliği uygula
    this.updateInputValues(element)
  }

  /**
   * Index veya HTMLElement'e göre container elementini bulur
   */
  private getElement(
    indexOrContainer: number | HTMLElement,
  ): TimeInputElement | null {
    if (typeof indexOrContainer === 'number') {
      return this.containers[indexOrContainer] || null
    } else {
      return (
        this.containers.find(item => item.container === indexOrContainer) ||
        null
      )
    }
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
   * TimeInput instance'ını temizler ve kaynakları serbest bırakır
   */
  public destroy(): void {
    // Tüm observer'ları temizle
    this.clearObservers()

    // Containers'ı temizle
    this.containers = []
  }
}

export { TimeInput }
