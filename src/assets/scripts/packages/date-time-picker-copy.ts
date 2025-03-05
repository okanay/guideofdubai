// Aşama 1: Temel Yapı ve Arayüzlerin Tasarımı

/**
 * Default CSS sınıfları
 */
const DEFAULT_CLASSES = {
  calendar: {
    grid: 'calendar-grid',
    dayHeader: 'day-header',
  },
  wrapper: {
    base: 'wrapper',
    hidden: 'date-hidden',
  },
  month: {
    container: 'month-container',
    current: 'month-current',
    pointer: {
      prev: {
        base: 'prev-pointer',
        disabled: 'prev-disabled',
      },
      next: {
        base: 'next-pointer',
        disabled: 'next-disabled',
      },
    },
  },
  day: {
    base: 'day',
    disabled: 'day-disabled',
    selected: 'day-selected',
    empty: 'day-empty',
    today: 'day-today',
  },
  time: {
    container: 'time-container',
    column: 'time-column',
    display: 'time-display',
    button: 'time-btn',
    separator: 'time-separator',
    ampm: {
      container: 'ampm-container',
      button: 'ampm-btn',
      selected: 'ampm-selected',
    },
  },
} as const

/**
 * Dil yapılandırması
 */
interface LanguageConfig {
  language: string
  monthNames: string[]
  dayNames: string[]
}

/**
 * Saat seçici yapılandırması
 */
interface TimePickerConfig {
  enabled: boolean
  use24HourFormat?: boolean
  minuteInterval?: number
  defaultHours?: number
  defaultMinutes?: number
}

/**
 * Çıktı formatı yapılandırması
 */
interface OutputConfig {
  order: string[] // ["day", "month", "year"]
  slash: string // "/" veya "-" veya "."
  between: string // " - " veya " & "
  fullFormat?: boolean
  backendFormat?: string[] // Backend formatı için
}

/**
 * DatePickerWithTime yapılandırması
 */
interface DatePickerWithTimeConfig {
  elements: {
    container: string
    monthContainer: string
    daysContainer: string
    timeContainer?: string
    buttons: {
      prev: string
      next: string
      reset?: string
      resetAll?: string
      close?: string
    }
  }
  input: {
    id: string
    focusContainer?: string
  }
  classes?: {
    day?: {
      base?: string
      disabled?: string
      selected?: string
      empty?: string
      today?: string
    }
    month?: {
      container?: string
      current?: string
      buttons?: {
        prev?: {
          base?: string
          disabled?: string
        }
        next?: {
          base?: string
          disabled?: string
        }
      }
    }
    calendar?: {
      grid?: string
      dayHeader?: string
    }
    wrapper?: {
      base?: string
      hidden?: string
    }
    time?: {
      container?: string
      column?: string
      display?: string
      button?: string
      separator?: string
      ampm?: {
        container?: string
        button?: string
        selected?: string
      }
    }
  }
  language: LanguageConfig[]
  output?: OutputConfig
  minDate?: Date
  maxDate?: Date
  autoClose?: boolean
  timePicker?: TimePickerConfig
}

type ResetType = 'today' | 'all' | 'soft'

interface ResetOptions {
  type: ResetType
  date?: Date
  language?: string
}

// Aşama 2: Veri Yapılarının Hazırlanması

/**
 * DatePickerWithTime sınıfı
 */
class DatePickerWithTime {
  private config: DatePickerWithTimeConfig
  private classes: typeof DEFAULT_CLASSES
  private containerElement: HTMLElement | null = null
  private monthContainer: HTMLElement | null = null
  private daysContainer: HTMLElement | null = null
  private timeContainer: HTMLElement | null = null

  private prevButton: HTMLElement | null = null
  private nextButton: HTMLElement | null = null
  private resetButton: HTMLElement | null = null
  private resetAllButton: HTMLElement | null = null
  private closeButton: HTMLElement | null = null

  private hoursDisplay: HTMLElement | null = null
  private minutesDisplay: HTMLElement | null = null
  private ampmToggle: HTMLElement | null = null

  public input: HTMLInputElement | null = null
  private focusContainer: HTMLElement | null = null

  private currentDate: Date
  private selectedDate: Date | null = null
  private hours: number = 12
  private minutes: number = 0
  private isPM: boolean = false

  private autoClose: boolean = true

  // Aşama 3: Constructor ve Başlatma Yöntemleri

