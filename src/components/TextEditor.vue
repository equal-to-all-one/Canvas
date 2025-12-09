<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import type { TextElement, TextSpan } from '@/types/element';

const props = defineProps<{
  element: TextElement;
  visible: boolean;
  position: {
    top: number;
    left: number;
    width: number;
    height: number;
    fontSize: number;
    fontFamily: string;
    color: string;
  };
}>();

const emit = defineEmits<{
  (e: 'update', content: TextSpan[]): void;
  (e: 'close'): void;
}>();

const editorRef = ref<HTMLDivElement | null>(null);

const convertSpansToHtml = (spans: TextSpan[]): string => {
  return spans.map(span => {
    let html = span.text.replace(/\n/g, '<br>');
    if (span.bold) html = `<b>${html}</b>`;
    if (span.italic) html = `<i>${html}</i>`;
    if (span.underline) html = `<u>${html}</u>`;
    if (span.strikethrough) html = `<s>${html}</s>`;
    return html;
  }).join('');
};

const parseHtmlToSpans = (html: string): TextSpan[] => {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const spans: TextSpan[] = [];
  
  const traverse = (node: Node, currentStyle: Partial<TextSpan>) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) {
        spans.push({
          text: node.textContent,
          ...currentStyle
        });
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const newStyle = { ...currentStyle };
      
      if (element.tagName === 'BR') {
        spans.push({
          text: '\n',
          ...currentStyle
        });
      } else if (element.tagName === 'DIV' && spans.length > 0) {
         // DIV usually implies a new line in contenteditable
         // But we need to be careful not to double add if BR is used
         // For simple contenteditable, often it wraps lines in DIVs
         // Let's add a newline if it's not the first element
         spans.push({
            text: '\n',
            ...currentStyle
         });
      }

      if (element.tagName === 'B' || element.style.fontWeight === 'bold') newStyle.bold = true;
      if (element.tagName === 'I' || element.style.fontStyle === 'italic') newStyle.italic = true;
      if (element.tagName === 'U' || element.style.textDecoration.includes('underline')) newStyle.underline = true;
      if (element.tagName === 'S' || element.tagName === 'STRIKE' || element.style.textDecoration.includes('line-through')) newStyle.strikethrough = true;
      
      element.childNodes.forEach(child => traverse(child, newStyle));
    }
  };
  
  traverse(tempDiv, {});
  
  // Merge adjacent spans with same style
  const mergedSpans: TextSpan[] = [];
  spans.forEach(span => {
    if (mergedSpans.length > 0) {
      const last = mergedSpans[mergedSpans.length - 1];
      if (
        last &&
        last.bold === span.bold &&
        last.italic === span.italic &&
        last.underline === span.underline &&
        last.strikethrough === span.strikethrough
      ) {
        last.text += span.text;
        return;
      }
    }
    mergedSpans.push(span);
  });
  
  return mergedSpans;
};

const onBlur = () => {
  if (editorRef.value) {
    const newContent = parseHtmlToSpans(editorRef.value.innerHTML);
    emit('update', newContent);
    emit('close');
  }
};

const initEditor = () => {
  if (editorRef.value) {
    editorRef.value.innerHTML = convertSpansToHtml(props.element.content);
    nextTick(() => {
      if (!editorRef.value) return;
      
      editorRef.value.focus();
      
      // Select all content
      const range = document.createRange();
      range.selectNodeContents(editorRef.value);
      
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  }
};

onMounted(() => {
  initEditor();
});

watch(() => props.visible, (newVal) => {
  if (newVal) {
    initEditor();
  }
});

</script>

<template>
  <div
    v-if="visible"
    ref="editorRef"
    class="text-editor"
    contenteditable="true"
    @blur="onBlur"
    :style="{
      top: position.top + 'px',
      left: position.left + 'px',
      minWidth: position.width + 'px',
      minHeight: position.height + 'px',
      fontFamily: position.fontFamily,
      fontSize: position.fontSize + 'px',
      color: position.color,
      backgroundColor: element.backgroundColor === 'transparent' ? 'rgba(255,255,255,0.8)' : element.backgroundColor,
      transformOrigin: 'top left',
      transform: `rotate(${element.rotation}rad)`
    }"
  ></div>
</template>

<style scoped>
.text-editor {
  position: absolute;
  outline: none; /* Remove default focus outline */
  border: 1px dashed var(--color-primary); /* Custom border */
  z-index: 1000;
  white-space: pre;
  overflow: visible; /* Allow text to expand */
  line-height: 1.4; /* Increased for better cursor visibility */
  padding: 0;
  margin: 0;
  caret-color: var(--color-primary); /* Bright blue cursor for better visibility */
}
</style>
