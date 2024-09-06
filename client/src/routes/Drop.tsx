

import { useState } from 'react';
import Draggable from 'react-draggable';
import { Link } from 'react-router-dom';

const DraggableItem = ({ id, content }: any) => {
    return (
        <Draggable bounds="parent">
            <div id={id} className="absolute cursor-move bg-white border-2 hover:scale-105 hover:border-blue-500 rounded-lg shadow-lg p-4 w-32 h-32 flex items-center justify-center text-center">
                {content}
            </div>
        </Draggable>
    );
};

const SimpleDragDropComponent = () => {
    const [items, setItems] = useState([
        { id: 'item1', content: 'Item 1' },
        { id: 'item2', content: 'Item 2' },
        { id: 'item3', content: 'Item 3' },
    ]);
    const [newItemContent, setNewItemContent] = useState('');

    const addNewItem = () => {
        if (newItemContent.trim() !== '') {
            const newItem = {
                id: `item${items.length + 1}`,
                content: newItemContent,
            };
            setItems([...items, newItem]);
            setNewItemContent('');
        }
    };

    return (
        <div className="relative w-full h-screen bg-gray-100 p-4">

            <div className="mb-4 gap-3 flex">
                <Link className='px-3 py-2 bg-blue-200 rounded-md shadow-lg' to="/">back</Link>
                <input
                    type="text"
                    value={newItemContent}
                    onChange={(e) => setNewItemContent(e.target.value)}
                    placeholder="Enter new item content"
                    className="mr-2 p-2 border border-gray-300 rounded-md"
                />
                <button
                    onClick={addNewItem}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                >
                    Add Item
                </button>
            </div>
            <div className="relative w-full h-[calc(100vh-100px)] border-2 border-dashed border-gray-300">
                {items.map((item) => (
                    <DraggableItem key={item.id} id={item.id} content={item.content} />
                ))}
            </div>
        </div>
    );
};

export default SimpleDragDropComponent;
