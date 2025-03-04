interface LanguageConfig {
  language: string
  monthNames: string[]
  dayNames: string[]
}

interface DatePickerClasses {
  day?: {
    base?: string
    disabled?: string
    selected?: string
    empty?: string
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
    selected?: string
  }
}

interface DateTimePickerConfig {
  elements: {
    container: string
    monthContainer: string
    daysContainer: string
    buttons: {
      prev: string
      next: string
      reset?: string
      resetAll?: string
      close?: string
    }
    input: string
    focusContainer?: string
    // TimePicker için eklenmiş alanlar
    timeContainer?: string
    hourUp?: string
    hourDisplay?: string
    hourDown?: string
    minuteUp?: string
    minuteDisplay?: string
    minuteDown?: string
    ampmToggle?: string
  }
  classes?: DatePickerClasses
  language: LanguageConfig[]
  output?: {
    order: string[] // ["day", "month", "year"]
    slash: string // "/" or "-" or "."
    timeSeparator: string // " & " veya " - " veya " "
    timeFormat?: '12h' | '24h' // 12 veya 24 saat formatı
    fullFormat?: boolean
    backendFormat?: string[] // Backend formatı için
  }
  defaultDate?: Date
  minDate?: Date
  maxDate?: Date
  autoClose?: boolean
  timePicker?: {
    enabled: boolean
    use24HourFormat?: boolean
    minuteInterval?: number // Dakika artış miktarı (default: 1)
    defaultHours?: number
    defaultMinutes?: number
  }
}

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
    buttons: {
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
  },
  time: {
    container: 'time-container',
    column: 'time-column',
    display: 'time-display',
    button: 'time-btn',
    separator: 'time-separator',
    selected: 'time-selected',
  },
} as const

class DateTimePicker {
  private config: DateTimePickerConfig
  private classes: Required<DatePickerClasses>
  private currentDate: Date
  private selectedDate: Date | null = null
  private selectedHours: number = 12
  private selectedMinutes: number = 0
  private isPM: boolean = false
  private monthShortNamePointer: HTMLElement | null
  private daysContainer: HTMLElement | null
  private containerElement: HTMLElement | null
  private timeContainerElement: HTMLElement | null = null
  private hourDisplayElement: HTMLElement | null = null
  private minuteDisplayElement: HTMLElement | null = null
  private ampmToggleElement: HTMLElement | null = null
  private activeInput: HTMLInputElement | null = null
  private prevButton: HTMLElement | null = null
  private nextButton: HTMLElement | null = null
  private resetButton: HTMLElement | null = null
  private resetAllButton: HTMLElement | null = null
  private closeButton: HTMLElement | null = null
  private hourUpButton: HTMLElement | null = null
  private hourDownButton: HTMLElement | null = null
  private minuteUpButton: HTMLElement | null = null
  private minuteDownButton: HTMLElement | null = null
  private focusContainer: HTMLElement | null = null
  private autoClose = true
  private outputConfig = {
    order: ['day', 'month', 'year'],
    slash: '/',
    timeSeparator: ' & ',
    timeFormat: '24h' as '12h' | '24h',
  }

