import { ModalController } from './packages/modal.js'

document.addEventListener('DOMContentLoaded', () => {
  new ModalController(
    [
      {
        id: 'profile-menu',
        toggleElements: ['#profile-menu-button'],
        openElements: [],
        contentElement: '#profile-navigation',
        closeElements: [
          '#profile-view-control-1',
          '#profile-view-control-2',
          '#profile-view-control-3',
          '#profile-view-control-4',
          '#profile-view-control-5',
          '#profile-view-control-6',
          '#profile-view-control-7',
          '#profile-view-control-8',
          '#profile-view-control-9',
          '#profile-view-control-10',
          '#profile-view-control-11',
        ],
        containers: ['#profile-navigation-content', '#profile-navigation'],
      },
    ],
    {
      outsideClickClose: true,
      escapeClose: true,
      preserveModalHistory: false,
      attributes: {
        stateAttribute: 'data-state',
        values: {
          open: 'open',
          preserved: 'open',
          hidden: 'closed',
        },
      },
      scrollLock: {
        enabled: false,
      },
    },
  )

  new ModalController(
    [
      {
        id: 'activities',
        toggleElements: [],
        openElements: ['#profile-view-control-1'],
        contentElement: '#activities',
        closeElements: [],
        containers: ['#activities'],
      },
      {
        id: 'tickets',
        toggleElements: [],
        openElements: ['#profile-view-control-10'],
        contentElement: '#tickets',
        closeElements: [],
        containers: ['#tickets'],
      },
      {
        id: 'favorites',
        toggleElements: [],
        openElements: ['#profile-view-control-2'],
        contentElement: '#favorites',
        closeElements: [],
        containers: ['#favorites'],
      },
      {
        id: 'profile-details',
        toggleElements: [],
        openElements: ['#profile-view-control-3'],
        contentElement: '#profile-details',
        closeElements: [],
        containers: ['#profile-details'],
      },
      {
        id: 'password-change',
        toggleElements: [],
        openElements: ['#profile-view-control-4'],
        contentElement: '#password-change',
        closeElements: [],
        containers: ['#password-change'],
      },
      {
        id: 'preferences',
        toggleElements: [],
        openElements: ['#profile-view-control-5'],
        contentElement: '#preferences',
        closeElements: [],
        containers: ['#preferences'],
      },
      {
        id: 'references',
        toggleElements: [],
        openElements: ['#profile-view-control-11'],
        contentElement: '#references',
        closeElements: [],
        containers: ['#references'],
      },
      {
        id: 'visa-applications',
        toggleElements: [],
        openElements: ['#profile-view-control-6'],
        contentElement: '#visa-applications',
        closeElements: [],
        containers: ['#visa-applications'],
      },
      {
        id: 'hotel-reservations',
        toggleElements: [],
        openElements: ['#profile-view-control-7'],
        contentElement: '#hotel-reservations',
        closeElements: [],
        containers: ['#hotel-reservations'],
      },
      {
        id: 'car-rentals',
        toggleElements: [],
        openElements: ['#profile-view-control-8'],
        contentElement: '#car-rentals',
        closeElements: [],
        containers: ['#car-rentals'],
      },
      {
        id: 'transfers',
        toggleElements: [],
        openElements: ['#profile-view-control-9'],
        contentElement: '#transfers',
        closeElements: [],
        containers: ['#transfers'],
      },
    ],
    {
      initialActiveModal: 'activities',
      outsideClickClose: false,
      escapeClose: false,
      preserveModalHistory: false,
      attributes: {
        stateAttribute: 'data-state',
        values: {
          open: 'open',
          preserved: 'open',
          hidden: 'closed',
        },
      },
      scrollTo: {
        enabled: true,
        behavior: 'smooth',
        block: 'start',
        inline: 'start',
        offset: 160,
      },
      scrollLock: {
        enabled: false,
      },
      urlState: {
        enabled: true,
        queryParam: 'view',
        modals: [
          'activities',
          'favorites',
          'profile-details',
          'password-change',
          'preferences',
          'references',
          'visa-applications',
          'hotel-reservations',
          'car-rentals',
          'transfers',
          'tickets',
        ],
      },
    },
  )

  function generateIds() {
    // Tüm reservation cardları bul
    const cards = document.querySelectorAll('.reservation-card')

    // Her card için
    cards.forEach((card, cardIndex) => {
      // Input ve labelları bul
      const inputs = card.querySelectorAll('input[type="checkbox"]')
      const labels = card.querySelectorAll('label')

      // Her input ve label çiftine ID ver
      inputs.forEach((input, index) => {
        const id = `card-${cardIndex}-${index}`
        input.id = id
        labels[index].setAttribute('for', id)
      })
    })
  }

  generateIds()
})
