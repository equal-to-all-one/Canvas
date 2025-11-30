# 画布产品技术方案文档

## 1. 背景与目标
本项目旨在从零构建一个基于 Web 的轻量级画布产品（类似 Figma/Excalidraw 的简化版）。
**核心目标**：
- 实现高性能的 2D 图形渲染。
- 支持无限画布交互（缩放、平移）。
- 提供丰富的创作工具（图形、图片滤镜、富文本编辑）。
- 具备完整的数据持久化能力。

## 2. MVP 范围与需求拆解
### P0 核心功能 (MVP)
1.  **基础渲染**：支持矩形、圆形、三角形等基础图元的绘制与渲染。
2.  **交互系统**：
    - 画布层：无限拖拽平移、滚轮缩放。
    - 元素层：点击选中、拖拽移动。
3.  **图片能力**：支持图片上传、渲染，以及基础滤镜（灰度、模糊、亮度）。
4.  **文本能力**：支持文本创建、双击编辑、富文本样式（加粗/斜体/下划线/删除线）。
5.  **数据管理**：画布状态的保存与恢复。

### 进阶挑战
- [x] **富文本编辑器**：实现所见即所得 (WYSIWYG) 的文本编辑体验。
- [x] **图片滤镜系统**：基于 WebGL Shader 的实时图像处理。
- [ ] **性能优化**：针对大量图元的渲染优化（待办）。

## 3. 技术选型与架构设计

### 3.1 核心技术栈
| 模块 | 选型 | 决策理由 (Why?) |
| :--- | :--- | :--- |
| **前端框架** | **Vue 3 + TypeScript** | Composition API 极适合逻辑复用（如 `useCanvasRenderer`）；TS 提供严格的类型系统，保障复杂图形数据的稳定性。 |
| **渲染引擎** | **PixiJS (v8)** | 相比原生 Canvas API，PixiJS 提供了高性能的 WebGL 渲染管线、场景图管理和内置滤镜系统，能轻松处理数千个图元且保持 60FPS。 |
| **状态管理** | **Pinia** | 轻量且直观，适合管理画布的全局状态（元素列表、视口变换、选中态）。 |
| **构建工具** | **Vite** | 极速的开发服务器启动和热更新体验。 |

### 3.2 渲染方案决策：Canvas vs DOM
**最终选择：Canvas (PixiJS)**
- **Canvas 优势**：
  - **性能**：在处理大量图元（>1000）时，Canvas (WebGL) 的渲染性能远超 DOM。
  - **像素级控制**：便于实现复杂的图像滤镜（如高斯模糊、色彩矩阵），这在 DOM 中很难高效实现。
  - **一致性**：不受浏览器 CSS 差异影响，渲染结果高度一致。
- **DOM 劣势**：
  - DOM 节点过多会导致严重的重排重绘性能问题。
  - 复杂的几何变换（旋转、倾斜）在 DOM 中处理较为繁琐。

## 4. 核心数据结构设计

### 4.1 画布元素模型 (`CanvasElement`)
采用 **Discriminated Union (辨别联合类型)** 设计，确保类型安全与扩展性。

```typescript
// 统一元素类型
export type CanvasElement = ShapeElement | ImageElement | TextElement;

// 1. 基础图形
interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isSelected: boolean;
}

interface ShapeElement extends BaseElement {
  type: 'rectangle' | 'circle' | 'triangle' | 'rounded-rectangle';
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  borderRadius?: number; // 仅圆角矩形
}

// 2. 图片元素
interface ImageElement extends BaseElement {
  type: 'image';
  src: string; // Base64 或 URL
  filters: {
    grayscale: boolean;
    blur: number;
    brightness: number;
  };
}

// 3. 富文本元素
interface TextElement extends BaseElement {
  type: 'text';
  content: TextSpan[]; // 核心：支持多段混合样式
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
}

// 文本片段定义
interface TextSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}
```

### 4.2 画布状态 (`CanvasStore`)
```typescript
interface CanvasState {
  elements: CanvasElement[]; // 所有图元列表
  selectedElementIds: string[]; // 当前选中元素的 ID 集合
  zoom: number; // 画布缩放比例
  pan: { x: number; y: number }; // 画布平移偏移量
  activeTool: 'select' | 'rectangle' | 'text' | ...; // 当前激活工具
}
```

## 5. 关键流程与实现细节

### 5.1 坐标转换系统
为了实现无限画布，必须在 **屏幕坐标 (Screen)** 和 **世界坐标 (World)** 之间进行转换。
- **Screen -> World**: `(screenX - panX) / zoom`
- **World -> Screen**: `worldX * zoom + panX`
- **应用场景**: 鼠标点击命中检测、新元素创建位置计算、编辑器 Overlay 定位。

