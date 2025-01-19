import { ModalController } from './packages/modal.js'

// Global'e ekleyelim
declare global {
  interface Window {
    Modals: ModalController
    ResendTimer: {
      start: (duration?: number) => number
      stop: () => void
      reset: () => void
      setCooldown: (seconds: number) => void
      getState: () => {
        buttonState: string
        isDisabled: boolean
        cooldownDuration: number
      }
    }
    VerificationCode: {
      reset: () => void
      setError: () => void
      clearError: () => void
      getValue: () => string
      isComplete: () => boolean
      updateValue: () => string
      setValue: (code: string) => void
      getCleanValue: () => string
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.callIcons()

  const modal = new ModalController(
    [
      {
        id: 'visa-modal',
        contentElement: '#visa-ship-modal',
        containers: ['#visa-ship-modal-container'],
        openElements: [],
        closeElements: ['#visa-ship-modal-closed-button'],
        toggleElements: [],
      },
      {
        id: 'verification-modal',
        contentElement: '#verification-modal',
        containers: ['#verification-modal-container'],
        openElements: [],
        closeElements: ['#verification-modal-close-button'],
        toggleElements: [],
      },
    ],
    {
      outsideClickClose: true,
      escapeClose: true,
      preserveModalHistory: true,
      attributes: {
        stateAttribute: 'data-state',
        values: {
          open: 'open',
          preserved: 'open',
          hidden: 'closed',
        },
      },
      scrollLock: {
        enabled: true,
        styles: {
          hidden: {
            overflow: 'hidden',
            position: 'fixed',
            width: '100%',
          },
          visible: {
            overflow: 'auto',
            position: 'static',
            width: 'auto',
          },
        },
      },
    },
  )

  window.Modals = modal
})

document.addEventListener('DOMContentLoaded', function () {
  // DOM Elements
  const resendCodeContainer = document.getElementById(
    'resend-code-container',
  ) as HTMLElement
  const resendCodeButton = document.getElementById(
    'resend-code-button',
  ) as HTMLButtonElement
  const resendCodeTimer = document.getElementById(
    'resend-code-timer',
  ) as HTMLElement
  let timerInterval: number | null

  // Utility Functions
  function formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `(${minutes}:${remainingSeconds.toString().padStart(2, '0')})`
  }

  // Timer Management Object
  window.ResendTimer = {
    // Start the timer with optional duration
    start: function (duration?: number): number {
      let timeLeft =
        duration || parseInt(resendCodeContainer.dataset.cooldown || '120')

      resendCodeButton.dataset.state = 'cooling'
      resendCodeTimer.dataset.state = 'visible'
      resendCodeButton.disabled = true

      if (timerInterval) this.stop()

      timerInterval = window.setInterval(() => {
        timeLeft--
        resendCodeTimer.textContent = formatTime(timeLeft)

        if (timeLeft <= 0) {
          this.reset()
        }
      }, 1000)

      // Return remaining time for backend use
      return timeLeft
    },

    // Stop the timer
    stop: function (): void {
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
    },

    // Reset timer and UI states
    reset: function (): void {
      this.stop()
      resendCodeButton.dataset.state = 'ready'
      resendCodeTimer.dataset.state = 'hidden'
      resendCodeButton.disabled = false
      resendCodeTimer.textContent = ''
    },

    // Set new cooldown duration
    setCooldown: function (seconds: number): void {
      resendCodeContainer.dataset.cooldown = seconds.toString()
    },

    // Get current timer state
    getState: function (): {
      buttonState: string
      isDisabled: boolean
      cooldownDuration: number
    } {
      return {
        buttonState: resendCodeButton.dataset.state || '',
        isDisabled: resendCodeButton.disabled,
        cooldownDuration: parseInt(
          resendCodeContainer.dataset.cooldown || '120',
        ),
      }
    },
  }

  // Default click handler
  resendCodeButton.addEventListener('click', () => {
    window.ResendTimer.start()
  })
})

document.addEventListener('DOMContentLoaded', function () {
  // DOM Elements
  const inputs = document.querySelectorAll<HTMLInputElement>(
    '.verification-code-input',
  )
  const container = document.getElementById(
    'verification-code-container',
  ) as HTMLElement

  // Verification Code Management Object
  window.VerificationCode = {
    // Reset all inputs and focus first input
    reset: function () {
      inputs.forEach(input => {
        input.value = ''
        input.classList.remove('border-red-500')
      })
      inputs[0].focus()
      this.updateValue()
    },

    // Set error state for inputs
    setError: function () {
      inputs.forEach(input => {
        input.classList.add('border-red-500')
      })
    },

    // Clear error state
    clearError: function () {
      inputs.forEach(input => {
        input.classList.remove('border-red-500')
      })
    },

    // Get current entered value
    getValue: function () {
      return container.dataset.entered || ''
    },

    // Check if code is complete
    isComplete: function () {
      return !this.getValue().includes('_')
    },

    // Update data-entered attribute
    updateValue: function () {
      const values = Array.from(inputs).map(input => input.value || '_')
      container.dataset.entered = values.join('')
      return this.getValue()
    },

    // Set specific value to inputs
    setValue: function (code: string) {
      const chars = code.split('')
      inputs.forEach((input, index) => {
        input.value = chars[index] || ''
      })
      this.updateValue()
    },

    // Get just the numbers without placeholders
    getCleanValue: function () {
      return this.getValue().replace(/_/g, '')
    },
  }

  // Input event handlers
  inputs.forEach((input, index) => {
    // Handle input
    input.addEventListener('input', e => {
      const target = e.target as HTMLInputElement
      if (target.value) {
        if (index < inputs.length - 1) {
          inputs[index + 1].focus()
        }
      }
      window.VerificationCode.updateValue()
    })

    // Handle backspace
    input.addEventListener('keydown', e => {
      const target = e.target as HTMLInputElement
      if (e.key === 'Backspace') {
        if (!target.value && index > 0) {
          inputs[index - 1].focus()
        }
        setTimeout(() => window.VerificationCode.updateValue(), 0)
      }
    })
  })
})
