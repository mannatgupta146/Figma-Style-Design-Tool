const main = document.querySelector("main")
const screen = document.querySelector(".screen")
const box = document.querySelector(".h")

let scale = 1

function placeAtViewCenter() {
  const centerX = (main.clientWidth / 2) / scale
  const centerY = (main.clientHeight / 2) / scale

  box.style.left = `${centerX - box.offsetWidth / 2}px`
  box.style.top  = `${centerY - box.offsetHeight / 2}px`
}

function updateTransform() {
  screen.style.transform = `scale(${scale})`
  screen.style.transformOrigin = "0 0"
}

function zoomIn() {
  scale = Math.min(scale + 0.1, 2)
  updateTransform()
  placeAtViewCenter()
}

function zoomOut() {
  scale = Math.max(scale - 0.1, 0.4)
  updateTransform()
  placeAtViewCenter()
}

placeAtViewCenter()
