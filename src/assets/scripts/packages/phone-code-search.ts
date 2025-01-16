interface PhoneCodeElements {
  container: string
  select: string
  flag: string
  prefix: string
  phoneInput: string
  searchInput: string
  suggestions: string
  searchModal: string
  clearButton: string
  afterFocusElement?: string // Yeni eklenen element ID'si
}

interface PhoneCodeOption {
  name: string
  dial_code: string
  code: string
}

interface PhoneCodeLanguage {
  id: 'TR' | 'EN' // Desteklenen diller
  data: PhoneCodeOption[]
}

// Ana options interface'ini güncelleme
interface PhoneCodeOptions {
  elements: PhoneCodeElements
  languages: PhoneCodeLanguage[]
  defaultLanguage?: 'TR' | 'EN'
  defaultCountry?: string // Opsiyonel default ülke kodu
  onSelect?: (option: PhoneCodeOption) => void
  onPhoneChange?: (phone: string) => void
  onModalOpen?: () => void
  onModalClose?: () => void
}

class PhoneCodeSearch {
  private elements: {
    container: HTMLElement
    select: HTMLSelectElement
    flag: HTMLImageElement
    prefix: HTMLElement
    phoneInput: HTMLInputElement
    searchInput: HTMLInputElement
    suggestions: HTMLElement
    searchModal: HTMLElement
    clearButton: HTMLElement
  }
  private isOpen: boolean = false
  private templates: {
    suggestionItem: HTMLElement
    noResults: HTMLElement
  }

  private options: PhoneCodeOptions
  private allOptions: PhoneCodeOption[] = []
  private currentLanguage: 'TR' | 'EN'

  constructor(options: PhoneCodeOptions) {
    this.options = options

    const container = document.getElementById(options.elements.container)
    const select = document.getElementById(
      options.elements.select,
    ) as HTMLSelectElement
    const flag = document.getElementById(
      options.elements.flag,
    ) as HTMLImageElement
    const prefix = document.getElementById(options.elements.prefix)
    const phoneInput = document.getElementById(
      options.elements.phoneInput,
    ) as HTMLInputElement
    const searchInput = document.getElementById(
      options.elements.searchInput,
    ) as HTMLInputElement
    const suggestions = document.getElementById(options.elements.suggestions)
    const searchModal = document.getElementById(options.elements.searchModal)
    const clearButton = document.getElementById(options.elements.clearButton)

    if (
      !container ||
      !select ||
      !flag ||
      !prefix ||
      !phoneInput ||
      !searchInput ||
      !suggestions ||
      !searchModal ||
      !clearButton
    ) {
      throw new Error('Required elements not found')
    }

    this.elements = {
      container,
      select,
      flag,
      prefix,
      phoneInput,
      searchInput,
      suggestions,
      searchModal,
      clearButton,
    }

    // HTML'den dil kontrolü
    const htmlLanguage = this.elements.select.getAttribute('data-language') as
      | 'TR'
      | 'EN'
      | null

    // Dil önceliği: HTML > options > default
    this.currentLanguage = htmlLanguage || options.defaultLanguage || 'EN'

    // Dil paketini bul ve yükle
    const languagePackage = options.languages.find(
      lang => lang.id === this.currentLanguage,
    )
    if (!languagePackage) {
      throw new Error(`Language package not found for: ${this.currentLanguage}`)
    }

    this.allOptions = languagePackage.data

    // Select elemente dil bilgisini ekle
    this.elements.select.setAttribute('data-language', this.currentLanguage)

    // Template'leri yakala
    this.templates = this.captureTemplates()

    // Default ülke kontrolü (HTML > options > ilk ülke)
    const defaultCountryCode =
      this.elements.select.getAttribute('data-default') ||
      options.defaultCountry

    // Initialize'da kullanmak üzere default ülkeyi belirle
    const defaultOption = defaultCountryCode
      ? this.allOptions.find(opt => opt.code === defaultCountryCode)
      : this.allOptions[0]

    // Başlangıç değerlerini ayarla ve event listener'ları bağla
    this.initialize(defaultOption)
  }

