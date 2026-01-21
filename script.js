/* =====================================================
   DOM REFERENCES
===================================================== */

const main = document.querySelector("main")
const screen = document.querySelector(".screen")

const toolPanIcon = document.querySelector(".tool-pan")
const toolSelectIcon = document.querySelector(".tool-select")
const toolRectangleIcon = document.querySelector(".tool-rectangle")
const toolResizeIcon = document.querySelector(".tool-resize")
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

/* =====================================================
   ZOOM LOGIC
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
  resizeHandle = null
  toolPanIcon.classList.remove("dragging")
  screen.style.cursor = "default"
}

function setActiveTool(name, icon) {
  tools.forEach(t => t.classList.remove("active"))
  if (icon) icon.classList.add("active")
  activeTool = name
  stopAllActions()
}

/* ---- Toolbar Buttons ---- */

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

  if (activeTool === "resize") {
    // turn resize OFF
    selectedElement.classList.remove("resize-mode")
    setActiveTool("select", toolSelectIcon)
  } else {
    // turn resize ON
    setActiveTool("resize", toolResizeIcon)
    selectedElement.classList.add("resize-mode")
  }
}


/* =====================================================
   SELECTION
===================================================== */

function addResizeHandles(el) {
  ["tl", "tr", "bl", "br"].forEach(pos => {
    const handle = document.createElement("div")
    handle.className = `resize-handle ${pos}`
    el.appendChild(handle)
  })
}

function selectElement(el) {
  clearSelection()
  selectedElement = el
  el.classList.add("selected")

  if (!el.querySelector(".resize-handle")) {
    addResizeHandles(el)
  }

  // show handles ONLY if resize tool is active
  if (activeTool === "resize") {
    el.classList.add("resize-mode")
  }
}

function clearSelection() {
  if (!selectedElement) return
  selectedElement.classList.remove("selected")
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

  let newLeft = selectedElement.offsetLeft + dx
  let newTop = selectedElement.offsetTop + dy

  /* Boundary restriction */
  newLeft = Math.max(0, Math.min(newLeft, screen.clientWidth - selectedElement.offsetWidth))
  newTop = Math.max(0, Math.min(newTop, screen.clientHeight - selectedElement.offsetHeight))

  selectedElement.style.left = newLeft + "px"
  selectedElement.style.top = newTop + "px"

  startX = e.clientX
  startY = e.clientY
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

  if (resizeHandle.includes("r")) w = startWidth + dx
  if (resizeHandle.includes("l")) { w = startWidth - dx; l = startLeft + dx }
  if (resizeHandle.includes("b")) h = startHeight + dy
  if (resizeHandle.includes("t")) { h = startHeight - dy; t = startTop + dy }

  w = Math.max(MIN_WIDTH, w)
  h = Math.max(MIN_HEIGHT, h)

  l = Math.max(0, l)
  t = Math.max(0, t)

  if (l + w > screen.clientWidth) w = screen.clientWidth - l
  if (t + h > screen.clientHeight) h = screen.clientHeight - t

  selectedElement.style.width = w + "px"
  selectedElement.style.height = h + "px"
  selectedElement.style.left = l + "px"
  selectedElement.style.top = t + "px"
}

/* =====================================================
   CURSOR UPDATE (Resize Tool Only)
===================================================== */

function updateResizeCursor(e) {
  if (activeTool !== "resize" || !selectedElement) {
    screen.style.cursor = "default"
    return
  }

  const rect = selectedElement.getBoundingClientRect()
  const gap = 10

  const nearL = Math.abs(e.clientX - rect.left) <= gap
  const nearR = Math.abs(e.clientX - rect.right) <= gap
  const nearT = Math.abs(e.clientY - rect.top) <= gap
  const nearB = Math.abs(e.clientY - rect.bottom) <= gap

  if ((nearL && nearT) || (nearR && nearB)) {
    screen.style.cursor = "nwse-resize"
  } else if ((nearR && nearT) || (nearL && nearB)) {
    screen.style.cursor = "nesw-resize"
  } else {
    screen.style.cursor = "default"
  }
}

/* =====================================================
   MOUSE EVENTS
===================================================== */

screen.addEventListener("mousedown", (e) => {

  /* CREATE RECTANGLE */
  if (activeTool === "rectangle") {
    const rect = document.createElement("div")
    rect.className = "rectangle"

    const canvas = screen.getBoundingClientRect()
    const x = (e.clientX - canvas.left + main.scrollLeft) / scale
    const y = (e.clientY - canvas.top + main.scrollTop) / scale

    rect.style.left = x - 200 + "px"
    rect.style.top = y - 125 + "px"

    screen.appendChild(rect)
    selectElement(rect)
    setActiveTool("select", toolSelectIcon)
    return
  }

  /* RESIZE HANDLE */
  if (activeTool === "resize" && e.target.classList.contains("resize-handle")) {
    startResize(e, e.target.classList[1])
    return
  }

  /* SELECT RECTANGLE */
  if (e.target.classList.contains("rectangle")) {
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

window.addEventListener("mousemove", (e) => {
  updateResizeCursor(e)

  if (isResizing) return handleResizeMove(e)
  if (isPanning) return handlePanMove(e)
  if (isDragging && selectedElement) handleDragMove(e)
})

window.addEventListener("mouseup", stopAllActions)

/* =====================================================
   DOUBLE CLICK → LOCK DRAG
===================================================== */

screen.addEventListener("dblclick", (e) => {
  if (!e.target.classList.contains("rectangle")) return
  isDragDisabled = !isDragDisabled
})

/* =====================================================
   GRID (UNCHANGED)
===================================================== */

const blockWidth = 30
const blockHeight = 30
const cols = Math.floor(screen.clientWidth / blockWidth)
const rows = Math.floor(screen.clientHeight / blockHeight)

for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    const block = document.createElement("div")
    block.classList.add("block")
    screen.appendChild(block)
  }
}
