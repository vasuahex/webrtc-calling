import React, { useState } from 'react';

interface FontMenuProps {
    availableFonts: string[];
    onAddFont: (font: string) => void;
    onSelectFont: (font: string) => void;
    selectedFont: string;
}

const FontMenu: React.FC<FontMenuProps> = ({ availableFonts, onAddFont, onSelectFont, selectedFont }) => {
    const [newFont, setNewFont] = useState('');

    const handleAddFont = () => {
        if (newFont && !availableFonts.includes(newFont)) {
            onAddFont(newFont);
            setNewFont('');
        }
    };

    return (
        <div className="font-menu">
            <div className="add-font">
                <input
                    type="text"
                    value={newFont}
                    onChange={(e) => setNewFont(e.target.value)}
                    placeholder="Add new font"
                />
                <button onClick={handleAddFont}>Add Font</button>
            </div>
            <div className="font-list">
                <h3>Available Fonts</h3>
                <ul>
                    {availableFonts.map((font, index) => (
                        <li
                            key={index}
                            onClick={() => onSelectFont(font)}
                            style={{ fontFamily: font, cursor: 'pointer', padding: '5px', border: selectedFont === font ? '1px solid black' : 'none' }}
                        >
                            {font}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default FontMenu;