  private handleCodeButtonClick(): void {
    if (this.isOpen) {
      this.closeModal()
    } else {
      this.openModal()
    }

    // Modal açıldığında scroll pozisyonunu ayarla
    if (this.isOpen) {
      this.adjustModalPosition()
    }

    // Focus durumunu güncelle
    this.updateFocusState(this.isOpen)
  }

  public setLanguage(languageId: 'TR' | 'EN'): void {
    const languagePackage = this.options.languages.find(
      lang => lang.id === languageId,
    )
    if (!languagePackage) {
      throw new Error(`Language package not found for: ${languageId}`)
    }

    this.currentLanguage = languageId
    this.allOptions = languagePackage.data
    this.elements.select.setAttribute('data-language', languageId)

    // Mevcut seçili değeri koru
    const currentCode = this.elements.select.value

    // Select options'ları güncelle
    this.updateSelectOptions()

    // Eğer mevcut seçili ülke yeni dilde varsa, onu seç
    const currentOption = this.allOptions.find(opt => opt.code === currentCode)
    if (currentOption) {
      this.updateSelectedOption(currentOption)
    } else {
      // Yoksa ilk opsiyonu seç
      const defaultOption = this.allOptions[0]
      if (defaultOption) {
        this.updateSelectedOption(defaultOption)
      }
    }
  }

  // Şablon elementlerini yakala
  private captureTemplates(): {
    suggestionItem: HTMLElement
    noResults: HTMLElement
  } {
    const suggestionItem =
      this.elements.suggestions.querySelector('.suggestion-item')
    const noResults = this.elements.suggestions.querySelector('.no-results')

    if (!suggestionItem || !noResults) {
      throw new Error(
        'Required template elements not found in suggestions container',
      )
    }

    this.elements.suggestions.innerHTML = ''

    return {
      suggestionItem: suggestionItem.cloneNode(true) as HTMLElement,
      noResults: noResults.cloneNode(true) as HTMLElement,
    }
  }

  private setupEventListeners(): void {
    // Ülke kodu butonuna tıklanınca
    const codeButton =
      this.elements.container.querySelector('#phone-code-button')
    codeButton?.addEventListener('click', this.handleCodeButtonClick.bind(this))

    // Arama input'u için event listener
    this.elements.searchInput.addEventListener(
      'input',
      this.handleSearch.bind(this),
    )

    // Temizleme butonu için event listener
    this.elements.clearButton.addEventListener(
      'click',
      this.handleClear.bind(this),
    )

    // Öneriler için click event listener
    this.elements.suggestions.addEventListener(
      'mousedown',
      this.handleSuggestionClick.bind(this),
    )

    // Telefon input'u için event listener
    this.elements.phoneInput.addEventListener(
      'input',
      this.handlePhoneInput.bind(this),
    )

    // Modal dışına tıklanınca kapanması için
    document.addEventListener('click', (e: MouseEvent) => {
      if (!this.elements.container.contains(e.target as Node)) {
        this.closeModal()
      }
    })
  }

  private handleSearch(e: Event): void {
    const searchText = (e.target as HTMLInputElement).value
    this.filterAndRenderSuggestions(searchText)
    this.toggleClearButton(searchText)
  }

  private handleClear(): void {
    this.elements.searchInput.value = ''
    this.filterAndRenderSuggestions('')
    this.toggleClearButton('')
    this.elements.searchInput.focus()
  }

  private handlePhoneInput(e: Event): void {
    const value = (e.target as HTMLInputElement).value
    this.options.onPhoneChange?.(value)
  }

  private isMobileWidth(): boolean {
    return window.innerWidth <= 510 // 510px ve altı mobil olarak kabul edilecek
  }

