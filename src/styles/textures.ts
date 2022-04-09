export function createPencilFilter(): SVGFilterElement {
  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
  filter.setAttribute('id', 'pencilTextureFilter')
  filter.setAttribute('x', '0%')
  filter.setAttribute('y', '0%')
  filter.setAttribute('width', '100%')
  filter.setAttribute('height', '100%')
  filter.setAttribute('filterUnits', 'objectBoundingBox')

  const feTurbulence = document.createElementNS('http://www.w3.org/2000/svg', 'feTurbulence')
  feTurbulence.setAttribute('type', 'fractalNoise')
  feTurbulence.setAttribute('baseFrequency', '2')
  feTurbulence.setAttribute('numOctaves', '5')
  feTurbulence.setAttribute('stitchTiles', 'stitch')
  feTurbulence.setAttribute('result', 'f1')
  filter.appendChild(feTurbulence)

  const feColorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix')
  feColorMatrix.setAttribute('type', 'matrix')
  feColorMatrix.setAttribute('values', '0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -1.5 1.5')
  feColorMatrix.setAttribute('result', 'f2')
  filter.appendChild(feColorMatrix)

  const feComposite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite')
  feComposite.setAttribute('operator', 'in')
  feComposite.setAttribute('in', 'SourceGraphic')
  feComposite.setAttribute('in2', 'f2')
  feComposite.setAttribute('result', 'f3')
  filter.appendChild(feComposite)

  return filter
}
