import { useRef, useState } from 'react'
import { DesignElement } from '../interfaces/globalInterface';
import EditorBoard from '../routes/Editor';
import Toolbar from '../components/other components/AllOptions';

const RichTextEditor = () => {
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
                // fontFamily: selectedFont
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
            case 'strikeThrough':
                updatedStyle.textDecoration = updatedStyle.textDecoration === "line-through" ? 'none' : 'line-through';
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

    const handleLinkInsert = (url: string) => {
        if (!selectedElement) return;
        const updatedContent = `<a href="${url}">${selectedElement.content}</a>`;
        updateElement(selectedElement.id, { content: updatedContent });
    };

    return (
        <>
            <Toolbar addElement={addElement} handleStyleChange={handleStyleChange}
                handleLinkInsert={handleLinkInsert} />
            <EditorBoard editorRef={editorRef} updateElement={updateElement}
                handleStyleChange={handleStyleChange} selectedElement={selectedElement}
                setSelectedElement={setSelectedElement} elements={elements} setElements={setElements} />
        </>
    )
}

export default RichTextEditor