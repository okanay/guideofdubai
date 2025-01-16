import { ModalController } from './packages/modal.js'

document.addEventListener('DOMContentLoaded', () => {
  if (typeof window !== 'undefined') {
    window.callIcons()
  }

  new ModalController(
    [
      {
        id: 'visa-ship-modal',
        contentElement: '#visa-ship-modal',
        containers: ['#visa-ship-modal-container'],
        openElements: ['#visa-ship-modal-open-button'],
        closeElements: ['#visa-ship-modal-closed-button'],
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
})
