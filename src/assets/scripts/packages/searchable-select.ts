interface SearchableSelectElements {
  container: string
  select: string
  input: string
  suggestions: string
  clearButton?: string
}

interface SearchableSelectOptions {
  elements: SearchableSelectElements
  onSelect?: (value: string) => void
  onClear?: () => void
  onSearch?: (searchText: string) => void
  onDropdownOpen?: () => void
  onDropdownClose?: () => void
}

interface SearchOption {
  value: string
  text: string
}

class SearchableSelect {
  private static instances = new Map<HTMLElement, SearchableSelect>()

  private elements: {
    container: HTMLElement
    select: HTMLSelectElement
    input: HTMLInputElement
    suggestions: HTMLElement
    clearButton: HTMLElement | null
  }
  private options: SearchableSelectOptions
  private allOptions: SearchOption[] = []
  private isOpen: boolean = false
  private templates: {
    suggestionItem: HTMLElement
    noResults: HTMLElement
    noneItem: HTMLElement
  }

  constructor(options: SearchableSelectOptions) {
    // 1. Options'ı kaydet
    this.options = options

    // 2. Gerekli elementleri bul ve validate et
    const container = document.getElementById(options.elements.container)
    const select = document.getElementById(
      options.elements.select,
    ) as HTMLSelectElement
    const input = document.getElementById(
      options.elements.input,
    ) as HTMLInputElement
    const suggestions = document.getElementById(options.elements.suggestions)
    const clearButton = options.elements.clearButton
      ? document.getElementById(options.elements.clearButton)
      : null

    // 3. Element validasyonu
    if (!container || !select || !input || !suggestions) {
      throw new Error('Required elements not found')
    }

    // 4. Element referanslarını kaydet
    this.elements = {
      container,
      select,
      input,
      suggestions,
      clearButton,
    }

    // 5. Template'leri yakala ve valide et (kritik nokta)
    const suggestionItem =
      this.elements.suggestions.querySelector('.suggestion-item')
    const noResults = this.elements.suggestions.querySelector('.no-results')
    const noneItem = this.elements.suggestions.querySelector('.none-item')

    if (!suggestionItem || !noResults || !noneItem) {
      throw new Error(
        'Required template elements not found in suggestions container',
      )
    }

    // 6. Template'leri kaydet
    this.templates = {
      suggestionItem: suggestionItem.cloneNode(true) as HTMLElement,
      noResults: noResults.cloneNode(true) as HTMLElement,
      noneItem: noneItem.cloneNode(true) as HTMLElement,
    }

    // 7. Suggestions container'ı temizle
    this.elements.suggestions.innerHTML = ''

    // 8. Select options'ları yakala
    this.captureSelectOptions()

    // 9. Event listener'ları bağla
    this.setupEventListeners()

    // 10. Orijinal select'i gizle
    this.hideOriginalSelect()

    // 11. Başlangıç değerini ayarla
    const noneValue = this.templates.noneItem.getAttribute('data-value') || ''
    this.setValue(noneValue)

    // Eğer select'in değeri yoksa veya none ise
    if (
      !this.elements.select.value ||
      this.elements.select.value === noneValue
    ) {
      this.elements.input.value = ''
      this.elements.select.value = noneValue

      // Dataset'i güncelle
      const datasetKey = Object.keys(this.elements.select.dataset)[0]
      if (datasetKey) {
        this.elements.select.dataset[datasetKey] = noneValue
      }
    } else {
      // Specific bir değer seçili ise
      const selectedOption = this.allOptions.find(
        opt => opt.value === this.elements.select.value,
      )
      if (selectedOption) {
        this.elements.input.value = selectedOption.text
      }
    }

    // 12. Önerileri ilk kez render et
    this.filterAndRenderSuggestions('')

    // 13. Instance'ı kaydet
    SearchableSelect.instances.set(container, this)
  }

  private captureSelectOptions(): void {
    // Select options'ları al ve kaydet
    // None option'ı da dahil edilmeli
    this.allOptions = Array.from(this.elements.select.options).map(option => ({
      value: option.value,
      text: option.text,
    }))

    // None option'ı ekle (eğer yoksa)
    const noneValue = this.templates.noneItem.getAttribute('data-value') || ''
    const hasNoneOption = this.allOptions.some(opt => opt.value === noneValue)

    if (!hasNoneOption) {
      const noneOption = document.createElement('option')
      noneOption.value = noneValue
      noneOption.text = this.templates.noneItem.textContent || ''
      this.elements.select.appendChild(noneOption)
    }
  }

