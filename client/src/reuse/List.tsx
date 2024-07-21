
import React, { useState, useEffect, useRef } from 'react';
import { animated, useSprings } from 'react-spring';

const gutterPadding = 21;
const height = 110;

const clamp = (n: number, min: number, max: number) => Math.max(Math.min(n, max), min);

type State = {
  mouse: [number, number];
  delta: [number, number];
  lastPress: number | null;
  currentColumn: number | null;
  isPressed: boolean;
  order: number[][];
  isResizing: boolean;
};

const List: React.FC = () => {
  const [state, setState] = useState<State>({
    mouse: [0, 0],
    delta: [0, 0],
    lastPress: null,
    currentColumn: null,
    isPressed: false,
    order: [
      [0, 3, 6, 9],
      [1, 4, 7, 10],
      [2, 5, 8, 11]
    ],
    isResizing: false
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const getColumnWidth = (): number => containerRef.current ? (containerRef.current.clientWidth / state.order.length) - (gutterPadding / state.order.length) : 0;

  const calculateLayout = (order: number[][]): { [key: number]: [number, number] } => {
    const columnWidth = getColumnWidth();
    const layout: { [key: number]: [number, number] } = {};
    order.forEach((column, colIndex) => {
      column.forEach((item, rowIndex) => {
        layout[item] = [columnWidth * colIndex, height * rowIndex];
      });
    });
    return layout;
  };

  const reinsert = (array: number[][], colFrom: number, rowFrom: number, colTo: number, rowTo: number): number[][] => {
    const _array = array.map(col => [...col]);
    const val = _array[colFrom][rowFrom];
    _array[colFrom].splice(rowFrom, 1);
    _array[colTo] = _array[colTo] || [];
    _array[colTo].splice(rowTo, 0, val);
    return _array;
  };

  useEffect(() => {
    setWidth(getColumnWidth());
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [state.order]);

  const handleResize = (): void => {
    setState(prev => ({ ...prev, isResizing: true }));
    setWidth(getColumnWidth());
    setTimeout(() => setState(prev => ({ ...prev, isResizing: false })), 100);
  };

  const handleMouseDown = (key: number, currentColumn: number, [pressX, pressY]: [number, number], e: React.MouseEvent): void => {
    e.preventDefault();
    setState(prev => ({
      ...prev,
      lastPress: key,
      currentColumn,
      isPressed: true,
      delta: [e.pageX - pressX, e.pageY - pressY],
      mouse: [pressX, pressY],
    }));
  };

  const handleMouseMove = (e: globalThis.MouseEvent): void => {
    const { order, lastPress, currentColumn: colFrom, isPressed, delta: [dx, dy] } = state;
    if (isPressed && colFrom !== null && lastPress !== null) {
      const mouse: [number, number] = [e.pageX - dx, e.pageY - dy];
      const colTo = clamp(Math.floor((mouse[0] + (width / 2)) / width), 0, 2);
      const columnItems = order[colTo].length;
      const rowTo = clamp(Math.floor((mouse[1] + (height / 2)) / height), 0, columnItems);
      const rowFrom = order[colFrom].indexOf(lastPress);
      const newOrder = reinsert(order, colFrom, rowFrom, colTo, rowTo);
      setState(prev => ({
        ...prev,
        mouse,
        order: newOrder,
        currentColumn: colTo
      }));
    }
  };

  const handleMouseUp = (): void => {
    setState(prev => ({
      ...prev,
      isPressed: false,
      delta: [0, 0]
    }));
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove as EventListener);
    window.addEventListener('mouseup', handleMouseUp as EventListener);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove as EventListener);
      window.removeEventListener('mouseup', handleMouseUp as EventListener);
    };
  }, [state.isPressed]);

  const layout = calculateLayout(state.order);

  const springs = useSprings(
    state.order.flat().length,
    state.order.flat().map((item) => {
      const isActive = (item === state.lastPress && state.isPressed);
      let [x, y] = layout[item] || [0, 0];
      return {
        x: isActive ? state.mouse[0] : x,
        y: isActive ? state.mouse[1] : y,
        scale: isActive ? 1.1 : 1,
        zIndex: isActive ? 99 : 1,
        immediate: state.isResizing
      };
    })
  );

  return (
    <div ref={containerRef} className="items p-5" onMouseDown={(e) => e.preventDefault()}>
      {springs.map((props, index) => {
        const item = state.order.flat()[index];
        const isActive = (item === state.lastPress && state.isPressed);

        return (
          <animated.div
            key={item}
            onMouseDown={(e) => {
              const colIndex = state.order.findIndex(col => col.includes(item));
              handleMouseDown(item, colIndex, [props.x.get(), props.y.get()], e);
            }}
            className={`item absolute rounded shadow-md bg-gray-200 cursor-grab ${isActive ? 'bg-gray-300 cursor-grabbing' : ''}`}
            style={{
              width: `calc((100% / 3) - ${gutterPadding}px)`,
              height: '90px',
              transform: props.x.to((x) => `translate3d(${x}px, ${props.y.get()}px, 0)`),
              zIndex: props.zIndex,
              scale: props.scale
            }}
          >
            <div className="flex items-center justify-center h-full">
              Item {item + 1}
            </div>
          </animated.div>
        );
      })}
    </div>
  );
};

export default List;

