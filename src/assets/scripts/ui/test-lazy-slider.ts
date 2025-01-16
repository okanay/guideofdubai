document.addEventListener('DOMContentLoaded', () => {
  const desktopGalleryController = document.getElementById(
    'desktop-gallery-controller',
  )
  const mobileGalleryController = document.getElementById(
    'mobile-gallery-controller',
  )

  if (desktopGalleryController && mobileGalleryController) {
    // Başlangıçta hepsini disable yap
    desktopGalleryController.setAttribute('data-active', '0')
    mobileGalleryController.setAttribute('data-active', '0')

    for (let i = 1; i <= 4; i++) {
      const desktopSlider = document.getElementById(`slider-${i}-desktop`)
      const mobileSlider = document.getElementById(`slider-${i}`)

      if (desktopSlider) desktopSlider.setAttribute('data-status', 'disable')
      if (mobileSlider) mobileSlider.setAttribute('data-status', 'disable')
    }

    // Input değişikliklerini dinle
    const inputs = document.querySelectorAll('input[name="camp-type"]')
    inputs.forEach(input => {
      input.addEventListener('change', e => {
        const target = e.target as HTMLInputElement
        let activeIndex = 0

        // Input ID'sine göre aktif index'i belirle
        switch (target.id) {
          case 'silver':
            activeIndex = 1
            break
          case 'gold':
            activeIndex = 2
            break
          case 'premium':
            activeIndex = 3
            break
          case 'platinum':
            activeIndex = 4
            break
        }

        // Önceki aktif slider'ları disable et
        const currentDesktopActive = parseInt(
          desktopGalleryController.getAttribute('data-active') || '0',
        )
        const currentMobileActive = parseInt(
          mobileGalleryController.getAttribute('data-active') || '0',
        )

        if (currentDesktopActive > 0) {
          const currentDesktopSlider = document.getElementById(
            `slider-${currentDesktopActive}-desktop`,
          )
          if (currentDesktopSlider) {
            currentDesktopSlider.setAttribute('data-status', 'disable')
          }
        }

        if (currentMobileActive > 0) {
          const currentMobileSlider = document.getElementById(
            `slider-${currentMobileActive}`,
          )
          if (currentMobileSlider) {
            currentMobileSlider.setAttribute('data-status', 'disable')
          }
        }

        // Gallery controller'ların data-active'lerini güncelle
        desktopGalleryController.setAttribute(
          'data-active',
          activeIndex.toString(),
        )
        mobileGalleryController.setAttribute(
          'data-active',
          activeIndex.toString(),
        )

        // Yeni slider'ları enable et
        if (activeIndex > 0) {
          const newDesktopSlider = document.getElementById(
            `slider-${activeIndex}-desktop`,
          )
          const newMobileSlider = document.getElementById(
            `slider-${activeIndex}`,
          )

          if (newDesktopSlider) {
            newDesktopSlider.setAttribute('data-status', 'enable')
          }
          if (newMobileSlider) {
            newMobileSlider.setAttribute('data-status', 'enable')
          }
        }
      })
    })

    // Sayfa yüklendiğinde checked olan input'u tetikle
    const checkedInput = document.querySelector(
      'input[name="camp-type"]:checked',
    ) as HTMLInputElement
    if (checkedInput) {
      checkedInput.dispatchEvent(new Event('change'))
    }
  }
})
