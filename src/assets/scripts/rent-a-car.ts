import { RangeSlider } from './packages/range-slider.js'

document.addEventListener('DOMContentLoaded', () => {
  new RangeSlider({
    containerId: 'price-range-1',
    minDisplayId: 'display-min-value-1',
    maxDisplayId: 'display-max-value-1',
    sliderRangeId: 'slider-range-1',
    minHandleId: 'min-handle-1',
    maxHandleId: 'max-handle-1',
    minInputId: 'min_price_1',
    maxInputId: 'max_price_1',
  })
})
