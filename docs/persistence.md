# Data Persistence & Clipboard Strategy

## Overview
This application implements a robust data persistence strategy using the browser's `localStorage`. This ensures that the user's work is automatically saved and can be recovered after a page refresh. Additionally, the clipboard functionality (Copy/Paste) is also persisted, allowing users to copy an element, refresh the page, and then paste it.

## Implementation Details

### 1. Auto-Save (Data Persistence)
-   **Technology**: `localStorage`
-   **Key**: `canvas-data`
-   **Mechanism**:
    -   We utilize Pinia's `$subscribe` method to listen for any changes in the global state.
    -   Whenever a mutation occurs (e.g., adding an element, moving a shape, editing text), the entire `elements` array is serialized to JSON and saved to `localStorage`.
    -   **Recovery**: On application mount (`App.vue`), we check for the existence of `canvas-data` in `localStorage`. If found, we parse the JSON and hydrate the Pinia store, restoring the canvas to its previous state.

### 2. Persistent Clipboard
-   **Technology**: `localStorage`
-   **Key**: `canvas-clipboard`
-   **Mechanism**:
    -   **Copy (`Ctrl+C`)**: When the user triggers the copy command, the currently selected elements are serialized to JSON and stored in `localStorage` under the key `canvas-clipboard`. This allows the "clipboard" to survive a page reload, unlike a simple in-memory variable.
    -   **Paste (`Ctrl+V`)**: When the paste command is triggered, we read from `canvas-clipboard`.
    -   **Multi-Paste Support**: We maintain a `pasteCount` in the store. Each subsequent paste operation increases the offset (20px * count), allowing users to paste multiple times and see a cascading effect, rather than all copies stacking directly on top of each other. The count resets when a new Copy operation is performed.
    -   **Conflict Resolution**: To avoid ID collisions, new UUIDs are generated for every pasted element.
    -   **Visual Feedback**: Pasted elements are slightly offset from the original position to make them visible.

## Limitations & Trade-offs
-   **Storage Limit**: `localStorage` is typically limited to around 5MB per origin. Since we are storing images as Base64 Data URLs, adding multiple high-resolution images will quickly exhaust this limit.
-   **Performance**: Serializing the entire element tree on every change is efficient for hundreds of elements but may become a bottleneck with thousands of elements.

## Future Improvements
-   **IndexedDB**: For a production-ready application, we would migrate to `IndexedDB` (using a wrapper like `idb` or `localforage`). This would remove the 5MB limit and allow for storing large image blobs asynchronously without blocking the main thread.
-   **Debouncing**: Implementing a debounce function for the save operation would reduce the frequency of writes to storage during rapid interactions (like dragging).
