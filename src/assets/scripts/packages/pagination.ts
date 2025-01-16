export class Pagination {
  private container: HTMLElement
  private totalPages: number
  private currentPage: number

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!
    this.totalPages = this.container.querySelectorAll('[data-page]').length
    this.currentPage =
      Number(
        this.container
          .querySelector('[data-active="true"]')
          ?.getAttribute('data-page'),
      ) || 1
    this.init()
  }

  private init(): void {
    this.updateVisibility()
  }

  private updateVisibility(): void {
    const links = Array.from(
      this.container.querySelectorAll('[data-page]'),
    ) as HTMLElement[]

    links.forEach(link => {
      const pageNum = Number(link.getAttribute('data-page'))
      link.style.display = this.shouldShowButton(pageNum) ? '' : 'none'
    })

    this.updateDots()
  }

  private shouldShowButton(pageNum: number): boolean {
    // Her zaman ilk ve son sayfa gösterilir
    if (pageNum === 1 || pageNum === this.totalPages) return true

    // Aktif sayfanın yanındaki sayfalar gösterilir
    if (Math.abs(pageNum - this.currentPage) <= 1) return true

    return false
  }

  private updateDots(): void {
    // Mevcut dots elementlerini temizle
    const existingDots = this.container.querySelectorAll('[data-type="dots"]')
    existingDots.forEach(dot => dot.remove())

    const links = Array.from(
      this.container.querySelectorAll('[data-page]'),
    ) as HTMLElement[]
    const visibleLinks = links.filter(link => link.style.display !== 'none')

    // Görünür butonlar arasında boşluk varsa dots ekle
    for (let i = 0; i < visibleLinks.length - 1; i++) {
      const current = Number(visibleLinks[i].getAttribute('data-page'))
      const next = Number(visibleLinks[i + 1].getAttribute('data-page'))

      if (next - current > 1) {
        const dots = document.createElement('span')
        dots.className = 'px-2 text-gray-500'
        dots.setAttribute('data-type', 'dots')
        dots.textContent = '...'
        visibleLinks[i].after(dots)
      }
    }
  }
}