  private openModal(): void {
    this.isOpen = true
    this.elements.searchModal.classList.remove('hidden')
    this.elements.searchModal.classList.remove('pointer-events-none')
    this.elements.searchInput.value = ''

    // Modalı görünür yap ve pozisyonunu ayarla
    requestAnimationFrame(() => {
      this.adjustModalPosition()

      // Mobil genişlikte değilse input'a odaklan
      if (!this.isMobileWidth()) {
        this.elements.searchInput.focus()
      }
    })

    this.filterAndRenderSuggestions('')
    this.options.onModalOpen?.()
    this.updateFocusState(true)
  }

  private adjustModalPosition(): void {
    const modalRect = this.elements.searchModal.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const modalHeight = modalRect.height
    const isMobile = this.isMobileWidth()

    if (isMobile) {
      // Mobil genişlikte ise, modalı viewport'un üst kısmına konumlandır
      const targetTop = Math.min(viewportHeight * 0.15, 80) // Viewport'un en fazla %15'i veya 80px
      const currentScroll = window.pageYOffset
      const targetScroll = currentScroll + modalRect.top - targetTop

      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      })
    } else {
      // Desktop genişlikte ise, ortalama pozisyonlama yap
      const idealPosition = (viewportHeight - modalHeight) / 2

      if (modalRect.top < 0 || modalRect.top + modalHeight > viewportHeight) {
        const currentScroll = window.pageYOffset
        const targetScroll = currentScroll + modalRect.top - idealPosition

        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth',
        })
      }
    }
  }

  private closeModal(): void {
    if (this.isOpen) {
      this.isOpen = false
      this.elements.searchModal.classList.add('hidden')
      this.elements.searchModal.classList.add('pointer-events-none')
      this.options.onModalClose?.()
      this.updateFocusState(false)
    }
  }

  private updateFocusState(isFocused: boolean): void {
    this.elements.container.setAttribute('data-focus', isFocused.toString())
  }

  private toggleClearButton(value: string): void {
    if (value) {
      this.elements.clearButton.classList.remove('hidden')
    } else {
      this.elements.clearButton.classList.add('hidden')
    }
  }

  private updateSelectOptions(): void {
    this.elements.select.innerHTML = this.allOptions
      .map(
        option => `
          <option value="${option.code}" data-prefix="${option.dial_code}" data-flag="${option.code.toLowerCase()}">
            ${option.name} (${option.dial_code})
          </option>
        `,
      )
      .join('')
  }

  private createSuggestionElement(option: PhoneCodeOption): HTMLElement {
    const element = this.templates.suggestionItem.cloneNode(true) as HTMLElement
    const isSelected = option.code === this.elements.select.value
    const flag = element.querySelector('img')
    const name = element.querySelector('span')
    const dialCode = element.querySelectorAll('span')[1]

    element.setAttribute('data-value', option.code)
    element.setAttribute('data-selected', isSelected.toString())

    if (flag) {
      flag.src = `https://flagcdn.com/${option.code.toLowerCase()}.svg`
      flag.alt = option.name
    }
    if (name) {
      name.textContent = option.name
    }
    if (dialCode) {
      dialCode.textContent = option.dial_code
    }

    return element
  }

  private filterAndRenderSuggestions(searchText: string): void {
    this.elements.suggestions.innerHTML = ''
    const currentValue = this.elements.select.value

    // Filtreleme işlemi
    const filteredOptions =
      searchText.trim() === ''
        ? this.allOptions
        : this.allOptions.filter(
            option =>
              option.name.toLowerCase().includes(searchText.toLowerCase()) ||
              option.dial_code.includes(searchText) ||
              option.code.toLowerCase().includes(searchText.toLowerCase()),
          )

    // Sonuç bulunamadı durumu
    if (filteredOptions.length === 0) {
      this.elements.suggestions.appendChild(
        this.templates.noResults.cloneNode(true),
      )
      return
    }

    // Önerileri render et
    const fragment = document.createDocumentFragment()
    filteredOptions.forEach(option => {
      const element = this.createSuggestionElement(option)
      // Seçili olan elemanın durumunu güncelle
      const isSelected = option.code === currentValue
      element.setAttribute('data-selected', isSelected.toString())

      // Eğer seçili ise görünür olması için scroll position'ı ayarla
      if (isSelected && searchText.trim() === '') {
        setTimeout(() => {
          element.scrollIntoView({ block: 'nearest' })
        }, 0)
      }

      fragment.appendChild(element)
    })

    this.elements.suggestions.appendChild(fragment)
  }

  private handleSuggestionClick(e: Event): void {
    const target = e.target as HTMLElement
    const suggestionEl = target.closest('[data-value]') as HTMLElement

    if (suggestionEl) {
      const code = suggestionEl.dataset.value
      const selectedOption = this.allOptions.find(opt => opt.code === code)
      if (selectedOption) {
        this.updateSelectedOption(selectedOption, true) // shouldFocus true olarak geçiyoruz
        this.closeModal()
      }
    }
  }

  private updateSelectedOption(
    option: PhoneCodeOption,
    shouldFocus: boolean = false,
  ): void {
    // Select elementine veriyi set et
    this.elements.select.value = option.code

    // Data attribute'leri ekle
    this.elements.select.setAttribute('data-code', option.code)
    this.elements.select.setAttribute('data-dial-code', option.dial_code)
    this.elements.select.setAttribute('data-country', option.name)
    this.elements.select.setAttribute('data-flag', option.code.toLowerCase())

    // Görsel güncelleme
    this.elements.flag.src = `https://flagcdn.com/${option.code.toLowerCase()}.svg`
    this.elements.prefix.textContent = option.dial_code

    // Callback'i çağır
    this.options.onSelect?.(option)

    // Focus işlemini en sona alıyoruz ve shouldFocus kontrolü yapıyoruz
    if (shouldFocus) {
      // Modal kapandıktan sonra focus yapması için setTimeout kullanıyoruz
      setTimeout(() => {
        this.focusAfterElement()
      }, 150) // Modal kapanma animasyonundan sonra çalışması için biraz daha uzun bir süre
    }
  }

  private focusAfterElement(): void {
    // TODO:: focus yapılacak elementin ID'sini alıp focus yap
  }

  // initialize metodunu da güncelliyoruz
  private initialize(defaultOption?: PhoneCodeOption): void {
    this.setupEventListeners()
    this.updateSelectOptions()

    // Default ülkeyi ayarla - initialize'da focus yapma
    if (defaultOption) {
      this.updateSelectedOption(defaultOption, false)
    }
  }

  // Public API metodları
  public getValue(): PhoneCodeOption | undefined {
    const code = this.elements.select.value
    return this.allOptions.find(opt => opt.code === code)
  }

  // setValue metodunu da güncelliyoruz
  public setValue(code: string, shouldFocus: boolean = false): void {
    const option = this.allOptions.find(opt => opt.code === code)
    if (option) {
      this.updateSelectedOption(option, shouldFocus)
    }
  }

  public getPhoneNumber(): string {
    const option = this.getValue()
    return option
      ? `${option.dial_code}${this.elements.phoneInput.value}`
      : this.elements.phoneInput.value
  }

  public getFormattedPhoneNumber(): string {
    const option = this.getValue()
    const number = this.elements.phoneInput.value.trim()
    return option && number ? `${option.dial_code} ${number}` : number
  }

  public clear(): void {
    // Varsayılan ilk opsiyonu seç
    const defaultOption = this.allOptions[0]
    if (defaultOption) {
      this.updateSelectedOption(defaultOption)
    }
    // Telefon input'unu temizle
    this.elements.phoneInput.value = ''
  }
}

export default PhoneCodeSearch
