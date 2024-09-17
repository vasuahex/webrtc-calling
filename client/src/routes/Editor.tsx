import React, { MouseEvent, useEffect } from 'react';
import { DesignElement } from '../interfaces/globalInterface';
import { ElementControls, ResizeContent } from '../reuse/ImediateShortCuts';

// Define the type for the props
interface EditorBoardProps {
    elements: DesignElement[];
    selectedElement: DesignElement | null;
    setSelectedElement: React.Dispatch<React.SetStateAction<DesignElement | null>>;
    editorRef: React.RefObject<HTMLDivElement>;
    setElements: React.Dispatch<React.SetStateAction<DesignElement[]>>;
}

const EditorBoard: React.FC<EditorBoardProps> = ({ elements, selectedElement, setSelectedElement, editorRef, setElements }) => {
    // Update element with new style properties
    const updateElement = (id: string, updates: Partial<DesignElement>) => {
        setElements((prevElements) =>
            prevElements.map((el) => (el.id === id ? { ...el, ...updates } : el))
        );
        if (selectedElement && selectedElement.id === id) {
            setSelectedElement({ ...selectedElement, ...updates });
        }
    };

    // Handle style changes (bold, italic, underline, text alignment)
    const handleStyleChange = (style: string, fontFamily?: any) => {
        if (!selectedElement) return;
        const updatedStyle = { ...selectedElement.style };

        switch (style) {
            case 'bold':
                updatedStyle.fontWeight = updatedStyle.fontWeight === 'bold' ? 'normal' : 'bold';
                break;
            case 'italic':
                updatedStyle.fontStyle = updatedStyle.fontStyle === 'italic' ? 'normal' : 'italic';
                break;
            case 'underline':
                updatedStyle.textDecoration = updatedStyle.textDecoration === 'underline' ? 'none' : 'underline';
                break;
            case 'alignLeft':
            case 'alignCenter':
            case 'alignRight':
            case 'justify':
                updatedStyle.textAlign = style.replace('align', '').toLowerCase() as 'left' | 'center' | 'right' | 'justify';
                break;
            case 'fontFamily':
                if (fontFamily) {
                    updatedStyle.fontFamily = fontFamily;
                }
                break;
            default:
                break;
        }
        updateElement(selectedElement.id, { style: updatedStyle });
    };

    // Handle mouse events for moving and resizing elements
    const handleMouseDown = (e: MouseEvent<HTMLDivElement>, element: DesignElement, action: string) => {
        e.stopPropagation();
        setSelectedElement(element);

        const startX = e.clientX;
        const startY = e.clientY;
        const startLeft = parseInt(element.style.left, 10);
        const startTop = parseInt(element.style.top, 10);
        const startWidth = parseInt(element.style.width, 10);
        const startHeight = parseInt(element.style.height, 10);
        const startRotation = parseInt(element.style.transform.replace('rotate(', '').replace('deg)', ''), 10) || 0;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            const newStyle = { ...element.style };

            switch (action) {
                case 'move':
                    newStyle.left = `${startLeft + dx}px`;
                    newStyle.top = `${startTop + dy}px`;
                    break;
                case 'resize-se':
                    newStyle.width = `${startWidth + dx}px`;
                    newStyle.height = `${startHeight + dy}px`;
                    break;
                case 'resize-sw':
                    newStyle.width = `${startWidth - dx}px`;
                    newStyle.height = `${startHeight + dy}px`;
                    newStyle.left = `${startLeft + dx}px`;
                    break;
                case 'resize-ne':
                    newStyle.width = `${startWidth + dx}px`;
                    newStyle.height = `${startHeight - dy}px`;
                    newStyle.top = `${startTop + dy}px`;
                    break;
                case 'resize-nw':
                    newStyle.width = `${startWidth - dx}px`;
                    newStyle.height = `${startHeight - dy}px`;
                    newStyle.left = `${startLeft + dx}px`;
                    newStyle.top = `${startTop + dy}px`;
                    break;
                case 'rotate':
                    const angle = Math.atan2(moveEvent.clientY - startY, moveEvent.clientX - startX) * (180 / Math.PI);
                    newStyle.transform = `rotate(${startRotation + angle}deg)`;
                    break;
                default:
                    break;
            }

            updateElement(element.id, { style: newStyle });
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove as any);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove as any);
        document.addEventListener('mouseup', handleMouseUp);
    };

    // Handle duplication of selected element
    const handleDuplicate = () => {
        if (selectedElement) {
            const newElement = {
                ...selectedElement,
                id: `element-${Date.now()}`,
                style: {
                    ...selectedElement.style,
                    left: `${parseInt(selectedElement.style.left, 10) + 20}px`,
                    top: `${parseInt(selectedElement.style.top, 10) + 20}px`,
                },
            };
            setElements((prev) => [...prev, newElement]);
            setSelectedElement(newElement);
        }
    };

    // Handle click outside to deselect elements
    const handleClickOutside = (event: Event) => {
        const mouseEvent = event;
        if (editorRef.current && !editorRef.current.contains(mouseEvent.target as Node)) {
            setSelectedElement(null);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [editorRef, setSelectedElement]);

    // Handle deletion of selected element
    const handleDelete = (element: DesignElement) => {
        setElements(elements.filter((el) => el.id !== element.id));
    };

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <section className="relative border-2 overflow-hidden shadow-md h-screen rounded-md p-1" ref={editorRef}>
                {elements.map((element) => (
                    <div
                        key={element.id}
                        style={element.style}
                        className={`absolute ${selectedElement?.id === element.id ? 'ring-2 ring-blue-500' : ''}`}
                        onMouseDown={(e) => handleMouseDown(e, element, 'move')}
                    >
                        {element.type === 'text' && (
                            <div
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => updateElement(element.id, { content: e.currentTarget.textContent || '' })}
                                className="outline-none w-full h-full overflow-hidden"
                                style={{
                                    fontSize: element.style.fontSize,
                                    fontWeight: element.style.fontWeight,
                                    fontStyle: element.style.fontStyle,
                                    textDecoration: element.style.textDecoration,
                                    textAlign: element.style.textAlign,
                                    fontFamily: element.style.fontFamily,
                                }}
                            >
                                {element.content}
                            </div>
                        )}
                        {selectedElement?.id === element.id && (
                            <>
                                <ElementControls handleDuplicate={handleDuplicate} handleStyleChange={handleStyleChange} onDelete={handleDelete} selectedElement={selectedElement} />
                                <ResizeContent onMouseDown={handleMouseDown} element={element} />
                            </>
                        )}
                    </div>
                ))}
            </section>
        </div>
    );
};

export default EditorBoard;
