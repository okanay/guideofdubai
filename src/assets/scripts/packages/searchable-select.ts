interface SearchableSelectElements {
  container: string
  select: string
  input: string
  suggestions: string
  clearButton?: string
}

interface SearchableSelectOptions {
  elements: SearchableSelectElements
  onSelect?: (value: string | string[]) => void
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
  private isMultiple: boolean = false
  private selectedValues: Set<string> = new Set()
  private templates: {
    suggestionItem: HTMLElement
    noResults: HTMLElement
    noneItem: HTMLElement
  }

  constructor(options: SearchableSelectOptions) {
    this.options = options

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

    if (!container || !select || !input || !suggestions) {
      throw new Error('Required elements not found')
    }

    this.elements = {
      container,
      select,
      input,
      suggestions,
      clearButton,
    }

    this.isMultiple = this.elements.select.hasAttribute('multiple')

    const suggestionItem =
      this.elements.suggestions.querySelector('.suggestion-item')
    const noResults = this.elements.suggestions.querySelector('.no-results')
    const noneItem = this.elements.suggestions.querySelector('.none-item')

    if (!suggestionItem || !noResults || !noneItem) {
      throw new Error(
        'Required template elements not found in suggestions container',
      )
    }

    this.templates = {
      suggestionItem: suggestionItem.cloneNode(true) as HTMLElement,
      noResults: noResults.cloneNode(true) as HTMLElement,
      noneItem: noneItem.cloneNode(true) as HTMLElement,
    }

    this.elements.suggestions.innerHTML = ''
    this.captureSelectOptions()
    this.setupEventListeners()
    this.hideOriginalSelect()

    // Başlangıç değerlerini ayarla
    if (this.isMultiple) {
      Array.from(this.elements.select.selectedOptions).forEach(option => {
        this.selectedValues.add(option.value)
      })
      this.updateInputValueForMultiple()

      // Clear button başlangıç durumu
      if (this.elements.clearButton) {
        this.elements.clearButton.setAttribute(
          'data-active',
          (this.selectedValues.size > 0).toString(),
        )
      }
    } else {
      const noneValue = this.templates.noneItem.getAttribute('data-value') || ''
      this.setValue(noneValue)

      if (
        !this.elements.select.value ||
        this.elements.select.value === noneValue
      ) {
        this.elements.input.value = ''
        this.elements.select.value = noneValue
      } else {
        const selectedOption = this.allOptions.find(
          opt => opt.value === this.elements.select.value,
        )
        if (selectedOption) {
          this.elements.input.value = selectedOption.text
        }
      }
    }

    this.filterAndRenderSuggestions('')
    SearchableSelect.instances.set(container, this)
  }

  private captureSelectOptions(): void {
    this.allOptions = Array.from(this.elements.select.options).map(option => ({
      value: option.value,
      text: option.text,
    }))

    const noneValue = this.templates.noneItem.getAttribute('data-value') || ''
    const hasNoneOption = this.allOptions.some(opt => opt.value === noneValue)

    if (!hasNoneOption) {
      const noneOption = document.createElement('option')
      noneOption.value = noneValue
      noneOption.text = this.templates.noneItem.textContent || ''
      this.elements.select.appendChild(noneOption)
    }
  }

  private createSuggestionElement(option: SearchOption): HTMLElement {
    const element = this.templates.suggestionItem.cloneNode(true) as HTMLElement
    element.setAttribute('data-value', option.value)
    element.textContent = option.text
    return element
  }

  private handleInput(e: Event): void {
    const searchText = (e.target as HTMLInputElement).value

    if (this.isMultiple) {
      const startPlaceholder =
        this.elements.input.getAttribute('data-start-placeholder') || ''
      this.elements.input.placeholder = startPlaceholder

      // Clear button active durumunu güncelle
      if (this.elements.clearButton) {
        const shouldShowClear =
          searchText.length > 0 || this.selectedValues.size > 0
        this.elements.clearButton.setAttribute(
          'data-active',
          shouldShowClear.toString(),
        )
      }
    }

    this.filterAndRenderSuggestions(searchText)
    this.options.onSearch?.(searchText)
  }

