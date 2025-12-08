# 系统架构与设计构思

本文档阐述了 Canvas 项目的核心架构决策与设计理念。

## 1. 技术选型

### 1.1 核心框架: Vue 3 + TypeScript
-   **Vue 3 (Composition API)**: 提供灵活的逻辑复用机制 (`composables`)，适合处理复杂的画布交互逻辑。
-   **TypeScript**: 强类型系统确保了 `CanvasElement` 等核心数据结构的严谨性，极大降低了运行时错误。

### 1.2 状态管理: Pinia
-   **单一数据源**: 所有的画布元素数据 (`elements`)、选中状态 (`selectedElementIds`)、视口状态 (`zoom`, `pan`) 均存储在 Pinia Store 中。
-   **响应式驱动**: 视图层 (CanvasBoard) 并不直接管理数据，而是通过监听 Store 的变化来驱动 PixiJS 的重绘。

### 1.3 渲染引擎: PixiJS
-   **高性能**: 基于 WebGL，能够轻松处理成百上千个图形元素的渲染，满足 P0 级性能需求。
-   **场景图 (Scene Graph)**: PixiJS 的 `Container` 和 `DisplayObject` 体系天然契合画布的分层管理需求。
-   **限制**: 我们刻意避免使用 `fabric.js` 或 `konva` 等高级封装库，而是直接操作 PixiJS。这意味着视口变换、点击检测等逻辑需要手动实现，从而获得对底层行为的完全控制权。

---

## 2. 核心设计模式

### 2.1 数据驱动渲染 (Data-Driven Rendering)
-   **原则**: UI 是状态的函数 (`UI = f(State)`).
-   **实现**: `CanvasBoard.vue` 监听 `canvasStore.elements` 的变化。一旦数据改变，立即清空 PixiJS Stage 并根据最新数据重新构建场景。
-   **优势**: 逻辑清晰，避免了 DOM 操作与数据状态不同步的问题。

### 2.2 坐标系统分离
-   **屏幕坐标 (Screen Coordinates)**: 鼠标事件 (`clientX`, `clientY`) 产生的原始坐标。
-   **世界坐标 (World Coordinates)**: 画布内部的逻辑坐标，受缩放 (`zoom`) 和平移 (`pan`) 影响。
-   **转换**: 通过 `screenToWorld` 和 `worldToScreen` 工具函数进行双向转换，确保交互逻辑（如拖拽、缩放）在任意视口状态下均准确无误。

### 2.3 交互分层
-   **DOM 层**: 处理 UI 控件（如浮动工具栏、文本编辑器），利用 HTML/CSS 的优势处理复杂的表单交互。
-   **Canvas 层**: 处理图形绘制和高性能交互（如拖拽、框选）。
-   **事件层**: 全局监听 `keydown` (快捷键) 和 `mousemove` (拖拽)，统一分发处理。

---

## 3. 目录结构说明

```
src/
├── components/         # Vue 组件 (UI 展示)
│   ├── CanvasBoard.vue # 核心画布组件，集成 PixiJS
│   ├── Toolbar.vue     # 底部固定工具栏
│   ├── FloatingToolbar.vue # 上下文浮动工具栏
│   └── ...
├── stores/            # Pinia 状态管理
│   └── canvasStore.ts # 核心 Store，包含所有业务逻辑
├── types/             # TypeScript 类型定义
│   └── element.ts     # 定义 CanvasElement 及其子类型
├── utils/             # 工具函数
│   └── coordinates.ts # 坐标转换逻辑
└── composables/       # 组合式函数
    └── useCanvasRenderer.ts # 封装 PixiJS 初始化逻辑
```