  constructor(config: DateTimePickerConfig) {
    this.config = config
    this.classes = this.mergeClasses(DEFAULT_CLASSES, config.classes || {})
    this.containerElement = document.getElementById(config.elements.container)

    // Reset hours, minutes, seconds, and milliseconds for consistent date comparison
    this.currentDate = this.stripTime(new Date())
    this.selectedDate = null

    this.autoClose = config.autoClose ?? this.autoClose
    this.outputConfig = {
      ...this.outputConfig,
      ...config.output,
    }

    // Also strip time from min and max dates
    if (this.config.minDate) {
      this.config.minDate = this.stripTime(this.config.minDate)
    }
    if (this.config.maxDate) {
      this.config.maxDate = this.stripTime(this.config.maxDate)
    }

    // Set default date if provided
    if (config.defaultDate) {
      this.selectedDate = this.stripTime(config.defaultDate)
      this.currentDate = new Date(this.selectedDate)
    }

    // Initialize TimePicker defaults
    if (config.timePicker?.enabled) {
      this.selectedHours = config.timePicker.defaultHours || 12
      this.selectedMinutes = config.timePicker.defaultMinutes || 0
      this.isPM = this.selectedHours >= 12 && !config.timePicker.use24HourFormat

      // Adjust hours for 12h format display
      if (!config.timePicker.use24HourFormat && this.selectedHours > 12) {
        this.selectedHours -= 12
      }
      if (!config.timePicker.use24HourFormat && this.selectedHours === 0) {
        this.selectedHours = 12
      }

      // Ensure minutes match the interval
      if (
        config.timePicker.minuteInterval &&
        config.timePicker.minuteInterval > 1
      ) {
        this.selectedMinutes = this.getNearestValidMinute(this.selectedMinutes)
      }

      // Set output time format
      this.outputConfig.timeFormat = config.timePicker.use24HourFormat
        ? '24h'
        : '12h'
    }

    // Read HTML data attributes
    this.initializeFromDataAttributes()

    this.monthShortNamePointer = document.getElementById(
      config.elements.monthContainer,
    )
    this.daysContainer = document.getElementById(config.elements.daysContainer)
    this.prevButton = document.getElementById(config.elements.buttons.prev)
    this.nextButton = document.getElementById(config.elements.buttons.next)

    // Input element
    this.activeInput = document.getElementById(
      config.elements.input,
    ) as HTMLInputElement

    // Focus container
    if (config.elements.focusContainer) {
      this.focusContainer = document.getElementById(
        config.elements.focusContainer,
      )
    }

    // Button elements
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

    // TimePicker elements
    if (config.timePicker?.enabled) {
      this.initializeTimePicker()
    }

    if (
      !this.monthShortNamePointer ||
      !this.daysContainer ||
      !this.containerElement
    ) {
      console.warn('One or more container elements not found.')
    } else {
      this.initializeDatePicker()
      this.addEventListeners()
    }

    window.addEventListener('resize', this.handleWindowResize)

    this.hideDatePicker()
  }

  private initializeTimePicker() {
    const elements = this.config.elements

    if (elements.timeContainer) {
      this.timeContainerElement = document.getElementById(
        elements.timeContainer,
      )
    }

    if (elements.hourDisplay) {
      this.hourDisplayElement = document.getElementById(elements.hourDisplay)
    }

    if (elements.minuteDisplay) {
      this.minuteDisplayElement = document.getElementById(
        elements.minuteDisplay,
      )
    }

    if (elements.ampmToggle && !this.config.timePicker?.use24HourFormat) {
      this.ampmToggleElement = document.getElementById(elements.ampmToggle)
    }

    if (elements.hourUp) {
      this.hourUpButton = document.getElementById(elements.hourUp)
    }

    if (elements.hourDown) {
      this.hourDownButton = document.getElementById(elements.hourDown)
    }

    if (elements.minuteUp) {
      this.minuteUpButton = document.getElementById(elements.minuteUp)
    }

    if (elements.minuteDown) {
      this.minuteDownButton = document.getElementById(elements.minuteDown)
    }

    this.updateTimeDisplay()
  }

  private getNearestValidMinute(minute: number): number {
    const interval = this.config.timePicker?.minuteInterval || 1
    return (Math.round(minute / interval) * interval) % 60
  }

  private updateTimeDisplay() {
    if (!this.config.timePicker?.enabled) return

    if (this.hourDisplayElement) {
      this.hourDisplayElement.textContent = this.selectedHours
        .toString()
        .padStart(2, '0')
      this.hourDisplayElement.classList.toggle(
        this.classes.time?.selected || 'time-selected-hours',
        true,
      )
    }

    if (this.minuteDisplayElement) {
      this.minuteDisplayElement.textContent = this.selectedMinutes
        .toString()
        .padStart(2, '0')
      this.minuteDisplayElement.classList.toggle(
        this.classes.time?.selected || 'time-selected-min',
        true,
      )
    }

    if (this.ampmToggleElement && !this.config.timePicker?.use24HourFormat) {
      this.ampmToggleElement.textContent = this.isPM ? 'PM' : 'AM'
    }
  }

