# Thinking Level Toggle

## Overview
Change thinking toggle from boolean to multi-level selector with null/low/medium/high states.

## Changes

### 1. inputStore.ts

**State change:**
```typescript
// Before
thinkingEnabled: boolean;

// After
thinking: null | 'low' | 'medium' | 'high';
```

**Toggle logic:**
```typescript
toggleThinking: () =>
  set((state) => ({
    thinking:
      state.thinking === null
        ? 'low'
        : state.thinking === 'low'
          ? 'medium'
          : state.thinking === 'medium'
            ? 'high'
            : null,
  })),
```

### 2. ChatInput.tsx

**Conditional rendering:**
- Only show thinking button when `thinking !== null`
- Display text label next to brain icon: "Low" / "Med" / "High"
- Style similar to planMode button (icon + label)

**Button structure:**
```tsx
{thinking && (
  <Tooltip>
    <TooltipTrigger
      render={
        <button
          type="button"
          onClick={() => toggleThinking()}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--brand-primary, #3b82f6)' }}
        >
          <HugeiconsIcon icon={BrainIcon} size={14} />
          <span className="font-medium capitalize">
            {thinking === 'medium' ? 'Med' : thinking}
          </span>
        </button>
      }
    />
    <TooltipPopup>Extended thinking: {thinking} (Ctrl+T to cycle)</TooltipPopup>
  </Tooltip>
)}
```

### 3. useInputState.ts / useInputHandlers.ts

No changes needed - they pass through `toggleThinking` from store.

## Interaction

| Action | Result |
|--------|--------|
| Click/Ctrl+T (from null) | Show button with "Low" |
| Click/Ctrl+T (from low) | Show "Med" |
| Click/Ctrl+T (from medium) | Show "High" |
| Click/Ctrl+T (from high) | Hide button (null) |

## Type Export

Add type export for consumers:
```typescript
export type ThinkingLevel = null | 'low' | 'medium' | 'high';
```
