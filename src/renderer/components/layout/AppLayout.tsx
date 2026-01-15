import { useRef, useEffect, ReactNode } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import type { PanelImperativeHandle } from 'react-resizable-panels';
import { useStore } from '../../store';

/*
+------------------+--------------+---------+---------+---------------+
| Panel            | defaultSize  | minSize | maxSize | collapsedSize |
+------------------+--------------+---------+---------+---------------+
| AppLayoutSidebar | "20%"        | 250     | "30%"   | 48            |
| AppLayoutPrimary | "55%"        | "30%"   | -       | -             |
| AppLayoutSecond  | "25%"        | "15%"   | "35%"   | -             |
+------------------+--------------+---------+---------+---------------+
*/

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return <Group orientation="horizontal">{children}</Group>;
}

interface AppLayoutSidebarProps {
  children: ReactNode;
}

export function AppLayoutSidebar({ children }: AppLayoutSidebarProps) {
  const sidebarPanelRef = useRef<PanelImperativeHandle>(null);
  const sidebarCollapsed = useStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useStore((state) => state.setSidebarCollapsed);

  useEffect(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;

    if (sidebarCollapsed) {
      panel.collapse();
    } else {
      panel.expand();
    }
  }, [sidebarCollapsed]);

  const handleResize = () => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;

    const isCollapsed = panel.isCollapsed();
    if (isCollapsed !== sidebarCollapsed) {
      setSidebarCollapsed(isCollapsed);
    }
  };

  return (
    <>
      <Panel
        panelRef={sidebarPanelRef}
        defaultSize="20%"
        minSize={250}
        maxSize="30%"
        collapsedSize={48}
        collapsible
        onResize={handleResize}
      >
        {children}
      </Panel>

      <Separator className="w-px bg-(--border-subtle) outline-none origin-center transition-[transform,background-color,opacity] data-[separator=hover]:scale-x-[2] data-[separator=active]:scale-x-[2] data-[separator=hover]:bg-[#3b82f6] data-[separator=active]:bg-[#3b82f6] data-[separator=hover]:opacity-90 data-[separator=active]:opacity-100" />
    </>
  );
}

interface AppLayoutPrimaryPanelProps {
  children: ReactNode;
}

export function AppLayoutPrimaryPanel({
  children,
}: AppLayoutPrimaryPanelProps) {
  return (
    <Panel defaultSize="55%" minSize="30%">
      {children}
    </Panel>
  );
}

interface AppLayoutSecondaryPanelProps {
  children: ReactNode;
}

export function AppLayoutSecondaryPanel({
  children,
}: AppLayoutSecondaryPanelProps) {
  return (
    <>
      <Separator className="w-px bg-(--border-subtle) outline-none origin-center transition-[transform,background-color,opacity] data-[separator=hover]:scale-x-[2] data-[separator=active]:scale-x-[2] data-[separator=hover]:bg-[#3b82f6] data-[separator=active]:bg-[#3b82f6] data-[separator=hover]:opacity-90 data-[separator=active]:opacity-100" />

      <Panel defaultSize="25%" minSize="15%" maxSize="35%">
        {children}
      </Panel>
    </>
  );
}
