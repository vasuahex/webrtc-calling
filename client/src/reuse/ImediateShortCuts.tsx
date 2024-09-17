import React, { MouseEvent } from 'react'
import { DesignElement } from '../interfaces/globalInterface';
interface ResizeHandleProps {
    position: 'nw' | 'ne' | 'sw' | 'se';
    onMouseDown: (e: MouseEvent<HTMLDivElement>) => void;
}

interface ElementControlsProps {
    selectedElement: DesignElement;
    handleStyleChange: (style: string) => void;
    handleDuplicate: () => void;
    onDelete: (selectedElement: DesignElement) => void;
}

import { FaTrash, FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight, FaRedo, FaCopy, FaAlignJustify } from 'react-icons/fa';

export const ResizeContent = ({ onMouseDown, element }: any) => {
    return (
        <div>
            <ResizeHandle position="nw" onMouseDown={(e) => onMouseDown(e, element, 'resize-nw')} />
            <ResizeHandle position="ne" onMouseDown={(e) => onMouseDown(e, element, 'resize-ne')} />
            <ResizeHandle position="sw" onMouseDown={(e) => onMouseDown(e, element, 'resize-sw')} />
            <ResizeHandle position="se" onMouseDown={(e) => onMouseDown(e, element, 'resize-se')} />
            <RotationHandle onMouseDown={(e) => onMouseDown(e, element, 'rotate')} />
        </div>
    )
}



export const ResizeHandle: React.FC<ResizeHandleProps> = ({ position, onMouseDown }) => {
    const handleClasses = {
        nw: 'cursor-nw-resize -top-1.5 -left-1.5',
        ne: 'cursor-ne-resize -top-1.5 -right-1.5',
        sw: 'cursor-sw-resize -bottom-1.5 -left-1.5',
        se: 'cursor-se-resize -bottom-1.5 -right-1.5',
    };

    return (
        <div className={`absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full ${handleClasses[position]}`} onMouseDown={onMouseDown} />
    );
};


export const RotationHandle: React.FC<{ onMouseDown: (e: MouseEvent<HTMLDivElement>) => void }> = ({ onMouseDown }) => (
    <div
        className="absolute w-4 h-4 bg-white border-2 rounded-full -bottom-10 right-1/2 cursor-move"
        onMouseDown={onMouseDown}
    >
        <FaRedo className="text-xs text-blue-500" />
    </div>
);




export const ElementControls: React.FC<ElementControlsProps> = ({ selectedElement, handleStyleChange, handleDuplicate, onDelete }) => {
    return (
        <>
            {selectedElement && (
                <div className='absolute -top-14 flex space-x-2 bg-white p-2 rounded shadow'>
                    <button onClick={() => handleStyleChange('bold')} className="p-2 hover:bg-gray-100 rounded">
                        <FaBold title='bold' />
                    </button>
                    <button onClick={() => handleStyleChange('italic')} className="p-2 hover:bg-gray-100 rounded">
                        <FaItalic title='italic' />
                    </button>
                    <button onClick={() => handleStyleChange('underline')} className="p-2 hover:bg-gray-100 rounded">
                        <FaUnderline title='underline' />
                    </button>
                    <button onClick={() => handleStyleChange('alignLeft')} className="p-2 hover:bg-gray-100 rounded">
                        <FaAlignLeft title='align left' />
                    </button>
                    <button onClick={() => handleStyleChange('alignCenter')} className="p-2 hover:bg-gray-100 rounded">
                        <FaAlignCenter title='align center' />
                    </button>
                    <button onClick={() => handleStyleChange('alignRight')} className="p-2 hover:bg-gray-100 rounded">
                        <FaAlignRight title='align right' />
                    </button>
                    <button onClick={() => handleStyleChange('justify')} className="p-2 hover:bg-gray-100 rounded">
                        <FaAlignJustify title='justify' />
                    </button>
                    <button onClick={handleDuplicate} className="p-2 hover:bg-gray-100 rounded">
                        <FaCopy title='copy' />
                    </button>
                    <button onClick={() => onDelete(selectedElement)} className="p-2 hover:bg-gray-100 rounded">
                        <FaTrash title='trash' />
                    </button>
                </div>
            )}
        </>
    )
}
