import { TimeInput } from '../packages/time-input.js'

declare global {
  interface Window {
    TimeInput: TimeInput
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Sayaçları kişi seçiciler için başlat
  const timeInput = new TimeInput({
    container: '.time-input-container',
  })

  window.TimeInput = timeInput
})