  private handleInputFocus(): void {
    this.isOpen = true
    this.options.onDropdownOpen?.()

    if (this.isMultiple) {
      // Focus olduğunda normal placeholder'ı göster
      this.elements.input.placeholder =
        this.elements.input.getAttribute('placeholder') || ''
    }

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

  private selectOption(value: string): void {
    const noneValue = this.templates.noneItem.getAttribute('data-value') || ''

    if (value === noneValue || !value) {
      this.elements.input.value = ''
      this.elements.select.value = noneValue
    } else {
      const selectedOption = this.allOptions.find(opt => opt.value === value)
      if (!selectedOption) return

      if (!this.isMultiple) {
        this.elements.input.value = selectedOption.text
        this.elements.select.value = value
      }
    }

    this.filterAndRenderSuggestions('')
    this.elements.select.dispatchEvent(new Event('change'))
    this.options.onSelect?.(this.elements.select.value)

    // Sadece tekli seçimde dropdown'ı kapat
    if (!this.isMultiple) {
      this.closeDropdown()
      this.elements.input.blur()
    }
  }

  private updateInputValueForMultiple(): void {
    if (this.selectedValues.size === 0) {
      this.elements.input.value = ''
      const startPlaceholder =
        this.elements.input.getAttribute('data-start-placeholder') || ''
      this.elements.input.placeholder = startPlaceholder

      if (this.elements.clearButton) {
        this.elements.clearButton.setAttribute('data-active', 'false')
      }

      // Eğer 0 ise selected durumu start placeholder mesajı yayınlanmalı
      this.options.onSelect?.(startPlaceholder)
      return
    }

    const selectedCount = this.selectedValues.size
    const selectedPlaceholder =
      this.elements.input.getAttribute('data-selected-placeholder') || ''

    if (this.elements.clearButton) {
      this.elements.clearButton.setAttribute('data-active', 'true')
    }

    this.elements.input.placeholder = `${selectedCount} ${selectedPlaceholder}`
    this.elements.input.value = ''
  }

  private filterAndRenderSuggestions(searchText: string): void {
    this.elements.suggestions.innerHTML = ''
    const trimmedSearch = searchText.trim()

    const filteredOptions =
      trimmedSearch === ''
        ? this.allOptions
        : this.allOptions.filter(option =>
            option.text.toLowerCase().includes(trimmedSearch.toLowerCase()),
          )

    // None seçeneğini sadece tekli seçimde ve arama yokken göster
    if (!trimmedSearch && !this.isMultiple) {
      const noneElement = this.templates.noneItem.cloneNode(true) as HTMLElement
      const noneValue = this.templates.noneItem.getAttribute('data-value') || ''
      noneElement.setAttribute(
        'data-selected',
        (!this.selectedValues.size).toString(),
      )

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
      const isSelected = this.isMultiple
        ? this.selectedValues.has(option.value)
        : option.value === this.elements.select.value
      element.setAttribute('data-selected', isSelected.toString())
      fragment.appendChild(element)
    })

    this.elements.suggestions.appendChild(fragment)
  }

  private handleSuggestionClick(e: Event): void {
    const target = e.target as HTMLElement
    const suggestionEl = target.closest('[data-value]') as HTMLElement
    const noneValue = this.templates.noneItem.getAttribute('data-value') || ''

    if (suggestionEl) {
      const value = suggestionEl.dataset.value || noneValue

      if (this.isMultiple) {
        if (value === noneValue) return // Çoklu seçimde none seçeneğini yoksay

        if (this.selectedValues.has(value)) {
          this.selectedValues.delete(value)
        } else {
          this.selectedValues.add(value)
        }

        // Select elementini güncelle
        Array.from(this.elements.select.options).forEach(option => {
          option.selected = this.selectedValues.has(option.value)
        })

        // Seçili öğe sayısını güncelle ve placeholder'ı ayarla
        const selectedCount = this.selectedValues.size
        const selectedPlaceholder =
          this.elements.input.getAttribute('data-selected-placeholder') || ''
        this.elements.input.placeholder = selectedCount
          ? `${selectedCount} ${selectedPlaceholder}`
          : this.elements.input.getAttribute('data-start-placeholder') || ''

        this.elements.input.value = '' // Arama kutusunu temizle
        this.filterAndRenderSuggestions('') // Tüm seçenekleri göster
        this.elements.select.dispatchEvent(new Event('change'))
        this.options.onSelect?.(Array.from(this.selectedValues))

        // Clear button active durumunu güncelle
        if (this.elements.clearButton) {
          this.elements.clearButton.setAttribute(
            'data-active',
            (this.selectedValues.size > 0).toString(),
          )
        }

        // Çoklu seçimde dropdown'ı açık tut
        setTimeout(() => {
          this.elements.input.focus() // Input'u odakta tut
        }, 0)
      } else {
        this.selectOption(value)
      }
    }
  }

  private handleClear(): void {
    if (this.isMultiple) {
      if (this.elements.input.value) {
        // Sadece arama metnini temizle
        this.elements.input.value = ''
        this.filterAndRenderSuggestions('')

        // Placeholder'ı seçili öğe sayısına göre güncelle
        const selectedCount = this.selectedValues.size
        const selectedPlaceholder =
          this.elements.input.getAttribute('data-selected-placeholder') || ''
        this.elements.input.placeholder = selectedCount
          ? `${selectedCount} ${selectedPlaceholder}`
          : this.elements.input.getAttribute('data-start-placeholder') || ''
      } else {
        // Seçili öğeleri temizle
        this.selectedValues.clear()
        Array.from(this.elements.select.options).forEach(option => {
          option.selected = false
        })
        this.updateInputValueForMultiple()
      }
    } else {
      const noneValue = this.templates.noneItem.getAttribute('data-value') || ''
      this.selectOption(noneValue)
    }

    this.elements.input.focus()
    this.options.onClear?.()

    // Clear button durumunu güncelle
    if (this.elements.clearButton) {
      this.elements.clearButton.setAttribute(
        'data-active',
        (this.selectedValues.size > 0).toString(),
      )
    }
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
      if (
        !this.elements.container.contains(e.target as Node) &&
        !this.isMultiple
      ) {
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

  public getValue(): string | string[] {
    return this.isMultiple
      ? Array.from(this.selectedValues)
      : this.elements.select.value
  }

  public setValue(value: string | string[]): void {
    if (this.isMultiple && Array.isArray(value)) {
      this.selectedValues = new Set(value)
      Array.from(this.elements.select.options).forEach(option => {
        option.selected = this.selectedValues.has(option.value)
      })
      this.updateInputValueForMultiple()
      this.filterAndRenderSuggestions('')
      this.elements.select.dispatchEvent(new Event('change'))
    } else if (!Array.isArray(value)) {
      this.selectOption(value)
    }
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
