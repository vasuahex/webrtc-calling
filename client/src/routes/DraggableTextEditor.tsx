

import React, { useState, useRef, MouseEvent, useEffect } from 'react';
import { FaPlus, FaTrash, FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaRedo, FaCopy, FaAlignJustify } from 'react-icons/fa';

interface ElementStyle {
    position: 'absolute';
    left: string;
    top: string;
    width: string;
    height: string;
    fontSize: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline';
    textAlign: 'left' | 'center' | 'right' | 'justify';
    transform: string;
}

interface DesignElement {
    id: string;
    type: 'text';
    content: string;
    style: ElementStyle;
}

const DesignEditor: React.FC = () => {
    const [elements, setElements] = useState<DesignElement[]>([]);
    const [selectedElement, setSelectedElement] = useState<DesignElement | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    const addElement = (type: 'text') => {
        const randomNumber = Math.floor(Math.random() * (400 - 50 + 1)) + 50;
        console.log(randomNumber);
        const newElement: DesignElement = {
            id: `element-${Date.now()}`,
            type,
            content: type === 'text' ? 'New Text' : '',
            style: {
                position: 'absolute',
                left: `${randomNumber}px`,
                top: `${randomNumber}px`,
                width: '200px',
                height: '50px',
                fontSize: '16px',
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'left',
                transform: 'rotate(0deg)',
            },
        };
        setElements((prev) => [...prev, newElement]);
        setSelectedElement(newElement);
    };

    const updateElement = (id: string, updates: Partial<DesignElement>) => {
        setElements((prevElements) =>
            prevElements.map((el) => (el.id === id ? { ...el, ...updates } : el))
        );
        if (selectedElement && selectedElement.id === id) {
            setSelectedElement({ ...selectedElement, ...updates });
        }
    };

    const handleStyleChange = (style: string) => {
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
            // updatedStyle.textAlign = style.replace('align', '').toLowerCase() as 'left' | 'center' | 'right';
            // break;
            default:
                break;
        }
        updateElement(selectedElement.id, { style: updatedStyle });
    };

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

    const handleClickOutside = (event: Event) => {
        const mouseEvent = event; // Cast the generic event to MouseEvent
        if (editorRef.current && !editorRef.current.contains(mouseEvent.target as Node)) {
            setSelectedElement(null);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="relative w-full h-screen bg-gray-100" ref={editorRef}>
            <div className="absolute top-4 left-4 flex space-x-2 bg-white p-2 rounded shadow">
                <button onClick={() => addElement('text')} className="p-2 hover:bg-gray-100 rounded">
                    <FaPlus />
                </button>

            </div>

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
                            }}
                        >
                            {element.content}
                        </div>
                    )}
                    {selectedElement?.id === element.id && (
                        <>
                            {selectedElement && (
                                <div className='absolute -top-14 flex space-x-2 bg-white p-2 rounded shadow'>
                                    <button onClick={() => handleStyleChange('bold')} className="p-2 hover:bg-gray-100 rounded">
                                        <FaBold />
                                    </button>
                                    <button onClick={() => handleStyleChange('italic')} className="p-2 hover:bg-gray-100 rounded">
                                        <FaItalic />
                                    </button>
                                    <button onClick={() => handleStyleChange('underline')} className="p-2 hover:bg-gray-100 rounded">
                                        <FaUnderline />
                                    </button>
                                    <button onClick={() => handleStyleChange('alignLeft')} className="p-2 hover:bg-gray-100 rounded">
                                        <FaAlignLeft />
                                    </button>
                                    <button onClick={() => handleStyleChange('alignCenter')} className="p-2 hover:bg-gray-100 rounded">
                                        <FaAlignCenter />
                                    </button>
                                    <button onClick={() => handleStyleChange('alignRight')} className="p-2 hover:bg-gray-100 rounded">
                                        <FaAlignRight />
                                    </button>
                                    <button onClick={() => handleStyleChange('justify')} className="p-2 hover:bg-gray-100 rounded">
                                        <FaAlignJustify />
                                    </button>
                                    <button onClick={handleDuplicate} className="p-2 hover:bg-gray-100 rounded">
                                        <FaCopy />
                                    </button>
                                    <button
                                        onClick={() => setElements(elements.filter((el) => el.id !== selectedElement.id))}
                                        className="p-2 hover:bg-gray-100 rounded"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            )}
                            {/* Resize corners */}
                            <div
                                className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -top-1.5 -left-1.5 cursor-nw-resize"
                                onMouseDown={(e) => handleMouseDown(e, element, 'resize-nw')}
                            />
                            <div
                                className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -top-1.5 -right-1.5 cursor-ne-resize"
                                onMouseDown={(e) => handleMouseDown(e, element, 'resize-ne')}
                            />
                            <div
                                className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -bottom-1.5 -left-1.5 cursor-sw-resize"
                                onMouseDown={(e) => handleMouseDown(e, element, 'resize-sw')}
                            />
                            <div
                                className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full -bottom-1.5 -right-1.5 cursor-se-resize"
                                onMouseDown={(e) => handleMouseDown(e, element, 'resize-se')}
                            />
                            {/* Rotation handle */}
                            <div
                                className="absolute w-4 h-4 bg-white border-2  rounded-full -bottom-10 right-1/2 cursor-move"
                                onMouseDown={(e) => handleMouseDown(e, element, 'rotate')}
                            >
                                <FaRedo className="text-xs text-blue-500" />
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
};

export default DesignEditor;



// import { FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaAlignJustify, FaCopy, FaTrash, FaPlus } from 'react-icons/fa';
// import React, { useState, useRef, useEffect, MouseEvent } from 'react';
// import { FaRedo } from 'react-icons/fa';

// const DesignEditor: React.FC = () => {
//     const [elements, setElements] = useState<DesignElement[]>([]);
//     const [selectedElement, setSelectedElement] = useState<DesignElement | null>(null);
//     const editorRef = useRef<HTMLDivElement>(null);

//     const addElement = (type: 'text') => {
//         const randomNumber = Math.floor(Math.random() * (400 - 50 + 1)) + 50;
//         console.log(randomNumber);
//         const newElement: DesignElement = {
//             id: `element-${Date.now()}`,
//             type,
//             content: type === 'text' ? 'New Text' : '',
//             style: {
//                 position: 'absolute',
//                 left: `${randomNumber}px`,
//                 top: `${randomNumber}px`,
//                 width: '200px',
//                 height: '50px',
//                 fontSize: '16px',
//                 fontWeight: 'normal',
//                 fontStyle: 'normal',
//                 textDecoration: 'none',
//                 textAlign: 'left',
//                 transform: 'rotate(0deg)',
//             },
//         };
//         setElements((prev) => [...prev, newElement]);
//         setSelectedElement(newElement);
//     };

//     const updateElement = (id: string, updates: Partial<DesignElement>) => {
//         setElements((prevElements) =>
//             prevElements.map((el) => (el.id === id ? { ...el, ...updates } : el))
//         );
//         if (selectedElement && selectedElement.id === id) {
//             setSelectedElement({ ...selectedElement, ...updates });
//         }
//     };

//     const handleMouseDown = (e: MouseEvent<HTMLDivElement>, element: DesignElement, action: string) => {
//         e.stopPropagation();
//         setSelectedElement(element);

//         const startX = e.clientX;
//         const startY = e.clientY;
//         const startLeft = parseInt(element.style.left, 10);
//         const startTop = parseInt(element.style.top, 10);
//         const startWidth = parseInt(element.style.width, 10);
//         const startHeight = parseInt(element.style.height, 10);
//         const startRotation = parseInt(element.style.transform.replace('rotate(', '').replace('deg)', ''), 10) || 0;

//         const handleMouseMove = (moveEvent: MouseEvent) => {
//             const dx = moveEvent.clientX - startX;
//             const dy = moveEvent.clientY - startY;
//             const newStyle = { ...element.style };

//             switch (action) {
//                 case 'move':
//                     newStyle.left = `${startLeft + dx}px`;
//                     newStyle.top = `${startTop + dy}px`;
//                     break;
//                 case 'resize-se':
//                     newStyle.width = `${startWidth + dx}px`;
//                     newStyle.height = `${startHeight + dy}px`;
//                     break;
//                 case 'resize-sw':
//                     newStyle.width = `${startWidth - dx}px`;
//                     newStyle.height = `${startHeight + dy}px`;
//                     newStyle.left = `${startLeft + dx}px`;
//                     break;
//                 case 'resize-ne':
//                     newStyle.width = `${startWidth + dx}px`;
//                     newStyle.height = `${startHeight - dy}px`;
//                     newStyle.top = `${startTop + dy}px`;
//                     break;
//                 case 'resize-nw':
//                     newStyle.width = `${startWidth - dx}px`;
//                     newStyle.height = `${startHeight - dy}px`;
//                     newStyle.left = `${startLeft + dx}px`;
//                     newStyle.top = `${startTop + dy}px`;
//                     break;
//                 case 'rotate':
//                     const angle = Math.atan2(moveEvent.clientY - startY, moveEvent.clientX - startX) * (180 / Math.PI);
//                     newStyle.transform = `rotate(${startRotation + angle}deg)`;
//                     break;
//                 default:
//                     break;
//             }

//             updateElement(element.id, { style: newStyle });
//         };

//         const handleMouseUp = () => {
//             document.removeEventListener('mousemove', handleMouseMove as any);
//             document.removeEventListener('mouseup', handleMouseUp);
//         };

//         document.addEventListener('mousemove', handleMouseMove as any);
//         document.addEventListener('mouseup', handleMouseUp);
//     };


//     const handleStyleChange = (style: string) => {
//         if (!selectedElement) return;
//         const updatedStyle = { ...selectedElement.style };

//         switch (style) {
//             case 'bold':
//                 updatedStyle.fontWeight = updatedStyle.fontWeight === 'bold' ? 'normal' : 'bold';
//                 break;
//             case 'italic':
//                 updatedStyle.fontStyle = updatedStyle.fontStyle === 'italic' ? 'normal' : 'italic';
//                 break;
//             case 'underline':
//                 updatedStyle.textDecoration = updatedStyle.textDecoration === 'underline' ? 'none' : 'underline';
//                 break;
//             case 'alignLeft':
//             case 'alignCenter':
//             case 'alignRight':
//             case 'justify':
//                 updatedStyle.textAlign = style.replace('align', '').toLowerCase() as 'left' | 'center' | 'right' | 'justify';
//                 break;
//             default:
//                 break;
//         }
//         updateElement(selectedElement.id, { style: updatedStyle });
//     };
//     const handleDuplicate = () => {
//         if (selectedElement) {
//             const newElement = {
//                 ...selectedElement,
//                 id: `element-${Date.now()}`,
//                 style: {
//                     ...selectedElement.style,
//                     left: `${parseInt(selectedElement.style.left, 10) + 20}px`,
//                     top: `${parseInt(selectedElement.style.top, 10) + 20}px`,
//                 },
//             };
//             setElements((prev) => [...prev, newElement]);
//             setSelectedElement(newElement);
//         }
//     };
//     const handleClickOutside = (event: Event) => {
//         const mouseEvent = event; // Cast the generic event to MouseEvent
//         if (editorRef.current && !editorRef.current.contains(mouseEvent.target as Node)) {
//             setSelectedElement(null);
//         }
//     };

//     useEffect(() => {
//         document.addEventListener('mousedown', handleClickOutside);
//         return () => {
//             document.removeEventListener('mousedown', handleClickOutside);
//         };
//     }, []);


//     return (
//         <div className="relative w-full h-screen bg-gray-100" ref={editorRef}>
//             <div className="absolute top-4 left-4 flex space-x-2 bg-white p-2 rounded shadow">
//                 <button onClick={() => addElement('text')} className="p-2 hover:bg-gray-100 rounded">
//                     <FaPlus />
//                 </button>
//             </div>

//             {elements.map((element) => (
//                 <DesignElement
//                     key={element.id}
//                     element={element}
//                     isSelected={selectedElement?.id === element.id}
//                     onSelect={() => setSelectedElement(element)}
//                     onUpdate={updateElement}
//                     onMouseDown={(e, action) => handleMouseDown(e, element, action)}
//                 />
//             ))}

//             {selectedElement && (
//                 <ElementControls
//                     selectedElement={selectedElement}
//                     onStyleChange={(style) => handleStyleChange(style)}
//                     onDuplicate={handleDuplicate}
//                     onDelete={() => setElements(elements.filter((el) => el.id !== selectedElement.id))}
//                 />
//             )}
//         </div>
//     );
// };

// export default DesignEditor;




// interface DesignElementProps {
//     element: DesignElement;
//     isSelected: boolean;
//     onSelect: () => void;
//     onUpdate: (id: string, updates: Partial<DesignElement>) => void;
//     onMouseDown: (e: MouseEvent<HTMLDivElement>, action: string) => void;
// }

// const DesignElement: React.FC<DesignElementProps> = ({ element, isSelected, onSelect, onUpdate, onMouseDown }) => (
//     <div
//         style={element.style}
//         className={`absolute ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
//         onMouseDown={(e) => onMouseDown(e, 'move')}
//         onClick={onSelect}
//     >
//         {element.type === 'text' && (
//             <div
//                 contentEditable
//                 suppressContentEditableWarning
//                 onBlur={(e) => onUpdate(element.id, { content: e.currentTarget.textContent || '' })}
//                 className="outline-none w-full h-full overflow-hidden"
//                 style={{
//                     fontSize: element.style.fontSize,
//                     fontWeight: element.style.fontWeight,
//                     fontStyle: element.style.fontStyle,
//                     textDecoration: element.style.textDecoration,
//                     textAlign: element.style.textAlign,
//                 }}
//             >
//                 {element.content}
//             </div>
//         )}
//         {isSelected && (
//             <>
//                 <ResizeHandle position="nw" onMouseDown={(e) => onMouseDown(e, 'resize-nw')} />
//                 <ResizeHandle position="ne" onMouseDown={(e) => onMouseDown(e, 'resize-ne')} />
//                 <ResizeHandle position="sw" onMouseDown={(e) => onMouseDown(e, 'resize-sw')} />
//                 <ResizeHandle position="se" onMouseDown={(e) => onMouseDown(e, 'resize-se')} />
//                 <RotationHandle onMouseDown={(e) => onMouseDown(e, 'rotate')} />
//             </>
//         )}
//     </div>
// );



// interface ElementControlsProps {
//     selectedElement: DesignElement;
//     onStyleChange: (style: string) => void;
//     onDuplicate: () => void;
//     onDelete: () => void;
// }

// const ElementControls: React.FC<ElementControlsProps> = ({ selectedElement, onStyleChange, onDuplicate, onDelete }) => (
//     <div className='absolute -top-14 flex space-x-2 bg-white p-2 rounded shadow'>
//         <button onClick={() => onStyleChange('bold')} className="p-2 hover:bg-gray-100 rounded">
//             <FaBold />
//         </button>
//         <button onClick={() => onStyleChange('italic')} className="p-2 hover:bg-gray-100 rounded">
//             <FaItalic />
//         </button>
//         <button onClick={() => onStyleChange('underline')} className="p-2 hover:bg-gray-100 rounded">
//             <FaUnderline />
//         </button>
//         <button onClick={() => onStyleChange('alignLeft')} className="p-2 hover:bg-gray-100 rounded">
//             <FaAlignLeft />
//         </button>
//         <button onClick={() => onStyleChange('alignCenter')} className="p-2 hover:bg-gray-100 rounded">
//             <FaAlignCenter />
//         </button>
//         <button onClick={() => onStyleChange('alignRight')} className="p-2 hover:bg-gray-100 rounded">
//             <FaAlignRight />
//         </button>
//         <button onClick={() => onStyleChange('justify')} className="p-2 hover:bg-gray-100 rounded">
//             <FaAlignJustify />
//         </button>
//         <button onClick={onDuplicate} className="p-2 hover:bg-gray-100 rounded">
//             <FaCopy />
//         </button>
//         <button onClick={onDelete} className="p-2 hover:bg-gray-100 rounded">
//             <FaTrash />
//         </button>
//     </div>
// );



// interface ResizeHandleProps {
//     position: 'nw' | 'ne' | 'sw' | 'se';
//     onMouseDown: (e: MouseEvent<HTMLDivElement>) => void;
// }

// const ResizeHandle: React.FC<ResizeHandleProps> = ({ position, onMouseDown }) => {
//     const handleClasses = {
//         nw: 'cursor-nw-resize -top-1.5 -left-1.5',
//         ne: 'cursor-ne-resize -top-1.5 -right-1.5',
//         sw: 'cursor-sw-resize -bottom-1.5 -left-1.5',
//         se: 'cursor-se-resize -bottom-1.5 -right-1.5',
//     };

//     return (
//         <div
//             className={`absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full ${handleClasses[position]}`}
//             onMouseDown={onMouseDown}
//         />
//     );
// };



// const RotationHandle: React.FC<{ onMouseDown: (e: MouseEvent<HTMLDivElement>) => void }> = ({ onMouseDown }) => (
//     <div
//         className="absolute w-4 h-4 bg-white border-2 rounded-full -bottom-10 right-1/2 cursor-move"
//         onMouseDown={onMouseDown}
//     >
//         <FaRedo className="text-xs text-blue-500" />
//     </div>
// );



// // export default DesignElement;
