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
  // 注意：width 和 height 为只读属性，由内容自动计算得出，不可手动设置
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
4.  **自动布局**: 文本元素的宽高完全由内容决定（Auto-size）。编辑完成后，系统自动重新计算包围盒大小。
**取舍理由**: 虽然增加了坐标同步的复杂度，但这避免了在 Canvas 中从头实现一个文本编辑器的巨大成本，且用户体验最原生。

### 5.3 图片滤镜系统
利用 PixiJS 内置的 Filter 系统：
- **灰度**: `ColorMatrixFilter.grayscale()`
- **亮度**: `ColorMatrixFilter.brightness()`
- **模糊**: `BlurFilter`
**实现**: 在 `CanvasBoard.vue` 的渲染循环中，根据 `element.filters` 状态动态挂载/卸载 Filter 对象。

## 6. 持久化与剪贴板策略
**方案**: **LocalStorage + JSON 序列化**

### 6.1 数据持久化 (Session Recovery)
- **机制**: 利用 Pinia 的 `$subscribe` 监听全局状态变更。
- **存储**: 将 `elements` 数组序列化为 JSON 字符串，存储于 `localStorage` 的 `canvas-data` 键中。
- **恢复策略**: 应用启动时检测是否存在历史数据。若存在，弹出对话框询问用户：“恢复上次未保存的画布”还是“创建新画布”。
  - **恢复**: 反序列化数据，还原画布状态。
  - **新建**: 清空 `localStorage`，初始化空白画布。

### 6.2 剪贴板 (Clipboard)
- **持久化**: 复制操作将选中元素序列化存入 `localStorage` (`canvas-clipboard`)，支持跨页面刷新粘贴。
- **智能粘贴**:
  - **多重粘贴**: 维护 `pasteCount`，连续粘贴时自动增加偏移量 (20px)，形成层叠效果。
  - **鼠标跟随**: 粘贴内容自动定位到鼠标指针中心（若有鼠标位置上下文），提升交互体验。
  - **冲突处理**: 粘贴时为所有新元素生成全新 UUID。

## 7. 性能优化方案
- **渲染循环优化**: 仅在 Store 发生变化（`watch`）或视口变换时触发 `renderElements`，而非每帧重绘。
- **资源缓存**: 图片纹理使用 `Assets.cache` 进行缓存，避免重复网络请求。
- **图元剔除 (Culling)**: (规划中) 仅渲染视口范围内的元素，提升大规模场景下的性能。
- **批量更新**: 拖拽过程中直接操作 PixiJS 对象属性，仅在 `pointerup` 时提交 Store，减少 Vue 响应式开销（当前规模下直接更新 Store 性能已达标，保留此优化路径）。

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

### 8.4 多选与批量操作的复杂性
**问题描述**：
实现框选和多选拖拽时，如何高效管理多个元素的状态同步，以及如何处理“部分选中”后的点击行为（是取消其他选中还是保持选中）。
**解决方案**：
- **状态管理**: Store 中维护 `selectedElementIds` 数组。
- **框选实现**: 在 DOM 层绘制临时的 SVG/Div 选区框，计算与所有元素的 AABB (Axis-Aligned Bounding Box) 碰撞，动态更新临时选中集合。
- **批量拖拽**: 记录拖拽开始时所有选中元素的初始位置快照 (`Map<id, {x, y}>`)，在 `mousemove` 时统一应用 `dx, dy` 偏移量，确保所有元素同步移动。
- **Shift 键逻辑**: 按住 Shift 点击元素时，执行“异或”选择（已选变未选，未选变已选），且不清除当前其他选中项。
- **框选缩放限制**: 当框选区域极小（如点或线）时，视为无效操作，不触发移动或选中更新，防止误操作。

### 8.5 文本框尺寸与混合缩放
**问题描述**：
文本框的大小应由内容决定（Auto-size），不应允许用户手动调整宽高。但在多选（包含文本和形状）进行缩放时，逻辑变得复杂。
**解决方案**：
- **单选文本**: 禁用 Transformer 的缩放手柄，仅允许移动。
- **混合缩放**: 当同时选中形状和文本进行缩放时：
  - **形状**: 正常进行几何缩放。
  - **文本**: 保持原有字号和宽高不变，仅根据缩放中心调整其 `(x, y)` 坐标，确保其相对于组的位置正确。
- **编辑交互**: 文本编辑完成后点击空白处，自动触发“取消选中”逻辑，避免焦点滞留。

### 8.6 UI/UX 细节优化
**问题描述**：
工具栏遮挡画布、选中高亮遮挡边框颜色、字体过小等体验问题。
**解决方案**：
- **工具栏布局**: 将浮动工具栏固定在屏幕右上方，避免遮挡当前操作的图形。
- **动态内容**: 工具栏根据选中元素类型动态渲染内容，移除无效的空白区域。
- **高亮样式**: 选中框（Selection Box）与元素本身保留一定间距（Padding），或使用细线框，确保用户能清晰看到元素自身的边框颜色。
- **圆形缩放**: 修复圆形仅能横向缩放的 Bug，强制锁定纵横比或正确映射纵向拖拽增量。

---
*文档最后更新时间: 2025-12-09*
