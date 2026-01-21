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

  el.classList.toggle("resize-mode", activeTool === "resize")
}

function clearSelection() {
  if (!selectedElement) return
  selectedElement.classList.remove("selected", "resize-mode")
  selectedElement = null
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
