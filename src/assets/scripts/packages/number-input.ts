export interface NumberInputOptions {
  container: HTMLElement // Ana konteyner elementi
  minusBtn: HTMLButtonElement // Azaltma butonu
  plusBtn: HTMLButtonElement // Artırma butonu
  input: HTMLInputElement // Input elementi (değer burada saklanır)
  displayEl?: HTMLElement // Opsiyonel - Değerin görüntüleneceği element
}

class NumberInput {
  public container: HTMLElement
  private minusBtn: HTMLButtonElement
  private plusBtn: HTMLButtonElement
  private input: HTMLInputElement
  private displayEl?: HTMLElement

  private min: number
  private max: number
  private step: number

  constructor(options: NumberInputOptions) {
    this.container = options.container
    this.minusBtn = options.minusBtn
    this.plusBtn = options.plusBtn
    this.input = options.input
    this.displayEl = options.displayEl

    // Data attribute'larından değerleri al veya varsayılanları kullan
    this.min = parseInt(this.container.dataset.min || '0', 10)
    this.max = parseInt(this.container.dataset.max || '99', 10)
    this.step = parseInt(this.container.dataset.step || '1', 10)

    this.init()
  }

  private init(): void {
    // Başlangıç değerini ayarla
    const initialValue = parseInt(this.input.value || '0', 10)
    this.setValue(initialValue)

    // Event listener'ları ekle
    this.minusBtn.addEventListener('click', () => this.decrement())
    this.plusBtn.addEventListener('click', () => this.increment())

    // Başlangıç durumunu güncelle
    this.updateButtonStates()
  }

  increment(): void {
    const currentValue = parseInt(this.input.value || '0', 10)
    this.setValue(Math.min(currentValue + this.step, this.max))
  }

  decrement(): void {
    const currentValue = parseInt(this.input.value || '0', 10)
    this.setValue(Math.max(currentValue - this.step, this.min))
  }

  setValue(value: number): void {
    // Değeri input'a ayarla
    this.input.value = value.toString()

    // Eğer bir gösterim elementi varsa, orayı da güncelle
    if (this.displayEl) {
      this.displayEl.textContent = value.toString()
    }

    // Buton durumlarını güncelle
    this.updateButtonStates()

    // Custom event gönder
    this.container.dispatchEvent(
      new CustomEvent('numberinput:change', {
        detail: { value },
      }),
    )
  }

  private updateButtonStates(): void {
    const value = parseInt(this.input.value || '0', 10)

    // Minus buton durumu
    const minusDisabled = value <= this.min
    this.minusBtn.disabled = minusDisabled
    this.minusBtn.setAttribute('data-disabled', minusDisabled.toString())

    // Plus buton durumu
    const plusDisabled = value >= this.max
    this.plusBtn.disabled = plusDisabled
    this.plusBtn.setAttribute('data-disabled', plusDisabled.toString())
  }

  getValue(): number {
    return parseInt(this.input.value || '0', 10)
  }

  // Belirli elementleri input kontrolüne dönüştürmek için statik yardımcı metod
  static createFromSelectors(containerSelector: string): NumberInput[] {
    const containers = document.querySelectorAll<HTMLElement>(containerSelector)
    const instances: NumberInput[] = []

    containers.forEach(container => {
      const minusBtn = container.querySelector<HTMLButtonElement>(
        '.number-input-minus',
      )
      const plusBtn =
        container.querySelector<HTMLButtonElement>('.number-input-plus')
      const input = container.querySelector<HTMLInputElement>(
        '.number-input-value',
      )
      const displayEl = container.querySelector<HTMLElement>(
        '.number-input-display',
      )

      if (minusBtn && plusBtn && input) {
        instances.push(
          new NumberInput({
            container,
            minusBtn,
            plusBtn,
            input,
            displayEl: displayEl ?? undefined,
          }),
        )
      }
    })

    return instances
  }
}

export { NumberInput }
