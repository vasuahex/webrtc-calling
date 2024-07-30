import { useState } from 'react';
import List from '../reuse/List';

const DragAndDrop = () => {
    const [items, setItems] = useState<any>([]);
    const [inputValue, setInputValue] = useState('');

    const handleAddItem = () => {
        if (inputValue.trim()) {
            const newItem = { title: inputValue, id: items.length + 1 };
            setItems([...items, newItem]);
            setInputValue('');
        }
    };
    return (
        <div className="container mx-auto">
            <div>
                <h1 className="text-3xl font-bold text-center mt-8 mb-4">Drag & Drop in React</h1>
                <div className="flex justify-center mb-4">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="border border-gray-300 p-2 mr-2"
                    />
                    <button onClick={handleAddItem} className="bg-blue-500 text-white p-2">
                        Add Item
                    </button>
                </div>
                <List items={items} />
            </div>
        </div>
    );
};

export default DragAndDrop;