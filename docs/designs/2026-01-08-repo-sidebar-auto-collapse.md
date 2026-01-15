# RepoSidebar Auto-Collapse on Small Window

**Date:** 2026-01-08

## Context
The RepoSidebar takes up significant horizontal space (256px). On smaller screens or when the user resizes the window to be narrow, the sidebar can consume too much space, hindering the main content area usability.

## Discussion
Key requirements discussed:
- Auto-collapse the sidebar when window width becomes small
- Do NOT auto-expand when window becomes large again (respects user's manual collapse/expand preference)
- Breakpoint options considered: 640px, 768px, 1024px
- **Decision:** Use 768px as the threshold (standard tablet breakpoint)

## Approach
Add a `useEffect` hook in the `RepoSidebar` component that:
1. Listens to `window.resize` events
2. When `window.innerWidth < 768` AND sidebar is currently expanded, collapse it
3. When window becomes larger, do nothing (preserves user preference)
4. Properly cleans up event listener on unmount

## Architecture

### Component: `RepoSidebar.tsx`

**Changes:**
- Import `useEffect` from React
- Add resize event listener in `useEffect`
- Dependencies: `[sidebarCollapsed, toggleSidebar]` to ensure fresh state

**Implementation:**
```tsx
useEffect(() => {
  const handleResize = () => {
    if (window.innerWidth < 768 && !sidebarCollapsed) {
      toggleSidebar();
    }
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [sidebarCollapsed, toggleSidebar]);
```

**Notes:**
- No debouncing/throttling added initially for simplicity; can be added if performance issues arise
- The collapse is one-way (only collapses, never auto-expands)
- Uses existing `toggleSidebar` action from Zustand store
