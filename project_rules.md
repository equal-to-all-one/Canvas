# 画布产品开发指南与规范 (System Prompt)

## 1. 项目背景
我们要开发一个基于 Web 的简易画布产品（类似 Figma/Excalidraw 的简化版）。
这是一个教学考核项目，重点在于考察**原生逻辑实现**、**架构设计**以及**规范的编码习惯**。

## 2. 技术栈约束
*   **核心框架**: Vue 3 (Composition API) + TypeScript。
*   **构建工具**: Vite。
*   **状态管理**: Pinia。
*   **渲染引擎**: PixiJS (v7 或 v8)。
    *   *注意*: 仅使用 PixiJS 做基础图形绘制。
    *   *禁止*: 使用 konva, fabric.js, react-flow, tldraw 等封装好的图形库。
    *   *禁止*: 使用 PixiJS 的高级插件来自动处理交互（如 pixi-viewport），需手动实现视口逻辑以符合考核要求。
*   **样式**: SCSS (Scoped) 或 Tailwind CSS (优先使用标准 SCSS 以保持代码清晰)。

## 3. 代码生成规范 (重要)
作为 AI 助手，在生成代码时必须严格遵守以下规则：

1.  **显式优于隐式**:
    *   尽量减少过度的语法糖。
    *   TypeScript 类型必须定义明确，**严禁使用 `any`**。所有数据结构需有对应的 Interface 定义。
    *   Vue 组件中，`props` 和 `emits` 必须有类型定义。

2.  **注释要求**:
    *   **文件头注释**: 说明该文件的作用。
    *   **函数注释**: 关键业务逻辑函数需说明参数、返回值和功能逻辑。
    *   **复杂逻辑**: 在复杂的数学计算（如坐标转换、碰撞检测）处必须添加行级注释。

3.  **解耦与模块化**:
    *   **View (视图层)**: `components/` 目录下的 Vue 组件只负责 UI 展示和用户事件的转发，不处理核心业务逻辑。
    *   **Store (状态层)**: `stores/` 目录负责管理画布数据（Elements List）和状态（Selected, Zoom Level）。
    *   **Logic (逻辑层)**: 核心算法（如“判断点是否在矩形内”、“计算缩放后的坐标”）应抽离为纯 TypeScript 函数，放在 `utils/` 或 `composables/` 中。

4.  **错误处理**:
    *   关键操作需包含 try-catch 或空值检查（例如获取不到 Canvas 上下文时）。

## 4. 核心数据结构设计
我们在项目中统一使用以下数据结构，请在生成代码时以此为准：

typescript // types/element.ts
export type ElementType = 'rectangle' | 'circle' | 'text' | 'image';

export interface BaseElement {
id: string;
type: ElementType;
x: number; // 绝对坐标 x
y: number; // 绝对坐标 y
width: number;
height: number;
rotation: number; // 角度
isSelected: boolean; // 是否被选中（UI状态，可选，或由 Store 统一管理）
}

export interface ShapeStyle {
fillColor: string; // 十六进制，如 #FF0000
strokeColor: string;
strokeWidth: number;
opacity: number;
}

export interface TextStyle {
content: string;
fontSize: number;
fontFamily: string;
fontWeight: string;
color: string;
}

// 联合类型
export type CanvasElement = BaseElement & ShapeStyle & Partial & { src?: string };
## 5. 任务拆解与实现指引
当你协助我编写代码时，请参考以下实现思路：

### 5.1 无限画布实现
*   不要使用 CSS transform 缩放整个容器，这会导致模糊。
*   **方案**: 使用 PixiJS 的 `Container` 作为根舞台 (Stage)。
*   **缩放**: 修改 Stage 的 `scale.x` 和 `scale.y`。
*   **平移**: 修改 Stage 的 `position.x` 和 `position.y`。
*   **坐标转换**: 必须实现 `screenToWorld(screenX, screenY)` 和 `worldToScreen(worldX, worldY)` 两个工具函数。

### 5.2 选中与交互
*   不要依赖 DOM 事件冒泡来处理 Canvas 内部元素。
*   **方案**: 监听 Canvas 元素的 `pointerdown`。
*   **点击空白**: 监听 Stage 的 `pointerdown`，如果触发则清空选区。
*   **多选**: 按住 Shift 点击。

### 5.3 渲染循环
*   使用 `requestAnimationFrame` 或 Pixi 的 `app.ticker`。
*   **响应式**: 监听 Pinia Store 的 `elements` 变化。当数据变化时，更新 Pixi 舞台上的 Graphics/Sprite。
*   **优化**: 使用 `Map<id, PixiObject>` 来缓存已创建的图形实例，避免每帧销毁重建。

## 6. 输出格式要求
*   当你提供代码时，请先解释这段代码的**逻辑思路**。
*   代码块必须包含完整的文件路径（例如: `src/stores/canvasStore.ts`）。
*   如果修改了现有文件，请尽量提供完整代码，或者清晰标明修改的位置，不要使用 "...rest of code" 这种模糊的省略，除非文件非常大。

---
**准备好了吗？请确认你已理解以上规范。接下来的对话中，我将向你发布具体的开发指令。**