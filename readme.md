# 🎨 Figma Style Design Tool

A browser-based **Figma-inspired design editor** built using **pure HTML, CSS, and Vanilla JavaScript**, focusing on core editor concepts like selection, layers, properties, and persistence.

## 🚀 What You Can Do
- Create **rectangles** and **text elements**
- Select, drag, resize (4-corner), and rotate elements
- Edit properties via a dynamic **Properties Panel**
- Manage element order using a **Layers Panel**
- Style text: **Bold / Italic / Underline / Color**
- Background & text color editing
- Keyboard controls (Delete, Arrow keys, Escape)
- Auto-save design using **localStorage**
- Export designs as **JSON** or **HTML**

## 🖼 Preview
<img src="assets/screenshot.png" alt="Editor Preview" height="230"/>

## 🧩 Editor Architecture (Conceptual)
- DOM-based element rendering (no `<canvas>`)
- Central state management via a layout array
- Z-index driven visual layering
- Real-time UI ↔ data binding
- Persistent layout reconstruction on reload

## 💾 Persistence & Recovery
- Layout stored as a simple array of objects
- Each element saves:
  - Position
  - Size
  - Rotation
  - Colors & text styles
  - Layer order
- Refreshing the page restores the exact design state

## 📤 Export Options
- **JSON Export** → raw editor data (for storage or reuse)
- **HTML Export** → visual reproduction using inline styles

## 🎯 Why This Project Matters
- Demonstrates understanding of:
  - Interactive UI design
  - State synchronization
  - Editor-style workflows
  - DOM manipulation without libraries
- Inspired by real tools like **Figma / Canva**

## 🛠 Built With
HTML • CSS • JavaScript (No frameworks, No libraries)

---
