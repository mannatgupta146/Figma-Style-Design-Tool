/* =====================================================
   DOM REFERENCES
===================================================== */

const main = document.querySelector("main")
const screen = document.querySelector(".screen")

const toolPanIcon = document.querySelector(".tool-pan")
const toolSelectIcon = document.querySelector(".tool-select")
const toolRectangleIcon = document.querySelector(".tool-rectangle")
const toolResizeIcon = document.querySelector(".tool-resize")
const toolTextIcon = document.querySelector(".tool-text")
const tools = document.querySelectorAll(".tool")
const toolDeleteIcon = document.querySelector(".tool-delete")
const layersList = document.querySelector(".layers-list")
const layerUpBtn = document.querySelector(".layer-up")
const layerDownBtn = document.querySelector(".layer-down")
const propWidth = document.querySelector(".prop-width")
const propHeight = document.querySelector(".prop-height")
const propBg = document.querySelector(".prop-bg")
const propText = document.querySelector(".prop-text")
const propTextWrap = document.querySelector(".prop-text-wrap")
const propertiesPanel = document.querySelector(".properties-panel")
const toolEditIcon = document.querySelector(".tool-edit")
const txtBold = document.querySelector(".txt-bold")
const txtItalic = document.querySelector(".txt-italic")
const txtUnderline = document.querySelector(".txt-underline")
const propTextColor = document.querySelector(".prop-text-color")


/* =====================================================
   GLOBAL STATE
===================================================== */

let scale = 1
let activeTool = "select"

let selectedElement = null
let isDragging = false
let isPanning = false
let isDragDisabled = false

let isResizing = false
let resizeHandle = null

// 🔄 ROTATION STATE
let isRotating = false
let startAngle = 0
let startRotation = 0

let startX = 0
let startY = 0
let startWidth = 0
let startHeight = 0
let startLeft = 0
let startTop = 0

let startScrollLeft = 0
let startScrollTop = 0

const MIN_WIDTH = 100
const MIN_HEIGHT = 80

let elementCounter = 0

let elements = [] 

screen.addEventListener("input", (e) => {
  if (!e.target.classList.contains("text-box")) return
  syncElementToStore(e.target)
})

/* =====================================================
   LOAD FROM LOCAL STORAGE (ON REFRESH)
===================================================== */

function loadFromLocalStorage() {
  const saved = localStorage.getItem("canvasElements")
  if (!saved) return

  screen.querySelectorAll(".rectangle, .text-box").forEach(el => el.remove())

  try {
    const data = JSON.parse(saved)
    if (!Array.isArray(data)) return

    elements = [] // reset safely

    data.forEach(item => {
      let el

      if (item.type === "rectangle") {
        el = document.createElement("div")
        el.className = "rectangle"
        el.style.width = item.width + "px"
        el.style.height = item.height + "px"
      }

      if (item.type === "text") {
        el = document.createElement("div")
        el.className = "text-box"
        el.contentEditable = "true"
        el.textContent = item.text || ""
      }

      if (item.bg) el.style.backgroundColor = item.bg
      if (item.color) el.style.color = item.color
      if (item.fontWeight) el.style.fontWeight = item.fontWeight
      if (item.fontStyle) el.style.fontStyle = item.fontStyle
      if (item.textDecoration) el.style.textDecoration = item.textDecoration


      if (!el) return

      // common props
      el.dataset.id = item.id
      el.dataset.type = item.type
      el.style.left = item.x + "px"
      el.style.top = item.y + "px"

      if (item.rotation) {
        el.style.transform = `rotate(${item.rotation}deg)`
        el.dataset.rotation = item.rotation
      }

      screen.appendChild(el)
      elements.push(item)
    })

    elementCounter = elements.reduce((max, e) => {
  const n = parseInt(e.id.split("-")[1], 10)
  return Math.max(max, isNaN(n) ? 0 : n)
}, 0)

applyZIndex()
renderLayers()

  } catch (err) {
    console.error("Failed to load canvas:", err)
  }
}

function applyZIndex() {
  elements.forEach((elData, index) => {
    const el = screen.querySelector(`[data-id="${elData.id}"]`)
    if (el) el.style.zIndex = index + 1
  })
}


function renderLayers() {
  layersList.innerHTML = ""

  // show top-most at top of list
  elements.slice().reverse().forEach(el => {
    const li = document.createElement("li")
    li.textContent = `${el.type} (${el.id})`
    li.dataset.id = el.id

    if (selectedElement?.dataset.id === el.id) {
      li.classList.add("active")
    }

    li.onclick = () => {
      const target = screen.querySelector(`[data-id="${el.id}"]`)
      if (target) selectElement(target)
      renderLayers()
    }

    layersList.appendChild(li)
  })
}

