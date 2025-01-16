const DEFAULT_CLASSES = {
  calendar: {
    grid: 'calendar-grid',
    dayHeader: 'day-header',
  },
  wrapper: {
    base: 'wrapper',
    hidden: 'date-hidden', // Changed default hidden class name
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
    linked: 'day-linked',
    currentInput: 'current-input-date',
    linkedHighlight: 'linked-date-highlight',
    betweenStart: 'date-between-start',
    betweenEnd: 'date-between-end',
    between: 'date-between',
  },
} as const

interface LanguageConfig {
  language: string
  monthNames: string[]
  dayNames: string[]
}

type DatePickerInputType = 'single' | 'two' | 'between'

interface SingleDateInput {
  id: string
  focusContainer?: string
}

interface BetweenDateInput {
  id: string
  focusContainer?: string
}

interface DateRangeInput {
  start: {
    id: string
    focusContainer?: string
  }
  end: {
    id: string
    focusContainer?: string
  }
}

interface RegisteredInput {
  element: HTMLInputElement
  type: 'single' | 'start' | 'end'
  linkedInputId?: string
  focusContainerId?: string
}

interface DatePickerInputConfig {
  type: DatePickerInputType
  elements: SingleDateInput | DateRangeInput | BetweenDateInput
}

interface RegisteredInput {
  element: HTMLInputElement
  type: 'single' | 'start' | 'end'
  linkedInputId?: string
}

interface DayClasses {
  base?: string
  disabled?: string
  selected?: string
  empty?: string
  linked?: string
  currentInput?: string
  linkedHighlight?: string
  betweenStart?: string
  betweenEnd?: string
  between?: string
}

interface MonthPointerClasses {
  base?: string
  disabled?: string
}

interface MonthClasses {
  container?: string
  current?: string
  buttons?: {
    prev?: MonthPointerClasses
    next?: MonthPointerClasses
  }
}

interface CalendarClasses {
  grid?: string
  dayHeader?: string
}

interface WrapperClasses {
  base?: string
  hidden?: string
}

interface DatePickerClasses {
  day?: DayClasses
  month?: MonthClasses
  calendar?: CalendarClasses
  wrapper?: WrapperClasses
}

interface OutputConfig {
  order: string[] // ["day", "month", "year"]
  slash: string // "/" or "-" or "."
  between: string // " - " or " to "
  fullFormat?: boolean
  backendFormat?: string[] // Yeni alan: Backend formatı için
}

interface DefaultDates {
  single?: Date
  between?: {
    start?: Date
    end?: Date
  }
  two?: {
    start?: Date
    end?: Date
  }
}

interface DatePickerConfig {
  elements: {
    container: string
    monthContainer: string
    daysContainer: string
    buttons: {
      prev: string
      next: string
      reset?: string
      resetAll?: string
      close?: string // Yeni, opsiyonel close butonu
    }
  }
  input: DatePickerInputConfig
  classes?: DatePickerClasses
  language: LanguageConfig[]
  output?: OutputConfig
  defaultDates?: DefaultDates
  minDate?: Date
  maxDate?: Date
  autoClose?: boolean
  autoSwitchInput?: boolean
}

type ResetType = 'today' | 'all' | 'between-new' | 'between-update' | 'soft'

interface ResetOptions {
  type: ResetType
  inputId?: string
  date?: Date
  keepStart?: boolean
  language?: string // Yeni eklenen dil parametresi
}

class DatePicker {
  private config: DatePickerConfig
  private classes: Required<DatePickerClasses>
  private currentDate: Date
  private selectedDate: Date | null = null
  private monthShortNamePointer: HTMLElement | null
  private daysContainer: HTMLElement | null
  private containerElement: HTMLElement | null
  private activeInput: HTMLInputElement | null = null
  private prevButton: HTMLElement | null = null
  private nextButton: HTMLElement | null = null
  private resetButton: HTMLElement | null = null
  private resetAllButton: HTMLElement | null = null
  private registeredInputs: Map<string, RegisteredInput> = new Map()
  private focusContainers: Map<string, HTMLElement> = new Map()
  private dateValues: Map<string, Date> = new Map()
  private selectedDates: Map<string, Date> = new Map()
  private autoClose = true
  private autoSwitchInput = true
  private outputConfig: OutputConfig = {
    order: ['day', 'month', 'year'],
    slash: '/',
    between: ' - ',
  }

  private betweenStartDate: Date | null = null
  private betweenEndDate: Date | null = null
  private closeButton: HTMLElement | null = null

