interface SliderOptions {
  containerId: string
  minDisplayId: string
  maxDisplayId: string
  sliderRangeId: string
  minHandleId: string
  maxHandleId: string
  minInputId: string
  maxInputId: string
}

export class RangeSlider {
  private container: HTMLElement
  private rangeTrack: HTMLElement
  private minHandle: HTMLElement
  private maxHandle: HTMLElement
  private minDisplay: HTMLElement
  private maxDisplay: HTMLElement
  private minInput: HTMLInputElement
  private maxInput: HTMLInputElement
  private min: number
  private max: number
  private step: number
  private isDragging: boolean = false
  private currentHandle: HTMLElement | null = null
  private startX: number = 0
  private startLeft: number = 0

  constructor(options: SliderOptions) {
    this.container = document.getElementById(options.containerId)!
    this.rangeTrack = document.getElementById(options.sliderRangeId)!
    this.minHandle = document.getElementById(options.minHandleId)!
    this.maxHandle = document.getElementById(options.maxHandleId)!
    this.minDisplay = document.getElementById(options.minDisplayId)!
    this.maxDisplay = document.getElementById(options.maxDisplayId)!
    this.minInput = document.getElementById(
      options.minInputId,
    ) as HTMLInputElement
    this.maxInput = document.getElementById(
      options.maxInputId,
    ) as HTMLInputElement

    // Get values from data attributes
    this.min = Number(this.container.dataset.min || '0')
    this.max = Number(this.container.dataset.max || '30000')

    // Get initial values from inputs and clamp them to valid range
    let initialMinValue = Number(this.minInput.value) || this.min
    let initialMaxValue = Number(this.maxInput.value) || this.max

    // Değerleri min-max aralığına sınırla
    initialMinValue = Math.max(this.min, Math.min(initialMinValue, this.max))
    initialMaxValue = Math.max(this.min, Math.min(initialMaxValue, this.max))

    // Min değer max değerden büyükse, max değere eşitle
    if (initialMinValue > initialMaxValue) {
      initialMinValue = initialMaxValue
    }

    // Max değer min değerden küçükse, min değere eşitle
    if (initialMaxValue < initialMinValue) {
      initialMaxValue = initialMinValue
    }

    // Step hesaplama
    const numberOfSteps = Number(this.container.dataset.step || '100')
    const range = this.max - this.min
    this.step = range / numberOfSteps

    // Step'e göre yuvarla
    initialMinValue = Math.round(initialMinValue / this.step) * this.step
    initialMaxValue = Math.round(initialMaxValue / this.step) * this.step

    // Input değerlerini güncelle (sınırlanmış değerlerle)
    this.minInput.value = initialMinValue.toString()
    this.maxInput.value = initialMaxValue.toString()

    this.init(initialMinValue, initialMaxValue)
  }

  private init(initialMinValue: number, initialMaxValue: number): void {
    // İlk yüklemede değerleri ayarla
    const range = this.max - this.min
    const minPercentage = ((initialMinValue - this.min) / range) * 100
    const maxPercentage = ((initialMaxValue - this.min) / range) * 100

    this.maxHandle.style.left = `${maxPercentage}%`
    this.minHandle.style.left = `${minPercentage}%`

    // Input ve display değerlerini ayarla
    this.minInput.value = initialMinValue.toString()
    this.maxInput.value = initialMaxValue.toString()

    this.minDisplay.textContent = initialMinValue.toLocaleString()
    this.maxDisplay.textContent = initialMaxValue.toLocaleString()

    this.updateRangeTrack()

    // Event listeners
    this.minHandle.addEventListener('mousedown', e =>
      this.startDragging(e, this.minHandle),
    )
    this.maxHandle.addEventListener('mousedown', e =>
      this.startDragging(e, this.maxHandle),
    )

    document.addEventListener('mousemove', e => this.onDrag(e))
    document.addEventListener('mouseup', () => this.stopDragging())

    this.minHandle.addEventListener('touchstart', e =>
      this.startDragging(e, this.minHandle),
    )
    this.maxHandle.addEventListener('touchstart', e =>
      this.startDragging(e, this.maxHandle),
    )

    document.addEventListener('touchmove', e => this.onDrag(e))
    document.addEventListener('touchend', () => this.stopDragging())
  }

  private startDragging(e: MouseEvent | TouchEvent, handle: HTMLElement): void {
    this.isDragging = true
    this.currentHandle = handle

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    this.startX = clientX
    this.startLeft = handle.offsetLeft

    e.preventDefault()
    handle.style.cursor = 'grabbing'
  }

  private onDrag(e: MouseEvent | TouchEvent): void {
    if (!this.isDragging || !this.currentHandle) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const delta = clientX - this.startX
    const containerRect = this.container.getBoundingClientRect()
    const newLeft = this.startLeft + delta

    // Yüzde hesapla
    let percentage = (newLeft / containerRect.width) * 100
    percentage = Math.max(0, Math.min(100, percentage))

    // Değeri hesapla
    const range = this.max - this.min
    let value = (percentage / 100) * range + this.min

    // Step'e göre yuvarla
    value = Math.round(value / this.step) * this.step
    value = Math.max(this.min, Math.min(this.max, value))

    // Handle kısıtlamalarını kontrol et
    if (this.currentHandle === this.minHandle) {
      const maxValue = Number(this.maxInput.value)
      if (value >= maxValue) return
    } else {
      const minValue = Number(this.minInput.value)
      if (value <= minValue) return
    }

    // Pozisyonu güncelle
    const finalPercentage = ((value - this.min) / range) * 100
    this.currentHandle.style.left = `${finalPercentage}%`

    this.updateRangeTrack()

    // Input ve display değerlerini güncelle
    if (this.currentHandle === this.minHandle) {
      this.minInput.value = value.toString()
      this.minDisplay.textContent = value.toLocaleString()
    } else {
      this.maxInput.value = value.toString()
      this.maxDisplay.textContent = value.toLocaleString()
    }
  }

  private stopDragging(): void {
    if (this.currentHandle) {
      this.currentHandle.style.cursor = 'grab'
    }
    this.isDragging = false
    this.currentHandle = null

    // Dispatch change event
    const event = new CustomEvent('rangeChange', {
      detail: {
        min: Number(this.minInput.value),
        max: Number(this.maxInput.value),
      },
    })
    this.container.dispatchEvent(event)
  }

  private updateRangeTrack(): void {
    const left = (this.minHandle.offsetLeft / this.container.offsetWidth) * 100
    const right =
      100 - (this.maxHandle.offsetLeft / this.container.offsetWidth) * 100

    this.rangeTrack.style.left = `${left}%`
    this.rangeTrack.style.right = `${right}%`
  }
}
