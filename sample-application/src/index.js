import 'core-js/stable'

import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/xml/xml.js'

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

import Svg2Roughjs from 'svg2roughjs'

let loadingSvg = false
let scheduledLoad

/**
 * @param {SVGSVGElement} svg
 * @returns {{width:number, height:number} | null}
 */
function getSvgSize(svg) {
  let width = parseInt(svg.getAttribute('width'))
  let height = parseInt(svg.getAttribute('height'))
  let viewBox = svg.getAttribute('viewBox')
  if (isNaN(width) || isNaN(height)) {
    return viewBox ? { width: svg.viewBox.baseVal.width, height: svg.viewBox.baseVal.height } : null
  }
  return { width, height }
}

function loadSvgString(svg2roughjs, fileContent) {
  if (loadingSvg) {
    scheduledLoad = fileContent
    return
  }

  document.getElementById('sample-select').disabled = true
  loadingSvg = true

  const inputElement = document.getElementById('input')
  const outputElement = document.getElementById('output')
  const canvas = outputElement.querySelector('canvas')

  const parser = new DOMParser()
  const doc = parser.parseFromString(fileContent, 'image/svg+xml')
  const svg = doc.querySelector('svg')

  while (inputElement.childElementCount > 0) {
    inputElement.removeChild(inputElement.firstChild)
  }

  if (!svg) {
    console.error('Could not load SVG file')
    return
  }

  const svgSize = getSvgSize(svg)
  if (svgSize) {
    inputElement.style.width = `${svgSize.width}px`
    inputElement.style.height = `${svgSize.height}px`
  }
  inputElement.appendChild(svg)

  // make sure the SVG is part of the DOM and rendered, before it is converted by
  // Svg2Rough.js. Otherwise, CSS percentaged width/height might not be applied yet
  setTimeout(() => {
    if (svg.tagName === 'HTML') {
      console.error('Error parsing XML')
      inputElement.style.opacity = 1
      inputElement.style.width = '100%'
      inputElement.style.height = '100%'
      if (canvas) {
        canvas.style.opacity = 0
      }
    } else {
      inputElement.style.opacity = document.getElementById('opacity').value
      if (canvas) {
        canvas.style.opacity = 1
      }
      try {
        svg2roughjs.svg = svg
      } catch (e) {
        console.error("Couldn't sketch content")
        throw e // re-throw to show error on console
      } finally {
        document.getElementById('sample-select').disabled = false
        loadingSvg = false
      }

      // maybe there was a load during the rendering.. so load this instead
      if (scheduledLoad) {
        loadSvgString(svg2roughjs, scheduledLoad)
        scheduledLoad = null
      }
    }
  }, 0)
}

function loadSample(svg2roughjs, sample) {
  let sampleString = ''
  switch (sample) {
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
  }

  codeMirrorInstance.setValue(sampleString)

  loadSvgString(svg2roughjs, sampleString)
}

let codeMirrorInstance

function run() {
  const svg2roughjs = new Svg2Roughjs('#output')
  svg2roughjs.backgroundColor = 'white'
  const sampleSelect = document.getElementById('sample-select')
  sampleSelect.addEventListener('change', () => {
    loadSample(svg2roughjs, sampleSelect.value)
  })

  const toggleSourceBtn = document.getElementById('source-toggle')
  toggleSourceBtn.addEventListener('change', () => {
    if (toggleSourceBtn.checked) {
      codeContainer.classList.remove('hidden')
      setTimeout(() => {
        codeMirrorInstance.refresh()
        codeMirrorInstance.focus()
      }, 20)
    } else {
      codeContainer.classList.add('hidden')
    }
  })

  const codeContainer = document.querySelector('.raw-svg-container')
  codeMirrorInstance = CodeMirror(codeContainer, {
    mode: 'xml',
    lineNumbers: 'true'
  })

  let debouncedTimer = null
  codeMirrorInstance.on('inputRead', () => {
    if (debouncedTimer) {
      clearTimeout(debouncedTimer)
    }
    debouncedTimer = setTimeout(() => {
      debouncedTimer = null
      try {
        loadSvgString(svg2roughjs, codeMirrorInstance.getValue())
      } catch (e) {}
    }, 500)
  })

  // make sure codemirror is rendered when the expand animation has finished
  codeContainer.addEventListener('transitionend', () => {
    if (toggleSourceBtn.checked) {
      codeMirrorInstance.refresh()
      codeMirrorInstance.focus()
    }
  })

  // pre-select a sample
  sampleSelect.selectedIndex = 0
  loadSample(svg2roughjs, sampleSelect.value)

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
  roughnessInput.addEventListener('change', () => {
    svg2roughjs.roughConfig = {
      bowing: parseInt(bowingInput.value),
      roughness: parseInt(roughnessInput.value),
      fillStyle: fillStyleSelect.value
    }
  })
  bowingInput.addEventListener('change', () => {
    svg2roughjs.roughConfig = {
      bowing: parseInt(bowingInput.value),
      roughness: parseInt(roughnessInput.value),
      fillStyle: fillStyleSelect.value
    }
  })

  function loadFile(file) {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.addEventListener('load', () => {
      const fileContent = reader.result
      codeMirrorInstance.setValue(fileContent)
      loadSvgString(svg2roughjs, fileContent)
    })
  }

  const fileInput = document.getElementById('file-chooser')
  fileInput.addEventListener('change', e => {
    const files = fileInput.files
    if (files.length > 0) {
      loadFile(files[0])
    }
  })

  const body = document.getElementsByTagName('body')[0]
  body.addEventListener('dragover', e => {
    e.preventDefault()
  })
  body.addEventListener('drop', e => {
    e.preventDefault()
    if (e.dataTransfer.items) {
      for (var i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind === 'file') {
          const file = e.dataTransfer.items[i].getAsFile()
          loadFile(file)
          return
        }
      }
    } else {
      // Use DataTransfer interface to access the file(s)
      for (var i = 0; i < ev.dataTransfer.files.length; i++) {
        loadFile(e.dataTransfer.files[i])
        return
      }
    }
  })

  const downloadBtn = document.getElementById('download-btn')
  downloadBtn.addEventListener('click', () => {
    // download file
    const canvas = document.querySelector('canvas')
    const image = canvas.toDataURL('image/png', 1.0).replace('image/png', 'image/octet-stream')
    const link = document.createElement('a')
    link.download = 'svg2roughjs.png'
    link.href = image
    link.click()
  })

  const originalFontCheckbox = document.getElementById('original-font')
  originalFontCheckbox.addEventListener('change', e => {
    if (originalFontCheckbox.checked) {
      svg2roughjs.fontFamily = null
    } else {
      svg2roughjs.fontFamily = 'Comic Sans MS, sans-serif'
    }
  })
  const randomizeCheckbox = document.getElementById('randomize')
  randomizeCheckbox.addEventListener('change', e => {
    if (randomizeCheckbox.checked) {
      svg2roughjs.randomize = true
    } else {
      svg2roughjs.randomize = false
    }
  })
}

run()
