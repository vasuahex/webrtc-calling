import { useRef, useState } from 'react'
import { FaPlus } from 'react-icons/fa'
import { DesignElement } from '../interfaces/globalInterface';
import EditorBoard from '../routes/Editor';

const RichTextEditor = () => {
    const [elements, setElements] = useState<DesignElement[]>([]);
    const [selectedElement, setSelectedElement] = useState<DesignElement | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);
    // const [availableFonts, setAvailableFonts] = useState<string[]>(['Arial', 'Verdana', 'Times New Roman']);
    // const [selectedFont, setSelectedFont] = useState<string>('Arial');

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


    return (
        <>
            <div className="flex space-x-2 bg-white p-2 rounded shadow w-fit">
                <button onClick={() => addElement('text')} className="p-2 hover:bg-gray-100 rounded">
                    <FaPlus />
                </button>
            </div>
            <EditorBoard editorRef={editorRef} selectedElement={selectedElement} setSelectedElement={setSelectedElement} elements={elements} setElements={setElements} />
        </>
    )
}

export default RichTextEditor