  private handleHourChange(direction: 'up' | 'down') {
    if (!this.config.timePicker?.enabled) return

    const use24Hour = this.config.timePicker.use24HourFormat
    const maxHour = use24Hour ? 23 : 12
    const minHour = use24Hour ? 0 : 1

    if (direction === 'up') {
      this.selectedHours =
        this.selectedHours >= maxHour ? minHour : this.selectedHours + 1
    } else {
      this.selectedHours =
        this.selectedHours <= minHour ? maxHour : this.selectedHours - 1
    }

    this.updateTimeDisplay()
    this.updateInputValue()
  }

  private handleMinuteChange(direction: 'up' | 'down') {
    if (!this.config.timePicker?.enabled) return

    const interval = this.config.timePicker.minuteInterval || 1

    if (direction === 'up') {
      this.selectedMinutes = (this.selectedMinutes + interval) % 60
    } else {
      this.selectedMinutes = (this.selectedMinutes - interval + 60) % 60
    }

    this.updateTimeDisplay()
    this.updateInputValue()
  }

  private toggleAMPM() {
    if (
      !this.config.timePicker?.enabled ||
      this.config.timePicker.use24HourFormat
    )
      return

    this.isPM = !this.isPM
    this.updateTimeDisplay()
    this.updateInputValue()
  }

  private formatTimeBasedOnConfig(): string {
    if (!this.config.timePicker?.enabled) return ''

    let hours = this.selectedHours
    const minutes = this.selectedMinutes.toString().padStart(2, '0')

    if (this.outputConfig.timeFormat === '24h') {
      // Convert to 24h format if displaying in 12h format
      if (!this.config.timePicker.use24HourFormat) {
        if (this.isPM && hours < 12) {
          hours += 12
        } else if (!this.isPM && hours === 12) {
          hours = 0
        }
      }
      return `${hours.toString().padStart(2, '0')}:${minutes}`
    } else {
      // 12h format
      if (this.config.timePicker.use24HourFormat) {
        // Convert from 24h to 12h for display
        const period = hours >= 12 ? 'PM' : 'AM'
        if (hours > 12) hours -= 12
        if (hours === 0) hours = 12
        return `${hours}:${minutes} ${period}`
      } else {
        return `${hours}:${minutes} ${this.isPM ? 'PM' : 'AM'}`
      }
    }
  }

  private initializeFromDataAttributes() {
    if (!this.activeInput) return

    // Check for date data attribute
    const selectedDate = this.activeInput.getAttribute('data-selected')
    if (selectedDate) {
      const date = this.parseBackendDate(selectedDate)
      if (date) {
        this.selectedDate = date
        this.currentDate = new Date(date)
      }
    }

    // Check for time data attributes
    if (this.config.timePicker?.enabled) {
      const hoursAttr = this.activeInput.getAttribute('data-hours')
      const minutesAttr = this.activeInput.getAttribute('data-minutes')
      const ampmAttr = this.activeInput.getAttribute('data-ampm')

      if (hoursAttr) {
        let hours = parseInt(hoursAttr, 10)
        if (!isNaN(hours)) {
          // Adjust for 12h format
          if (!this.config.timePicker.use24HourFormat) {
            this.isPM = hours >= 12
            if (hours > 12) hours -= 12
            if (hours === 0) hours = 12
          }
          this.selectedHours = hours
        }
      }

      if (minutesAttr) {
        const minutes = parseInt(minutesAttr, 10)
        if (!isNaN(minutes)) {
          this.selectedMinutes = this.getNearestValidMinute(minutes)
        }
      }

      if (ampmAttr && !this.config.timePicker.use24HourFormat) {
        this.isPM = ampmAttr.toUpperCase() === 'PM'
      }
    }

    // Update input value with both date and time
    this.updateInputValue()
  }

  private mergeClasses(
    defaults: DatePickerClasses,
    custom: DatePickerClasses,
  ): Required<DatePickerClasses> {
    const merged = { ...defaults }

    if (custom.day) {
      merged.day = {
        ...defaults.day,
        ...custom.day,
      }
    }

    if (custom.month) {
      merged.month = {
        ...defaults.month,
        ...custom.month,
        buttons: {
          prev: {
            ...defaults.month?.buttons?.prev,
            ...custom.month?.buttons?.prev,
          },
          next: {
            ...defaults.month?.buttons?.next,
            ...custom.month?.buttons?.next,
          },
        },
      }
    }

    if (custom.calendar) {
      merged.calendar = {
        ...defaults.calendar,
        ...custom.calendar,
      }
    }

    if (custom.wrapper) {
      merged.wrapper = {
        ...defaults.wrapper,
        ...custom.wrapper,
      }
    }

    if (custom.time) {
      merged.time = {
        ...defaults.time,
        ...custom.time,
      }
    }

    return merged as Required<DatePickerClasses>
  }

