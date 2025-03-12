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
  afterFocusElement?: string
}

interface PhoneCodeOption {
  name: string
  dial_code: string
  code: string
}

interface PhoneCodeLanguage {
  id: 'TR' | 'EN' | string
  data: PhoneCodeOption[]
}

interface PhoneCodeOptions {
  classNames: PhoneCodeElements // ID'ler yerine sınıf isimleri
  languages: PhoneCodeLanguage[]
  defaultLanguage?: 'TR' | 'EN'
  defaultCountry?: string
  onSelect?: (option: PhoneCodeOption, instance: PhoneCodeSearch) => void
  onPhoneChange?: (phone: string, instance: PhoneCodeSearch) => void
  onModalOpen?: (instance: PhoneCodeSearch) => void
  onModalClose?: (instance: PhoneCodeSearch) => void
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
  private instanceId: string // Her instance için benzersiz ID
  private static instances: Map<string, PhoneCodeSearch> = new Map() // Tüm instance'ları takip eden statik Map

  constructor(containerElement: HTMLElement, options: PhoneCodeOptions) {
    this.options = options
    this.instanceId = this.generateUniqueId()

    // Container elementi kaydet
    this.elements = {
      container: containerElement,
      select: containerElement.querySelector(
        `.${options.classNames.select}`,
      ) as HTMLSelectElement,
      flag: containerElement.querySelector(
        `.${options.classNames.flag}`,
      ) as HTMLImageElement,
      prefix: containerElement.querySelector(
        `.${options.classNames.prefix}`,
      ) as HTMLElement,
      phoneInput: containerElement.querySelector(
        `.${options.classNames.phoneInput}`,
      ) as HTMLInputElement,
      searchInput: containerElement.querySelector(
        `.${options.classNames.searchInput}`,
      ) as HTMLInputElement,
      suggestions: containerElement.querySelector(
        `.${options.classNames.suggestions}`,
      ) as HTMLElement,
      searchModal: containerElement.querySelector(
        `.${options.classNames.searchModal}`,
      ) as HTMLElement,
      clearButton: containerElement.querySelector(
        `.${options.classNames.clearButton}`,
      ) as HTMLElement,
    }

    // Gerekli elementlerin var olduğunu kontrol et
    if (
      !this.elements.select ||
      !this.elements.flag ||
      !this.elements.prefix ||
      !this.elements.phoneInput ||
      !this.elements.searchInput ||
      !this.elements.suggestions ||
      !this.elements.searchModal ||
      !this.elements.clearButton
    ) {
      throw new Error(
        `Required elements not found in container ${containerElement.className}`,
      )
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

    // Template'leri yakala ve hazırla
    this.templates = this.captureTemplates()

    // Default ülke kontrolü (HTML > options > ilk ülke)
    const defaultCountryCode =
      this.elements.select.getAttribute('data-default') ||
      options.defaultCountry

    // Initialize'da kullanmak üzere default ülkeyi belirle
    let defaultOption = defaultCountryCode
      ? this.allOptions.find(opt => opt.dial_code === defaultCountryCode)
      : this.allOptions[0]

    // +1 ise amerika code u olmalı US
    if (defaultCountryCode === '+1') {
      defaultOption = this.allOptions.find(opt => opt.code === 'US')
    }
    // +44 ise ingiltere
    if (defaultCountryCode === '+44') {
      defaultOption = this.allOptions.find(opt => opt.code === 'GB')
    }

    // Instance'ı global map'e ekle
    PhoneCodeSearch.instances.set(this.instanceId, this)

    // Container'a instance ID'sini ekle
    this.elements.container.setAttribute('data-phone-code-id', this.instanceId)

    // Başlangıç değerlerini ayarla ve event listener'ları bağla
    this.initialize(defaultOption)
  }

  private generateUniqueId(): string {
    return 'phone-code-' + Math.random().toString(36).substring(2, 9)
  }

  private handleCodeButtonClick(): void {
    // Tüm açık modalları kapat (tek seferde bir modal açık olmalı)
    if (this.isOpen) {
      this.closeModal()
    } else {
      // Diğer tüm açık modalları kapat
      PhoneCodeSearch.closeAllModals()
      this.openModal()
    }

    // Modal açıldığında scroll pozisyonunu ayarla
    if (this.isOpen) {
      this.adjustModalPosition()
    }

    // Focus durumunu güncelle
    this.updateFocusState(this.isOpen)
  }

  // Tüm açık modalları kapatmak için statik metod
  public static closeAllModals(): void {
    PhoneCodeSearch.instances.forEach(instance => {
      if (instance.isOpen) {
        instance.closeModal()
      }
    })
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

    // Template alındıktan sonra suggestions konteynırını temizle
    this.elements.suggestions.innerHTML = ''

    return {
      suggestionItem: suggestionItem.cloneNode(true) as HTMLElement,
      noResults: noResults.cloneNode(true) as HTMLElement,
    }
  }

  private setupEventListeners(): void {
    // Ülke kodu butonuna tıklanınca
    const codeButton =
      this.elements.container.querySelector('.phone-code-button')
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
      if (this.isOpen && !this.elements.container.contains(e.target as Node)) {
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

  // handlePhoneInput metoduna validasyon eklemek için güncelleyelim
  private handlePhoneInput(e: Event): void {
    const input = e.target as HTMLInputElement
    const value = input.value

    // Validasyon için regex pattern
    // Latin rakamlar (0-9), Arapça rakamlar (٠-٩) ve Doğu Arapça rakamlar (۰-۹)
    const numericPattern = /^[0-9٠-٩۰-۹]+$/

    // Maksimum uzunluk kontrolü
    const maxLength = input.getAttribute('data-max-length')
    const maxLengthValue = maxLength ? parseInt(maxLength, 10) : null

    // Değer kontrolü
    if (value !== '') {
      let newValue = value

      // Sayı kontrolü
      if (!numericPattern.test(newValue)) {
        newValue = input.dataset.lastValidValue || ''
      } else {
        // Sayıları standartlaştır (Arapça rakamları Latin rakamlara çevir)
        newValue = this.standardizeNumbers(newValue)
      }

      // Maksimum uzunluk kontrolü
      if (maxLengthValue !== null && newValue.length > maxLengthValue) {
        newValue = newValue.substring(0, maxLengthValue)
      }

      // Eğer değer değiştiyse, input değerini güncelle
      if (newValue !== value) {
        input.value = newValue
      }

      // Son geçerli değeri sakla
      input.dataset.lastValidValue = input.value
    } else {
      // Değer boşsa, son geçerli değeri temizle
      input.dataset.lastValidValue = ''
    }

    // Callback'i çağır
    this.options.onPhoneChange?.(input.value, this)
  }

  // Sayıları standartlaştırma fonksiyonu
  private standardizeNumbers(value: string): string {
    // Arapça ve Doğu Arapça (Farsi) rakamları Latin rakamlara çevirme
    return (
      value
        // Arapça rakamlar (٠-٩) → Latin rakamlar (0-9)
        .replace(/[٠-٩]/g, d =>
          String.fromCharCode(d.charCodeAt(0) - 1632 + 48),
        )
        // Doğu Arapça/Farsi rakamlar (۰-۹) → Latin rakamlar (0-9)
        .replace(/[۰-۹]/g, d =>
          String.fromCharCode(d.charCodeAt(0) - 1776 + 48),
        )
    )
  }

  // Telefon input'una validasyon eklemek için özel metod
  private setupPhoneInputValidation(): void {
    // Paste event'i için kontrol
    this.elements.phoneInput.addEventListener('paste', (e: ClipboardEvent) => {
      // Clipboard verisi al
      const clipboardData = e.clipboardData || window['clipboardData']
      const pastedData = clipboardData.getData('text')

      // Sayı pattern'i
      const numericPattern = /^[0-9٠-٩۰-۹]+$/

      // Yapıştırılan veri sadece rakam değilse
      if (!numericPattern.test(pastedData)) {
        e.preventDefault()

        // Sadece rakamları ayıkla
        const numericOnly = pastedData.replace(/[^0-9٠-٩۰-۹]/g, '')

        if (numericOnly) {
          // Mevcut değere ekle
          const input = e.target as HTMLInputElement
          const currentValue = input.value
          const selectionStart = input.selectionStart || 0
          const selectionEnd = input.selectionEnd || 0

          const newValue =
            currentValue.substring(0, selectionStart) +
            this.standardizeNumbers(numericOnly) +
            currentValue.substring(selectionEnd)

          input.value = newValue
          input.dataset.lastValidValue = newValue

          // Cursor'u doğru pozisyona ayarla
          setTimeout(() => {
            input.selectionStart = input.selectionEnd =
              selectionStart + this.standardizeNumbers(numericOnly).length
          }, 0)

          // Callback'i çağır
          this.options.onPhoneChange?.(input.value, this)
        }
      }
    })

    // Keydown event'i - izin verilmeyen karakterlerde event'i durdur
    this.elements.phoneInput.addEventListener('keydown', (e: KeyboardEvent) => {
      // Tab, backspace, delete, sol/sağ ok tuşları, home/end, ctrl+a, ctrl+c, ctrl+v gibi kontrol tuşları
      const controlKeys = [
        'Tab',
        'Backspace',
        'Delete',
        'ArrowLeft',
        'ArrowRight',
        'Home',
        'End',
      ]

      // Shift tuşuyla beraber sayı dışı karakterler girilemez
      if (e.shiftKey && !controlKeys.includes(e.key)) {
        e.preventDefault()
        return
      }

      // Sayı tuşları (0-9) ve kontrol tuşları hariç diğer tuşları engelle
      const isNumericKey = /^[0-9٠-٩۰-۹]$/.test(e.key)
      const isControlKey =
        controlKeys.includes(e.key) ||
        ((e.ctrlKey || e.metaKey) &&
          ['a', 'c', 'v', 'x', 'z'].includes(e.key.toLowerCase()))

      if (!isNumericKey && !isControlKey) {
        e.preventDefault()
      }
    })
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

    // Önerileri ilk kez yükle
    this.filterAndRenderSuggestions('')
    this.options.onModalOpen?.(this)
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

      // Modal kapandığında suggestions DOM'dan temizle (performans için)
      this.elements.suggestions.innerHTML = ''

      this.options.onModalClose?.(this)
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
    this.options.onSelect?.(option, this)

    // Focus işlemini en sona alıyoruz ve shouldFocus kontrolü yapıyoruz
    if (shouldFocus) {
      // Modal kapandıktan sonra focus yapması için setTimeout kullanıyoruz
      setTimeout(() => {
        this.focusAfterElement()
      }, 150) // Modal kapanma animasyonundan sonra çalışması için biraz daha uzun bir süre
    }
  }

  private focusAfterElement(): void {
    const afterElementClass = this.options.classNames.afterFocusElement
    if (afterElementClass) {
      const afterElement = this.elements.container.querySelector(
        `.${afterElementClass}`,
      ) as HTMLElement
      if (afterElement) {
        afterElement.focus()
      } else {
        this.elements.phoneInput.focus()
      }
    } else {
      this.elements.phoneInput.focus()
    }
  }

  private initialize(defaultOption?: PhoneCodeOption): void {
    this.setupEventListeners()
    this.updateSelectOptions()

    // Telefon input validasyonunu kur
    this.setupPhoneInputValidation()

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

  // Tüm telefon kodu arama inputlarını aktifleştiren statik metod
  public static init(options: PhoneCodeOptions): void {
    const containers = document.querySelectorAll(
      `.${options.classNames.container}`,
    )
    containers.forEach(container => {
      // Eğer bu container zaten bir instance'a sahipse tekrar oluşturma
      if (!container.hasAttribute('data-phone-code-id')) {
        new PhoneCodeSearch(container as HTMLElement, options)
      }
    })
  }

  // Yeni eklenen elementleri taramak için refresh metodu
  public static refresh(): void {
    console.log('Refreshing phone code search...')
    // Yeni eklenen phone-code-container elementleri için kontrol yap
    document
      .querySelectorAll('[class*="phone-code-container"]')
      .forEach(container => {
        // Eğer bu container henüz bir instance'a sahip değilse oluştur
        if (!container.hasAttribute('data-phone-code-id')) {
          // Hangi instance'ın option'larını kullanacağız bulmak için
          const lastUsedOptions = PhoneCodeSearch.getLastUsedOptions()
          if (lastUsedOptions) {
            new PhoneCodeSearch(container as HTMLElement, lastUsedOptions)
          } else {
            console.warn(
              'No existing PhoneCodeSearch instance found to get options from.',
            )
          }
        }
      })
  }

  // Son kullanılan options değerini almak için yardımcı metod
  private static getLastUsedOptions(): PhoneCodeOptions | null {
    if (PhoneCodeSearch.instances.size === 0) {
      return null
    }

    // Map'teki ilk instance'ı al
    const firstInstance = PhoneCodeSearch.instances.values().next().value

    // Instance varsa options değerini döndür, yoksa null döndür
    if (firstInstance) {
      return firstInstance.options
    }

    return null
  }

  // Instance'ı kaldırmak için
  public destroy(): void {
    PhoneCodeSearch.instances.delete(this.instanceId)
    this.elements.container.removeAttribute('data-phone-code-id')
    // Event listener'ları kaldır...
  }

  // Belirli bir container'a ait instance'ı bulmak için
  public static getInstance(
    container: HTMLElement,
  ): PhoneCodeSearch | undefined {
    const instanceId = container.getAttribute('data-phone-code-id')
    if (instanceId) {
      return PhoneCodeSearch.instances.get(instanceId)
    }
    return undefined
  }
}

export { PhoneCodeSearch }
export type {
  PhoneCodeOption,
  PhoneCodeLanguage,
  PhoneCodeElements,
  PhoneCodeOptions,
}