layerUpBtn.onclick = () => {
  if (!selectedElement) return

  const idx = elements.findIndex(e => e.id === selectedElement.dataset.id)
  if (idx === elements.length - 1) return

  ;[elements[idx], elements[idx + 1]] = [elements[idx + 1], elements[idx]]

  applyZIndex()
  renderLayers()
  localStorage.setItem("canvasElements", JSON.stringify(elements))
}

layerDownBtn.onclick = () => {
  if (!selectedElement) return

  const idx = elements.findIndex(e => e.id === selectedElement.dataset.id)
  if (idx === 0) return

  ;[elements[idx], elements[idx - 1]] = [elements[idx - 1], elements[idx]]

  applyZIndex()
  renderLayers()
  localStorage.setItem("canvasElements", JSON.stringify(elements))
}

txtBold.onclick = () => {
  if (!selectedElement) return
  selectedElement.style.fontWeight =
    selectedElement.style.fontWeight === "bold" ? "normal" : "bold"
  syncElementToStore(selectedElement)
}

txtItalic.onclick = () => {
  if (!selectedElement) return
  selectedElement.style.fontStyle =
    selectedElement.style.fontStyle === "italic" ? "normal" : "italic"
  syncElementToStore(selectedElement)
}

txtUnderline.onclick = () => {
  if (!selectedElement) return
  selectedElement.style.textDecoration =
    selectedElement.style.textDecoration === "underline" ? "none" : "underline"
  syncElementToStore(selectedElement)
}

propTextColor.oninput = () => {
  if (!selectedElement) return
  selectedElement.style.color = propTextColor.value
  syncElementToStore(selectedElement)
}



function updatePropertiesVisibility() {
  if (!selectedElement) {
    propertiesPanel.classList.remove("active")
    return
  }

  if (activeTool === "resize") {
    propertiesPanel.classList.add("active")
    updatePropertiesPanel()
  } else {
    propertiesPanel.classList.remove("active")
  }
}


/* =====================================================
   ZOOM
===================================================== */

function updateTransform() {
  screen.style.transform = `scale(${scale})`
  screen.style.transformOrigin = "0 0"
}

function zoomIn() {
  scale = Math.min(scale + 0.1, 2)
  updateTransform()
}

function zoomOut() {
  scale = Math.max(scale - 0.1, 0.4)
  updateTransform()
}

/* =====================================================
   TOOL HANDLING
===================================================== */

function stopAllActions() {
  isDragging = false
  isPanning = false
  isResizing = false
  isRotating = false
  resizeHandle = null
  toolPanIcon.classList.remove("dragging")
  screen.style.cursor = "default"
}

function setActiveTool(name, icon) {
  tools.forEach(t => t.classList.remove("active"))
  if (icon) icon.classList.add("active")
  activeTool = name
  stopAllActions()

  if (selectedElement) {
    selectedElement.classList.toggle("resize-mode", name === "resize")
  }
  updatePropertiesVisibility()
}

/* ---- Toolbar ---- */

toolSelectIcon.onclick = () => setActiveTool("select", toolSelectIcon)

toolPanIcon.onclick = () => {
  activeTool === "pan"
    ? setActiveTool("select", toolSelectIcon)
    : setActiveTool("pan", toolPanIcon)
}

toolRectangleIcon.onclick = () => {
  setActiveTool("rectangle", toolRectangleIcon)
}

toolResizeIcon.onclick = () => {
  if (!selectedElement) return
  activeTool === "resize"
    ? setActiveTool("select", toolSelectIcon)
    : setActiveTool("resize", toolResizeIcon)
}

toolTextIcon.onclick = () => {
  setActiveTool("text", toolTextIcon)
}

toolEditIcon.onclick = () => {
  if (!selectedElement) return

  if (activeTool === "resize") {
    setActiveTool("select", toolSelectIcon)
  } else {
    setActiveTool("resize", toolEditIcon)
  }
}


/* =====================================================
   SELECTION
===================================================== */

function addResizeHandles(el) {
  ["tl", "tr", "bl", "br"].forEach(pos => {
    const h = document.createElement("div")
    h.className = `resize-handle ${pos}`
    el.appendChild(h)
  })
}

