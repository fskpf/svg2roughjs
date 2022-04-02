import 'core-js'
import 'core-js/es/symbol'
import 'regenerator-runtime/runtime'

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

import { OutputType, Svg2Roughjs } from 'svg2roughjs/dist/svg2roughjs.es'

let svg2roughjs
let loadingSvg = false
let scheduledLoad
let debouncedTimer = null
let codeMirrorInstance

const onCodeMirrorChange = () => {
  if (debouncedTimer) {
    clearTimeout(debouncedTimer)
  }
  debouncedTimer = setTimeout(() => {
    debouncedTimer = null
    try {
      loadSvgString(svg2roughjs, codeMirrorInstance.getValue())
    } catch (e) {
      /* do nothing */
    }
  }, 500)
}

/**
 * Sets CodeMirror content without triggering the change listener
 * @param {string} value
 */
function setCodeMirrorValue(value) {
  codeMirrorInstance.off('change', onCodeMirrorChange)
  codeMirrorInstance.setValue(value)
  codeMirrorInstance.on('change', onCodeMirrorChange)
}

/**
 * @param {SVGSVGElement} svg
 * @returns {{width:number, height:number}}
 */
function getSvgSize(svg) {
  let width, height
  const hasViewbox = svg.hasAttribute('viewBox')
  if (svg.hasAttribute('width')) {
    // percantage sizes for the root SVG are unclear, thus use viewBox if available
    if (svg.width.baseVal.unitType === SVGLength.SVG_LENGTHTYPE_PERCENTAGE && hasViewbox) {
      width = svg.viewBox.baseVal.width
    } else {
      width = svg.width.baseVal.value
    }
  } else if (hasViewbox) {
    width = svg.viewBox.baseVal.width
  } else {
    width = 300
  }

  if (svg.hasAttribute('height')) {
    // percantage sizes for the root SVG are unclear, thus use viewBox if available
    if (svg.height.baseVal.unitType === SVGLength.SVG_LENGTHTYPE_PERCENTAGE && hasViewbox) {
      height = svg.viewBox.baseVal.height
    } else {
      height = svg.height.baseVal.value
    }
  } else if (hasViewbox) {
    height = svg.viewBox.baseVal.height
  } else {
    height = 150
  }

  return { width, height }
}

