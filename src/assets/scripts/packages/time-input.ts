/**
 * TimeInput sınıfı - Mobil uyumlu saat-dakika girişi için özel bir arayüz bileşeni.
 * Tüm özellikler data-attribute'lar ile yönetilir.
 */
interface TimeInputOptions {
  container: string // CSS selektör - time input container'ları için
  onChange?: (
    time: { hours: number; minutes: number; formatted: string },
    element: HTMLElement,
  ) => void // Değişiklik olduğunda çalışacak callback
}

class TimeInput {
  private containers: HTMLElement[] = []
  private options: TimeInputOptions
  private eventListeners: WeakMap<HTMLElement, Function[]> = new WeakMap()

  /**
   * TimeInput constructor
   * @param options Başlangıç ayarları
   */
  constructor(options: TimeInputOptions) {
    this.options = {
      container: options.container,
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

    // DOM değişikliklerini dinle (data-auto-refresh="true" varsa)
    this.setupDOMObserver()
  }

  /**
   * DOM değişikliklerini gözlemleyen observer kurulumu
   */
  private setupDOMObserver(): void {
    // Sayfadaki tüm containerları kontrol et, eğer data-auto-refresh="true" varsa izle
    document
      .querySelectorAll<HTMLElement>(this.options.container)
      .forEach(container => {
        if (container.getAttribute('data-auto-refresh') === 'true') {
          const observer = new MutationObserver(() => {
            this.refresh()
          })

          observer.observe(document.body, {
            childList: true,
            subtree: true,
          })

          // Sayfadan ayrılırken observer'ları temizle
          window.addEventListener(
            'beforeunload',
            () => {
              observer.disconnect()
            },
            { once: true },
          )
        }
      })
  }

  /**
   * DOM'u yeniden tarayıp güncelleyen fonksiyon
   */
  public refresh(): void {
    // Önce mevcut event listenerları temizle
    this.removeAllEventListeners()

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
        // Varsayılan değerleri data-attributes'dan al
        this.setupInputDefaults(hoursInput, minutesInput, container)

        // Event listener'ları ekle
        this.setupInputEventListeners(
          container,
          hoursInput,
          minutesInput,
          minutesPlusBtn,
          minutesMinusBtn,
        )

        // Container'ı listeye ekle
        this.containers.push(container)
      }
    })
  }

  /**
   * Input ve buton varsayılan değerlerini data attribute'lardan ayarla
   */
  private setupInputDefaults(
    hoursInput: HTMLInputElement,
    minutesInput: HTMLInputElement,
    container: HTMLElement,
  ): void {
    // Mobil uyumluluk için gerekli attribute'ları ekle
    if (!hoursInput.hasAttribute('inputmode')) {
      hoursInput.setAttribute('inputmode', 'numeric')
    }

    if (!minutesInput.hasAttribute('inputmode')) {
      minutesInput.setAttribute('inputmode', 'numeric')
    }

    if (!hoursInput.hasAttribute('pattern')) {
      hoursInput.setAttribute('pattern', '[0-9]*')
    }

    if (!minutesInput.hasAttribute('pattern')) {
      minutesInput.setAttribute('pattern', '[0-9]*')
    }

    if (!hoursInput.hasAttribute('maxlength')) {
      hoursInput.setAttribute('maxlength', '2')
    }

    if (!minutesInput.hasAttribute('maxlength')) {
      minutesInput.setAttribute('maxlength', '2')
    }

    // Container'dan ve input'lardan data-attribute'ları al
    const is24Hour = container.getAttribute('data-is-24-hour') !== 'false' // Varsayılan true

    // Hours input için min-max-step değerlerini ayarla (eğer yoksa)
    if (!hoursInput.hasAttribute('data-min')) {
      hoursInput.setAttribute('data-min', '0')
    }

    if (!hoursInput.hasAttribute('data-max')) {
      hoursInput.setAttribute('data-max', is24Hour ? '23' : '12')
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

    // Butonların durumlarını güncelle
    const hoursValue = parseInt(hoursInput.value, 10)
    const minutesValue = parseInt(minutesInput.value, 10)
    const hoursMin = parseInt(hoursInput.getAttribute('data-min') || '0', 10)
    const hoursMax = parseInt(hoursInput.getAttribute('data-max') || '23', 10)
    const minutesMin = parseInt(
      minutesInput.getAttribute('data-min') || '0',
      10,
    )
    const minutesMax = parseInt(
      minutesInput.getAttribute('data-max') || '59',
      10,
    )

    // Container'a güncel saati data-attribute olarak ekle
    container.setAttribute('data-hours', hoursValue.toString())
    container.setAttribute('data-minutes', minutesValue.toString())
    container.setAttribute(
      'data-formatted-time',
      `${hoursValue.toString().padStart(2, '0')}:${minutesValue.toString().padStart(2, '0')}`,
    )
  }

  /**
   * Event listener'ları ekle ve yönet
   */
  private setupInputEventListeners(
    container: HTMLElement,
    hoursInput: HTMLInputElement,
    minutesInput: HTMLInputElement,
    minutesPlusBtn: HTMLElement,
    minutesMinusBtn: HTMLElement,
  ): void {
    // WeakMap'de listeyi oluştur
    if (!this.eventListeners.has(container)) {
      this.eventListeners.set(container, [])
    }

    const listeners = this.eventListeners.get(container) || []

    // Dakika artırma butonu
    const incrementListener = () => {
      this.incrementMinutes(container, hoursInput, minutesInput)
    }
    minutesPlusBtn.addEventListener('click', incrementListener)
    listeners.push(() =>
      minutesPlusBtn.removeEventListener('click', incrementListener),
    )

    // Dakika azaltma butonu
    const decrementListener = () => {
      this.decrementMinutes(container, hoursInput, minutesInput)
    }
    minutesMinusBtn.addEventListener('click', decrementListener)
    listeners.push(() =>
      minutesMinusBtn.removeEventListener('click', decrementListener),
    )

    // Saat input için event'ler
    const hoursFocusListener = () => {
      // Odaklanınca readonly'i kaldır
      hoursInput.readOnly = false
      setTimeout(() => {
        hoursInput.select()
      }, 0)
    }
    hoursInput.addEventListener('focus', hoursFocusListener)
    listeners.push(() =>
      hoursInput.removeEventListener('focus', hoursFocusListener),
    )

    const hoursBlurListener = () => {
      // Değeri doğrula ve formatla
      this.validateInput(hoursInput, 'hours', container)
      // Tekrar readonly yap
      setTimeout(() => {
        hoursInput.readOnly = true
      }, 100)
      this.triggerChangeEvent(container, hoursInput, minutesInput)
    }
    hoursInput.addEventListener('blur', hoursBlurListener)
    listeners.push(() =>
      hoursInput.removeEventListener('blur', hoursBlurListener),
    )

    // Dakika input için event'ler
    const minutesFocusListener = () => {
      // Odaklanınca readonly'i kaldır
      minutesInput.readOnly = false
      setTimeout(() => {
        minutesInput.select()
      }, 0)
    }
    minutesInput.addEventListener('focus', minutesFocusListener)
    listeners.push(() =>
      minutesInput.removeEventListener('focus', minutesFocusListener),
    )

    const minutesBlurListener = () => {
      // Değeri doğrula ve formatla
      this.validateInput(minutesInput, 'minutes', container)
      // Tekrar readonly yap
      setTimeout(() => {
        minutesInput.readOnly = true
      }, 100)
      this.triggerChangeEvent(container, hoursInput, minutesInput)
    }
    minutesInput.addEventListener('blur', minutesBlurListener)
    listeners.push(() =>
      minutesInput.removeEventListener('blur', minutesBlurListener),
    )

    // Input sınırlamalar (sadece sayısal karakterlere izin ver)
    const hoursKeydownListener = (e: KeyboardEvent) => {
      this.handleKeyInput(e, hoursInput)
    }
    hoursInput.addEventListener('keydown', hoursKeydownListener)
    listeners.push(() =>
      hoursInput.removeEventListener('keydown', hoursKeydownListener),
    )

    const minutesKeydownListener = (e: KeyboardEvent) => {
      this.handleKeyInput(e, minutesInput)
    }
    minutesInput.addEventListener('keydown', minutesKeydownListener)
    listeners.push(() =>
      minutesInput.removeEventListener('keydown', minutesKeydownListener),
    )

    // Input değişikliklerini takip et
    const hoursInputListener = () => {
      // Sadece sayı karakterlerine izin ver
      hoursInput.value = hoursInput.value.replace(/[^\d]/g, '')
    }
    hoursInput.addEventListener('input', hoursInputListener)
    listeners.push(() =>
      hoursInput.removeEventListener('input', hoursInputListener),
    )

    const minutesInputListener = () => {
      // Sadece sayı karakterlerine izin ver
      minutesInput.value = minutesInput.value.replace(/[^\d]/g, '')
    }
    minutesInput.addEventListener('input', minutesInputListener)
    listeners.push(() =>
      minutesInput.removeEventListener('input', minutesInputListener),
    )

    // Enter tuşuna basıldığında blur'a neden ol
    const hoursEnterListener = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        hoursInput.blur()
      }
    }
    hoursInput.addEventListener('keydown', hoursEnterListener)
    listeners.push(() =>
      hoursInput.removeEventListener('keydown', hoursEnterListener),
    )

    const minutesEnterListener = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        minutesInput.blur()
      }
    }
    minutesInput.addEventListener('keydown', minutesEnterListener)
    listeners.push(() =>
      minutesInput.removeEventListener('keydown', minutesEnterListener),
    )

    // Mobil cihazlarda dokunma desteği
    const hoursTouchListener = (e: TouchEvent) => {
      if (hoursInput.readOnly) {
        // Only prevent default if readonly to allow standard behavior when editable
        e.preventDefault()
        hoursInput.readOnly = false
        hoursInput.focus()
        setTimeout(() => {
          hoursInput.select()
        }, 0)
      }
    }
    hoursInput.addEventListener('touchstart', hoursTouchListener)
    listeners.push(() =>
      hoursInput.removeEventListener('touchstart', hoursTouchListener),
    )

    const minutesTouchListener = (e: TouchEvent) => {
      if (minutesInput.readOnly) {
        // Only prevent default if readonly to allow standard behavior when editable
        e.preventDefault()
        minutesInput.readOnly = false
        minutesInput.focus()
        setTimeout(() => {
          minutesInput.select()
        }, 0)
      }
    }
    minutesInput.addEventListener('touchstart', minutesTouchListener)
    listeners.push(() =>
      minutesInput.removeEventListener('touchstart', minutesTouchListener),
    )

    // Event listenerları kaydet
    this.eventListeners.set(container, listeners)
  }

  /**
   * Klavye tuş girişlerini işler
   */
  private handleKeyInput(event: KeyboardEvent, input: HTMLInputElement): void {
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
      }
    }
  }

  /**
   * Dakika değerini artırır ve gerekirse saati de artırır
   */
  private incrementMinutes(
    container: HTMLElement,
    hoursInput: HTMLInputElement,
    minutesInput: HTMLInputElement,
  ): void {
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
      const is24Hour = container.getAttribute('data-is-24-hour') !== 'false'
      const hoursMax = parseInt(
        hoursInput.getAttribute('data-max') || (is24Hour ? '23' : '12'),
        10,
      )
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

    // Değişiklik olayını tetikle
    this.triggerChangeEvent(container, hoursInput, minutesInput)
  }

  /**
   * Dakika değerini azaltır ve gerekirse saati de azaltır
   */
  private decrementMinutes(
    container: HTMLElement,
    hoursInput: HTMLInputElement,
    minutesInput: HTMLInputElement,
  ): void {
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
      const is24Hour = container.getAttribute('data-is-24-hour') !== 'false'
      const hoursMax = parseInt(
        hoursInput.getAttribute('data-max') || (is24Hour ? '23' : '12'),
        10,
      )
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

    // Değişiklik olayını tetikle
    this.triggerChangeEvent(container, hoursInput, minutesInput)
  }

  /**
   * Input değerini doğrula ve formatla (sınır kontrolü yapar)
   */
  private validateInput(
    input: HTMLInputElement,
    type: 'hours' | 'minutes',
    container: HTMLElement,
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
    const is24Hour = container.getAttribute('data-is-24-hour') !== 'false'
    const max = parseInt(
      input.getAttribute('data-max') ||
        (type === 'hours' ? (is24Hour ? '23' : '12') : '59'),
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
  }

  /**
   * Change event'i tetikle
   */
  private triggerChangeEvent(
    container: HTMLElement,
    hoursInput: HTMLInputElement,
    minutesInput: HTMLInputElement,
  ): void {
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
    let container: HTMLElement | null = null

    if (typeof indexOrContainer === 'number') {
      container = this.containers[indexOrContainer] || null
    } else {
      container = indexOrContainer
    }

    if (!container) {
      return '00:00'
    }

    return container.getAttribute('data-formatted-time') || '00:00'
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
    let container: HTMLElement | null = null

    if (typeof indexOrContainer === 'number') {
      container = this.containers[indexOrContainer] || null
    } else {
      container = indexOrContainer
    }

    if (!container) {
      return { hours: 0, minutes: 0 }
    }

    const hours = parseInt(container.getAttribute('data-hours') || '0', 10)
    const minutes = parseInt(container.getAttribute('data-minutes') || '0', 10)

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
    let container: HTMLElement | null = null

    if (typeof indexOrContainer === 'number') {
      container = this.containers[indexOrContainer] || null
    } else {
      container = indexOrContainer
    }

    if (!container) {
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

    // Input'ları bul
    const hoursInput =
      container.querySelector<HTMLInputElement>('.time-input-hours')
    const minutesInput = container.querySelector<HTMLInputElement>(
      '.time-input-minutes',
    )

    if (hoursInput && minutesInput) {
      // Değerleri güncelle
      hoursInput.value = hours.toString().padStart(2, '0')
      minutesInput.value = minutes.toString().padStart(2, '0')

      // Değişiklik olayını tetikle
      this.triggerChangeEvent(container, hoursInput, minutesInput)
    }
  }

  /**
   * Belirli bir container için event listenerları temizler
   */
  private removeEventListeners(container: HTMLElement): void {
    const listeners = this.eventListeners.get(container)

    if (listeners && listeners.length) {
      // Her bir listener'ı çalıştır (cleanup)
      listeners.forEach(cleanup => {
        if (typeof cleanup === 'function') {
          cleanup()
        }
      })

      // Listeners listesini temizle
      this.eventListeners.set(container, [])
    }
  }

  /**
   * Tüm containerlar için event listenerları temizler
   */
  private removeAllEventListeners(): void {
    this.containers.forEach(container => {
      this.removeEventListeners(container)
    })
  }

  /**
   * TimeInput instance'ını temizler ve kaynakları serbest bırakır
   */
  public destroy(): void {
    // Tüm event listenerları temizle
    this.removeAllEventListeners()

    // Containers'ı temizle
    this.containers = []
  }
}

export { TimeInput }