function selectElement(el) {
  clearSelection()
  selectedElement = el
  el.classList.add("selected")

  if (el.dataset.type === "rectangle" && !el.querySelector(".resize-handle")) {
    addResizeHandles(el)
  }
  updatePropertiesPanel()
  updatePropertiesVisibility()

  el.classList.toggle("resize-mode", activeTool === "resize")
}

function clearSelection() {
  if (!selectedElement) return
  selectedElement.classList.remove("selected", "resize-mode")
  selectedElement = null
  propertiesPanel.classList.remove("active")

}

/* =====================================================
   PAN & DRAG
===================================================== */

function startPan(e) {
  isPanning = true
  toolPanIcon.classList.add("dragging")

  startX = e.clientX
  startY = e.clientY
  startScrollLeft = main.scrollLeft
  startScrollTop = main.scrollTop
}

function handlePanMove(e) {
  main.scrollLeft = startScrollLeft - (e.clientX - startX)
  main.scrollTop = startScrollTop - (e.clientY - startY)
}

function startDrag(e) {
  isDragging = true
  startX = e.clientX
  startY = e.clientY
}

function handleDragMove(e) {
  const dx = (e.clientX - startX) / scale
  const dy = (e.clientY - startY) / scale

  let left = selectedElement.offsetLeft + dx
  let top = selectedElement.offsetTop + dy

  left = Math.max(0, Math.min(left, screen.clientWidth - selectedElement.offsetWidth))
  top = Math.max(0, Math.min(top, screen.clientHeight - selectedElement.offsetHeight))

  selectedElement.style.left = left + "px"
  selectedElement.style.top = top + "px"

  startX = e.clientX
  startY = e.clientY
  syncElementToStore(selectedElement)

}

/* =====================================================
   🔄 ROTATION (ALT + DRAG)
===================================================== */

function startRotate(e) {
  isRotating = true

  const rect = selectedElement.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  startAngle = Math.atan2(e.clientY - cy, e.clientX - cx)
  startRotation = parseFloat(selectedElement.dataset.rotation || 0)
}

function handleRotateMove(e) {
  const rect = selectedElement.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2

  const currentAngle = Math.atan2(e.clientY - cy, e.clientX - cx)
  const delta = currentAngle - startAngle
  const deg = startRotation + delta * (180 / Math.PI)

  selectedElement.style.transform = `rotate(${deg}deg)`
  selectedElement.dataset.rotation = deg
  syncElementToStore(selectedElement)

}

/* =====================================================
   RESIZE (4 CORNERS)
===================================================== */

function startResize(e, handle) {
  isResizing = true
  resizeHandle = handle

  startX = e.clientX
  startY = e.clientY

  startWidth = selectedElement.offsetWidth
  startHeight = selectedElement.offsetHeight
  startLeft = selectedElement.offsetLeft
  startTop = selectedElement.offsetTop
}

function handleResizeMove(e) {
  const dx = (e.clientX - startX) / scale
  const dy = (e.clientY - startY) / scale

  let w = startWidth
  let h = startHeight
  let l = startLeft
  let t = startTop

  if (resizeHandle.includes("r")) w += dx
  if (resizeHandle.includes("l")) { w -= dx; l += dx }
  if (resizeHandle.includes("b")) h += dy
  if (resizeHandle.includes("t")) { h -= dy; t += dy }

  w = Math.max(MIN_WIDTH, w)
  h = Math.max(MIN_HEIGHT, h)

  selectedElement.style.width = w + "px"
  selectedElement.style.height = h + "px"
  selectedElement.style.left = l + "px"
  selectedElement.style.top = t + "px"
  syncElementToStore(selectedElement)

}

/* =====================================================
   MOUSE EVENTS
===================================================== */

