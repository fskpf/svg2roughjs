import SAMPLE_BPMN from '../public/bpmn1.svg'
import SAMPLE_COMPUTER_NETWORK from '../public/computer-network.svg'
import SAMPLE_FLOWCHART from '../public/flowchart4.svg'
import SAMPLE_HIERARCHICAL1 from '../public/hierarchical1.svg'
import SAMPLE_HIERARCHICAL2 from '../public/hierarchical2.svg'
import SAMPLE_MINDMAP from '../public/mindmap.svg'
import SAMPLE_MOVIES from '../public/movies.svg'
import SAMPLE_ORGANIC1 from '../public/organic1.svg'
import SAMPLE_ORGANIC2 from '../public/organic2.svg'
import SAMPLE_TREE from '../public/tree1.svg'
import SAMPLE_VENN from '../public/venn.svg'
import SAMPLE_SINGLE_MOVIE from '../public/singlemovie.svg'

import Svg2Roughjs from 'svg2roughjs'

function loadSvg(svg2roughjs, fileContent) {
  const inputElement = document.getElementById('input')

  const parser = new DOMParser()
  const parsererrorNS = parser
    .parseFromString('INVALID', 'text/xml')
    .getElementsByTagName('parsererror')[0].namespaceURI
  const doc = parser.parseFromString(fileContent, 'image/svg+xml')

  const svg = doc.firstElementChild

  while (inputElement.childElementCount > 0) {
    inputElement.removeChild(inputElement.firstElementChild)
  }
  inputElement.appendChild(svg)

  if (doc.getElementsByTagNameNS(parsererrorNS, 'parsererror').length > 0) {
    console.error('Error parsing XML')
    inputElement.style.opacity = 1
  } else {
    inputElement.style.opacity = 0
    svg2roughjs.svg = svg
  }
}

function run() {
  const svg2roughjs = new Svg2Roughjs('#output')
  const sampleSelect = document.getElementById('sample-select')
  sampleSelect.addEventListener('change', () => {
    let sampleString = ''
    switch (sampleSelect.value) {
      case 'bpmn1':
        sampleString = SAMPLE_BPMN
        break
      case 'computer-network':
        sampleString = SAMPLE_COMPUTER_NETWORK
        break
      case 'flowchart4':
        sampleString = SAMPLE_FLOWCHART
        break
      case 'hierarchical1':
        sampleString = SAMPLE_HIERARCHICAL1
        break
      case 'hierarchical2':
        sampleString = SAMPLE_HIERARCHICAL2
        break
      case 'mindmap':
        sampleString = SAMPLE_MINDMAP
        break
      case 'movies':
        sampleString = SAMPLE_MOVIES
        break
      case 'organic1':
        sampleString = SAMPLE_ORGANIC1
        break
      case 'organic2':
        sampleString = SAMPLE_ORGANIC2
        break
      case 'tree1':
        sampleString = SAMPLE_TREE
        break
      case 'venn':
        sampleString = SAMPLE_VENN
        break
      case 'singlemovie':
        sampleString = SAMPLE_SINGLE_MOVIE
        break
    }

    loadSvg(svg2roughjs, sampleString)
  })

  // pre-select a sample
  sampleSelect.selectedIndex = 4
  sampleSelect.dispatchEvent(new Event('change'))

  const fillStyleSelect = document.getElementById('fill-style')
  const roughnessInput = document.getElementById('roughness-input')
  const bowingInput = document.getElementById('bowing-input')

  fillStyleSelect.addEventListener('change', () => {
    svg2roughjs.roughConfig = {
      bowing: parseInt(bowingInput.value),
      roughness: parseInt(roughnessInput.value),
      fillStyle: fillStyleSelect.value
    }
  })
  roughnessInput.addEventListener('input', () => {
    svg2roughjs.roughConfig = {
      bowing: parseInt(bowingInput.value),
      roughness: parseInt(roughnessInput.value),
      fillStyle: fillStyleSelect.value
    }
  })
  bowingInput.addEventListener('input', () => {
    svg2roughjs.roughConfig = {
      bowing: parseInt(bowingInput.value),
      roughness: parseInt(roughnessInput.value),
      fillStyle: fillStyleSelect.value
    }
  })

  const fileInput = document.getElementById('file-chooser')
  fileInput.addEventListener('change', e => {
    const files = fileInput.files
    if (files.length > 0) {
      const file = files[0]
      const reader = new FileReader()
      reader.readAsText(file)
      reader.addEventListener('load', () => {
        loadSvg(svg2roughjs, reader.result)
      })
    }
  })

  const downloadBtn = document.getElementById('download-btn')
  downloadBtn.addEventListener('click', () => {
    // we add a white background for the download
    const canvas = document.querySelector('canvas')
    const canvasClone = canvas.cloneNode()

    canvasClone.width = canvas.width
    canvasClone.height = canvas.height

    // add white background
    const ctx = canvasClone.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // transfer content
    ctx.drawImage(canvas, 0, 0)

    // download file
    const image = canvasClone.toDataURL('image/png', 1.0).replace('image/png', 'image/octet-stream')
    const link = document.createElement('a')
    link.download = 'svg2roughjs.png'
    link.href = image
    link.click()
  })
}

run()
