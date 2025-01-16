import { ModalMap } from '../packages/leaflet.js'

declare global {
  interface Window {
    ModalMapControl: {
      showMap: (coordinates: string) => void
    }
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const modalMap = new ModalMap(
    {
      mapId: 'map-modal',
    },
    {
      zoomInIconUrl: '/assets/images/leaflet/plus.svg',
      zoomOutIconUrl: '/assets/images/leaflet/minus.svg',
      layerControlToggleIconUrl: '/assets/images/leaflet/layer.svg',
      markerShadowUrl: '/assets/images/leaflet/shadow.svg',
      markerIconUrl: '/assets/images/leaflet/marker.png',
      markerIconSize: [24, 24],
      markerIconAnchor: [24, 24],
      markerShadowAnchor: [28, 22],
      markerShadowSize: [41, 24],
    },
  )

  window.ModalMapControl = {
    showMap: (coordinates: string) => {
      const [lat, lng] = coordinates.split(',').map(Number)
      modalMap.openMap(lat, lng)
    },
  }
})
