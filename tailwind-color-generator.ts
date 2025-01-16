type HexColorObject = {
  [key: string]: string
}

type ColorMode = 'light' | 'dark'

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function convertHexToTailwindRgb(
  hexObject: HexColorObject,
  prefix: string = 'primary',
  mode: ColorMode = 'light',
): string {
  let output = ''

  const sortedKeys = Object.keys(hexObject).sort(
    (a, b) => Number(a) - Number(b),
  )

  sortedKeys.forEach((key, index) => {
    const hexValue = hexObject[key]
    const rgb = hexToRgb(hexValue)
    if (rgb) {
      const colorKey =
        mode === 'dark' ? sortedKeys[sortedKeys.length - 1 - index] : key
      output += `--${prefix}-${colorKey}: ${rgb.r} ${rgb.g} ${rgb.b};\n`
    }
  })

  return output
}

// Örnek kullanım
const colorObject: HexColorObject = {
  '50': '#effefb',
  '100': '#c7fff3',
  '200': '#90ffe7',
  '300': '#51f7da',
  '400': '#1de4c7',
  '500': '#04c8ae',
  '600': '#00af9c',
  '700': '#058074',
  '800': '#0a655d',
  '900': '#0d544e',
  '950': '#003331',
}

console.log(convertHexToTailwindRgb(colorObject, 'primary', 'light'))
