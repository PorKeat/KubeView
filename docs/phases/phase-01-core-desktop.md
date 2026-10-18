# Phase 1: Core Desktop Application Specification

> **Phase Goal:** Establish the high-performance desktop application shell, window management, theme engine, navigation system, and persistent state using **Tauri 2**, **Next.js Static Export**, **Tailwind CSS 4**, and **shadcn/ui**.

---

## 1. Functional Scope

### 1.1 Desktop Windowing & Shell Architecture
- Universal desktop support for macOS (Apple Silicon + Intel), Windows 10/11, and Linux via **Tauri 2**.
- Custom frameless titlebar integrating native window controls, context indicator, and global search trigger.
- **Next.js Static Export (`output: 'export'`):** Bundles to static HTML/JS/CSS assets loaded directly into the Tauri webview with zero node runtime overhead.
- Multi-panel resizable layout using `react-resizable-panels`.
- Collapsible sidebar for cluster navigation: Workloads, Networking, Storage, Config, Access Control, Custom Resources, Settings.
- Tabbed workspace bar supporting multiple active resource views, close buttons, and tab pinning.
- Status bar displaying active context latency, K8s version, background tasks, and Sonner toast center.

### 1.2 Themes & Typography
- **Geist Font Family:** Geist Sans for crisp UI labels and Geist Mono for addresses, namespaces, YAML, and logs.
- **Dark-First Theme Tokens:**
  - Background: `#17191D`
  - Surface: `#22252B`
  - Hover: `#2C3038`
  - Subtle Borders: `#323741`
  - Accent / Brand: `#F08A42`
  - Healthy: `#38B879`
- Dynamic theme switching via `next-themes` with zero flash of unstyled content (FOUC).

### 1.3 Command Palette (`cmdk`) & Toast Notifications (`Sonner`)
- Global `Cmd+K` / `Ctrl+K` command palette built with `cmdk`.
- Instant action triggers:
  - Jump to resource (e.g. `Pods`, `Deployments`, `Ingresses`).
  - Switch cluster context or namespace.
  - Trigger global actions (`Open Terminal`, `Inspect Kubeconfig`, `Toggle Theme`).
- Clean toast notifications powered by `Sonner` for task progress, warnings, and errors.

### 1.4 State Persistence & Configuration
- Lightweight persistent store powered by `tauri-plugin-store`.
- Persists:
  - Last active cluster context and namespace.
  - Window geometry, maximized state, and splitter positions.
  - Sidebar collapsed/expanded state.
  - User preferences (editor font size, theme, refresh intervals).

---

## 2. Technical Stack & Dependencies

```json
{
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "shadcn-ui": "latest",
    "lucide-react": "^0.460.0",
    "motion": "^11.11.0",
    "cmdk": "^1.0.0",
    "sonner": "^1.7.0",
    "next-themes": "^0.4.0",
    "geist": "^1.3.0",
    "zustand": "^5.0.0",
    "react-resizable-panels": "^2.1.0"
  }
}
```

---

## 3. Acceptance Criteria & Quality Gates

1. **Cold Startup:** App boots to interactive state in under 800 milliseconds.
2. **Memory Footprint:** Idle memory consumption stays under 70 MB.
3. **State Integrity:** Quitting the application and relaunching restores the exact window dimensions, open tabs, and splitter positions.
4. **Keyboard Usability:** The application shell can be fully navigated, and views switched, without using a mouse.