### 5.2 富文本编辑 (关键设计取舍)
**挑战**: PixiJS 的 `PIXI.Text` 不支持复杂的富文本编辑交互（光标移动、选区、输入法）。
**方案**: **DOM Overlay (覆盖层) 策略**
1.  **显示态**: 使用 PixiJS 渲染。将 `TextSpan[]` 解析为多个 `PIXI.Text` 对象水平排列，手动绘制下划线/删除线。
2.  **编辑态**:
    - 双击文本时，计算其在屏幕上的精确位置。
    - 在 Canvas 上方覆盖一个透明的 `contenteditable` DIV。
    - 将 `TextSpan[]` 转换为 HTML (`<b>`, `<i>` 等) 填入 DIV。
    - 用户在 DIV 中编辑，利用浏览器原生的光标和输入法能力。
3.  **保存态**: 失去焦点 (Blur) 时，解析 DIV 的 HTML 内容，反向转换为 `TextSpan[]` 数据结构，更新 Store 并触发 Canvas 重绘。
**取舍理由**: 虽然增加了坐标同步的复杂度，但这避免了在 Canvas 中从头实现一个文本编辑器的巨大成本，且用户体验最原生。

### 5.3 图片滤镜系统
利用 PixiJS 内置的 Filter 系统：
- **灰度**: `ColorMatrixFilter.grayscale()`
- **亮度**: `ColorMatrixFilter.brightness()`
- **模糊**: `BlurFilter`
**实现**: 在 `CanvasBoard.vue` 的渲染循环中，根据 `element.filters` 状态动态挂载/卸载 Filter 对象。

## 6. 持久化策略 (待实现)
**方案**: **LocalStorage + JSON 序列化**
- **保存时机**: 
  - 自动保存：监听 Store 变化，使用 `debounce` 防抖（如 1s）写入 LocalStorage。
  - 手动保存：提供“保存”按钮。
- **数据结构**: 将 `CanvasState` 序列化为 JSON 字符串存储。
- **恢复逻辑**: 应用初始化时读取 LocalStorage，若存在则解析并替换 Store 初始状态。
- **未来扩展**: 当数据量超过 5MB 时，迁移至 **IndexedDB**。

## 7. 性能优化方案
- **渲染循环优化**: 仅在 Store 发生变化（`watch`）或视口变换时触发 `renderElements`，而非每帧重绘。
- **资源缓存**: 图片纹理使用 `Assets.cache` 进行缓存，避免重复网络请求。
- **图元剔除 (Culling)**: (规划中) 仅渲染视口范围内的元素，提升大规模场景下的性能。

## 8. 遇到的问题与解决方案

### 8.1 PixiJS 图片加载与渲染不同步
**问题描述**：
在渲染图片元素时，如果纹理（Texture）尚未加载完成，PixiJS 会尝试渲染一个尺寸为 1x1 的空纹理，导致图片在初次加载时闪烁或无法显示。
**解决方案**：
- 引入 **异步预加载机制**：在 `renderElements` 循环中，先检查 `Assets.cache.has(src)`。
- 如果未缓存，则中断当前渲染，调用 `Assets.load(src)`。
- 待 Promise resolve 后，再次触发 `renderElements`。
- 这样确保了只有当纹理完全就绪时，才会执行 `new Sprite(texture)` 及后续的尺寸设置逻辑。

### 8.2 PixiJS 不支持富文本混合样式
**问题描述**：
`PIXI.Text` 仅支持单一的样式设置（如整个文本都是粗体），无法实现“一段文字中**部分加粗**、*部分斜体*”的效果，且不支持下划线和删除线。
**解决方案**：
- **分段渲染**：将文本数据模型设计为 `TextSpan[]` 数组。渲染时遍历数组，为每个 Span 创建独立的 `PIXI.Text` 对象。
- **手动布局**：维护一个 `currentX` 变量，计算每个 Span 的宽度并累加，实现水平排列。
- **自定义装饰线**：使用 `PIXI.Graphics` 手动绘制线条来实现下划线和删除线，线条颜色与文本颜色同步。

### 8.3 双击编辑与单击选中的冲突
**问题描述**：
用户双击文本框时，期望进入编辑模式。但双击操作包含两次单击，第一次单击会触发“选中元素”逻辑，第二次单击可能被 DOM 容器捕获并触发“取消选中”逻辑（如果点击了空白处），导致编辑器刚打开就关闭。
**解决方案**：
- **事件拦截**：在 PixiJS 的 `pointerdown` 事件中检测双击（`Date.now() - lastClick < 300`）。
- **阻止冒泡**：一旦确认为双击，立即调用 `e.originalEvent.stopPropagation()`，阻止事件传递给 DOM 层的画布容器。
- **状态锁**：在 DOM 层的点击处理函数中增加检查 `if (isEditingText.value) return;`，确保在编辑模式下，背景点击不会误触发“取消选中”逻辑。

---
*文档最后更新时间: 2025-12-01*
