/**
 * react-grid-layout 타입 선언
 */
declare module 'react-grid-layout' {
  import * as React from 'react';

  export interface Layout {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
  }

  export interface GridLayoutProps {
    className?: string;
    style?: React.CSSProperties;
    width?: number;
    autoSize?: boolean;
    cols?: number;
    draggableCancel?: string;
    draggableHandle?: string;
    compactType?: 'vertical' | 'horizontal' | null;
    layout?: Layout[];
    margin?: [number, number];
    containerPadding?: [number, number] | null;
    rowHeight?: number;
    maxRows?: number;
    isBounded?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    isDroppable?: boolean;
    preventCollision?: boolean;
    useCSSTransforms?: boolean;
    transformScale?: number;
    droppingItem?: Partial<Layout>;
    resizeHandles?: Array<'s' | 'w' | 'e' | 'n' | 'sw' | 'nw' | 'se' | 'ne'>;
    onLayoutChange?: (layout: Layout[]) => void;
    onDragStart?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      event: MouseEvent,
      element: HTMLElement
    ) => void;
    onDrag?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      event: MouseEvent,
      element: HTMLElement
    ) => void;
    onDragStop?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      event: MouseEvent,
      element: HTMLElement
    ) => void;
    onResizeStart?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      event: MouseEvent,
      element: HTMLElement
    ) => void;
    onResize?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      event: MouseEvent,
      element: HTMLElement
    ) => void;
    onResizeStop?: (
      layout: Layout[],
      oldItem: Layout,
      newItem: Layout,
      placeholder: Layout,
      event: MouseEvent,
      element: HTMLElement
    ) => void;
    onDrop?: (layout: Layout[], item: Layout, e: Event) => void;
    children?: React.ReactNode;
  }

  export default class GridLayout extends React.Component<GridLayoutProps> {}

  export class Responsive extends React.Component<GridLayoutProps & {
    breakpoints?: { [key: string]: number };
    cols?: { [key: string]: number };
    layouts?: { [key: string]: Layout[] };
    onBreakpointChange?: (newBreakpoint: string, newCols: number) => void;
    onLayoutChange?: (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => void;
    onWidthChange?: (containerWidth: number, margin: [number, number], cols: number, containerPadding: [number, number] | null) => void;
  }> {}

  export function WidthProvider<P extends object>(
    ComposedComponent: React.ComponentType<P>
  ): React.ComponentType<Omit<P, 'width'>>;
}