  private initializeDatePicker() {
    this.renderMonthShortNames()
    this.renderCalendar()
    this.updateNavigationState()
  }

  private showDatePicker() {
    if (this.containerElement && this.classes.wrapper.hidden) {
      this.containerElement.classList.remove(this.classes.wrapper.hidden)
    }
    // Focus container'ını güncelle
    if (this.focusContainer) {
      this.focusContainer.setAttribute('data-focus', 'true')
    }
  }

  private hideDatePicker() {
    if (this.containerElement && this.classes.wrapper.hidden) {
      this.containerElement.classList.add(this.classes.wrapper.hidden)
    }
    // Focus container'ını güncelle
    if (this.focusContainer) {
      this.focusContainer.setAttribute('data-focus', 'false')
    }
  }

  private isDatePickerVisible(): boolean {
    return this.containerElement && this.classes.wrapper.hidden
      ? !this.containerElement.classList.contains(this.classes.wrapper.hidden)
      : false
  }

  private positionDatePickerUnderInput(input: HTMLInputElement) {
    if (!this.containerElement) return

    // Get input element dimensions and position
    const inputRect = input.getBoundingClientRect()

    // Get window dimensions
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    // Get datepicker dimensions
    const datePickerRect = this.containerElement.getBoundingClientRect()

    // Get scroll positions
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft

    // Calculate initial positions
    let top = inputRect.bottom + scrollTop + 8 // 8px padding
    let left = inputRect.left + scrollLeft - 1.5

    // Check if the datepicker would overflow the right edge of the window
    if (left + datePickerRect.width > windowWidth) {
      // Align to the right edge of the input instead
      left = inputRect.right + scrollLeft - datePickerRect.width

      // If still overflowing, align with window right edge with some padding
      if (left < 0) {
        left = windowWidth - datePickerRect.width - 16 // 16px padding from right
      }
    }

    // Check if the datepicker would overflow the bottom of the window
    const bottomOverflow =
      top + datePickerRect.height > windowHeight + scrollTop
    const hasSpaceAbove = inputRect.top - datePickerRect.height - 16 > 0

    if (bottomOverflow && hasSpaceAbove) {
      // Position above the input if there's space
      top = inputRect.top + scrollTop - datePickerRect.height - 16
    } else if (bottomOverflow) {
      // If can't fit above, position it as high as possible while keeping it on screen
      top = windowHeight + scrollTop - datePickerRect.height - 16
    }

    // Ensure left position is never negative
    left = Math.max(8, left) // Minimum 8px from left edge

    // Apply the calculated positions
    this.containerElement.style.position = 'absolute'
    this.containerElement.style.top = `${Math.round(top)}px`
    this.containerElement.style.left = `${Math.round(left)}px`
    this.containerElement.style.zIndex = '100'
    this.containerElement.style.opacity = '100%'

    // Add a data attribute indicating position (useful for animations/styling)
    this.containerElement.setAttribute(
      'data-position',
      bottomOverflow && hasSpaceAbove ? 'top' : 'bottom',
    )
  }

  private handleWindowResize = () => {
    if (this.activeInput && this.isDatePickerVisible()) {
      this.positionDatePickerUnderInput(this.activeInput)
    }
  }

  private handleInputClick = () => {
    if (this.isDatePickerVisible()) {
      return
    }

    if (this.activeInput && this.activeInput.value) {
      this.parseInputValue(this.activeInput.value)
    }

    this.renderCalendar()
    this.renderMonthShortNames()
    this.updateNavigationState()
    this.updateTimeDisplay()
    this.positionDatePickerUnderInput(this.activeInput!)
    this.showDatePicker()
  }

