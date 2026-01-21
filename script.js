/* ===================== DOM ===================== */

const main = document.querySelector("main")
const screen = document.querySelector(".screen")

const toolPanIcon = document.querySelector(".tool-pan")
const toolSelectIcon = document.querySelector(".tool-select")
const tools = document.querySelectorAll(".tool")

/* ===================== STATE ===================== */

let scale = 1
let activeTool = "select"

let selectedElement = null
let isDragging = false
let isPanning = false
let isDragDisabled = false

let startX = 0
let startY = 0
let startScrollLeft = 0
let startScrollTop = 0

/* ===================== ZOOM ===================== */

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

/* ===================== TOOL HANDLING ===================== */

function stopAllActions() {
  isDragging = false
  isPanning = false
  toolPanIcon.classList.remove("dragging")
}

function activatePanTool(tool) {
  tools.forEach(t => t.classList.remove("active"))
  tool.classList.add("active")
  activeTool = "pan"
  clearSelection()
  stopAllActions()
}

function deactivatePanTool(tool) {
  tool.classList.remove("active")
  activeTool = "select"
  stopAllActions()
}

function activateSelectTool(tool) {
  tools.forEach(t => t.classList.remove("active"))
  tool.classList.add("active")
  activeTool = "select"
  stopAllActions()
}

tools.forEach(tool => {
  tool.addEventListener("click", (e) => {
    e.stopPropagation()

    if (tool.classList.contains("tool-pan")) {
      activeTool === "pan"
        ? deactivatePanTool(tool)
        : activatePanTool(tool)
      return
    }

    activateSelectTool(tool)
  })
})

/* ===================== SELECTION ===================== */

function selectElement(el) {
  clearSelection()
  selectedElement = el
  el.classList.add("selected")
  toolSelectIcon.classList.add("active")
}

function clearSelection() {
  if (!selectedElement) return
  selectedElement.classList.remove("selected")
  selectedElement = null
  toolSelectIcon.classList.remove("active")
}

/* ===================== DRAG & PAN ===================== */

function startDrag(e) {
  isDragging = true
  startX = e.clientX
  startY = e.clientY
}

function startPan(e) {
  isPanning = true
  toolPanIcon.classList.add("dragging")

  startX = e.clientX
  startY = e.clientY
  startScrollLeft = main.scrollLeft
  startScrollTop = main.scrollTop
}

function handlePanMove(e) {
  const dx = e.clientX - startX
  const dy = e.clientY - startY

  main.scrollLeft = startScrollLeft - dx
  main.scrollTop = startScrollTop - dy
}

function handleDragMove(e) {
  const dx = (e.clientX - startX) / scale
  const dy = (e.clientY - startY) / scale

  selectedElement.style.left =
    selectedElement.offsetLeft + dx + "px"
  selectedElement.style.top =
    selectedElement.offsetTop + dy + "px"

  startX = e.clientX
  startY = e.clientY
}

/* ===================== EVENTS ===================== */

screen.addEventListener("mousedown", (e) => {

  // Rectangle selection (always)
  if (e.target.classList.contains("rectangle")) {
    selectElement(e.target)

    // Drag only when pan tool is active
    if (activeTool === "pan" && !isDragDisabled) {
      startDrag(e)
      toolPanIcon.classList.add("dragging")
    }
    return
  }

  // Canvas pan
  if (activeTool === "pan") {
    startPan(e)
    return
  }

  clearSelection()
})

window.addEventListener("mousemove", (e) => {
  if (activeTool === "pan" && isPanning) {
    handlePanMove(e)
    return
  }

  if (isDragging && selectedElement) {
    handleDragMove(e)
  }
})

window.addEventListener("mouseup", () => {
  isDragging = false
  isPanning = false
  toolPanIcon.classList.remove("dragging")
})

screen.addEventListener("dblclick", (e) => {
  if (!e.target.classList.contains("rectangle")) return
  isDragDisabled = !isDragDisabled
  e.target.style.cursor = isDragDisabled ? "default" : "move"
})

const blockWidth = 30
const blockHeight = 30
const blocks = {}

const cols = Math.floor(screen.clientWidth / blockWidth)
const rows = Math.floor(screen.clientHeight / blockHeight)

for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    const block = document.createElement("div")
    block.classList.add("block")
    screen.appendChild(block)
    blocks[`${row},${col}`] = block
  }
}