screen.addEventListener("mousedown", (e) => {

  /* 🔄 ROTATE (ALT) */
  if (selectedElement && e.altKey) {
    startRotate(e)
    return
  }

  /* TEXT */
  if (activeTool === "text") {
    const text = document.createElement("div")
    text.className = "text-box"
    text.contentEditable = "true"
    text.dataset.type = "text"
    text.dataset.id = `el-${++elementCounter}`

    const rect = screen.getBoundingClientRect()
    const x = (e.clientX - rect.left + main.scrollLeft) / scale
    const y = (e.clientY - rect.top + main.scrollTop) / scale

    text.style.left = x + "px"
    text.style.top = y + "px"
    text.textContent = "Type here"

    screen.appendChild(text)
    selectElement(text)
    elements.push(createElementObject(text))
    localStorage.setItem("canvasElements", JSON.stringify(elements))
    applyZIndex()
    renderLayers()

    setTimeout(() => text.focus(), 0)
    setActiveTool("select", toolSelectIcon)
    
    return
  }

  /* RECTANGLE */
  if (activeTool === "rectangle") {
    const r = document.createElement("div")
    r.className = "rectangle"
    r.dataset.type = "rectangle"
    r.dataset.id = `el-${++elementCounter}`

    const rect = screen.getBoundingClientRect()
    const x = (e.clientX - rect.left + main.scrollLeft) / scale
    const y = (e.clientY - rect.top + main.scrollTop) / scale

    r.style.left = x - 200 + "px"
    r.style.top = y - 125 + "px"

    screen.appendChild(r)
    selectElement(r)
    elements.push(createElementObject(r))
    localStorage.setItem("canvasElements", JSON.stringify(elements))
    applyZIndex()
    renderLayers()
    setActiveTool("select", toolSelectIcon)
    return
  }

  /* RESIZE */
  if (activeTool === "resize" && e.target.classList.contains("resize-handle")) {
    startResize(e, e.target.classList[1])
    return
  }

  /* SELECT */
  if (e.target.classList.contains("rectangle") || e.target.classList.contains("text-box")) {
    selectElement(e.target)
    if (activeTool === "pan" && !isDragDisabled) startDrag(e)
    return
  }

  /* PAN */
  if (activeTool === "pan") {
    startPan(e)
    return
  }

  clearSelection()
})

screen.addEventListener("mousemove", (e) => {
  if (isRotating) return handleRotateMove(e)
  if (isResizing) return handleResizeMove(e)
  if (isPanning) return handlePanMove(e)
  if (isDragging && selectedElement) handleDragMove(e)
})

window.addEventListener("mouseup", stopAllActions)

/* =====================================================
   GRID (UNCHANGED)
===================================================== */

const blockSize = 30
const cols = Math.floor(screen.clientWidth / blockSize)
const rows = Math.floor(screen.clientHeight / blockSize)

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const block = document.createElement("div")
    block.classList.add("block")
    screen.appendChild(block)
  }
}

/* =====================================================
   ELEMENT STORE
===================================================== */

function createElementObject(el) {
  return {
    id: el.dataset.id,
    type: el.dataset.type,
    x: el.offsetLeft,
    y: el.offsetTop,
    width: el.offsetWidth || null,
    height: el.offsetHeight || null,
    rotation: parseFloat(el.dataset.rotation || 0),
    bg: getComputedStyle(el).backgroundColor,
    color: getComputedStyle(el).color,
    fontWeight: el.style.fontWeight || "normal",
    fontStyle: el.style.fontStyle || "normal",
    textDecoration: el.style.textDecoration || "none",
    text: el.dataset.type === "text" ? el.textContent : null
  }
}


function syncElementToStore(el) {
  const idx = elements.findIndex(e => e.id === el.dataset.id)
  if (idx === -1) return

  elements[idx].x = el.offsetLeft
  elements[idx].y = el.offsetTop
  elements[idx].width = el.offsetWidth || null
  elements[idx].height = el.offsetHeight || null
  elements[idx].rotation = parseFloat(el.dataset.rotation || 0)
  elements[idx].bg = getComputedStyle(el).backgroundColor
  elements[idx].color = getComputedStyle(el).color
  elements[idx].fontWeight = el.style.fontWeight || "normal"
  elements[idx].fontStyle = el.style.fontStyle || "normal"
  elements[idx].textDecoration = el.style.textDecoration || "none"


  if (el.dataset.type === "text") {
    elements[idx].text = el.textContent
  }
  localStorage.setItem("canvasElements", JSON.stringify(elements))
}

function deleteSelectedElement() {
  if (!selectedElement) return

  const ok = confirm("Delete selected element?")
  if (!ok) return

  const idx = elements.findIndex(e => e.id === selectedElement.dataset.id)
  if (idx !== -1) {
    elements.splice(idx, 1)
  }

  selectedElement.remove()
  selectedElement = null

  localStorage.setItem("canvasElements", JSON.stringify(elements))

  stopAllActions()
  setActiveTool("select", toolSelectIcon)
  renderLayers()

}