  private filterAndRenderSuggestions(searchText: string): void {
    this.elements.suggestions.innerHTML = ''
    const currentValue = this.elements.select.value
    const trimmedSearch = searchText.trim()

    const filteredOptions =
      trimmedSearch === ''
        ? this.allOptions
        : this.allOptions.filter(option =>
            option.text.toLowerCase().includes(trimmedSearch.toLowerCase()),
          )

    // None item'ı sadece arama yapılmadığında göster
    if (!trimmedSearch) {
      const noneElement = this.templates.noneItem.cloneNode(true) as HTMLElement
      const noneValue = this.templates.noneItem.getAttribute('data-value') || ''
      noneElement.setAttribute('data-selected', (!currentValue).toString())

      // Mevcut attribute'ları koru
      Array.from(this.templates.noneItem.attributes).forEach(attr => {
        if (attr.name !== 'data-selected') {
          noneElement.setAttribute(attr.name, attr.value)
        }
      })

      this.elements.suggestions.appendChild(noneElement)
    }

    if (filteredOptions.length === 0) {
      this.elements.suggestions.appendChild(
        this.templates.noResults.cloneNode(true),
      )
      return
    }

    const fragment = document.createDocumentFragment()
    filteredOptions.forEach(option => {
      const element = this.createSuggestionElement(option)
      const isSelected = option.value === currentValue
      element.setAttribute('data-selected', isSelected.toString())
      fragment.appendChild(element)
    })

    this.elements.suggestions.appendChild(fragment)
  }

  private createSuggestionElement(option: SearchOption): HTMLElement {
    const element = this.templates.suggestionItem.cloneNode(true) as HTMLElement
    element.setAttribute('data-value', option.value)
    element.textContent = option.text
    return element
  }

  private handleInput(e: Event): void {
    const searchText = (e.target as HTMLInputElement).value
    this.filterAndRenderSuggestions(searchText)
    this.options.onSearch?.(searchText)
  }

  private handleInputFocus(): void {
    this.isOpen = true
    this.options.onDropdownOpen?.()

    const currentInputValue = this.elements.input.value
    this.elements.input.value = ''
    this.filterAndRenderSuggestions('')
    this.elements.input.value = currentInputValue

    setTimeout(() => {
      const selectedElement = this.elements.suggestions.querySelector(
        '[data-selected="true"]',
      ) as HTMLElement

      if (selectedElement) {
        const containerHeight = this.elements.suggestions.clientHeight
        const elementOffset = selectedElement.offsetTop
        const elementHeight = selectedElement.offsetHeight

        if (elementOffset > containerHeight - elementHeight) {
          const scrollPosition =
            elementOffset - containerHeight / 2 + elementHeight / 2
          this.elements.suggestions.scrollTop = Math.max(0, scrollPosition - 20)
        }
      }
    }, 0)
  }

  private handleSuggestionClick(e: Event): void {
    const target = e.target as HTMLElement
    const suggestionEl = target.closest('[data-value]') as HTMLElement
    const noneValue = this.templates.noneItem.getAttribute('data-value') || ''

    if (suggestionEl) {
      const value = suggestionEl.dataset.value || noneValue
      this.selectOption(value)
    }
  }

  private selectOption(value: string): void {
    const noneValue = this.templates.noneItem.getAttribute('data-value') || ''

    if (value === noneValue || !value) {
      this.elements.input.value = ''
      this.elements.select.value = noneValue
    } else {
      const selectedOption = this.allOptions.find(opt => opt.value === value)
      if (!selectedOption) return

      this.elements.input.value = selectedOption.text
      this.elements.select.value = value
    }

    this.filterAndRenderSuggestions('')
    this.elements.select.dispatchEvent(new Event('change'))
    this.options.onSelect?.(this.elements.select.value)

    this.closeDropdown()
    this.elements.input.blur()
  }

  private handleClear(): void {
    this.selectOption('')
    this.elements.input.focus()
    this.filterAndRenderSuggestions('')
    this.options.onClear?.()
  }

  private hideOriginalSelect(): void {
    this.elements.select.style.display = 'none'
  }

  private setupEventListeners(): void {
    this.elements.input.addEventListener('input', this.handleInput.bind(this))
    this.elements.input.addEventListener(
      'focus',
      this.handleInputFocus.bind(this),
    )

    if (this.elements.clearButton) {
      this.elements.clearButton.addEventListener(
        'click',
        this.handleClear.bind(this),
      )
    }

    this.elements.suggestions.addEventListener(
      'mousedown',
      this.handleSuggestionClick.bind(this),
    )

    document.addEventListener('click', (e: MouseEvent) => {
      if (!this.elements.container.contains(e.target as Node)) {
        this.closeDropdown()
      }
    })
  }

  private closeDropdown(): void {
    if (this.isOpen) {
      this.isOpen = false
      this.options.onDropdownClose?.()
    }
  }

  // Public API
  public static getInstance(
    container: HTMLElement,
  ): SearchableSelect | undefined {
    return SearchableSelect.instances.get(container)
  }

  public getValue(): string {
    return this.elements.select.value
  }

  public setValue(value: string): void {
    this.selectOption(value)
  }

  public clear(): void {
    this.handleClear()
  }

  public updateOptions(newOptions: SearchOption[]): void {
    this.elements.select.innerHTML = newOptions
      .map(opt => `<option value="${opt.value}">${opt.text}</option>`)
      .join('')

    this.allOptions = newOptions
    this.filterAndRenderSuggestions(this.elements.input.value)
  }

  public destroy(): void {
    SearchableSelect.instances.delete(this.elements.container)
    this.elements.input.removeEventListener('input', this.handleInput)
    this.elements.input.removeEventListener('focus', this.handleInputFocus)
    if (this.elements.clearButton) {
      this.elements.clearButton.removeEventListener('click', this.handleClear)
    }
    this.elements.suggestions.removeEventListener(
      'mousedown',
      this.handleSuggestionClick,
    )
  }
}

export default SearchableSelect