  private parseInputValue(inputValue: string) {
    // Check if the input has both date and time
    const hasTimeSeparator =
      this.outputConfig.timeSeparator &&
      inputValue.includes(this.outputConfig.timeSeparator)

    if (hasTimeSeparator) {
      const [dateStr, timeStr] = inputValue.split(
        this.outputConfig.timeSeparator,
      )

      // Parse date
      if (dateStr) {
        const dateParts = dateStr.trim().split(' ')
        if (dateParts.length >= 3) {
          const day = parseInt(dateParts[0], 10)
          const monthIndex = this.getMonthIndexFromName(dateParts[1])
          const year = parseInt(dateParts[2], 10)

          if (!isNaN(day) && monthIndex !== -1 && !isNaN(year)) {
            this.selectedDate = new Date(year, monthIndex, day)
            this.currentDate = new Date(this.selectedDate)
          }
        }
      }

      // Parse time
      if (timeStr && this.config.timePicker?.enabled) {
        const timeMatch = timeStr
          .trim()
          .match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i)
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10)
          const minutes = parseInt(timeMatch[2], 10)
          const ampm = timeMatch[3]?.toUpperCase()

          if (!isNaN(hours) && !isNaN(minutes)) {
            if (ampm) {
              this.isPM = ampm === 'PM'
              if (this.isPM && hours < 12) hours += 12
              if (!this.isPM && hours === 12) hours = 0
            }

            // Adjust for display format
            if (!this.config.timePicker.use24HourFormat) {
              this.isPM = hours >= 12
              if (hours > 12) hours -= 12
              if (hours === 0) hours = 12
            }

            this.selectedHours = hours
            this.selectedMinutes = this.getNearestValidMinute(minutes)
          }
        }
      }
    } else {
      // Try to parse only date
      const dateParts = inputValue.trim().split(' ')
      if (dateParts.length >= 3) {
        const day = parseInt(dateParts[0], 10)
        const monthIndex = this.getMonthIndexFromName(dateParts[1])
        const year = parseInt(dateParts[2], 10)

        if (!isNaN(day) && monthIndex !== -1 && !isNaN(year)) {
          this.selectedDate = new Date(year, monthIndex, day)
          this.currentDate = new Date(this.selectedDate)
        }
      }
    }
  }

  private getMonthIndexFromName(monthName: string): number {
    const { monthNames } = this.getSelectedLanguage()
    const normalizedName = monthName.toLowerCase()

    // First try exact match
    const exactIndex = monthNames.findIndex(
      m => m.toLowerCase() === normalizedName,
    )

    if (exactIndex !== -1) return exactIndex

    // Then try abbreviated match (first 3 chars)
    return monthNames.findIndex(
      m => m.toLowerCase().substring(0, 3) === normalizedName.substring(0, 3),
    )
  }

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

  private renderMonthShortNames() {
    if (!this.monthShortNamePointer) return
    const { monthNames } = this.getSelectedLanguage()
    const { month } = this.classes
    const currentMonthIndex = this.currentDate.getMonth()

    this.monthShortNamePointer.innerHTML = `
      <div class="${month.container}">
        <span class="${month.current}">
          ${monthNames[currentMonthIndex]}
        </span>
      </div>`
  }

  private renderCalendar() {
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
    const startingDay = firstDayOfMonth.getDay()

    // Önceki ay günleri hesaplaması
    const prevMonthLastDay = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
      0,
    )
    const daysFromPrevMonth = startingDay === 0 ? 6 : startingDay - 1

    // Sonraki ay günleri hesaplaması
    const totalDaysInMonth = lastDayOfMonth.getDate()
    const lastDayOfMonthWeekday = lastDayOfMonth.getDay()
    const daysFromNextMonth =
      lastDayOfMonthWeekday === 0 ? 0 : 7 - lastDayOfMonthWeekday

    let calendarHTML = `<div class="${calendar.grid}">`

    // Gün başlıklarını render et
    dayNames.forEach(dayName => {
      calendarHTML += `<div class="${calendar.dayHeader}">${dayName.substring(0, 2)}</div>`
    })

    // Tarih seçili mi kontrolü
    const isDateSelected = (date: Date): boolean => {
      if (!this.selectedDate) return false
      return this.areDatesEqual(this.stripTime(date), this.selectedDate)
    }

    // Gün render fonksiyonu
    const renderDay = (date: Date, isOtherMonth: boolean = false) => {
      const strippedDate = this.stripTime(date)
      const isValid = this.isDateValid(date)
      const isSelected = isDateSelected(date)

      // CSS sınıflarını birleştir
      const dayClasses = [
        day.base,
        !isValid ? day.disabled : isOtherMonth ? day.empty : '',
        isSelected ? day.selected : '',
      ]
        .filter(Boolean)
        .join(' ')

      return `<div class="${dayClasses}"
              data-date="${date.toISOString()}"
              data-month="${isOtherMonth ? (date < firstDayOfMonth ? 'prev' : 'next') : 'current'}">
              ${date.getDate()}
          </div>`
    }

    // Önceki ayın günlerini render et
    for (let i = daysFromPrevMonth; i > 0; i--) {
      const prevDate = new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth() - 1,
        prevMonthLastDay.getDate() - i + 1,
      )
      calendarHTML += renderDay(prevDate, true)
    }

    // Mevcut ayın günlerini render et
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const currentDate = new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth(),
        i,
      )
      calendarHTML += renderDay(currentDate)
    }

    // Sonraki ayın günlerini render et
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const nextDate = new Date(
        this.currentDate.getFullYear(),
        this.currentDate.getMonth() + 1,
        i,
      )
      calendarHTML += renderDay(nextDate, true)
    }

    calendarHTML += '</div>'
    this.daysContainer.innerHTML = calendarHTML
  }

  private formatDateBasedOnConfig(date: Date): string {
    if (!date) return ''

    const day = date.getDate().toString()
    const { monthNames } = this.getSelectedLanguage()
    const monthName = monthNames[date.getMonth()]
    const year = date.getFullYear().toString()

    // Eğer fullFormat true ise özel formatlama
    if (this.config.output?.fullFormat) {
      return `${day} ${monthName.slice(0, 3)} ${year}`
    }

    const parts: Record<string, string> = {
      day: day.padStart(2, '0'),
      month: (date.getMonth() + 1).toString().padStart(2, '0'),
      year,
    }

    const output = this.config.output || {
      order: ['day', 'month', 'year'],
      slash: '/',
      timeSeparator: ' & ',
    }

    return output.order.map(part => parts[part]).join(output.slash)
  }

  private formatDateTimeBasedOnConfig(): string {
    if (!this.selectedDate) return ''

    const dateStr = this.formatDateBasedOnConfig(this.selectedDate)

    if (!this.config.timePicker?.enabled) {
      return dateStr
    }

    const timeStr = this.formatTimeBasedOnConfig()
    return `${dateStr}${this.outputConfig.timeSeparator}${timeStr}`
  }

  private addEventListeners() {
    // Date picker navigation
    this.prevButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.changeMonth('prev')
    })

    this.nextButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.changeMonth('next')
    })

    // Reset buttons
    this.resetButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.resetToToday()
    })

    this.resetAllButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.resetAll()
    })

    // Close button
    this.closeButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.safeClose()
    })

    // Day selection
    this.daysContainer?.addEventListener('click', e => {
      e.stopPropagation()
      const target = e.target as HTMLElement

      if (target.classList.contains(this.classes.day?.base ?? '')) {
        const dateStr = target.getAttribute('data-date')
        const monthType = target.getAttribute('data-month')

        if (!dateStr) return

        const date = new Date(dateStr)

        // Önceki/sonraki ay günlerine tıklanınca sadece ay değişimi yap
        if (monthType === 'prev') {
          this.changeMonth('prev')
          return
        } else if (monthType === 'next') {
          this.changeMonth('next')
          return
        }

        // Sadece geçerli günlerde tarih seçimi yap
        if (!target.classList.contains(this.classes.day?.disabled ?? '')) {
          this.selectDate(date)
        }
      }
    })

    // Input click listener
    this.activeInput?.addEventListener('click', e => {
      e.stopPropagation()
      this.handleInputClick()
    })

    this.activeInput?.addEventListener('focus', () => {
      this.handleInputClick()
    })

    // TimePicker event listeners
    if (this.config.timePicker?.enabled) {
      this.hourUpButton?.addEventListener('click', e => {
        e.stopPropagation()
        this.handleHourChange('up')
      })

      this.hourDownButton?.addEventListener('click', e => {
        e.stopPropagation()
        this.handleHourChange('down')
      })

      this.minuteUpButton?.addEventListener('click', e => {
        e.stopPropagation()
        this.handleMinuteChange('up')
      })

      this.minuteDownButton?.addEventListener('click', e => {
        e.stopPropagation()
        this.handleMinuteChange('down')
      })

      this.ampmToggleElement?.addEventListener('click', e => {
        e.stopPropagation()
        this.toggleAMPM()
      })
    }

    // Close when clicking outside
    document.addEventListener('click', e => {
      const target = e.target as HTMLElement
      const isInsideDatePicker = this.containerElement?.contains(target)
      const isDateInput = this.activeInput === target

      if (!isInsideDatePicker && !isDateInput && this.isDatePickerVisible()) {
        this.safeClose()
      }
    })
  }

  private updateNavigationState() {
    const { minDate, maxDate } = this.config
    const currentMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
    )

    if (this.prevButton && minDate) {
      const minMonth = new Date(minDate.getFullYear(), minDate.getMonth())
      const isDisabled = currentMonth <= minMonth

      if (this.classes.month.buttons?.prev?.disabled) {
        this.prevButton.classList.toggle(
          this.classes.month.buttons.prev.disabled,
          isDisabled,
        )
      }
      ;(this.prevButton as HTMLButtonElement).disabled = isDisabled
    }

    if (this.nextButton && maxDate) {
      const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth())
      const isDisabled = currentMonth >= maxMonth

      if (this.classes.month.buttons?.next?.disabled) {
        this.nextButton.classList.toggle(
          this.classes.month.buttons.next.disabled,
          isDisabled,
        )
      }
      ;(this.nextButton as HTMLButtonElement).disabled = isDisabled
    }
  }

  public changeMonth(direction: 'next' | 'prev') {
    const newMonth =
      direction === 'next'
        ? this.currentDate.getMonth() + 1
        : this.currentDate.getMonth() - 1

    this.currentDate.setMonth(newMonth)
    this.renderMonthShortNames()
    this.renderCalendar()
    this.updateNavigationState()

    if (this.activeInput) {
      this.positionDatePickerUnderInput(this.activeInput)
    }
  }

  private stripTime(date: Date): Date {
    const newDate = new Date(date)
    newDate.setHours(0, 0, 0, 0)
    return newDate
  }

  private isDateValid(date: Date): boolean {
    const strippedDate = this.stripTime(date)
    const { minDate, maxDate } = this.config

    if (minDate && strippedDate < this.stripTime(minDate)) return false
    if (maxDate && strippedDate > this.stripTime(maxDate)) return false

    return true
  }

  private areDatesEqual(date1: Date | null, date2: Date | null): boolean {
    if (!date1 || !date2) return false

    const d1 = this.stripTime(date1)
    const d2 = this.stripTime(date2)
    return d1.getTime() === d2.getTime()
  }

  private selectDate(date: Date) {
    const selectedDate = this.stripTime(date)

    if (!this.isDateValid(selectedDate)) return

    this.selectedDate = selectedDate
    this.updateInputValue()
    this.renderCalendar()

    // If auto close is enabled and time picker is not used, close the picker
    if (this.autoClose && !this.config.timePicker?.enabled) {
      this.hideDatePicker()
    }
  }

  private updateInputValue() {
    if (!this.activeInput) return

    if (this.selectedDate) {
      this.activeInput.value = this.formatDateTimeBasedOnConfig()

      // Update data attributes
      if (this.config.timePicker?.enabled) {
        let hours = this.selectedHours

        // Convert to 24h format for data attribute
        if (
          !this.config.timePicker.use24HourFormat &&
          this.isPM &&
          hours < 12
        ) {
          hours += 12
        } else if (
          !this.config.timePicker.use24HourFormat &&
          !this.isPM &&
          hours === 12
        ) {
          hours = 0
        }

        this.activeInput.setAttribute('data-hours', hours.toString())
        this.activeInput.setAttribute(
          'data-minutes',
          this.selectedMinutes.toString(),
        )
        if (!this.config.timePicker.use24HourFormat) {
          this.activeInput.setAttribute('data-ampm', this.isPM ? 'PM' : 'AM')
        }
      }

      this.activeInput.setAttribute(
        'data-selected',
        this.formatDateForBackend(this.selectedDate),
      )
    } else {
      this.activeInput.value = ''
      this.activeInput.removeAttribute('data-selected')
      if (this.config.timePicker?.enabled) {
        this.activeInput.removeAttribute('data-hours')
        this.activeInput.removeAttribute('data-minutes')
        this.activeInput.removeAttribute('data-ampm')
      }
    }
  }

  private formatDateForBackend(date: Date): string {
    if (!date) return ''

    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear().toString()

    const backendFormat = this.config.output?.backendFormat || [
      'year',
      'month',
      'day',
    ]
    const separator = this.config.output?.slash || '-'

    const parts: Record<string, string> = { day, month, year }
    return backendFormat.map(part => parts[part]).join(separator)
  }

  private parseBackendDate(dateStr: string): Date | null {
    if (!dateStr) return null

    const separator = this.config.output?.slash || '-'
    const parts = dateStr.split(separator)

    if (parts.length !== 3) return null

    const backendFormat = this.config.output?.backendFormat || [
      'year',
      'month',
      'day',
    ]
    const dateObj: Record<string, number> = {}

    parts.forEach((part, index) => {
      dateObj[backendFormat[index]] = parseInt(part, 10)
    })

    const date = new Date(dateObj.year, dateObj.month - 1, dateObj.day)

    return isNaN(date.getTime()) ? null : date
  }

  private safeClose() {
    if (!this.activeInput) return

    // If time picker is enabled, check if both date and time are selected
    if (this.config.timePicker?.enabled) {
      if (!this.selectedDate) {
        // Neither date nor time selected - clear everything
        this.resetAll()
      } else {
        // Date is selected, time is auto-selected by default, so we can keep it
        this.updateInputValue()
      }
    } else {
      // For date picker only, just check if date is selected
      if (!this.selectedDate) {
        this.resetAll()
      } else {
        this.updateInputValue()
      }
    }

    this.hideDatePicker()
  }

  private resetToToday() {
    const today = this.stripTime(new Date())
    this.selectedDate = today
    this.currentDate = new Date(today)

    // Reset time to defaults or current time
    if (this.config.timePicker?.enabled) {
      const now = new Date()
      let hours =
        this.config.timePicker.defaultHours !== undefined
          ? this.config.timePicker.defaultHours
          : now.getHours()

      const minutes =
        this.config.timePicker.defaultMinutes !== undefined
          ? this.config.timePicker.defaultMinutes
          : now.getMinutes()

      // Format hours for 12h display if needed
      if (!this.config.timePicker.use24HourFormat) {
        this.isPM = hours >= 12
        if (hours > 12) hours -= 12
        if (hours === 0) hours = 12
      }

      this.selectedHours = hours
      this.selectedMinutes = this.getNearestValidMinute(minutes)
      this.updateTimeDisplay()
    }

    this.renderCalendar()
    this.renderMonthShortNames()
    this.updateNavigationState()
    this.updateInputValue()
  }

  private resetAll() {
    this.selectedDate = null
    this.currentDate = this.stripTime(new Date())

    // Reset time to defaults
    if (this.config.timePicker?.enabled) {
      this.selectedHours = this.config.timePicker.defaultHours || 12
      this.selectedMinutes = this.config.timePicker.defaultMinutes || 0
      this.isPM = false

      if (this.config.timePicker.use24HourFormat) {
        // No AM/PM adjustment needed
      } else if (this.selectedHours > 12) {
        this.selectedHours -= 12
        this.isPM = true
      } else if (this.selectedHours === 0) {
        this.selectedHours = 12
        this.isPM = false
      }

      this.updateTimeDisplay()
    }

    this.renderCalendar()
    this.renderMonthShortNames()
    this.updateNavigationState()
    this.updateInputValue()
  }

  public destroy() {
    window.removeEventListener('resize', this.handleWindowResize)
  }
}

export { DateTimePicker }
export type { DateTimePickerConfig, LanguageConfig }