  constructor(config: DatePickerConfig) {
    this.config = config
    this.classes = this.mergeClasses(DEFAULT_CLASSES, config.classes || {})
    this.containerElement = document.getElementById(config.elements.container)

    // Reset hours, minutes, seconds, and milliseconds for consistent date comparison
    this.currentDate = this.stripTime(new Date())
    this.selectedDate = this.stripTime(new Date())

    this.autoClose = config.autoClose ?? this.autoClose
    this.autoSwitchInput = config.autoSwitchInput || this.autoSwitchInput
    this.outputConfig = config.output || this.outputConfig

    // Also strip time from min and max dates
    if (this.config.minDate) {
      this.config.minDate = this.stripTime(this.config.minDate)
    }
    if (this.config.maxDate) {
      this.config.maxDate = this.stripTime(this.config.maxDate)
    }

    if (config.defaultDates) {
      this.initializeDefaultDates(config.defaultDates)
    }

    // Strip time from min and max dates
    if (this.config.minDate) {
      this.config.minDate = this.stripTime(this.config.minDate)
    }
    if (this.config.maxDate) {
      this.config.maxDate = this.stripTime(this.config.maxDate)
    }

    // Read HTML data attributes first
    this.initializeFromDataAttributes()

    // Then apply config default dates if no data attributes found
    if (config.defaultDates && !this.hasDataAttributes()) {
      this.initializeDefaultDates(config.defaultDates)
    }

    this.monthShortNamePointer = document.getElementById(
      config.elements.monthContainer,
    )

    this.monthShortNamePointer = document.getElementById(
      config.elements.monthContainer,
    )
    this.daysContainer = document.getElementById(config.elements.daysContainer)
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

    if (
      !this.monthShortNamePointer ||
      !this.daysContainer ||
      !this.containerElement
    ) {
      console.warn('One or more container elements not found.')
    } else {
      this.initializeDatePicker()
      this.initializeInputs()
      this.addEventListeners()
      this.initializeFocusContainers()
    }

    window.addEventListener('resize', this.handleWindowResize)

    this.hideDatePicker()
  }

  private initializeDefaultDates(defaultDates: DefaultDates) {
    const { input } = this.config
    const selectedLanguage = this.getSelectedLanguage()

    if (input.type === 'single' && defaultDates.single) {
      const dateInput = document.getElementById(
        (input.elements as SingleDateInput).id,
      ) as HTMLInputElement

      if (dateInput) {
        const date = this.stripTime(defaultDates.single)
        // Dil bilgisini resetState'e geçir
        this.resetState({
          type: 'between-new',
          inputId: dateInput.id,
          date: date,
          language: selectedLanguage.language,
        })
      }
    }

    if (input.type === 'between' && defaultDates.between) {
      const dateInput = document.getElementById(
        (input.elements as BetweenDateInput).id,
      ) as HTMLInputElement

      if (dateInput && defaultDates.between.start && defaultDates.between.end) {
        const startDate = this.stripTime(defaultDates.between.start)
        const endDate = this.stripTime(defaultDates.between.end)

        // Start date için dil bilgisini geçir
        this.resetState({
          type: 'between-new',
          inputId: dateInput.id,
          date: startDate,
          language: selectedLanguage.language,
        })

        // End date için dil bilgisini geçir
        this.resetState({
          type: 'between-update',
          inputId: dateInput.id,
          date: endDate,
          keepStart: true,
          language: selectedLanguage.language,
        })
      }
    }

    if (input.type === 'two' && defaultDates.two) {
      const rangeConfig = input.elements as DateRangeInput

      if (defaultDates.two.start) {
        const startInput = document.getElementById(
          rangeConfig.start.id,
        ) as HTMLInputElement
        if (startInput) {
          const startDate = this.stripTime(defaultDates.two.start)
          this.resetState({
            type: 'between-new',
            inputId: startInput.id,
            date: startDate,
            language: selectedLanguage.language,
          })
        }
      }

      if (defaultDates.two.end) {
        const endInput = document.getElementById(
          rangeConfig.end.id,
        ) as HTMLInputElement
        if (endInput) {
          const endDate = this.stripTime(defaultDates.two.end)
          this.resetState({
            type: 'between-new',
            inputId: endInput.id,
            date: endDate,
            language: selectedLanguage.language,
          })
        }
      }
    }
  }

  private initializeFromDataAttributes() {
    const { input } = this.config
    const selectedLanguage = this.getSelectedLanguage() // Dil bilgisini al

    if (input.type === 'single') {
      const dateInput = document.getElementById(
        (input.elements as SingleDateInput).id,
      ) as HTMLInputElement
      if (dateInput) {
        const selectedDate = dateInput.getAttribute('data-selected')
        if (selectedDate) {
          const date = this.parseBackendDate(selectedDate)
          if (date) {
            this.resetState({
              type: 'between-new',
              inputId: dateInput.id,
              date: date,
              language: selectedLanguage.language,
            })
          }
        }
      }
    }

    if (input.type === 'between') {
      const dateInput = document.getElementById(
        (input.elements as BetweenDateInput).id,
      ) as HTMLInputElement
      if (dateInput) {
        const startDate = this.parseBackendDate(
          dateInput.getAttribute('data-start') as any,
        )
        const endDate = this.parseBackendDate(
          dateInput.getAttribute('data-end') as any,
        )

        if (startDate) {
          // Start date'i set et
          this.betweenStartDate = startDate
          this.selectedDates.set(`${dateInput.id}-start`, startDate)
          this.dateValues.set(`${dateInput.id}-start`, startDate)
        }

        if (startDate && endDate) {
          // End date'i de set et
          this.betweenEndDate = endDate
          this.selectedDates.set(`${dateInput.id}-end`, endDate)
          this.dateValues.set(`${dateInput.id}-end`, endDate)

          // Input değerini güncel dil ile formatlayarak güncelle
          dateInput.value = `${this.formatDateBasedOnConfig(startDate)}${this.outputConfig.between}${this.formatDateBasedOnConfig(endDate)}`
        } else if (startDate) {
          // Sadece start date varsa, güncel dil ile formatla
          dateInput.value = this.formatDateBasedOnConfig(startDate)
        }
      }
    }

    if (input.type === 'two') {
      const rangeConfig = input.elements as DateRangeInput
      const startInput = document.getElementById(
        rangeConfig.start.id,
      ) as HTMLInputElement
      const endInput = document.getElementById(
        rangeConfig.end.id,
      ) as HTMLInputElement

      if (startInput) {
        const startDate = startInput.getAttribute('data-start')
        if (startDate) {
          const parsedStartDate = this.parseBackendDate(startDate)
          if (parsedStartDate) {
            this.selectedDates.set(startInput.id, parsedStartDate)
            this.dateValues.set(startInput.id, parsedStartDate)
            startInput.value = this.formatDateBasedOnConfig(parsedStartDate)
          }
        }
      }

      if (endInput) {
        const endDate = endInput.getAttribute('data-end')
        if (endDate) {
          const parsedEndDate = this.parseBackendDate(endDate)
          if (parsedEndDate) {
            this.selectedDates.set(endInput.id, parsedEndDate)
            this.dateValues.set(endInput.id, parsedEndDate)
            endInput.value = this.formatDateBasedOnConfig(parsedEndDate)
          }
        }
      }
    }
  }

