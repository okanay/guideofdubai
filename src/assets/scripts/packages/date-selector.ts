class OldDatePickerManager {
  // DOM içindeki tüm container elementlerini tutacak property
  private containers: NodeListOf<Element>

  constructor(options: { containerSelector: string; inputSelector?: string }) {
    // Verilen container selector'a göre tüm elementleri seç
    this.containers = document.querySelectorAll(options.containerSelector)

    // inputSelector verilmezse varsayılan olarak date tipindeki inputları kullan
    this.initialize(options.inputSelector || 'input[type="date"]')
  }

  private initialize(inputSelector: string): void {
    // Her container için click event listener ekle
    this.containers.forEach(container => {
      container.addEventListener('click', () => {
        // Container içindeki input elementini bul
        const dateInput = container.querySelector(
          inputSelector,
        ) as HTMLInputElement

        // Input element varsa picker'ı göster
        if (dateInput) {
          dateInput.showPicker()
        }
      })
    })
  }
}

// datetime-local desteği için geliştirilmiş versiyon
class DatePickerManager {
  private containers: NodeListOf<Element>

  constructor(options: { containerSelector: string; inputSelector?: string }) {
    this.containers = document.querySelectorAll(options.containerSelector)

    // Varsayılan selector'ı hem date hem datetime-local inputları kapsayacak şekilde güncelle
    this.initialize(
      options.inputSelector ||
        'input[type="date"], input[type="datetime-local"]',
    )
  }

  private initialize(inputSelector: string): void {
    this.containers.forEach(container => {
      container.addEventListener('click', () => {
        const input = container.querySelector(inputSelector) as HTMLInputElement

        if (input?.showPicker) {
          input.showPicker()
        }
      })
    })
  }
}

export { OldDatePickerManager, DatePickerManager }