  /**
   * DatePickerWithTime sınıfının constructor'ı
   * @param config DatePickerWithTime yapılandırması
   */
  constructor(config: DatePickerWithTimeConfig) {
    // Temel yapılandırmayı ayarla
    this.config = config
    this.classes = this.mergeClasses(DEFAULT_CLASSES, config.classes || {})
    this.currentDate = this.stripTime(new Date())
    this.autoClose = config.autoClose ?? this.autoClose

    // HTML elementlerini al
    this.containerElement = document.getElementById(config.elements.container)
    this.monthContainer = document.getElementById(
      config.elements.monthContainer,
    )
    this.daysContainer = document.getElementById(config.elements.daysContainer)

    if (config.elements.timeContainer) {
      this.timeContainer = document.getElementById(
        config.elements.timeContainer,
      )
    }

    this.prevButton = document.getElementById(config.elements.buttons.prev)
    this.nextButton = document.getElementById(config.elements.buttons.next)

    if (config.elements.buttons.reset) {
      this.resetButton = document.getElementById(config.elements.buttons.reset)
    }

    if (config.elements.buttons.resetAll) {
      this.resetAllButton = document.getElementById(
        config.elements.buttons.resetAll,
      )
    }

    if (config.elements.buttons.close) {
      this.closeButton = document.getElementById(config.elements.buttons.close)
    }

    // Input elementini al
    this.input = document.getElementById(config.input.id) as HTMLInputElement

    // Focus container'ı al (varsa)
    if (config.input.focusContainer) {
      this.focusContainer = document.getElementById(config.input.focusContainer)
    }

    // Min ve max tarihleri düzenle
    if (this.config.minDate) {
      this.config.minDate = this.stripTime(this.config.minDate)
    }

    if (this.config.maxDate) {
      this.config.maxDate = this.stripTime(this.config.maxDate)
    }

    // TimePicker özelliklerini data attribute'larından al
    if (this.input) {
      // Varsayılan tarih için data attribute kontrolü
      const defaultDateAttr = this.input.getAttribute('data-default-date')
      if (defaultDateAttr) {
        const defaultDate = this.parseDefaultDate(defaultDateAttr)
        if (defaultDate) {
          this.currentDate = this.stripTime(defaultDate)
          this.selectedDate = this.stripTime(defaultDate)
        }
      }

      // data attribute değerlerini kontrol et ve logla
      const timePickerAttr = this.input.getAttribute('data-timepicker')
      const defaultHoursAttr = this.input.getAttribute('data-default-hours')
      const defaultMinuteAttr = this.input.getAttribute('data-default-minute')
      const ampmAttr = this.input.getAttribute('data-ampm')
      const minuteIntervalAttr = this.input.getAttribute('data-minute-interval')

      // Input'taki data attributelerine öncelik verelim, ancak timePickerEnabled config'deki değeri de koruyalım
      const configTimePickerEnabled = this.config.timePicker?.enabled ?? false
      const timePickerEnabled =
        timePickerAttr !== null
          ? timePickerAttr === 'true'
          : configTimePickerEnabled

      // Diğer değerleri input'tan alırken, yalnızca değerler varsa ve use24HourFormat için tam tersi mantık kullanıyoruz
      const defaultHours =
        defaultHoursAttr !== null
          ? parseInt(defaultHoursAttr)
          : this.config.timePicker?.defaultHours || 12

      const defaultMinutes =
        defaultMinuteAttr !== null
          ? parseInt(defaultMinuteAttr)
          : this.config.timePicker?.defaultMinutes || 0

      // ampmAttr'ın "false" olması, 24 saat formatını KULLANMAK istediğimiz anlamına gelir (use24HourFormat = true)
      const use24HourFormat =
        ampmAttr !== null
          ? ampmAttr === 'false'
          : this.config.timePicker?.use24HourFormat || false

      const minuteInterval =
        minuteIntervalAttr !== null
          ? parseInt(minuteIntervalAttr)
          : this.config.timePicker?.minuteInterval || 1

      // TimePicker yapılandırmasını güncelle - önce input'taki değerlere öncelik ver
      this.config.timePicker = {
        enabled: timePickerEnabled,
        use24HourFormat: use24HourFormat,
        defaultHours: defaultHours,
        defaultMinutes: defaultMinutes,
        minuteInterval: minuteInterval,
      }

      // Varsayılan saat değerlerini ayarla
      if (this.config.timePicker?.enabled) {
        this.hours = this.config.timePicker.defaultHours || 12
        this.minutes = this.getNearestValidMinute(
          this.config.timePicker.defaultMinutes || 0,
        )
        this.isPM = !this.config.timePicker.use24HourFormat && this.hours >= 12

        // 24 saat formatında 12 varsayılan değerse 0 olarak ayarla
        if (this.config.timePicker.use24HourFormat && this.hours === 12) {
          this.hours = 0
        }
      }
    }

    // Saat seçici için elementleri al
    if (this.config.timePicker?.enabled && this.timeContainer) {
      this.hoursDisplay = this.timeContainer.querySelector('#hour-display')
      this.minutesDisplay = this.timeContainer.querySelector('#minute-display')
      this.ampmToggle = this.timeContainer.querySelector('#ampm-toggle')
    }

    // DatePicker'ı başlat
    if (this.containerElement && this.daysContainer && this.monthContainer) {
      this.initializeDatePicker()
      this.addEventListeners()
    } else {
      console.warn('Gerekli container elementleri bulunamadı.')
    }

    // DatePicker'ı gizle
    this.hideDatePicker()

    // Eğer varsayılan tarih varsa, input değerini güncelle
    if (this.selectedDate) {
      this.updateInputValue()
    }
  }

  /**
   * TimePicker için event listener'ları ekle - düzeltilmiş versiyon
   */
  private addTimePickerEventListeners(): void {
    if (!this.config.timePicker?.enabled || !this.timeContainer) {
      return
    }

    // Referansları al
    const hourUpBtn = this.timeContainer.querySelector('#hour-up')
    const hourDownBtn = this.timeContainer.querySelector('#hour-down')
    const minuteUpBtn = this.timeContainer.querySelector('#minute-up')
    const minuteDownBtn = this.timeContainer.querySelector('#minute-down')
    const ampmToggle = this.timeContainer.querySelector('#ampm-toggle')

    // Saat arttırma
    if (hourUpBtn) {
      // Önce eski event listener'ları kaldır (varsa)
      const newHourUpBtn = hourUpBtn.cloneNode(true)
      if (hourUpBtn.parentNode) {
        hourUpBtn.parentNode.replaceChild(newHourUpBtn, hourUpBtn)

        newHourUpBtn.addEventListener('click', e => {
          e.stopPropagation()
          this.changeHour('up')
        })
      }
    }

    // Saat azaltma
    if (hourDownBtn) {
      const newHourDownBtn = hourDownBtn.cloneNode(true)
      if (hourDownBtn.parentNode) {
        hourDownBtn.parentNode.replaceChild(newHourDownBtn, hourDownBtn)

        newHourDownBtn.addEventListener('click', e => {
          e.stopPropagation()
          this.changeHour('down')
        })
      }
    }

    // Dakika arttırma
    if (minuteUpBtn) {
      const newMinuteUpBtn = minuteUpBtn.cloneNode(true)
      if (minuteUpBtn.parentNode) {
        minuteUpBtn.parentNode.replaceChild(newMinuteUpBtn, minuteUpBtn)

        newMinuteUpBtn.addEventListener('click', e => {
          e.stopPropagation()
          this.changeMinute('up')
        })
      }
    }

    // Dakika azaltma
    if (minuteDownBtn) {
      const newMinuteDownBtn = minuteDownBtn.cloneNode(true)
      if (minuteDownBtn.parentNode) {
        minuteDownBtn.parentNode.replaceChild(newMinuteDownBtn, minuteDownBtn)

        newMinuteDownBtn.addEventListener('click', e => {
          e.stopPropagation()
          this.changeMinute('down')
        })
      }
    }

    // AM/PM toggle
    if (ampmToggle) {
      const newAmPmToggle = ampmToggle.cloneNode(true)
      if (ampmToggle.parentNode) {
        ampmToggle.parentNode.replaceChild(newAmPmToggle, ampmToggle)

        newAmPmToggle.addEventListener('click', e => {
          e.stopPropagation()
          this.toggleAMPM()
        })
      }

      // Referansı güncelle
      this.ampmToggle = newAmPmToggle as HTMLElement
    }

    // Referansları güncelle
    this.hoursDisplay = this.timeContainer.querySelector('#hour-display')
    this.minutesDisplay = this.timeContainer.querySelector('#minute-display')
  }