  private handleInputClick(input: HTMLInputElement) {
    if (this.activeInput === input && this.isDatePickerVisible()) {
      return
    }

    const prevInput = this.activeInput
    this.activeInput = input

    if (input.value) {
      const [day, month, year] = input.value.split('/').map(Number)
      const date = new Date(year, month - 1, day)

      if (!isNaN(date.getTime())) {
        this.currentDate = new Date(date)

        if (this.config.input.type === 'between') {
          // Between mode için özel kontrol
          if (this.betweenStartDate && !this.betweenEndDate) {
            this.resetState({
              type: 'between-new',
              inputId: input.id,
              date: date,
            })
          }
        } else {
          // Diğer modlar için
          this.resetState({
            type: 'between-new',
            inputId: input.id,
            date: date,
          })
        }
      }
    }

    this.renderCalendar()
    this.renderMonthShortNames()
    this.updateNavigationState()
    this.positionDatePickerUnderInput(input)
    this.showDatePicker()

    if (prevInput) {
      this.updateFocusContainer(prevInput.id, false)
    }
    this.updateFocusContainer(input.id, true)
  }

  public resetInput(inputId: string) {
    this.resetState({
      type: 'soft',
      inputId: inputId,
    })
  }

  private initializeFocusContainers() {
    const { input } = this.config

    if (input.type === 'single') {
      const singleConfig = input.elements as SingleDateInput
      if (singleConfig.focusContainer) {
        const container = document.getElementById(singleConfig.focusContainer)
        if (container) {
          this.focusContainers.set(singleConfig.id, container)
        }
      }
    } else if (input.type === 'two') {
      const rangeConfig = input.elements as DateRangeInput

      if (rangeConfig.start.focusContainer) {
        const startContainer = document.getElementById(
          rangeConfig.start.focusContainer,
        )
        if (startContainer) {
          this.focusContainers.set(rangeConfig.start.id, startContainer)
        }
      }

      if (rangeConfig.end.focusContainer) {
        const endContainer = document.getElementById(
          rangeConfig.end.focusContainer,
        )
        if (endContainer) {
          this.focusContainers.set(rangeConfig.end.id, endContainer)
        }
      }
    } else if (input.type === 'between') {
      const betweenConfig = input.elements as BetweenDateInput
      if (betweenConfig.focusContainer) {
        const container = document.getElementById(betweenConfig.focusContainer)
        if (container) {
          this.focusContainers.set(betweenConfig.id, container)
        }
      }
    }
  }

  private updateFocusContainer(inputId: string | null, isFocused: boolean) {
    if (!inputId) return

    // Önce tüm containerlardaki focus'u kaldır
    this.focusContainers.forEach(container => {
      container.setAttribute('data-focus', 'false')
    })

    // Aktif input'un container'ını güncelle
    const container = this.focusContainers.get(inputId)
    if (container) {
      container.setAttribute('data-focus', isFocused ? 'true' : 'false')
    }
  }

  private parseBackendDate(dateStr: string): Date | null {
    const parts = dateStr.split(this.outputConfig.slash || '-')
    if (parts.length !== 3) return null

    const backendFormat = this.config.output?.backendFormat || [
      'year',
      'month',
      'day',
    ]
    const dateObj: { [key: string]: number } = {}

    parts.forEach((part, index) => {
      dateObj[backendFormat[index]] = parseInt(part)
    })

    const date = new Date(
      dateObj.year,
      dateObj.month - 1, // Month is 0-based
      dateObj.day,
    )

    return isNaN(date.getTime()) ? null : date
  }

