# 画布产品课程项目 (Canvas Product Project)

## 1. 项目简介
本项目是一个基于 Web 的轻量级画布产品（类似 Figma 或 Excalidraw 的简化版），旨在通过从零实现一个功能完备的图形编辑器，深入探索图形渲染、交互设计与状态管理等核心领域。

项目采用 **Vue 3 + TypeScript** 作为核心框架，使用 **PixiJS** 作为高性能 2D 渲染引擎，并通过 **Pinia** 进行全局状态管理。

## 2. 如何启动项目

### 环境要求
- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```
启动后访问: `http://localhost:5173` (默认端口)

### 构建生产版本
```bash
npm run build
```

## 3. 主要目录结构说明

```
src/
├── assets/              # 静态资源文件
├── components/          # Vue UI 组件
│   ├── CanvasBoard.vue  # 核心画布组件 (PixiJS 渲染容器)
│   ├── Toolbar.vue      # 顶部工具栏 & 属性设置栏
│   └── TextEditor.vue   # 富文本编辑器 (DOM Overlay)
├── composables/         # 组合式函数
│   └── useCanvasRenderer.ts # PixiJS 应用实例初始化逻辑
├── stores/              # Pinia 状态管理
│   └── canvasStore.ts   # 画布核心状态 (元素列表、视口变换、选中态)
├── types/               # TypeScript 类型定义
│   └── element.ts       # 画布元素数据模型 (Shape, Image, Text)
├── utils/               # 工具函数
│   └── coordinates.ts   # 坐标转换算法 (屏幕坐标 <-> 世界坐标)
├── App.vue              # 根组件
└── main.ts              # 入口文件
```

## 4. 已实现功能列表

### ✅ 必做功能 (P0)
- **基础图形渲染**：支持绘制矩形、圆形、圆角矩形、三角形。
- **无限画布交互**：
  - 鼠标滚轮缩放 (Zoom)。
  - 中键/空格拖拽平移 (Pan)。
- **元素操作**：
  - 点击选中元素。
  - 拖拽移动元素位置。
- **图片支持**：
  - 上传本地图片。
  - 异步加载渲染。
- **基础文本**：创建文本元素。

### ⭐ 进阶挑战 (Advanced)
- **富文本编辑器 (WYSIWYG)**：
  - 双击文本进入编辑模式 (DOM Overlay 方案)。
  - 支持混合样式：**加粗**、*斜体*、<u>下划线</u>、~~删除线~~。
  - 实时所见即所得编辑体验。
- **图片滤镜系统**：
  - 基于 WebGL 的实时滤镜。
  - 支持调节：灰度 (Grayscale)、模糊 (Blur)、亮度 (Brightness)。
- **交互体验优化**：
  - 智能光标样式。
  - 编辑时自动隐藏原图元 ("幽灵文本"修复)。
  - 选中与编辑状态的防冲突处理。

## 5. 小组分工
*本项目目前为个人独立完成。*
- **核心开发**: 负责架构设计、渲染引擎对接、交互逻辑实现及富文本编辑器开发。

## 6. 关键脚本说明

| 脚本命令 | 说明 |
| :--- | :--- |
| `npm run dev` | 启动本地开发服务器 (Vite)，支持热更新 (HMR)。 |
| `npm run build` | 执行 TypeScript 类型检查并构建生产环境代码 (输出至 `dist/`)。 |
| `npm run preview` | 在本地预览构建后的生产环境代码。 |
| `npm run type-check` | 仅运行 TypeScript 类型检查，不进行构建。 |

