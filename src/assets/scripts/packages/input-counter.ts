// Interface'lere minimum değer ekleyelim
interface CounterItem {
  type: string
  dataAttribute: string
  textElementId: string
  minusButtonId: string
  plusButtonId: string
  countElementId: string
  containerId: string // Parent element ID'si eklendi
}

interface SelectItem {
  type: string
  dataAttribute: string
  selectElementId: string
  containerId: string
}

interface CounterConfig {
  value: number
  minValue: number
  maxValue: number // Maximum değer eklendi
  plusBtn: HTMLButtonElement | null
  minusBtn: HTMLButtonElement | null
  countElement: HTMLElement | null
  textElement: HTMLElement | null
  container: HTMLElement | null // Parent element referansı eklendi
  isActive: boolean // Yeni eklenen alan
}

export class InputCounter {
  private input: HTMLInputElement
  private counters: Map<string, CounterConfig> = new Map()
  private selects: Map<string, HTMLSelectElement> = new Map()
  private counterItems: CounterItem[]
  private selectItems: SelectItem[]
  private observers: Map<string, MutationObserver> = new Map()

  constructor(
    inputId: string,
    counterItems: CounterItem[],
    selectItems: SelectItem[],
  ) {
    this.input = document.getElementById(inputId) as HTMLInputElement
    this.counterItems = counterItems
    this.selectItems = selectItems

    if (!this.input) {
      console.error(`Input element with id ${inputId} not found`)
      return
    }

    this.initialize()
    this.bindEvents()
    this.setupObservers()
    this.updateInputValue()

    // Manager'a kaydet
    InputCounterManager.addInstance(inputId, this)
  }

  private initialize() {
    // Counter'ları başlat
    this.initializeCounters()
    // Select'leri başlat
    this.initializeSelects()
  }

  private initializeSelects() {
    this.selectItems.forEach(item => {
      const select = document.getElementById(
        item.selectElementId,
      ) as HTMLSelectElement
      const container = document.getElementById(item.containerId)

      if (select && container) {
        this.selects.set(item.type, select)
        const dataAttrName = item.dataAttribute.replace('data-', '')

        // Select değeri değiştiğinde input'u güncelle
        select.addEventListener('change', () => {
          // Boş değer kontrolü ekleyelim
          const value = select.value || ''
          this.input.dataset[dataAttrName] = value // Her durumda dataset'i güncelle
          this.updateInputValue()
        })

        // Başlangıç değerini ayarla - burada da boş değer kontrolü yapalım
        const initialValue = select.value || ''
        this.input.dataset[dataAttrName] = initialValue

        // Container için observer ekle
        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            if (
              mutation.type === 'attributes' &&
              mutation.attributeName === 'data-active'
            ) {
              // Aktiflik değiştiğinde dataset'i güncelle
              const currentValue = select.value || ''
              this.input.dataset[dataAttrName] = currentValue
              this.updateInputValue()
            }
          })
        })

        observer.observe(container, {
          attributes: true,
          attributeFilter: ['data-active'],
        })