screen.addEventListener("blur", (e) => {
  if (!e.target.classList.contains("text-box")) return

  // auto delete empty text boxes
  if (e.target.textContent.trim() === "") {
    const idx = elements.findIndex(el => el.id === e.target.dataset.id)
    if (idx !== -1) elements.splice(idx, 1)

    e.target.remove()
    localStorage.setItem("canvasElements", JSON.stringify(elements))
    renderLayers()
  }
}, true)


document.addEventListener("keydown", (e) => {
  if (!selectedElement) return

  // block delete while typing text
  if (
    document.activeElement &&
    document.activeElement.classList.contains("text-box") &&
    (e.key === "Delete")
  ) return

  /* DELETE */
  if (e.key === "Delete") {
    deleteSelectedElement()
    return
  }

  if (e.key === "Escape" && selectedElement.classList.contains("text-box")) {
    selectedElement.blur()
    screen.focus()
    return
  }

  /* MOVE WITH ARROWS */
  const step = 5
  let left = selectedElement.offsetLeft
  let top = selectedElement.offsetTop

  if (e.key === "ArrowUp") top -= step
  else if (e.key === "ArrowDown") top += step
  else if (e.key === "ArrowLeft") left -= step
  else if (e.key === "ArrowRight") left += step
  else return

  e.preventDefault()

  left = Math.max(0, Math.min(left, screen.clientWidth - selectedElement.offsetWidth))
  top = Math.max(0, Math.min(top, screen.clientHeight - selectedElement.offsetHeight))

  selectedElement.style.left = left + "px"
  selectedElement.style.top = top + "px"

  syncElementToStore(selectedElement)
})


const saveBtn = document.querySelector(".buttons-right .save")

function updatePropertiesPanel() {
  if (!selectedElement) return

  propWidth.value = selectedElement.offsetWidth || ""
  propHeight.value = selectedElement.offsetHeight || ""

  // ✅ background for rectangle AND text
  propBg.disabled = false
  propBg.value = rgbToHex(
    getComputedStyle(selectedElement).backgroundColor
  )

  // text-only controls
  if (selectedElement.dataset.type === "text") {
    propTextWrap.style.display = "block"
    propText.value = selectedElement.textContent
    propTextColor.value =
      rgbToHex(getComputedStyle(selectedElement).color)
  } else {
    propTextWrap.style.display = "none"
  }
}

propWidth.addEventListener("input", () => {
  if (!selectedElement) return
  selectedElement.style.width = propWidth.value + "px"
  syncElementToStore(selectedElement)
})


propHeight.addEventListener("input", () => {
  if (!selectedElement) return
  selectedElement.style.height = propHeight.value + "px"
  syncElementToStore(selectedElement)
})

propBg.addEventListener("input", () => {
  if (!selectedElement) return
  selectedElement.style.backgroundColor = propBg.value
  syncElementToStore(selectedElement)
})

propText.addEventListener("input", () => {
  if (!selectedElement) return
  selectedElement.textContent = propText.value
  syncElementToStore(selectedElement)
})

function rgbToHex(rgb) {
  const res = rgb.match(/\d+/g)
  if (!res) return "#000000"
  return (
    "#" +
    res
      .map(x => parseInt(x).toString(16).padStart(2, "0"))
      .join("")
  )
}


loadFromLocalStorage()


document.querySelector(".export-json").onclick = () => {
  const blob = new Blob(
    [JSON.stringify(elements, null, 2)],
    { type: "application/json" }
  )

  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = "design.json"
  a.click()
}

document.querySelector(".export-html").onclick = () => {
  let html = `
<div style="
  position:relative;
  width:4000px;
  height:4000px;
  bacground: azure;
">
`

  elements.forEach(el => {

    /* ===== RECTANGLE ===== */
    if (el.type === "rectangle") {
      html += `
<div style="
  position:absolute;
  left:${el.x}px;
  top:${el.y}px;
  width:${el.width}px;
  height:${el.height}px;
  background:${el.bg || "aquamarine"};
  transform:rotate(${el.rotation}deg);
"></div>
`
    }

    /* ===== TEXT ===== */
    if (el.type === "text") {
      html += `
<div style="
  position:absolute;
  left:${el.x}px;
  top:${el.y}px;
  background:${el.bg || "transparent"};
  color:${el.color || "#000"};
  font-weight:${el.fontWeight || "normal"};
  font-style:${el.fontStyle || "normal"};
  text-decoration:${el.textDecoration || "none"};
  transform:rotate(${el.rotation}deg);
">
${el.text || ""}
</div>
`
    }
  })

  html += "</div>"

  const blob = new Blob([html], { type: "text/html" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = "design.html"
  a.click()
}
