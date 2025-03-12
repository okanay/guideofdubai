/**
 * TimeInput sınıfı - HTML sayfasında saat-dakika girişi yapabilen özel bir arayüz bileşeni.
 * Sadece iki buton vardır (dakika artırma/azaltma) ve dakika değeri 60'ı geçerse saat otomatik artar.
 */
interface TimeInputOptions {
  container: string // CSS selektör - time input container'ları için
  autoRefresh?: boolean // DOM'daki değişiklikleri izleyip otomatik güncelleme yapıp yapmayacağı
  is24Hour?: boolean // 24 saat formatı mı kullanılacak (true) yoksa 12 saat mi (false)
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
  private touchTimeout: number | null = null
  private lastTap: { time: number; element: HTMLInputElement | null } = {
    time: 0,
    element: null,
  }

  /**
   * TimeInput constructor
   * @param options Başlangıç ayarları
   */
  constructor(options: TimeInputOptions) {
    // Varsayılan ayarlar ile kullanıcı ayarlarını birleştir
    this.options = {
      container: options.container,
      autoRefresh: options.autoRefresh || false,
      is24Hour: options.is24Hour !== undefined ? options.is24Hour : true,
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
        // Varsayılan değerleri ayarla (eğer yoksa)
        this.setupDefaultValues(container, hoursInput, minutesInput)

        const timeElement: TimeInputElement = {
          container,
          hoursInput,
          minutesInput,
          minutesPlusBtn,
          minutesMinusBtn,
        }

        // Event listener'ları ekle
        this.setupEventListeners(timeElement)

        // AutoRefresh aktifse, observer ekle
        if (this.options.autoRefresh) {
          this.setupObserver(timeElement)
        }

        // Container'ı listeye ekle
        this.containers.push(timeElement)

        // Butonları ilk durum için kontrol et
        this.updateButtonStates(timeElement)
      }
    })
  }

  /**
   * Varsayılan değerleri ayarla
   */
  private setupDefaultValues(
    container: HTMLElement,
    hoursInput: HTMLInputElement,
    minutesInput: HTMLInputElement,
  ): void {
    // Min-Max değerlerini ayarla (eğer data attribute'lardan belirtilmemişse)
    if (!hoursInput.hasAttribute('data-min')) {
      hoursInput.setAttribute('data-min', '0')
    }

    if (!hoursInput.hasAttribute('data-max')) {
      hoursInput.setAttribute('data-max', this.options.is24Hour ? '23' : '12')
    }

    if (!minutesInput.hasAttribute('data-min')) {
      minutesInput.setAttribute('data-min', '0')
    }

    if (!minutesInput.hasAttribute('data-max')) {
      minutesInput.setAttribute('data-max', '59')
    }

    // Step değerlerini ayarla (eğer belirtilmemişse)
    if (!hoursInput.hasAttribute('data-step')) {
      hoursInput.setAttribute('data-step', '1')
    }

    if (!minutesInput.hasAttribute('data-step')) {
      minutesInput.setAttribute('data-step', '5')
    }

    // Başlangıç değerlerini ayarla (eğer belirtilmemişse)
    if (!hoursInput.value) {
      hoursInput.value = '00'
    }

    if (!minutesInput.value) {
      minutesInput.value = '00'
    }

    // Input değerlerini formatlı göster
    this.formatHoursInput(hoursInput)
    this.formatMinutesInput(minutesInput)
  }

  /**
   * Event listener'ları ayarlar
   */
  private setupEventListeners(element: TimeInputElement): void {
    // Dakika artırma butonu
    element.minutesPlusBtn.addEventListener('click', () => {
      this.incrementMinutes(element)
    })

    // Dakika azaltma butonu
    element.minutesMinusBtn.addEventListener('click', () => {
      this.decrementMinutes(element)
    })

    // Saat input odaklanması ve çift tıklama
    element.hoursInput.addEventListener('focus', () => {
      // Odaklanınca tüm içeriği seç
      element.hoursInput.select()
      // Read-only'i kaldır ki değişiklik yapılabilsin
      element.hoursInput.readOnly = false
    })

    element.hoursInput.addEventListener('blur', () => {
      // Focus kaybedince değeri formatlı göster
      this.validateHoursInput(element)
      this.formatHoursInput(element.hoursInput)
      // Read-only yap
      element.hoursInput.readOnly = true
      this.updateButtonStates(element)
    })

    // Dakika input odaklanması ve çift tıklama
    element.minutesInput.addEventListener('focus', () => {
      // Odaklanınca tüm içeriği seç
      element.minutesInput.select()
      // Read-only'i kaldır ki değişiklik yapılabilsin
      element.minutesInput.readOnly = false
    })

    element.minutesInput.addEventListener('blur', () => {
      // Focus kaybedince değeri formatlı göster
      this.validateMinutesInput(element)
      this.formatMinutesInput(element.minutesInput)
      // Read-only yap
      element.minutesInput.readOnly = true
      this.updateButtonStates(element)
    })

    // Double tap algılama için touch event'lar
    element.hoursInput.addEventListener('touchend', e => {
      this.handleDoubleTap(e, element.hoursInput)
    })

    element.minutesInput.addEventListener('touchend', e => {
      this.handleDoubleTap(e, element.minutesInput)
    })

    // Klavye navigasyonu için key event'lar
    element.hoursInput.addEventListener('keydown', e => {
      this.handleKeyNavigation(e, element, 'hours')
    })

    element.minutesInput.addEventListener('keydown', e => {
      this.handleKeyNavigation(e, element, 'minutes')
    })
  }

  /**
   * Double tap olayını işler
   */
  private handleDoubleTap(
    event: TouchEvent,
    inputElement: HTMLInputElement,
  ): void {
    const currentTime = new Date().getTime()
    const tapLength = currentTime - this.lastTap.time

    // Double tap algılama (300ms içinde iki dokunuş)
    if (
      tapLength < 300 &&
      tapLength > 0 &&
      this.lastTap.element === inputElement
    ) {
      event.preventDefault()

      // Tüm içeriği seç
      inputElement.select()

      // Mobil klavyeyi göster
      inputElement.readOnly = false
      inputElement.focus()

      // Timeout temizle
      if (this.touchTimeout !== null) {
        clearTimeout(this.touchTimeout)
        this.touchTimeout = null
      }
    } else {
      // İlk dokunuş - timeout ayarla
      this.lastTap = { time: currentTime, element: inputElement }

      // Double tap fırsatı bittiğinde son tap bilgisini sıfırla
      this.touchTimeout = window.setTimeout(() => {
        this.lastTap = { time: 0, element: null }
        this.touchTimeout = null
      }, 300)
    }
  }

  /**
   * Klavye navigasyonunu işler
   */
  private handleKeyNavigation(
    event: KeyboardEvent,
    element: TimeInputElement,
    inputType: 'hours' | 'minutes',
  ): void {
    const input =
      inputType === 'hours' ? element.hoursInput : element.minutesInput

    // Yukarı/aşağı ok tuşları ile değer değiştirme
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (inputType === 'hours') {
        this.incrementHours(element)
      } else {
        this.incrementMinutes(element)
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (inputType === 'hours') {
        this.decrementHours(element)
      } else {
        this.decrementMinutes(element)
      }
    }
    // Sol/sağ ok tuşları ile inputlar arası geçiş
    else if (event.key === 'ArrowRight' && inputType === 'hours') {
      event.preventDefault()
      element.minutesInput.focus()
      element.minutesInput.select()
    } else if (event.key === 'ArrowLeft' && inputType === 'minutes') {
      event.preventDefault()
      element.hoursInput.focus()
      element.hoursInput.select()
    }
    // Enter tuşu ile inputtan çıkma
    else if (event.key === 'Enter') {
      event.preventDefault()
      input.blur()
    }
    // Sadece sayısal karakterlere izin ver
    else if (
      !/^\d$/.test(event.key) && // Sayısal karakter değilse
      event.key !== 'Backspace' &&
      event.key !== 'Delete' &&
      event.key !== 'Tab' &&
      !event.ctrlKey && // CTRL+C, CTRL+V gibi kombinasyonlara izin ver
      !event.metaKey // CMD+C, CMD+V gibi kombinasyonlara izin ver
    ) {
      event.preventDefault()
    }
  }

  /**
   * Saat değerini artırır
   */
  private incrementHours(element: TimeInputElement): void {
    const currentValue = parseInt(element.hoursInput.value, 10) || 0
    const step = parseInt(element.hoursInput.dataset.step || '1', 10)
    const min = parseInt(element.hoursInput.dataset.min || '0', 10)
    const max = parseInt(
      element.hoursInput.dataset.max || (this.options.is24Hour ? '23' : '12'),
      10,
    )

    let newValue = currentValue + step

    // Minimum ve maximum değerlerin dışına çıkmasını engelle (döngüsel olarak)
    if (newValue > max) {
      newValue = min
    }

    // Değeri güncelle
    this.setHoursValue(element, newValue)
    this.triggerChangeEvent(element)
  }

  /**
   * Saat değerini azaltır
   */
  private decrementHours(element: TimeInputElement): void {
    const currentValue = parseInt(element.hoursInput.value, 10) || 0
    const step = parseInt(element.hoursInput.dataset.step || '1', 10)
    const min = parseInt(element.hoursInput.dataset.min || '0', 10)
    const max = parseInt(
      element.hoursInput.dataset.max || (this.options.is24Hour ? '23' : '12'),
      10,
    )

    let newValue = currentValue - step

    // Minimum ve maximum değerlerin dışına çıkmasını engelle (döngüsel olarak)
    if (newValue < min) {
      newValue = max
    }

    // Değeri güncelle
    this.setHoursValue(element, newValue)
    this.triggerChangeEvent(element)
  }

  /**
   * Dakika değerini artırır ve gerekirse saati de artırır
   */
  private incrementMinutes(element: TimeInputElement): void {
    const currentValue = parseInt(element.minutesInput.value, 10) || 0
    const step = parseInt(element.minutesInput.dataset.step || '5', 10)
    const min = parseInt(element.minutesInput.dataset.min || '0', 10)
    const max = parseInt(element.minutesInput.dataset.max || '59', 10)

    let newValue = currentValue + step

    // Dakika maximum değeri geçerse, saati artır
    if (newValue > max) {
      const overflow = Math.floor(newValue / (max + 1))
      newValue = newValue % (max + 1)

      // Saati artır
      const hoursValue = parseInt(element.hoursInput.value, 10) || 0
      const hoursMax = parseInt(
        element.hoursInput.dataset.max || (this.options.is24Hour ? '23' : '12'),
        10,
      )
      const hoursMin = parseInt(element.hoursInput.dataset.min || '0', 10)

      let newHoursValue = hoursValue + overflow

      // Saat döngüsü için kontrol
      if (newHoursValue > hoursMax) {
        newHoursValue =
          hoursMin + ((newHoursValue - hoursMin) % (hoursMax - hoursMin + 1))
      }

      this.setHoursValue(element, newHoursValue)
    }

    // Değeri güncelle
    this.setMinutesValue(element, newValue)
    this.triggerChangeEvent(element)
  }

  /**
   * Dakika değerini azaltır ve gerekirse saati de azaltır
   */
  private decrementMinutes(element: TimeInputElement): void {
    const currentValue = parseInt(element.minutesInput.value, 10) || 0
    const step = parseInt(element.minutesInput.dataset.step || '5', 10)
    const min = parseInt(element.minutesInput.dataset.min || '0', 10)
    const max = parseInt(element.minutesInput.dataset.max || '59', 10)

    let newValue = currentValue - step

    // Dakika minimum değerin altına düşerse, saati azalt
    if (newValue < min) {
      const overflow = Math.ceil(Math.abs(newValue) / (max + 1))
      newValue = max - (Math.abs(newValue) % (max + 1))
      if (newValue === max + 1) newValue = 0 // Düzeltme

      // Saati azalt
      const hoursValue = parseInt(element.hoursInput.value, 10) || 0
      const hoursMax = parseInt(
        element.hoursInput.dataset.max || (this.options.is24Hour ? '23' : '12'),
        10,
      )
      const hoursMin = parseInt(element.hoursInput.dataset.min || '0', 10)

      let newHoursValue = hoursValue - overflow

      // Saat döngüsü için kontrol
      if (newHoursValue < hoursMin) {
        newHoursValue =
          hoursMax -
          ((hoursMin - newHoursValue - 1) % (hoursMax - hoursMin + 1))
      }

      this.setHoursValue(element, newHoursValue)
    }

    // Değeri güncelle
    this.setMinutesValue(element, newValue)
    this.triggerChangeEvent(element)
  }

  /**
   * Artırma/azaltma butonlarının durumlarını güncelle
   */
  private updateButtonStates(element: TimeInputElement): void {
    // Tüm saatler için döngüsel olduğundan butonları devre dışı bırakmıyoruz
    element.minutesPlusBtn.removeAttribute('disabled')
    element.minutesMinusBtn.removeAttribute('disabled')
  }

  /**
   * Saat input değerini doğrula ve formatla
   */
  private validateHoursInput(element: TimeInputElement): void {
    // Sayısal olmayan karakterleri temizle
    let value = element.hoursInput.value.replace(/[^\d]/g, '')

    // Sayısal değere dönüştür
    let numValue = parseInt(value, 10) || 0

    // Min-max sınırları içinde olmasını sağla
    const min = parseInt(element.hoursInput.dataset.min || '0', 10)
    const max = parseInt(
      element.hoursInput.dataset.max || (this.options.is24Hour ? '23' : '12'),
      10,
    )

    if (numValue < min) {
      numValue = min
    } else if (numValue > max) {
      numValue = max
    }

    // Değeri formatlanmış olarak güncelle
    this.setHoursValue(element, numValue)
    this.triggerChangeEvent(element)
  }

  /**
   * Dakika input değerini doğrula ve formatla
   */
  private validateMinutesInput(element: TimeInputElement): void {
    // Sayısal olmayan karakterleri temizle
    let value = element.minutesInput.value.replace(/[^\d]/g, '')

    // Sayısal değere dönüştür
    let numValue = parseInt(value, 10) || 0

    // Min-max sınırları içinde olmasını sağla
    const min = parseInt(element.minutesInput.dataset.min || '0', 10)
    const max = parseInt(element.minutesInput.dataset.max || '59', 10)

    if (numValue < min) {
      numValue = min
    } else if (numValue > max) {
      numValue = max
    }

    // Değeri formatlanmış olarak güncelle
    this.setMinutesValue(element, numValue)
    this.triggerChangeEvent(element)
  }

  /**
   * Saat değerini formatlı olarak güncelle
   */
  private setHoursValue(element: TimeInputElement, value: number): void {
    // 2 haneli formatta göster (başında sıfır ile)
    const formattedValue = value.toString().padStart(2, '0')

    // Değeri güncelle
    element.hoursInput.value = formattedValue
    element.hoursInput.setAttribute('value', formattedValue)
  }

  /**
   * Dakika değerini formatlı olarak güncelle
   */
  private setMinutesValue(element: TimeInputElement, value: number): void {
    // 2 haneli formatta göster (başında sıfır ile)
    const formattedValue = value.toString().padStart(2, '0')

    // Değeri güncelle
    element.minutesInput.value = formattedValue
    element.minutesInput.setAttribute('value', formattedValue)
  }

  /**
   * Saat değerini formatlı göster
   */
  private formatHoursInput(input: HTMLInputElement): void {
    let value = input.value.replace(/[^\d]/g, '') // Sayısal olmayan karakterleri temizle
    let numValue = parseInt(value, 10) || 0 // Sayısal değere dönüştür

    // Min-max sınırları içinde olmasını sağla
    const min = parseInt(input.dataset.min || '0', 10)
    const max = parseInt(
      input.dataset.max || (this.options.is24Hour ? '23' : '12'),
      10,
    )

    if (numValue < min) numValue = min
    if (numValue > max) numValue = max

    // 2 haneli formatta göster (başında sıfır ile)
    input.value = numValue.toString().padStart(2, '0')
  }

  /**
   * Dakika değerini formatlı göster
   */
  private formatMinutesInput(input: HTMLInputElement): void {
    let value = input.value.replace(/[^\d]/g, '') // Sayısal olmayan karakterleri temizle
    let numValue = parseInt(value, 10) || 0 // Sayısal değere dönüştür

    // Min-max sınırları içinde olmasını sağla
    const min = parseInt(input.dataset.min || '0', 10)
    const max = parseInt(input.dataset.max || '59', 10)

    if (numValue < min) numValue = min
    if (numValue > max) numValue = max

    // 2 haneli formatta göster (başında sıfır ile)
    input.value = numValue.toString().padStart(2, '0')
  }

  /**
   * Change event'i tetikle
   */
  private triggerChangeEvent(element: TimeInputElement): void {
    // Her iki input için de change event'i tetikle
    const hoursEvent = new Event('change', { bubbles: true })
    element.hoursInput.dispatchEvent(hoursEvent)

    const minutesEvent = new Event('change', { bubbles: true })
    element.minutesInput.dispatchEvent(minutesEvent)

    // Input event'leri de tetikle
    const hoursInputEvent = new Event('input', { bubbles: true })
    element.hoursInput.dispatchEvent(hoursInputEvent)

    const minutesInputEvent = new Event('input', { bubbles: true })
    element.minutesInput.dispatchEvent(minutesInputEvent)

    // Container'a custom time-change event'i gönder
    const timeChangeEvent = new CustomEvent('time-change', {
      bubbles: true,
      detail: {
        hours: parseInt(element.hoursInput.value, 10) || 0,
        minutes: parseInt(element.minutesInput.value, 10) || 0,
        formattedTime: this.getFormattedTime(element),
      },
    })
    element.container.dispatchEvent(timeChangeEvent)
  }

  /**
   * Formatlanmış saat değerini al (HH:MM)
   */
  public getFormattedTime(element: TimeInputElement): string {
    const hours = (parseInt(element.hoursInput.value, 10) || 0)
      .toString()
      .padStart(2, '0')
    const minutes = (parseInt(element.minutesInput.value, 10) || 0)
      .toString()
      .padStart(2, '0')

    return `${hours}:${minutes}`
  }

  /**
   * Sayısal saat değerini al (saat + dakika/60)
   */
  public getNumericTime(element: TimeInputElement): number {
    const hours = parseInt(element.hoursInput.value, 10) || 0
    const minutes = parseInt(element.minutesInput.value, 10) || 0

    return hours + minutes / 60
  }

  /**
   * HH:MM formatındaki string'i saat ve dakika değerlerine ayırıp element'lere uygula
   */
  public setTime(element: TimeInputElement, timeString: string): void {
    // HH:MM formatını parçala
    const parts = timeString.split(':')

    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10) || 0
      const minutes = parseInt(parts[1], 10) || 0

      // Değerleri güncelle
      this.setHoursValue(element, hours)
      this.setMinutesValue(element, minutes)
      this.triggerChangeEvent(element)
    }
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
        this.validateHoursInput(element)
        this.validateMinutesInput(element)
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

export { TimeInput }