  /**
   * TimePicker'ı render et - Düzeltilmiş versiyon
   */
  private renderTimePicker(): void {
    if (!this.timeContainer || !this.config.timePicker?.enabled) {
      return
    }

    const is24Hour = this.config.timePicker.use24HourFormat

    // Saat ve dakika değerlerini formatla
    const displayHours = this.getDisplayHours().toString().padStart(2, '0')
    const displayMinutes = this.minutes.toString().padStart(2, '0')

    // Var olan elementlerin içeriğini güncelle
    if (this.hoursDisplay) {
      this.hoursDisplay.textContent = displayHours
    } else {
    }

    if (this.minutesDisplay) {
      this.minutesDisplay.textContent = displayMinutes
    } else {
    }

    // AM/PM toggle durumunu güncelle
    const ampmContainer = this.timeContainer.querySelector('#ampm-container')
    if (ampmContainer) {
      if (!is24Hour) {
        // 12 saat formatı kullanılıyorsa AM/PM container'ı göster
        if (ampmContainer instanceof HTMLElement) {
          ampmContainer.style.display = 'block'
        }

        if (this.ampmToggle) {
          this.ampmToggle.textContent = this.isPM ? 'PM' : 'AM'

          // AM/PM butonunun sınıflarını güncelle
          if (this.classes.time.ampm.selected) {
            const ampmClass = this.classes.time.ampm.selected
            if (this.isPM) {
              this.ampmToggle.classList.add(ampmClass)
            } else {
              this.ampmToggle.classList.remove(ampmClass)
            }
          }
        } else {
        }
      } else {
        // 24 saat formatı kullanılıyorsa AM/PM container'ı gizle
        if (ampmContainer instanceof HTMLElement) {
          ampmContainer.style.display = 'none'
        }
      }
    } else {
    }
  }

  /**
   * Varsayılan tarih formatını parse et
   * Format: YYYY-MM-DD (2025-05-06 gibi)
   */
  private parseDefaultDate(dateStr: string): Date | null {
    // Tarih formatını kontrol et (YYYY-MM-DD)
    const dateRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    const matches = dateStr.match(dateRegex)

    if (!matches) {
      console.warn(
        'Geçersiz default date formatı. Lütfen YYYY-MM-DD formatını kullanın.',
      )
      return null
    }

    const year = parseInt(matches[1])
    const month = parseInt(matches[2]) - 1 // Ay 0-tabanlı (0-11)
    const day = parseInt(matches[3])

    // Geçerli tarih kontrolü
    if (
      isNaN(year) ||
      isNaN(month) ||
      isNaN(day) ||
      month < 0 ||
      month > 11 ||
      day < 1 ||
      day > 31
    ) {
      console.warn('Geçersiz tarih değerleri.')
      return null
    }

    const date = new Date(year, month, day)

    // Tarih geçerliliğini kontrol et (örn. 31 Şubat gibi hatalı tarihler)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      console.warn('Geçersiz tarih.')
      return null
    }

