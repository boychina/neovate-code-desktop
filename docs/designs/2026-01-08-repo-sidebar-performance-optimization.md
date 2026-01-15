# Repo Sidebar Performance Optimization

**Date:** 2026-01-08

## Context

The `RepoSidebar.tsx` component has two performance issues:
1. **onToggle performance** — The `toggleSidebar` function passed to the Header component causes unnecessary re-renders
2. **Slow animation** — The sidebar collapse/expand animation is sluggish due to expensive CSS transitions

## Discussion

### Animation Performance

**Problem:** The sidebar uses `transition-all duration-200` with width changes (`w-64` to `w-12`). This causes:
- `transition-all` transitions ALL CSS properties unnecessarily
- Width transitions trigger layout reflows (expensive CPU operation)

**Options Explored:**
1. `transition-[width]` only — Simple fix, least invasive, but still causes reflows
2. GPU-accelerated transform — Use `translateX` instead of width, smoother but requires layout restructuring
3. Remove animation entirely — Instant collapse/expand

**Decision:** GPU-accelerated transform approach selected for optimal smoothness.

### onToggle Re-render Issue

**Problem:** Every parent re-render creates new store selector references, potentially causing unnecessary Header re-renders.

**Decision:** Wrap `RepoSidebar.Header` and `RepoSidebar.Footer` with `React.memo()`.

### Layout Structure

**Options for GPU transform approach:**
- **(A)** Make sidebar `position: fixed` with transform animation, main content gets static margin
- **(B)** Keep flex layout but animate `margin-left` on main content (still causes reflow)
- **(C)** Use clip-path or opacity-based transition for perceived smoothness

**Decision:** Option A — Fixed positioning with transform animation.

## Approach

Replace the width-based animation with GPU-accelerated transforms:
- Sidebar remains at full width (`w-64`) always
- Use `transform: translateX(-208px)` to slide sidebar when collapsed (leaving 48px visible)
- Main content uses static margin that adjusts based on collapsed state
- Memoize sub-components to prevent unnecessary re-renders

## Architecture

### RepoSidebar.tsx Changes

1. **Positioning:** Change from flex-based width to `position: fixed`
   - `left: 0`, `top: 0`, `h-screen`, `z-10`
   - Fixed width `w-64` (256px)

2. **Animation:** Replace width transition with transform
   - Remove: `transition-all duration-200` with width changes
   - Add: `transition-transform duration-200`
   - Collapsed: `transform: translateX(-208px)` (256px - 48px = 208px shift)

3. **Memoization:**
   - Wrap `RepoSidebar.Header` with `React.memo()`
   - Wrap `RepoSidebar.Footer` with `React.memo()`

### MainLayout.tsx Changes

1. **Read collapsed state** from store via `useStore((state) => state.sidebarCollapsed)`

2. **Apply dynamic margin** to main content area:
   - Expanded: `ml-64` (256px)
   - Collapsed: `ml-12` (48px)

3. **Optional:** Add `transition-[margin]` for smooth content shift, or keep instant for no additional reflow

### Key Measurements

| State | Sidebar Width | Visible Width | Transform | Content Margin |
|-------|---------------|---------------|-----------|----------------|
| Expanded | 256px | 256px | `translateX(0)` | 256px |
| Collapsed | 256px | 48px | `translateX(-208px)` | 48px |
