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

    const parser = new DOMParser()
    const doc = parser.parseFromString(sampleString, 'image/svg+xml')
    const svg = doc.firstElementChild

    const inputElement = document.getElementById('input')
    while (inputElement.childElementCount > 0) {
      inputElement.removeChild(inputElement.firstElementChild)
    }
    inputElement.appendChild(svg)

    svg2roughjs.svg = svg
  })

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

  // pre-select a sample
  sampleSelect.selectedIndex = 4
  sampleSelect.dispatchEvent(new Event('change'))
}

run()