        this.observers.set(`select_${item.type}`, observer)
      }
    })
  }

  public updateInputValue(): void {
    const parts: string[] = []

    // Sadece aktif select değerlerini ekle (boş olmayan değerler için)
    this.selectItems.forEach(item => {
      const select = this.selects.get(item.type)
      const container = document.getElementById(item.containerId)

      if (
        select &&
        container &&
        container.dataset.active === 'active' &&
        select.value !== 'not-selected'
      ) {
        parts.push(select.value)
      }
    })

    // Sadece aktif counter değerlerini ekle
    this.counters.forEach((config, type) => {
      if (
        config.isActive &&
        config.textElement?.textContent &&
        config.value > 0
      ) {
        parts.push(`${config.value} ${config.textElement.textContent}`)
      }
    })

    // Boş olmayan parçaları birleştir
    this.input.value = parts.filter(part => part.trim()).join(', ')
    this.updateButtonStates()
  }

  // Refresh metodunu da güncelleyelim
  public refresh(): void {
    // Counter'ları güncelle
    this.counterItems.forEach(item => {
      const config = this.counters.get(item.type)
      if (!config) return

      // Container'dan min/max ve active değerlerini güncelle
      if (config.container) {
        const newMin = Number(config.container.dataset.min || 0)
        const newMax = Number(config.container.dataset.max || 99)
        const isActive = config.container.dataset.active === 'active'

        config.minValue = newMin
        config.maxValue = newMax
        config.isActive = isActive

        // Input dataset'ten değeri al
        const dataAttrName = item.dataAttribute.replace('data-', '')
        const newValue = Number(this.input.dataset[dataAttrName] || 0)

        // Değeri limitlere göre ayarla
        config.value = Math.min(
          Math.max(newValue, config.minValue),
          config.maxValue,
        )

        // Dataset'i limitlere göre güncelle
        this.input.dataset[dataAttrName] = config.value.toString()

        // Count elementini güncelle
        if (config.countElement) {
          config.countElement.textContent = config.value.toString()
        }

        // Button state'lerini active durumuna göre güncelle
        if (config.minusBtn) {
          config.minusBtn.disabled =
            !isActive || config.value <= config.minValue
        }
        if (config.plusBtn) {
          config.plusBtn.disabled = !isActive || config.value >= config.maxValue
        }
      }
    })

    // Select'leri güncelle
    this.selectItems.forEach(item => {
      const select = this.selects.get(item.type)
      const container = document.getElementById(item.containerId)
      if (!select || !container) return

      const isActive = container.dataset.active === 'active'
      const dataAttrName = item.dataAttribute.replace('data-', '')

      if (isActive) {
        const datasetValue = this.input.dataset[dataAttrName]
        // Input dataset'ten değeri al ve select'i güncelle
        if (datasetValue && datasetValue !== select.value) {
          select.value = datasetValue
        }
        // Input dataset'i güncelle (select değeri değişmiş olabilir)
        this.input.dataset[dataAttrName] = select.value

        // Select elementinin disabled durumunu güncelle
        select.disabled = false
      } else {
        // Active değilse select'i disable et
        select.disabled = true
      }
    })

    // Input değerini güncelle (görünen metin)
    const parts: string[] = []

    // Aktif select değerlerini ekle
    this.selectItems.forEach(item => {
      const select = this.selects.get(item.type)
      const container = document.getElementById(item.containerId)
      if (select && container && container.dataset.active === 'active') {
        parts.push(select.value)
      }
    })

    // Aktif counter değerlerini ekle
    this.counters.forEach((config, type) => {
      if (config.isActive && config.textElement?.textContent) {
        parts.push(`${config.value} ${config.textElement.textContent}`)
      }
    })

    // Input değerini ayarla
    this.input.value = parts.join(', ')
  }

  private updateActiveState(type: string) {
    const config = this.counters.get(type)
    if (!config || !config.container) return

    const isActive = config.container.dataset.active === 'active'
    config.isActive = isActive

    // Pasif durumdaysa butonları devre dışı bırak
    if (config.plusBtn) {
      config.plusBtn.disabled = !isActive || config.value >= config.maxValue
    }
    if (config.minusBtn) {
      config.minusBtn.disabled = !isActive || config.value <= config.minValue
    }

    this.updateInputValue()
  }

  private initializeCounters() {
    this.counterItems.forEach(item => {
      const container = document.getElementById(item.containerId)
      const plusBtn = document.getElementById(item.plusButtonId)
      const minusBtn = document.getElementById(item.minusButtonId)
      const countElement = document.getElementById(item.countElementId)
      const textElement = document.getElementById(item.textElementId)

      const dataAttrName = item.dataAttribute.replace('data-', '')
      const initialValue = Number(this.input.dataset[dataAttrName] || 0)

      const minValue = Number(container?.dataset.min || 0)
      const maxValue = Number(container?.dataset.max || 99)
      const isActive = container?.dataset.active === 'active' // Yeni eklenen

      if (countElement) {
        countElement.textContent = initialValue.toString()
      }

      this.counters.set(item.type, {
        value: initialValue,
        minValue,
        maxValue,
        plusBtn: plusBtn as HTMLButtonElement,
        minusBtn: minusBtn as HTMLButtonElement,
        countElement,
        textElement,
        container,
        isActive, // Yeni eklenen
      })
    })
  }

  private setupObservers() {
    this.counters.forEach((config, type) => {
      if (config.container) {
        const observer = new MutationObserver(mutations => {
          mutations.forEach(mutation => {
            if (mutation.type === 'attributes') {
              if (
                mutation.attributeName === 'data-min' ||
                mutation.attributeName === 'data-max'
              ) {
                this.updateLimits(type)
              } else if (mutation.attributeName === 'data-active') {
                this.updateActiveState(type)
              }
            }
          })
        })

        observer.observe(config.container, {
          attributes: true,
          attributeFilter: ['data-min', 'data-max', 'data-active'],
        })

        this.observers.set(type, observer)
      }
    })
  }

  private updateLimits(type: string) {
    const config = this.counters.get(type)
    if (!config || !config.container) return

    const newMin = Number(config.container.dataset.min || 0)
    const newMax = Number(config.container.dataset.max || 99)

    config.minValue = newMin
    config.maxValue = newMax

    // Mevcut değeri yeni limitlere göre ayarla
    config.value = Math.min(Math.max(config.value, newMin), newMax)
    if (config.countElement) {
      config.countElement.textContent = config.value.toString()
    }

    this.updateInputValue()
    this.updateButtonStates()
  }

  private updateButtonStates() {
    this.counters.forEach(config => {
      if (config.minusBtn) {
        config.minusBtn.disabled = config.value <= config.minValue
      }
      if (config.plusBtn) {
        config.plusBtn.disabled = config.value >= config.maxValue
      }
    })
  }

  private updateCount(type: string, change: number) {
    const config = this.counters.get(type)
    if (!config) return

    const newValue = Math.min(
      Math.max(config.minValue, config.value + change),
      config.maxValue,
    )
    if (newValue === config.value) return

    config.value = newValue

    // Dataset'i güncelle - eklenen kısım
    const item = this.counterItems.find(item => item.type === type)
    if (item) {
      const dataAttrName = item.dataAttribute.replace('data-', '')
      this.input.dataset[dataAttrName] = newValue.toString()
    }

    if (config.countElement) {
      config.countElement.textContent = newValue.toString()
    }

    this.updateInputValue()
    this.updateButtonStates()
  }

  private bindEvents() {
    this.counterItems.forEach(item => {
      const config = this.counters.get(item.type)
      if (!config) return
      if (config.plusBtn) {
        config.plusBtn.addEventListener('click', () =>
          this.updateCount(item.type, 1),
        )
      }
      if (config.minusBtn) {
        config.minusBtn.addEventListener('click', () =>
          this.updateCount(item.type, -1),
        )
      }
    })
  }

  public reset() {
    this.counters.forEach(config => {
      config.value = config.minValue // 0 yerine minValue kullan
      if (config.countElement) {
        config.countElement.textContent = config.minValue.toString()
      }
    })
    this.updateInputValue()
  }
}

// Manager sınıfı
class InputCounterManager {
  private static instances: Map<string, InputCounter> = new Map()

  static addInstance(id: string, instance: InputCounter): void {
    this.instances.set(id, instance)
  }

  static getInstance(id: string): InputCounter | undefined {
    return this.instances.get(id)
  }

  static refreshInstance(id: string): boolean {
    const instance = this.instances.get(id)
    if (instance) {
      try {
        instance.refresh()
        return true
      } catch (error) {
        console.error(`Error refreshing input counter ${id}:`, error)
        return false
      }
    }
    return false
  }

  static refreshAll(): boolean {
    let success = true
    this.instances.forEach((instance, id) => {
      try {
        instance.refresh()
      } catch (error) {
        console.error(`Error refreshing input counter ${id}:`, error)
        success = false
      }
    })
    return success
  }
}

// Window interface genişletmesi
declare global {
  interface Window {
    RefreshCounterInput: (inputId: string) => boolean
    RefreshAllCounterInputs: () => boolean
  }
}

// Window metodlarını tanımla
window.RefreshCounterInput = function (inputId: string): boolean {
  return InputCounterManager.refreshInstance(inputId)
}

window.RefreshAllCounterInputs = function (): boolean {
  return InputCounterManager.refreshAll()
}
