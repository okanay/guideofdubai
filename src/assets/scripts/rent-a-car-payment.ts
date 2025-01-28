import { DynamicSlider } from './packages/dynamic-slider.js'

document.addEventListener('DOMContentLoaded', () => {
  new DynamicSlider()
})

interface ExtraElement extends HTMLInputElement {
  dataset: {
    min: string
    max: string
    price: string
  }
}

class ExtrasCounter {
  constructor() {
    this.initialize()
    this.updateInitialValues() // Yeni eklenen fonksiyon çağrısı
  }

  private initialize(): void {
    const containers = document.querySelectorAll<HTMLTableRowElement>(
      '#extras-container tr',
    )

    containers.forEach(container => {
      const input = container.querySelector<ExtraElement>(
        '.extra-quantity-input',
      )
      const minusBtn =
        container.querySelector<HTMLButtonElement>('.extra-minus')
      const plusBtn = container.querySelector<HTMLButtonElement>('.extra-plus')
      const countDisplay =
        container.querySelector<HTMLSpanElement>('.extra-count')
      const totalDisplay =
        container.querySelector<HTMLSpanElement>('.extra-item-total')

      if (!input || !minusBtn || !plusBtn || !countDisplay || !totalDisplay)
        return

      const min = parseInt(input.dataset.min) || 0
      const max = parseInt(input.dataset.max) || 99
      const price = parseFloat(input.dataset.price) || 0

      minusBtn.addEventListener('click', () => {
        this.updateCount(
          input,
          countDisplay,
          totalDisplay,
          -1,
          min,
          max,
          price,
          minusBtn,
          plusBtn,
        )
      })

      plusBtn.addEventListener('click', () => {
        this.updateCount(
          input,
          countDisplay,
          totalDisplay,
          1,
          min,
          max,
          price,
          minusBtn,
          plusBtn,
        )
      })
    })
  }

  private updateInitialValues(): void {
    const containers = document.querySelectorAll<HTMLTableRowElement>(
      '#extras-container tr',
    )

    containers.forEach(container => {
      const input = container.querySelector<ExtraElement>(
        '.extra-quantity-input',
      )
      const countDisplay =
        container.querySelector<HTMLSpanElement>('.extra-count')
      const totalDisplay =
        container.querySelector<HTMLSpanElement>('.extra-item-total')
      const minusBtn =
        container.querySelector<HTMLButtonElement>('.extra-minus')
      const plusBtn = container.querySelector<HTMLButtonElement>('.extra-plus')

      if (!input || !countDisplay || !totalDisplay || !minusBtn || !plusBtn)
        return

      const initialValue = parseInt(input.value) || 0
      const price = parseFloat(input.dataset.price) || 0
      const min = parseInt(input.dataset.min) || 0
      const max = parseInt(input.dataset.max) || 99

      if (initialValue > 0) {
        // Count değerini güncelle
        countDisplay.textContent = initialValue.toString()

        // Toplam fiyatı güncelle
        const total = initialValue * price
        totalDisplay.textContent = total.toString()

        // Button durumlarını güncelle
        this.updateButtonStates(initialValue, min, max, minusBtn, plusBtn)
      }
    })

    // Genel toplamı güncelle
    this.updateTotalPrice()
  }

  private updateCount(
    input: ExtraElement,
    countDisplay: HTMLSpanElement,
    totalDisplay: HTMLSpanElement,
    change: number,
    min: number,
    max: number,
    price: number,
    minusBtn: HTMLButtonElement,
    plusBtn: HTMLButtonElement,
  ): void {
    const currentValue = parseInt(input.value) || 0
    const newValue = Math.min(Math.max(currentValue + change, min), max)

    if (newValue === currentValue) return

    input.value = newValue.toString()
    countDisplay.textContent = newValue.toString()

    const total = newValue * price
    totalDisplay.textContent = total.toString()

    this.updateButtonStates(newValue, min, max, minusBtn, plusBtn)
    this.updateTotalPrice()
  }

  private updateButtonStates(
    value: number,
    min: number,
    max: number,
    minusBtn: HTMLButtonElement,
    plusBtn: HTMLButtonElement,
  ): void {
    minusBtn.disabled = value <= min
    plusBtn.disabled = value >= max

    if (value <= min) {
      minusBtn.classList.add('disabled')
    } else {
      minusBtn.classList.remove('disabled')
    }

    if (value >= max) {
      plusBtn.classList.add('disabled')
    } else {
      plusBtn.classList.remove('disabled')
    }
  }

  private updateTotalPrice(): void {
    const totalPriceElement = document.getElementById('extras-total-price')
    if (!totalPriceElement) return

    const total = Array.from(
      document.querySelectorAll<HTMLSpanElement>('.extra-item-total'),
    ).reduce(
      (sum, element) => sum + (parseFloat(element.textContent || '0') || 0),
      0,
    )

    totalPriceElement.textContent = `${total}`
  }
}

// DOM yüklendiğinde initialize et
document.addEventListener('DOMContentLoaded', () => {
  new ExtrasCounter()
})