  private hasDataAttributes(): boolean {
    const { input } = this.config

    if (input.type === 'single') {
      const dateInput = document.getElementById(
        (input.elements as SingleDateInput).id,
      ) as HTMLInputElement
      return !!dateInput?.getAttribute('data-selected')
    }

    if (input.type === 'between') {
      const dateInput = document.getElementById(
        (input.elements as BetweenDateInput).id,
      ) as HTMLInputElement
      return !!(
        dateInput?.getAttribute('data-start') ||
        dateInput?.getAttribute('data-end')
      )
    }

    if (input.type === 'two') {
      const rangeConfig = input.elements as DateRangeInput
      const startInput = document.getElementById(
        rangeConfig.start.id,
      ) as HTMLInputElement
      const endInput = document.getElementById(
        rangeConfig.end.id,
      ) as HTMLInputElement
      return !!(
        startInput?.getAttribute('data-start') ||
        endInput?.getAttribute('data-end')
      )
    }

    return false
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

    return merged as Required<DatePickerClasses>
  }

  private initializeInputs() {
    const { input } = this.config

    if (input.type === 'single') {
      const singleConfig = input.elements as SingleDateInput
      const dateInput = document.getElementById(
        singleConfig.id,
      ) as HTMLInputElement
      if (dateInput) {
        this.registerInput(dateInput, { type: 'single' })
      }
    } else if (input.type === 'two') {
      const rangeConfig = input.elements as DateRangeInput
      const startInput = document.getElementById(
        rangeConfig.start.id,
      ) as HTMLInputElement
      const endInput = document.getElementById(
        rangeConfig.end.id,
      ) as HTMLInputElement

      if (startInput && endInput) {
        this.registerInput(startInput, {
          type: 'start',
          linkedInputId: rangeConfig.end.id,
        })
        this.registerInput(endInput, {
          type: 'end',
          linkedInputId: rangeConfig.start.id,
        })
      }
    } else if (input.type === 'between') {
      const betweenConfig = input.elements as BetweenDateInput
      const dateInput = document.getElementById(
        betweenConfig.id,
      ) as HTMLInputElement
      if (dateInput) {
        this.registerInput(dateInput, { type: 'single' }) // between için 'single' type kullanıyoruz
      }
    }
  }

  private registerInput(
    input: HTMLInputElement,
    config: { type: 'single' | 'start' | 'end'; linkedInputId?: string },
  ) {
    if (!this.registeredInputs.has(input.id)) {
      this.registeredInputs.set(input.id, {
        element: input,
        type: config.type,
        linkedInputId: config.linkedInputId,
      })

      input.addEventListener('click', e => {
        e.stopPropagation()
        this.handleInputClick(input)
      })

      input.addEventListener('focus', () => {
        this.handleInputClick(input)
      })
    }
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
    // Aktif input'un focus container'ını güncelle
    if (this.activeInput) {
      this.updateFocusContainer(this.activeInput.id, true)
    }
  }