    return date
  }

  /**
   * DatePicker'ı başlat
   */
  private initializeDatePicker(): void {
    // Elementlerin hazır olup olmadığını kontrol et
    if (!this.containerElement || !this.daysContainer || !this.monthContainer) {
      console.error('Gerekli container elementleri bulunamadı.')
      return
    }

    this.renderMonthHeader()
    this.renderCalendar()

    if (this.config.timePicker?.enabled && this.timeContainer) {
      // İlk oluşturma sırasında zaten HTML mevcut olacak, sadece değerleri güncelle
      this.hoursDisplay = this.timeContainer.querySelector('#hour-display')
      this.minutesDisplay = this.timeContainer.querySelector('#minute-display')
      this.ampmToggle = this.timeContainer.querySelector('#ampm-toggle')

      this.renderTimePicker()
    } else if (this.timeContainer) {
      // Zaman seçici devre dışıysa, container'ı gizle
      this.timeContainer.style.display = 'none'
    }

    this.updateNavigationState()
  }

  /**
   * CSS sınıflarını birleştir
   */
  private mergeClasses(
    defaults: typeof DEFAULT_CLASSES,
    custom: any,
  ): typeof DEFAULT_CLASSES {
    const merged = JSON.parse(JSON.stringify(defaults))

    // Her bir özellik grubunu birleştir
    if (custom.day) {
      Object.assign(merged.day, custom.day)
    }

    if (custom.month) {
      Object.assign(merged.month, custom.month)

      if (custom.month.buttons?.prev) {
        Object.assign(merged.month.pointer.prev, custom.month.buttons.prev)
      }

      if (custom.month.buttons?.next) {
        Object.assign(merged.month.pointer.next, custom.month.buttons.next)
      }
    }

    if (custom.calendar) {
      Object.assign(merged.calendar, custom.calendar)
    }

    if (custom.wrapper) {
      Object.assign(merged.wrapper, custom.wrapper)
    }

    if (custom.time) {
      Object.assign(merged.time, custom.time)

      if (custom.time.ampm) {
        Object.assign(merged.time.ampm, custom.time.ampm)
      }
    }

    return merged
  }

  /**
   * Event listener'ları ekle
   */
  private addEventListeners(): void {
    // Ay değiştirme butonları
    this.prevButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.safeChangeMonth('prev')
    })

    this.nextButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.safeChangeMonth('next')
    })

    // Reset butonları
    this.resetButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.resetState({ type: 'today' })
    })

    this.resetAllButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.resetState({ type: 'all' })
    })

    // Kapat butonu
    this.closeButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.safeClose()
    })

    // Gün seçimi
    this.daysContainer?.addEventListener('click', e => {
      e.stopPropagation()
      const target = e.target as HTMLElement

      if (target.classList.contains(this.classes.day.base)) {
        const dateStr = target.getAttribute('data-date')
        const monthType = target.getAttribute('data-month')

        if (!dateStr) return

        const date = new Date(dateStr)

        // Önceki/sonraki ay günlerine tıklanınca ay değişimi yap
        if (monthType === 'prev') {
          this.safeChangeMonth('prev')
          return
        } else if (monthType === 'next') {
          this.safeChangeMonth('next')
          return
        }

        // Disabled güne tıklanırsa işlem yapma
        if (target.classList.contains(this.classes.day.disabled)) {
          return
        }

        // Tarih seçimini yap
        this.selectDate(date)
      }
    })

    // TimePicker event listener'larını ekle
    this.addTimePickerEventListeners()

    // Input tıklaması
    this.input?.addEventListener('click', e => {
      e.stopPropagation()
      this.handleInputClick()
    })

    this.input?.addEventListener('focus', () => {
      this.handleInputClick()
    })

    // Dışarı tıklama
    document.addEventListener('click', e => {
      const target = e.target as HTMLElement
      const isDatePickerClick =
        this.containerElement && this.containerElement.contains(target)
      const isInputClick = this.input === target

      if (!isDatePickerClick && !isInputClick && this.isDatePickerVisible()) {
        this.safeClose()
      }
    })

    // Pencere boyut değişikliği
    window.addEventListener('resize', this.handleWindowResize)
  }

  /**
   * Input'a tıklanınca DatePicker'ı göster
   */
  private handleInputClick(): void {
    if (this.isDatePickerVisible()) {
      return
    }

    // Input'ta tarih varsa, o tarihi yükle
    if (this.input && this.input.value) {
      const dateStr = this.input.value.split(' & ')[0] // Tarih kısmını al
      const date = this.parseDisplayDate(dateStr)

      if (date) {
        this.currentDate = new Date(date)
        this.selectedDate = new Date(date)
      }
    }

    this.renderCalendar()
    this.renderMonthHeader()

    if (this.config.timePicker?.enabled && this.timeContainer) {
      this.renderTimePicker()
      // TimePicker event listener'larını yeniden ekle
      this.addTimePickerEventListeners()
    }

    this.updateNavigationState()
    this.positionDatePickerUnderInput()
    this.showDatePicker()

    // Focus container'ı güncelle
    if (this.focusContainer) {
      this.focusContainer.setAttribute('data-focus', 'true')
    }
  }

  /**
   * Pencere boyutu değişince DatePicker'ı yeniden konumlandır
   */
  private handleWindowResize = (): void => {
    if (this.isDatePickerVisible()) {
      this.positionDatePickerUnderInput()
    }
  }

  /**
   * DatePicker'ı göster
   */
  private showDatePicker(): void {
    if (this.containerElement && this.classes.wrapper.hidden) {
      this.containerElement.classList.remove(this.classes.wrapper.hidden)
    }
  }

  /**
   * DatePicker'ı gizle
   */
  private hideDatePicker(): void {
    if (this.containerElement && this.classes.wrapper.hidden) {
      this.containerElement.classList.add(this.classes.wrapper.hidden)
    }

    // Focus container'ı güncelle
    if (this.focusContainer) {
      this.focusContainer.setAttribute('data-focus', 'false')
    }
  }

  /**
   * DatePicker görünür mü?
   */
  private isDatePickerVisible(): boolean {
    return this.containerElement && this.classes.wrapper.hidden
      ? !this.containerElement.classList.contains(this.classes.wrapper.hidden)
      : false
  }

  /**
   * DatePicker'ı input'un altına konumlandır
   */
  private positionDatePickerUnderInput(): void {
    if (!this.containerElement || !this.input) return

    // Input element boyutları ve pozisyonu
    const inputRect = this.input.getBoundingClientRect()

    // Pencere boyutları
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // DatePicker boyutları
    const datePickerRect = this.containerElement.getBoundingClientRect()

    // Scroll pozisyonları
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft

    // Başlangıç pozisyonları
    let top = inputRect.bottom + scrollTop + 8 // 8px padding
    let left = inputRect.left + scrollLeft - 1.5

    // Sağ kenardan taşma kontrolü
    if (left + datePickerRect.width > windowWidth) {
      // Inputun sağ kenarına hizala
      left = inputRect.right + scrollLeft - datePickerRect.width

      // Hala taşıyorsa, pencere sağ kenarına hizala
      if (left < 0) {
        left = windowWidth - datePickerRect.width - 16 // 16px padding
      }
    }

    // Alt kenardan taşma kontrolü
    const bottomOverflow =
      top + datePickerRect.height > windowHeight + scrollTop
    const hasSpaceAbove = inputRect.top - datePickerRect.height - 16 > 0

    if (bottomOverflow && hasSpaceAbove) {
      // Üstte yeterli alan varsa, üste konumlandır
      top = inputRect.top + scrollTop - datePickerRect.height - 16
    } else if (bottomOverflow) {
      // Üstte de yeterli alan yoksa, mümkün olduğunca yukarı çek
      top = windowHeight + scrollTop - datePickerRect.height - 16
    }

    // Sol kenarın negatif olmamasını sağla
    left = Math.max(8, left)

    // Pozisyonu uygula
    this.containerElement.style.position = 'absolute'
    this.containerElement.style.top = `${Math.round(top)}px`
    this.containerElement.style.left = `${Math.round(left)}px`
    this.containerElement.style.zIndex = '100'
    this.containerElement.style.opacity = '100%'

    // Pozisyon için data attribute ekle (animasyon/stil için kullanışlı)
    this.containerElement.setAttribute(
      'data-position',
      bottomOverflow && hasSpaceAbove ? 'top' : 'bottom',
    )
  }

  /**
   * Güvenli kapatma
   */
  private safeClose(): void {
    // Hem tarih hem saat seçili mi kontrol et
    const hasValidDateTime =
      this.selectedDate !== null &&
      (this.config.timePicker?.enabled ? true : true) // Eğer timePicker etkin değilse tarih yeterli

    if (hasValidDateTime) {
      // Seçimleri inputa yansıt
      this.updateInputValue()
    } else {
      // Seçimleri temizle
      this.resetState({ type: 'soft' })
    }

    this.hideDatePicker()
  }

  /**
   * Input değerini güncelle
   */
  private updateInputValue(): void {
    if (!this.input || !this.selectedDate) return

    let value = this.formatDateBasedOnConfig(this.selectedDate)

    // TimePicker etkinse saat formatını ekle
    if (this.config.timePicker?.enabled) {
      const timeStr = this.formatTimeBasedOnConfig()
      value = `${value} & ${timeStr}`
    }

    this.input.value = value

    // Data attribute'larını güncelle
    this.updateDataAttributes()

    // Custom event tetikle (değer değiştiğinde harici kod için bildirim)
    const changeEvent = new Event('change', { bubbles: true })
    this.input.dispatchEvent(changeEvent)
  }

  /**
   * Data attribute'larını güncelle
   */
  /**
   * Data attribute'larını güncelle - 24 saatlik formatı destekler
   */
  private updateDataAttributes(): void {
    if (!this.input || !this.selectedDate) return

    // Tarih formatını backend formatında ayarla
    this.input.setAttribute(
      'data-selected',
      this.formatDateBasedOnConfig(this.selectedDate, 'backend'),
    )

    // Saat bilgilerini data attribute'larına ekle
    if (this.config.timePicker?.enabled) {
      // Saat değerini her zaman 24 saatlik format olarak ayarla
      let hours24 = this.hours

      // 12 saatlik format kullanılıyorsa ve PM ise, saati 24 saatlik formata çevir
      if (!this.config.timePicker.use24HourFormat) {
        if (this.isPM && this.hours < 12) {
          hours24 = this.hours + 12
        } else if (!this.isPM && this.hours === 12) {
          // 12 AM, 24 saatlik formatta 00'dır
          hours24 = 0
        }
      }

      const displayedMinutes = this.minutes.toString().padStart(2, '0')

      // data-hours her zaman 24 saatlik formatta
      this.input.setAttribute('data-hours', hours24.toString())
      this.input.setAttribute('data-minutes', displayedMinutes)

      // AM/PM bilgisini de ekle (görüntüleme amaçlı)
      if (!this.config.timePicker.use24HourFormat) {
        this.input.setAttribute('data-ampm', this.isPM ? 'PM' : 'AM')
      }
    }
  }

  /**
   * Tarih ve saati sıfırla
   */
  private resetState(options: ResetOptions): void {
    const { type, date, language } = options

    // Dil seçeneği varsa container'ı güncelle
    if (language && this.containerElement) {
      this.containerElement.setAttribute('data-language', language)
    }

    switch (type) {
      case 'today':
        this.handleTodayReset()
        break

      case 'all':
        this.handleFullReset()
        break

      case 'soft':
        this.handleSoftReset()
        break
    }

    // Görünümü güncelle
    this.renderCalendar()
    this.renderMonthHeader()

    if (this.config.timePicker?.enabled && this.timeContainer) {
      this.renderTimePicker()
    }

    this.updateNavigationState()
  }

  /**
   * Bugüne döndür
   */
  private handleTodayReset(): void {
    const today = this.stripTime(new Date())

    this.selectedDate = today
    this.currentDate = new Date(today)

    // Saati varsayılan değerlere döndür
    if (this.config.timePicker?.enabled) {
      this.hours = this.config.timePicker.defaultHours || 12
      this.minutes = this.getNearestValidMinute(
        this.config.timePicker.defaultMinutes || 0,
      )
      this.isPM = !this.config.timePicker.use24HourFormat && this.hours >= 12

      // 24 saat formatında 12 varsayılan değerse 0 olarak ayarla
      if (this.config.timePicker.use24HourFormat && this.hours === 12) {
        this.hours = 0
      }
    }

    // Input değerini güncelle
    this.updateInputValue()
  }

  /**
   * Tüm değerleri temizle
   */
  private handleFullReset(): void {
    this.selectedDate = null
    this.currentDate = this.stripTime(new Date())

    // Saati varsayılan değerlere döndür
    if (this.config.timePicker?.enabled) {
      this.hours = this.config.timePicker.defaultHours || 12
      this.minutes = this.getNearestValidMinute(
        this.config.timePicker.defaultMinutes || 0,
      )
      this.isPM = !this.config.timePicker.use24HourFormat && this.hours >= 12

      // 24 saat formatında 12 varsayılan değerse 0 olarak ayarla
      if (this.config.timePicker.use24HourFormat && this.hours === 12) {
        this.hours = 0
      }
    }

    // Input değerini temizle
    if (this.input) {
      this.input.value = ''
      this.input.removeAttribute('data-selected')
      this.input.removeAttribute('data-hours')
      this.input.removeAttribute('data-minutes')
      this.input.removeAttribute('data-ampm')
    }
  }

  /**
   * Yumuşak sıfırlama (sadece input)
   */
  private handleSoftReset(): void {
    if (this.input) {
      this.input.value = ''
      this.input.removeAttribute('data-selected')
      this.input.removeAttribute('data-hours')
      this.input.removeAttribute('data-minutes')
      this.input.removeAttribute('data-ampm')
    }
  }

  /**
   * TimePicker: En yakın geçerli dakika değerini bul
   */
  private getNearestValidMinute(minute: number): number {
    const interval = this.config.timePicker?.minuteInterval || 1
    return (Math.round(minute / interval) * interval) % 60
  }

  /**
   * TimePicker: Gösterilecek saat değerini hesapla
   */
  private getDisplayHours(): number {
    if (this.config.timePicker?.use24HourFormat) {
      return this.hours
    } else {
      // 12 saat formatı için daha sağlıklı hesaplama
      if (this.hours === 0) return 12
      if (this.hours > 12) return this.hours - 12
      return this.hours
    }
  }

  /**
   * TimePicker: Saat değerini değiştir - Tamamen Düzeltilmiş Versiyon
   */
  private changeHour(direction: 'up' | 'down'): void {
    if (!this.config.timePicker?.enabled) return

    const is24Hour = this.config.timePicker.use24HourFormat

    if (is24Hour) {
      // 24 saat formatı için
      if (direction === 'up') {
        this.hours = (this.hours + 1) % 24
      } else {
        this.hours = (this.hours - 1 + 24) % 24
      }
    } else {
      // 12 saat formatı için (1-12 aralığı)
      // Önce mevcut saat değerini kontrol edelim (güvenlik için)
      if (this.hours < 1 || this.hours > 12) {
        // Eğer saat geçersiz aralıktaysa, düzeltelim
        this.hours = this.hours % 12
        if (this.hours === 0) this.hours = 12
      }

      if (direction === 'up') {
        if (this.hours === 12) {
          this.hours = 1
          this.isPM = !this.isPM // 12'den 1'e geçişte AM/PM değişir
        } else {
          this.hours += 1
        }
      } else {
        // direction === 'down'
        if (this.hours === 1) {
          this.hours = 12
          this.isPM = !this.isPM // 1'den 12'ye geçişte AM/PM değişir
        } else {
          this.hours -= 1
        }
      }
    }

    this.renderTimePicker()
  }

  /**
   * TimePicker: Dakika değerini değiştir - Düzeltilmiş versiyon
   */
  private changeMinute(direction: 'up' | 'down'): void {
    if (!this.config.timePicker?.enabled) return

    const interval = this.config.timePicker.minuteInterval || 1

    if (direction === 'up') {
      this.minutes = (this.minutes + interval) % 60
    } else {
      // Aşağı yönde dakikayı ayarlarken negatif değeri önle
      this.minutes = (this.minutes - interval + 60) % 60
    }

    this.renderTimePicker()
  }

  /**
   * TimePicker: AM/PM değerini değiştir
   */
  private toggleAMPM(): void {
    if (
      !this.config.timePicker?.enabled ||
      this.config.timePicker.use24HourFormat
    )
      return

    this.isPM = !this.isPM

    // AM/PM değişimi sırasında saat değerini de güncelle
    // Saat 12'den küçükse PM -> AM geçişi için saati olduğu gibi bırak
    // Saat 12'den küçükse AM -> PM geçişi için saati 12 artır
    // Saat 12 ise PM -> AM geçişi için saat 0 olmalı
    // Saat 12 ise AM -> PM geçişi için saat 12 olarak kalmalı

    // İlk olarak PM'den AM'e geçişleri kontrol edelim
    if (!this.isPM) {
      // Şimdi AM'deyiz, demek ki PM'den geçiş yaptık
      if (this.hours === 12) {
        this.hours = 0 // 12 PM -> 12 AM (12 gece) geçişi = 0
      } else if (this.hours > 12) {
        this.hours = this.hours - 12 // 13-23 PM -> 1-11 AM geçişi
      }
    }
    // Şimdi AM'den PM'e geçişleri kontrol edelim
    else {
      // Şimdi PM'deyiz, demek ki AM'den geçiş yaptık
      if (this.hours === 0) {
        this.hours = 12 // 12 AM (0) -> 12 PM geçişi
      } else if (this.hours < 12) {
        this.hours = this.hours + 12 // 1-11 AM -> 13-23 PM geçişi
      }
    }

    this.renderTimePicker()

    // Eğer bir tarih seçilmişse input değerini güncelle
    if (this.selectedDate) {
      this.updateInputValue()
    }
  }

  /**
   * Zamanı formatla
   */
  private formatTimeBasedOnConfig(): string {
    const hours = this.getDisplayHours().toString().padStart(2, '0')
    const minutes = this.minutes.toString().padStart(2, '0')

    if (this.config.timePicker?.use24HourFormat) {
      return `${hours}:${minutes}`
    } else {
      return `${hours}:${minutes} ${this.isPM ? 'PM' : 'AM'}`
    }
  }

  /**
   * Tarih geçerliliğini kontrol et
   */
  private isDateValid(date: Date): boolean {
    const strippedDate = this.stripTime(date)
    const { minDate, maxDate } = this.config

    if (minDate && strippedDate < this.stripTime(minDate)) return false
    if (maxDate && strippedDate > this.stripTime(maxDate)) return false

    return true
  }

  /**
   * Tarihin zaman bölümünü sıfırla
   */
  private stripTime(date: Date): Date {
    const newDate = new Date(date)
    newDate.setHours(0, 0, 0, 0)
    return newDate
  }

  /**
   * Ay değiştir
   */
  private changeMonth(direction: 'next' | 'prev'): void {
    const newMonth =
      direction === 'next'
        ? this.currentDate.getMonth() + 1
        : this.currentDate.getMonth() - 1

    this.currentDate.setMonth(newMonth)
    this.renderMonthHeader()
    this.renderCalendar()
    this.updateNavigationState()
  }

  /**
   * Güvenli ay değişimi (min/max date kontrolü ile)
   */
  public safeChangeMonth(direction: 'next' | 'prev'): boolean {
    const { minDate, maxDate } = this.config
    const currentMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      1, // Ayın ilk günü
    )

    // Ay hesaplamasını düzelt
    const targetMonth =
      direction === 'prev'
        ? new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
        : new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)

    // Minimum tarih kontrolü
    if (direction === 'prev' && minDate) {
      const strippedMinDate = this.stripTime(minDate)
      const lastDayOfTargetMonth = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth() + 1,
        0,
      )

      if (lastDayOfTargetMonth < strippedMinDate) {
        return false // Önceki aya gitmeye izin verme
      }
    }

    // Maximum tarih kontrolü
    if (direction === 'next' && maxDate) {
      const strippedMaxDate = this.stripTime(maxDate)
      const firstDayOfTargetMonth = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth(),
        1,
      )

      if (firstDayOfTargetMonth > strippedMaxDate) {
        return false // Sonraki aya gitmeye izin verme
      }
    }

    // Güvenli değişim
    this.changeMonth(direction)
    return true
  }

  /**
   * Navigasyon durumunu güncelle (önceki/sonraki butonların durumu)
   */
  private updateNavigationState(): void {
    const { minDate, maxDate } = this.config
    const currentMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      1,
    )

    if (this.prevButton && minDate) {
      const prevMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1,
      )
      const lastDayOfPrevMonth = new Date(
        prevMonth.getFullYear(),
        prevMonth.getMonth() + 1,
        0,
      )

      const isDisabled = lastDayOfPrevMonth < this.stripTime(minDate)

      if (this.classes.month.pointer.prev.disabled) {
        this.prevButton.classList.toggle(
          this.classes.month.pointer.prev.disabled,
          isDisabled,
        )
      }
      ;(this.prevButton as HTMLButtonElement).disabled = isDisabled
    }

    if (this.nextButton && maxDate) {
      const nextMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1,
      )

      const isDisabled = nextMonth > this.stripTime(maxDate)

      if (this.classes.month.pointer.next.disabled) {
        this.nextButton.classList.toggle(
          this.classes.month.pointer.next.disabled,
          isDisabled,
        )
      }
      ;(this.nextButton as HTMLButtonElement).disabled = isDisabled
    }
  }

  /**
   * Tarih seç
   */
  private selectDate(date: Date): void {
    const selectedDate = this.stripTime(date)
    const isValid = this.isDateValid(date)

    if (!isValid) return

    this.selectedDate = selectedDate
    this.currentDate = new Date(selectedDate)

    this.renderCalendar()

    // Eğer TimePicker etkin değilse veya autoClose true ise
    if (!this.config.timePicker?.enabled || this.autoClose) {
      this.updateInputValue()

      if (this.autoClose) {
        this.hideDatePicker()
      }
    }
  }

  /**
   * String formatındaki tarihi parse et
   */
  private parseDisplayDate(dateStr: string): Date | null {
    if (!dateStr) return null

    // Tam tarih formatı (11 Mar 2025 gibi)
    if (this.config.output?.fullFormat) {
      const parts = dateStr.split(' ')
      if (parts.length !== 3) return null

      const day = parseInt(parts[0])
      const monthStr = parts[1]
      const year = parseInt(parts[2])

      // Ay ismini indekse çevir
      const { monthNames } = this.getSelectedLanguage()
      const monthIndex = monthNames.findIndex(name =>
        name.toLowerCase().includes(monthStr.toLowerCase()),
      )

      if (monthIndex === -1) return null

      return new Date(year, monthIndex, day)
    }

    // Normal format (11/03/2025 gibi)
    const separator = this.config.output?.slash || '/'
    const parts = dateStr.split(separator)

    if (parts.length !== 3) return null

    const order = this.config.output?.order || ['day', 'month', 'year']
    const dateObj: { [key: string]: number } = {}

    for (let i = 0; i < order.length; i++) {
      dateObj[order[i]] = parseInt(parts[i])
    }

    // Ay 0-tabanlı
    if (dateObj.month) dateObj.month--

    return new Date(dateObj.year, dateObj.month, dateObj.day)
  }

  /**
   * Tarihi konfigürasyon temelli formatla
   */
  private formatDateBasedOnConfig(
    date: Date,
    type: 'display' | 'backend' = 'display',
  ): string {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString()

    const { monthNames } = this.getSelectedLanguage()

    // Backend formatı
    if (type === 'backend' && this.config.output?.backendFormat) {
      const parts: Record<string, string> = {
        day,
        month,
        year,
      }
      return this.config.output.backendFormat
        .map(part => parts[part])
        .join(this.config.output?.slash || '-')
    }

    // Eğer fullFormat true ise özel formatlama
    if (this.config.output?.fullFormat) {
      const monthName = monthNames[date.getMonth()]
      return `${date.getDate()} ${monthName.slice(0, 3)} ${year}`
    }

    const parts: Record<string, string> = {
      day,
      month,
      year,
    }

    const output = this.config.output || {
      order: ['day', 'month', 'year'],
      slash: '/',
      between: ' - ',
    }

    return output.order.map(part => parts[part]).join(output.slash)
  }

  /**
   * Aktif dil seçimini al
   */
  private getSelectedLanguage(): LanguageConfig {
    // Önce container'dan dil bilgisini almaya çalış
    const containerLanguage =
      this.containerElement?.getAttribute('data-language')

    // Eğer container'da dil bilgisi varsa ve config'de bu dil mevcutsa onu kullan
    if (
      containerLanguage &&
      this.config.language.find(lang => lang.language === containerLanguage)
    ) {
      return this.config.language.find(
        lang => lang.language === containerLanguage,
      )!
    }

    // Yoksa default dili kullan (ilk dil)
    return this.config.language[0]
  }

  // Aşama 4: Takvim Render Yöntemleri

  /**
   * Ay başlığını render et
   */
  private renderMonthHeader(): void {
    if (!this.monthContainer) return

    const { monthNames } = this.getSelectedLanguage()
    const currentMonthIndex = this.currentDate.getMonth()
    const currentYear = this.currentDate.getFullYear()

    // Var olan ay başlığı elementi içeriğini güncelle
    const monthHeader = this.monthContainer.querySelector(
      `.${this.classes.month.current}`,
    )
    if (monthHeader) {
      monthHeader.textContent = `${monthNames[currentMonthIndex]} ${currentYear}`
    } else {
      // Eğer element mevcut değilse oluştur
      this.monthContainer.innerHTML = `
         <div class="${this.classes.month.container}">
           <span class="${this.classes.month.current}">
             ${monthNames[currentMonthIndex]} ${currentYear}
           </span>
         </div>`
    }
  }

  /**
   * Takvimi render et
   */
  private renderCalendar(): void {
    if (!this.daysContainer) return

    const { dayNames } = this.getSelectedLanguage()
    const { day, calendar } = this.classes

    // Ay için gerekli tarih hesaplamaları
    const firstDayOfMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      1,
    )
    const lastDayOfMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      0,
    )

    // Ayın ilk gününün haftanın hangi günü olduğu (0: Pazar, 1: Pazartesi, ...)
    const startingDay = firstDayOfMonth.getDay()

    // Önceki ay günleri hesaplaması (Pazartesi: 1. gün olarak ayarla)
    const daysFromPrevMonth = startingDay === 0 ? 6 : startingDay - 1

    // Önceki ayın son günü
    const prevMonthLastDay = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      0,
    )

    // Sonraki ay günleri hesaplaması
    const totalDaysInMonth = lastDayOfMonth.getDate()
    const lastDayOfMonthWeekday = lastDayOfMonth.getDay()
    const daysFromNextMonth =
      lastDayOfMonthWeekday === 0 ? 0 : 7 - lastDayOfMonthWeekday

    // Önce içeriği temizle
    this.daysContainer.innerHTML = ''

    // CSS sınıfını ekle ve sağlamlaştır
    if (!this.daysContainer.classList.contains(calendar.grid)) {
      this.daysContainer.classList.add(calendar.grid)
    }

    // Bugünün tarihini al
    const today = this.stripTime(new Date())

    // Gün başlıklarını oluştur
    for (let i = 0; i < dayNames.length; i++) {
      const dayHeader = document.createElement('div')
      dayHeader.className = calendar.dayHeader
      dayHeader.textContent = dayNames[i].substring(0, 2)
      this.daysContainer.appendChild(dayHeader)
    }

    // Gün oluşturma fonksiyonu
    const createDayElement = (date: Date, isOtherMonth: boolean = false) => {
      const strippedDate = this.stripTime(date)
      const isValid = this.isDateValid(date)
      const isSelected =
        this.selectedDate && this.areDatesEqual(strippedDate, this.selectedDate)
      const isToday = this.areDatesEqual(strippedDate, today)

      const dayElement = document.createElement('div')

      // CSS sınıflarını ekle
      dayElement.classList.add(day.base)

      if (!isValid) {
        dayElement.classList.add(day.disabled)
      } else if (isOtherMonth) {
        dayElement.classList.add(day.empty)
      }

      if (isSelected) {
        dayElement.classList.add(day.selected)
      }

      if (isToday) {
        dayElement.classList.add(day.today)
      }

      // Data özelliklerini ekle
      dayElement.setAttribute('data-date', date.toISOString())
      dayElement.setAttribute(
        'data-month',
        isOtherMonth ? (date < firstDayOfMonth ? 'prev' : 'next') : 'current',
      )

      // Günün numarasını ekle
      dayElement.textContent = date.getDate().toString()

      return dayElement
    }

    // Önceki ayın günlerini oluştur
    for (let i = daysFromPrevMonth; i > 0; i--) {
      const prevDate = new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth() - 1,
        prevMonthLastDay.getDate() - i + 1,
      )
      this.daysContainer.appendChild(createDayElement(prevDate, true))
    }

    // Mevcut ayın günlerini oluştur
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const currentDate = new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth(),
        i,
      )
      this.daysContainer.appendChild(createDayElement(currentDate))
    }

    // Sonraki ayın günlerini oluştur
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const nextDate = new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth() + 1,
        i,
      )
      this.daysContainer.appendChild(createDayElement(nextDate, true))
    }
  }

  /**
   * İki tarihin eşit olup olmadığını kontrol et
   */
  private areDatesEqual(date1: Date, date2: Date | null): boolean {
    if (!date2) return false

    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
  }

  /**
   * Input elemanına odaklan ve gerekirse date picker'ı aç
   * @param openDatePicker Date picker'ın otomatik açılıp açılmayacağı
   * @returns İşlem başarılı mı
   */
  public focus(openDatePicker: boolean = true): boolean {
    // Input elemanı var mı kontrol et
    if (!this.input) {
      console.warn('Focus işlemi başarısız: Input elementi bulunamadı.')
      return false
    }

    try {
      // Input'a odaklan
      this.input.focus()

      // Focus container'ı güncelle
      if (this.focusContainer) {
        this.focusContainer.setAttribute('data-focus', 'true')
      }

      // Eğer isteniyorsa date picker'ı aç
      if (openDatePicker) {
        // Öncelikle input'ta tarih varsa, o tarihi yükle
        if (this.input.value) {
          const dateStr = this.input.value.split(' & ')[0] // Tarih kısmını al
          const date = this.parseDisplayDate(dateStr)

          if (date) {
            this.currentDate = new Date(date)
            this.selectedDate = new Date(date)
          }
        }

        // Takvimi güncel tarih ve seçimlerle göster
        this.renderCalendar()
        this.renderMonthHeader()

        if (this.config.timePicker?.enabled && this.timeContainer) {
          this.renderTimePicker()
          // TimePicker event listener'larını yeniden ekle
          this.addTimePickerEventListeners()
        }

        this.updateNavigationState()
        this.positionDatePickerUnderInput()
        this.showDatePicker()
      }

      return true
    } catch (error) {
      console.error('Focus sırasında hata oluştu:', error)
      return false
    }
  }

  /**
   * Seçili tarihi Date objesi olarak döndürür
   * @returns Seçili tarih veya null
   */
  public getDate(): Date | null {
    if (!this.selectedDate) return null

    // Eğer timePicker aktifse, saat bilgisini de ekle
    if (this.config.timePicker?.enabled) {
      const date = new Date(this.selectedDate)
      let hours = this.hours

      // 12 saatlik formatta PM ise ve saat 12'den küçükse, 12 ekle
      if (!this.config.timePicker.use24HourFormat && this.isPM && hours < 12) {
        hours += 12
      }
      // 12 saatlik formatta AM ise ve saat 12 ise, 0 yap
      else if (
        !this.config.timePicker.use24HourFormat &&
        !this.isPM &&
        hours === 12
      ) {
        hours = 0
      }

      date.setHours(hours, this.minutes, 0, 0)
      return date
    }

    return new Date(this.selectedDate)
  }

  /**
   * Minimum tarihi değiştirir ve gerekirse mevcut seçimi günceller
   * @param date Yeni minimum tarih
   * @param resetIfInvalid Eğer true ise ve mevcut seçim minimum tarihten önceyse, seçimi sıfırlar
   * @returns Tarih değişikliği yapıldı mı
   */
  public changeMinDate(date: Date, resetIfInvalid: boolean = true): boolean {
    // Saat bilgisini sıfırla
    const newMinDate = this.stripTime(date)
    this.config.minDate = newMinDate

    // Mevcut seçim geçerliliğini kontrol et
    if (this.selectedDate && this.stripTime(this.selectedDate) < newMinDate) {
      if (resetIfInvalid) {
        // Seçimi sıfırla
        if (this.config.maxDate && newMinDate > this.config.maxDate) {
          // Minimum tarih maksimum tarihten büyükse, seçimi tamamen temizle
          this.resetState({ type: 'all' })
          return false
        } else {
          // Seçimi minimum tarihe ayarla
          this.selectDate(newMinDate)
        }
      }
    }

    // Takvimi güncelle
    this.renderCalendar()
    this.updateNavigationState()
    return true
  }

  /**
   * Maksimum tarihi değiştirir ve gerekirse mevcut seçimi günceller
   * @param date Yeni maksimum tarih
   * @param resetIfInvalid Eğer true ise ve mevcut seçim maksimum tarihten sonraysa, seçimi sıfırlar
   * @returns Tarih değişikliği yapıldı mı
   */
  public changeMaxDate(date: Date, resetIfInvalid: boolean = true): boolean {
    // Saat bilgisini sıfırla ve günün sonuna ayarla (23:59:59)
    const newMaxDate = this.stripTime(date)
    this.config.maxDate = newMaxDate

    // Mevcut seçim geçerliliğini kontrol et
    if (this.selectedDate && this.stripTime(this.selectedDate) > newMaxDate) {
      if (resetIfInvalid) {
        // Seçimi sıfırla
        if (this.config.minDate && newMaxDate < this.config.minDate) {
          // Maksimum tarih minimum tarihten küçükse, seçimi tamamen temizle
          this.resetState({ type: 'all' })
          return false
        } else {
          // Seçimi maksimum tarihe ayarla
          this.selectDate(newMaxDate)
        }
      }
    }

    // Takvimi güncelle
    this.renderCalendar()
    this.updateNavigationState()
    return true
  }

  /**
   * Tarihi belirtilen tarihe ayarlar (programmatik olarak tarih seçme)
   * @param date Ayarlanacak tarih
   * @param updateInput Input değerini güncelleme
   * @returns İşlem başarılı mı
   */
  public resetDate(date: Date, updateInput: boolean = true): boolean {
    const newDate = this.stripTime(date)

    // Tarih geçerli mi kontrol et
    if (!this.isDateValid(newDate)) {
      console.warn(
        'Geçersiz tarih: Minimum ve maksimum tarih sınırları dışında.',
      )
      return false
    }

    // Tarihi seç
    this.selectedDate = newDate
    this.currentDate = new Date(newDate)

    // Saati varsayılan değerlere veya belirtilen değerlere ayarla
    if (this.config.timePicker?.enabled) {
      // Belirtilen saati kullan veya varsayılan değerleri koru
      const hours = date.getHours()
      if (hours !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0) {
        // Tarih nesnesinde saat bilgisi var, kullan
        if (this.config.timePicker.use24HourFormat) {
          // 24 saat formatında doğrudan kullan
          this.hours = hours
        } else {
          // 12 saat formatına dönüştür
          this.isPM = hours >= 12
          this.hours = hours % 12
          if (this.hours === 0) this.hours = 12 // 0 saat yerine 12 AM göster
        }

        // Dakikaları en yakın geçerli değere yuvarla
        this.minutes = this.getNearestValidMinute(date.getMinutes())
      }
    }

    // Takvimi güncelle
    this.renderCalendar()
    this.renderMonthHeader()

    if (this.config.timePicker?.enabled && this.timeContainer) {
      this.renderTimePicker()
    }

    this.updateNavigationState()

    // Input değerini güncelle
    if (updateInput) {
      this.updateInputValue()
    }

    return true
  }

  /**
   * DatePicker'ı yok et (event listener'ları temizle)
   */
  public destroy(): void {
    window.removeEventListener('resize', this.handleWindowResize)
  }

  /**
   * Public API: Bugüne döndür
   */
  public resetToToday(): void {
    this.resetState({ type: 'today' })
  }

  /**
   * Public API: Tüm değerleri temizle
   */
  public resetAllInputs(): void {
    this.resetState({ type: 'all' })
  }
}

export { DatePickerWithTime }
export type { DatePickerWithTimeConfig, LanguageConfig, TimePickerConfig }
