document.addEventListener('DOMContentLoaded', () => {
  const personContainer = document.getElementById('persons')
  if (personContainer) {
    personContainer.addEventListener('change', e => {
      const target = e.target as HTMLInputElement

      if (target.type === 'file') {
        const inputContainer = target.closest('.image-input')
        const preview = inputContainer?.querySelector('div')
        const file = target.files?.[0]

        if (file && preview) {
          const isPDF = file.type === 'application/pdf'

          if (isPDF) {
            // PDF için özel görsel
            preview.innerHTML = `
              <div class="flex flex-col items-center justify-center gap-2">
                <img src="https://images.project-test.info/pdf-icon.png" class="h-12 w-auto" alt="PDF File" />
                <span class="text-xs text-gray-500 truncate max-w-[90%]">${file.name}</span>
              </div>
            `
          } else {
            // Görsel dosyalar için
            const reader = new FileReader()
            reader.onload = e => {
              if (e.target) {
                preview.innerHTML = `<img src="${e.target.result}" class="h-full w-full object-cover rounded" />`
              }
            }
            reader.readAsDataURL(file)
          }
        }
      }
    })
  }
})