  private hideDatePicker() {
    if (this.containerElement && this.classes.wrapper.hidden) {
      this.containerElement.classList.add(this.classes.wrapper.hidden)
    }
    // Aktif input'un focus container'ını güncelle
    if (this.activeInput) {
      this.updateFocusContainer(this.activeInput.id, false)
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
    let top = inputRect.bottom + scrollTop + 8 // 16px padding
    let left = inputRect.left + scrollLeft + -1.5

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
    this.containerElement.style.zIndex = '20'
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
      const strippedDate = this.stripTime(date)

      // Between seçimi için kontrol
      if (this.config.input.type === 'between') {
        if (
          this.betweenStartDate &&
          this.areDatesEqual(strippedDate, this.betweenStartDate)
        ) {
          return true
        }
        if (
          this.betweenEndDate &&
          this.areDatesEqual(strippedDate, this.betweenEndDate)
        ) {
          return true
        }
        return false
      }

      // Normal seçim için kontrol
      for (const selectedDate of this.selectedDates.values()) {
        if (this.areDatesEqual(selectedDate, date)) {
          return true
        }
      }
      return false
    }

    // Gün render fonksiyonu
    const renderDay = (date: Date, isOtherMonth: boolean = false) => {
      const strippedDate = this.stripTime(date)
      const isValid = this.isDateValid(date)
      const isSelected = isDateSelected(date)

      // Between seçimi için özel kontroller
      const isBetweenDate = (() => {
        if (
          this.config.input.type === 'between' &&
          this.betweenStartDate &&
          this.betweenEndDate
        ) {
          return (
            strippedDate > this.stripTime(this.betweenStartDate) &&
            strippedDate < this.stripTime(this.betweenEndDate)
          )
        }
        return false
      })()

      const isBetweenStart =
        this.betweenStartDate &&
        this.areDatesEqual(strippedDate, this.betweenStartDate)

      const isBetweenEnd =
        this.betweenEndDate &&
        this.areDatesEqual(strippedDate, this.betweenEndDate)

      // Normal seçim kontrolleri
      const isCurrentInput =
        this.activeInput &&
        this.areDatesEqual(
          this.selectedDates.get(this.activeInput.id) || null,
          date,
        )

      const isLinkedDate = (() => {
        if (!this.activeInput) return false
        const inputConfig = this.registeredInputs.get(this.activeInput.id)
        if (!inputConfig?.linkedInputId) return false
        const linkedDate = this.selectedDates.get(inputConfig.linkedInputId)
        return linkedDate && this.areDatesEqual(linkedDate, date)
      })()

      // CSS sınıflarını birleştir
      const dayClasses = [
        day.base,
        !isValid ? day.disabled : isOtherMonth ? day.empty : '',
        isSelected ? day.selected : '',
        isCurrentInput ? day.currentInput : '',
        isLinkedDate ? day.linkedHighlight : '',
        isBetweenStart ? day.betweenStart : '',
        isBetweenEnd ? day.betweenEnd : '',
        isBetweenDate ? day.between : '',
      ]
        .filter(Boolean)
        .join(' ')

      return `<div class="${dayClasses}"
              data-date="${date.toISOString()}"
              data-month="${isOtherMonth ? (date < firstDayOfMonth ? 'prev' : 'next') : 'current'}"
              ${isLinkedDate ? 'data-linked="true"' : ''}>
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

  private addEventListeners() {
    this.prevButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.changeMonth('prev')
    })

    this.nextButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.changeMonth('next')
    })

    this.resetButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.resetToToday()
    })

    this.resetAllButton?.addEventListener('click', e => {
      e.stopPropagation()
      this.resetAllInputs()
    })

    this.daysContainer?.addEventListener('click', e => {
      e.stopPropagation()
      const target = e.target as HTMLElement

      if (target.classList.contains(this.classes.day?.base ?? '')) {
        const dateStr = target.getAttribute('data-date')
        const monthType = target.getAttribute('data-month')

        if (!dateStr || !this.activeInput) return

        const date = new Date(dateStr)
        const selectedDate = this.stripTime(date)
        const inputConfig = this.registeredInputs.get(this.activeInput.id)

        // Önceki/sonraki ay günlerine tıklanınca sadece ay değişimi yap
        if (monthType === 'prev') {
          this.changeMonth('prev')
          return
        } else if (monthType === 'next') {
          this.changeMonth('next')
          return
        }

        // Linked date kontrolü
        const isLinkedDate = (() => {
          if (!this.activeInput) return false

          const currentConfig = this.registeredInputs.get(this.activeInput.id)
          if (!currentConfig?.linkedInputId) return false

          const linkedDate = this.dateValues.get(currentConfig.linkedInputId)
          return linkedDate && this.areDatesEqual(linkedDate, date)
        })()

        // Eğer linked date'e tıklandıysa, bağlantılı input'a geç
        if (isLinkedDate && this.activeInput) {
          const currentConfig = this.registeredInputs.get(this.activeInput.id)
          if (currentConfig?.linkedInputId) {
            const linkedInput = document.getElementById(
              currentConfig.linkedInputId,
            ) as HTMLInputElement
            if (linkedInput) {
              this.handleInputClick(linkedInput)
              return
            }
          }
        }

        // Eğer disabled bir güne tıklandıysa ve bu gün linked date ise
        // yine diğer input'a geçiş yap
        if (target.classList.contains(this.classes.day?.disabled ?? '')) {
          const currentConfig = this.registeredInputs.get(this.activeInput.id)
          if (currentConfig?.linkedInputId) {
            const linkedDate = this.dateValues.get(currentConfig.linkedInputId)
            if (linkedDate && this.areDatesEqual(linkedDate, date)) {
              const linkedInput = document.getElementById(
                currentConfig.linkedInputId,
              ) as HTMLInputElement
              if (linkedInput) {
                this.handleInputClick(linkedInput)
                return
              }
            }
          }
          return // Disabled ise ve linked date değilse hiçbir şey yapma
        }

        // Tarih seçimi öncesi validasyon
        if (inputConfig) {
          if (inputConfig.type === 'start' && inputConfig.linkedInputId) {
            const endDate = this.dateValues.get(inputConfig.linkedInputId)
            if (endDate && this.stripTime(endDate) <= selectedDate) {
              return
            }
          } else if (inputConfig.type === 'end' && inputConfig.linkedInputId) {
            const startDate = this.dateValues.get(inputConfig.linkedInputId)
            if (startDate && this.stripTime(startDate) >= selectedDate) {
              return
            }
          }
        }

        // Seçilen tarihi güncelle
        if (this.activeInput) {
          this.selectedDates.set(this.activeInput.id, date)
        }
        this.currentDate = new Date(date)

        // Sadece mevcut ayın günleri için tarih seçimini işle
        if (monthType === 'current') {
          this.selectDate(date)
        } else {
          this.renderCalendar()
          this.renderMonthShortNames()
          this.updateNavigationState()
        }
      }
    })

    if (this.closeButton) {
      this.closeButton.addEventListener('click', e => {
        e.stopPropagation()
        this.safeClose()
      })
    }

    document.addEventListener('click', e => {
      const target = e.target as HTMLElement
      const isDateInput = Array.from(this.registeredInputs.values()).some(
        input => input.element === target,
      )
      const isOutsideClick =
        this.containerElement &&
        !this.containerElement.contains(target) &&
        !isDateInput

      if (isOutsideClick && this.isDatePickerVisible()) {
        this.safeClose()
      }
    })
  }

  public safeChangeMonth(direction: 'next' | 'prev') {
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
      const lastDayOfTargetMonth = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth() + 1,
        0,
      )

      if (lastDayOfTargetMonth > strippedMaxDate) {
        return false // Sonraki aya gitmeye izin verme
      }
    }

    // Güvenli değişim
    this.changeMonth(direction)
    return true
  }

  private updateNavigationState() {
    const { minDate, maxDate } = this.config
    const currentMonth = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth(),
    )

    if (this.prevButton && minDate) {
      const isDisabled = currentMonth <= minDate
      if (this.classes.month.buttons?.prev?.disabled) {
        this.prevButton.classList.toggle(
          this.classes.month.buttons.prev.disabled,
          isDisabled,
        )
      }
      ;(this.prevButton as HTMLButtonElement).disabled = isDisabled
    }

    if (this.nextButton && maxDate) {
      const isDisabled = currentMonth >= maxDate
      if (this.classes.month.buttons?.next?.disabled) {
        this.nextButton.classList.toggle(
          this.classes.month.buttons.next.disabled,
          isDisabled,
        )
      }
      ;(this.nextButton as HTMLButtonElement).disabled = isDisabled
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

    if (minDate && strippedDate < minDate) return false
    if (maxDate && strippedDate > maxDate) return false

    // Range modu için özel validasyon
    if (this.config.input.type === 'two' && this.activeInput) {
      const inputConfig = this.registeredInputs.get(this.activeInput.id)

      if (inputConfig?.type === 'start' && inputConfig.linkedInputId) {
        // Gidiş tarihi için kontrol - seçili bir dönüş tarihi varsa ondan sonrası disabled olmalı
        const endDate = this.dateValues.get(inputConfig.linkedInputId)
        if (endDate && strippedDate >= this.stripTime(endDate)) {
          return false
        }
      } else if (inputConfig?.type === 'end' && inputConfig.linkedInputId) {
        // Dönüş tarihi için kontrol - seçili bir gidiş tarihi varsa ondan öncesi disabled olmalı
        const startDate = this.dateValues.get(inputConfig.linkedInputId)
        if (startDate && strippedDate <= this.stripTime(startDate)) {
          return false
        }
      }
    }

    // Between modu için özel validasyon
    if (this.config.input.type === 'between') {
      if (this.betweenEndDate && strippedDate > this.betweenEndDate) {
        return false
      }
    }

    return true
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
    this.positionDatePickerUnderInput(this.activeInput!)
  }

  private areDatesEqual(date1: Date | null, date2: Date): boolean {
    if (!date1) return false
    const d1 = this.stripTime(date1)
    const d2 = this.stripTime(date2)
    return d1.getTime() === d2.getTime()
  }

  private selectDate(date: Date) {
    if (!this.activeInput || !this.isDatePickerVisible()) return

    const inputConfig = this.registeredInputs.get(this.activeInput.id)
    if (!inputConfig) return

    const selectedDate = this.stripTime(date)
    const isValid = this.isDateValid(date)

    // Between mode için özel mantık
    if (this.config.input.type === 'between') {
      // Eğer seçilen tarih geçerli değilse işlem yapma
      if (!isValid) return

      // Seçilen tarih zaten seçili olan başlangıç veya bitiş tarihiyse, sıfırla ve yeniden başla
      if (
        (this.betweenStartDate &&
          this.areDatesEqual(selectedDate, this.betweenStartDate)) ||
        (this.betweenEndDate &&
          this.areDatesEqual(selectedDate, this.betweenEndDate))
      ) {
        this.resetState({
          type: 'between-new',
          date: selectedDate,
          inputId: this.activeInput.id,
        })
        return
      }

      // İlk seçim (hiç tarih seçili değil)
      if (!this.betweenStartDate && !this.betweenEndDate) {
        this.resetState({
          type: 'between-new',
          date: selectedDate,
          inputId: this.activeInput.id,
        })
        return
      }

      // Sadece başlangıç tarihi seçili
      if (this.betweenStartDate && !this.betweenEndDate) {
        if (selectedDate < this.betweenStartDate) {
          // Seçilen tarih başlangıç tarihinden küçükse, yeni başlangıç tarihi olarak ata
          this.resetState({
            type: 'between-update',
            date: selectedDate,
            inputId: this.activeInput.id,
            keepStart: false,
          })
        } else {
          // Seçilen tarih başlangıç tarihinden büyükse, bitiş tarihi olarak ata
          this.resetState({
            type: 'between-update',
            date: selectedDate,
            inputId: this.activeInput.id,
            keepStart: true,
          })

          // AutoClose kontrolü
          if (this.autoClose) {
            // <- Burada kontrol eksikti
            this.hideDatePicker()
            this.activeInput = null
          }
        }
        return
      }

      // İki tarih de seçili - yeni seçim başlat
      if (this.betweenStartDate && this.betweenEndDate) {
        this.resetState({
          type: 'between-new',
          date: selectedDate,
          inputId: this.activeInput.id,
        })
        return
      }
    }

    // Two inputs mode için mantık
    if (this.config.input.type === 'two') {
      if (!isValid) {
        // Eğer seçilen tarih linked date ise ve disabled ise, diğer input'a geç
        const isLinkedDate = (() => {
          if (!inputConfig.linkedInputId) return false
          const linkedDate = this.dateValues.get(inputConfig.linkedInputId)
          return linkedDate && this.areDatesEqual(linkedDate, date)
        })()

        if (isLinkedDate && inputConfig.linkedInputId) {
          const linkedInput = document.getElementById(
            inputConfig.linkedInputId,
          ) as HTMLInputElement
          if (linkedInput) {
            this.handleInputClick(linkedInput)
          }
        }
        return
      }

      // Tarihi seç ve değerleri güncelle
      this.selectedDates.set(this.activeInput.id, selectedDate)
      this.dateValues.set(this.activeInput.id, selectedDate)
      this.activeInput.value = this.formatDateBasedOnConfig(selectedDate)

      // Data attribute'unu güncelle
      this.updateDataAttributes(this.activeInput, {
        [inputConfig.type === 'start' ? 'start' : 'end']: selectedDate,
      })

      // AutoSwitch kontrolü
      if (this.autoSwitchInput && inputConfig.linkedInputId) {
        const linkedInput = document.getElementById(
          inputConfig.linkedInputId,
        ) as HTMLInputElement
        const linkedDate = this.selectedDates.get(inputConfig.linkedInputId)

        if (linkedInput && !linkedDate) {
          this.handleInputClick(linkedInput)
          this.updateFocusContainer(this.activeInput.id, false)
          this.updateFocusContainer(linkedInput.id, true)
          return
        }
      }

      // AutoClose kontrolü
      if (this.autoClose) {
        this.hideDatePicker()
        this.activeInput = null
      }

      this.renderCalendar()
      return
    }

    // Single mode için mantık
    if (this.config.input.type === 'single' && isValid) {
      this.selectedDates.set(this.activeInput.id, selectedDate)
      this.dateValues.set(this.activeInput.id, selectedDate)
      this.activeInput.value = this.formatDateBasedOnConfig(selectedDate)

      // Data attribute'unu güncelle
      this.updateDataAttributes(this.activeInput, { selected: selectedDate })

      if (this.autoClose) {
        this.hideDatePicker()
        this.activeInput = null
      }

      this.renderCalendar()
    }
  }

  private safeClose() {
    if (!this.activeInput) return
    const inputConfig = this.registeredInputs.get(this.activeInput.id)
    if (!inputConfig) return

    switch (this.config.input.type) {
      case 'between':
        if (this.betweenStartDate && !this.betweenEndDate) {
          // Tek tarih seçiliyken tamamen reset yapılmalı
          this.resetState({
            type: 'all', // 'soft' yerine 'all' kullanıyoruz
            inputId: this.activeInput.id,
          })
        } else if (this.betweenStartDate && this.betweenEndDate) {
          // İki tarih de seçiliyse tarihleri formatlayıp göster
          this.resetState({
            type: 'between-update',
            inputId: this.activeInput.id,
            date: this.betweenEndDate,
            keepStart: true,
          })
        }
        break

      case 'single':
        const selectedDate = this.selectedDates.get(this.activeInput.id)
        if (!selectedDate) {
          // Tarih seçili değilse soft reset
          this.resetState({
            type: 'soft',
            inputId: this.activeInput.id,
          })
        }
        break

      case 'two':
        if (inputConfig.type === 'start') {
          const startDate = this.selectedDates.get(this.activeInput.id)
          const endDate = inputConfig.linkedInputId
            ? this.selectedDates.get(inputConfig.linkedInputId)
            : null

          if (!startDate && endDate) {
            // Başlangıç tarihi yoksa soft reset
            this.resetState({
              type: 'soft',
              inputId: this.activeInput.id,
            })
          }
        } else if (inputConfig.type === 'end') {
          const endDate = this.selectedDates.get(this.activeInput.id)
          const startDate = inputConfig.linkedInputId
            ? this.selectedDates.get(inputConfig.linkedInputId)
            : null

          if (!endDate && startDate) {
            // Bitiş tarihi yoksa soft reset
            this.resetState({
              type: 'soft',
              inputId: this.activeInput.id,
            })
          }
        }
        break
    }

    this.hideDatePicker()
    this.activeInput = null
  }

  private resetState(options: ResetOptions) {
    const { type, inputId, date, keepStart = false, language } = options

    // Eğer language parametresi verilmişse, container'ın data-language attribute'unu güncelle
    if (language && this.containerElement) {
      this.containerElement.setAttribute('data-language', language)
    }

    // Seçilen input için temel kontroller
    const input = inputId
      ? (document.getElementById(inputId) as HTMLInputElement)
      : this.activeInput
    if (!input) return

    const inputConfig = this.registeredInputs.get(input.id)
    if (!inputConfig) return

    // Reset tiplerine göre işlemler
    switch (type) {
      case 'today':
        this.handleTodayReset(input)
        break

      case 'all':
        this.handleFullReset()
        break

      case 'between-new':
        if (!date) return
        this.handleBetweenNewReset(input, date)
        break

      case 'between-update':
        if (!date) return
        this.handleBetweenUpdateReset(input, date, keepStart)
        break

      case 'soft':
        this.handleSoftReset(input)
        break
    }

    // Calendar'ı güncelle
    this.renderCalendar()
    this.renderMonthShortNames()
    this.updateNavigationState()
  }

  private handleTodayReset(input: HTMLInputElement) {
    const today = this.stripTime(new Date())

    if (this.config.input.type === 'between') {
      // Between mode için bugün resetleme
      this.betweenStartDate = today
      this.betweenEndDate = null

      // Map'leri temizle ve yeni değeri set et
      this.clearDateMaps()
      this.selectedDates.set(`${input.id}-start`, today)
      this.dateValues.set(`${input.id}-start`, today)

      // Input'u güncelle
      input.value = this.formatDateBasedOnConfig(today)
      this.updateDataAttributes(input, { start: today, end: null })
    } else {
      // Single veya Two inputs mode için bugün resetleme
      this.selectedDates.set(input.id, today)
      this.dateValues.set(input.id, today)
      input.value = this.formatDateBasedOnConfig(today)

      const inputConfig = this.registeredInputs.get(input.id)
      if (inputConfig?.type === 'start') {
        this.updateDataAttributes(input, { start: today })
      } else if (inputConfig?.type === 'end') {
        this.updateDataAttributes(input, { end: today })
      } else {
        this.updateDataAttributes(input, { selected: today })
      }
    }

    this.currentDate = new Date(today)
    this.selectedDate = today
  }

  private handleFullReset() {
    this.registeredInputs.forEach((config, id) => {
      const input = document.getElementById(id) as HTMLInputElement
      if (input) {
        input.value = ''
        this.updateDataAttributes(input, {
          start: null,
          end: null,
          selected: null,
        })
      }
    })

    this.clearDateMaps()
    this.resetBetweenState()
    this.currentDate = new Date()
    this.selectedDate = null
  }

  private handleBetweenNewReset(input: HTMLInputElement, date: Date) {
    // Her şeyi temizle ve yeni start date'i set et
    this.clearDateMaps()
    this.resetBetweenState()

    this.betweenStartDate = date
    this.selectedDates.set(`${input.id}-start`, date)
    this.dateValues.set(`${input.id}-start`, date)

    input.value = this.formatDateBasedOnConfig(date)
    this.updateDataAttributes(input, { start: date, end: null })
  }

  private handleBetweenUpdateReset(
    input: HTMLInputElement,
    date: Date,
    keepStart: boolean,
  ) {
    if (keepStart && this.betweenStartDate) {
      // Start date'i koru, end date'i güncelle
      this.betweenEndDate = date
      this.selectedDates.set(`${input.id}-end`, date)
      this.dateValues.set(`${input.id}-end`, date)

      const value = `${this.formatDateBasedOnConfig(this.betweenStartDate)}${this.outputConfig.between}${this.formatDateBasedOnConfig(date)}`
      input.value = value
      this.updateDataAttributes(input, {
        start: this.betweenStartDate,
        end: date,
      })

      // AutoClose buradan KALDIRILMALI - selectDate içinde kontrol edilecek
    } else {
      // Start date'i güncelle, end date'i temizle
      this.betweenStartDate = date
      this.betweenEndDate = null

      this.clearDateMaps()
      this.selectedDates.set(`${input.id}-start`, date)
      this.dateValues.set(`${input.id}-start`, date)

      input.value = this.formatDateBasedOnConfig(date)
      this.updateDataAttributes(input, { start: date, end: null })
    }
  }

  private handleSoftReset(input: HTMLInputElement) {
    input.value = ''
    this.selectedDates.delete(input.id)
    this.dateValues.delete(input.id)

    if (this.config.input.type === 'between') {
      this.updateDataAttributes(input, { start: null, end: null })
    } else if (this.config.input.type === 'single') {
      this.updateDataAttributes(input, { selected: null })
    } else {
      const inputConfig = this.registeredInputs.get(input.id)
      if (inputConfig?.type === 'start') {
        this.updateDataAttributes(input, { start: null })
      } else if (inputConfig?.type === 'end') {
        this.updateDataAttributes(input, { end: null })
      }
    }
  }

  private clearDateMaps() {
    this.selectedDates.clear()
    this.dateValues.clear()
  }

  private resetBetweenState() {
    this.betweenStartDate = null
    this.betweenEndDate = null
  }

  private updateDataAttributes(
    input: HTMLInputElement,
    data: {
      start?: Date | null
      end?: Date | null
      selected?: Date | null
    },
  ) {
    const { start, end, selected } = data

    if (start === null) {
      input.removeAttribute('data-start')
    } else if (start) {
      input.setAttribute(
        'data-start',
        this.formatDateBasedOnConfig(start, 'backend'),
      )
    }

    if (end === null) {
      input.removeAttribute('data-end')
    } else if (end) {
      input.setAttribute(
        'data-end',
        this.formatDateBasedOnConfig(end, 'backend'),
      )
    }

    if (selected === null) {
      input.removeAttribute('data-selected')
    } else if (selected) {
      input.setAttribute(
        'data-selected',
        this.formatDateBasedOnConfig(selected, 'backend'),
      )
    }
  }

  // Mevcut fonksiyonları güncelleme
  public resetToToday() {
    this.resetState({ type: 'today' })
  }

  public resetAllInputs() {
    this.resetState({ type: 'all' })
  }

  public destroy() {
    window.removeEventListener('resize', this.handleWindowResize)
  }
}

export { DatePicker }
export type { DatePickerConfig, LanguageConfig }