function loadSvgString(svg2roughjs, fileContent) {
  if (loadingSvg) {
    scheduledLoad = fileContent
    return
  }
  setUIState(false)

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
    setUIState(true)
    loadingSvg = false
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
  setTimeout(async () => {
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
        await svg2roughjs.sketch()
      } catch (e) {
        console.error("Couldn't sketch content")
        throw e // re-throw to show error on console
      } finally {
        setUIState(true)
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

  setCodeMirrorValue(sampleString)

  loadSvgString(svg2roughjs, sampleString)
}

function updateOpacity(inputContainerOpacity) {
  const inputContainer = document.getElementById('input')
  const outputContainer = document.getElementById('output')
  inputContainer.style.opacity = inputContainerOpacity
  outputContainer.style.opacity = 1 - inputContainerOpacity
}

function run() {
  svg2roughjs = new Svg2Roughjs('#output', OutputType.SVG)
  svg2roughjs.backgroundColor = 'white'
  svg2roughjs.pencilFilter = !!document.getElementById('pencilFilter').checked
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
  const outputFormatSelect = document.getElementById('output-format')
  const roughnessInput = document.getElementById('roughness-input')
  const bowingInput = document.getElementById('bowing-input')

  outputFormatSelect.addEventListener('change', async () => {
    setUIState(false)
    svg2roughjs.outputType = outputFormatSelect.value === 'svg' ? OutputType.SVG : OutputType.CANVAS
    await svg2roughjs.sketch()
    setUIState(true)
  })
  fillStyleSelect.addEventListener('change', async () => {
    svg2roughjs.roughConfig = {
      bowing: parseInt(bowingInput.value),
      roughness: parseInt(roughnessInput.value),
      fillStyle: fillStyleSelect.value
    }
    setUIState(false)
    await svg2roughjs.sketch()
    setUIState(true)
  })
  roughnessInput.addEventListener('change', async () => {
    svg2roughjs.roughConfig = {
      bowing: parseInt(bowingInput.value),
      roughness: parseInt(roughnessInput.value),
      fillStyle: fillStyleSelect.value
    }
    setUIState(false)
    await svg2roughjs.sketch()
    setUIState(true)
  })
  bowingInput.addEventListener('change', async () => {
    svg2roughjs.roughConfig = {
      bowing: parseInt(bowingInput.value),
      roughness: parseInt(roughnessInput.value),
      fillStyle: fillStyleSelect.value
    }
    setUIState(false)
    await svg2roughjs.sketch()
    setUIState(true)
  })

  const opacityInput = document.getElementById('opacity')
  opacityInput.addEventListener('change', () => {
    updateOpacity(opacityInput.value)
  })
  const opacityLabel = document.querySelector('label[for=opacity]')
  opacityLabel.addEventListener('click', () => {
    const currentOpacity = opacityInput.value
    const newOpacity = currentOpacity < 1 ? 1 : 0
    opacityInput.value = newOpacity
    updateOpacity(newOpacity)
  })

  function loadFile(file) {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.addEventListener('load', () => {
      const fileContent = reader.result
      setCodeMirrorValue(fileContent)
      loadSvgString(svg2roughjs, fileContent)
    })
  }

  const fileInput = document.getElementById('file-chooser')
  fileInput.addEventListener('change', () => {
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
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        if (e.dataTransfer.items[i].kind === 'file') {
          const file = e.dataTransfer.items[i].getAsFile()
          loadFile(file)
          return
        }
      }
    } else {
      // Use DataTransfer interface to access the file(s)
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        loadFile(e.dataTransfer.files[i])
        return
      }
    }
  })

  const downloadBtn = document.getElementById('download-btn')
  downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a')

    if (svg2roughjs.outputType === OutputType.CANVAS) {
      const canvas = document.querySelector('#output canvas')
      const image = canvas.toDataURL('image/png', 1.0).replace('image/png', 'image/octet-stream')
      link.download = 'svg2roughjs.png'
      link.href = image
    } else {
      const serializer = new XMLSerializer()
      let svgString = serializer.serializeToString(document.querySelector('#output svg'))
      svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })
      link.download = 'svg2roughjs.svg'
      link.href = URL.createObjectURL(svgBlob)
    }

    link.click()
  })

  const originalFontCheckbox = document.getElementById('original-font')
  originalFontCheckbox.addEventListener('change', async () => {
    if (originalFontCheckbox.checked) {
      svg2roughjs.fontFamily = null
    } else {
      svg2roughjs.fontFamily = 'Comic Sans MS, sans-serif'
    }
    setUIState(false)
    await svg2roughjs.sketch()
    setUIState(true)
  })
  const randomizeCheckbox = document.getElementById('randomize')
  randomizeCheckbox.addEventListener('change', async () => {
    svg2roughjs.randomize = !!randomizeCheckbox.checked
    setUIState(false)
    await svg2roughjs.sketch()
    setUIState(true)
  })
  const pencilCheckbox = document.getElementById('pencilFilter')
  pencilCheckbox.addEventListener('change', async () => {
    svg2roughjs.pencilFilter = !!pencilCheckbox.checked
    setUIState(false)
    await svg2roughjs.sketch()
    setUIState(true)
  })
}

function setUIState(enabled) {
  const elements = [
    document.getElementById('fill-style'),
    document.getElementById('output-format'),
    document.getElementById('roughness-input'),
    document.getElementById('bowing-input'),
    document.getElementById('original-font'),
    document.getElementById('randomize'),
    document.getElementById('pencilFilter'),
    document.getElementById('sample-select')
  ]

  for (const ele of elements) {
    ele.disabled = !enabled
  }
}

run()
