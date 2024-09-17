import React, { useState, useEffect } from 'react';
import { FaFont, FaGoogle } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface Font {
    name: string;
    type: 'system' | 'google' | 'custom';
    url?: string;
}

const FontList = () => {
    const [fonts, setFonts] = useState<Font[]>([
        { name: 'Arial', type: 'system' },
        { name: 'Helvetica', type: 'system' },
        { name: 'Roboto', type: 'google' },
        { name: 'Open Sans', type: 'google' },
    ]);

    const [newFonts, setNewFonts] = useState<File[] | null>(null);

    useEffect(() => {
        // Load custom fonts
        fonts.forEach((font) => {
            if (font.type === 'custom' && font.url) {
                const fontFace = new FontFace(font.name, `url(${font.url})`);
                fontFace.load().then((loadedFont) => {
                    document.fonts.add(loadedFont);
                });
            }
        });
    }, [fonts]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files ? Array.from(event.target.files) : null;
        setNewFonts(files);
    };

    const handleFontSubmit = () => {
        if (newFonts && newFonts.length > 0) {
            const newFontsData: Font[] = [];

            newFonts.forEach((file) => {
                const fontName = file.name.split('.')[0];
                const reader = new FileReader();

                reader.onload = (e) => {
                    const fontUrl = URL.createObjectURL(new Blob([e.target?.result!]));
                    newFontsData.push({
                        name: fontName,
                        type: 'custom',
                        url: fontUrl,
                    });

                    if (newFontsData.length === newFonts.length) {
                        // After all fonts are processed, update the state
                        setFonts([...fonts, ...newFontsData]);
                        setNewFonts(null); // Clear the file input after upload
                    }
                };

                reader.readAsArrayBuffer(file);
            });
        } else {
            toast.error('No font files selected', { position: 'top-left' });
        }
    };

    return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
            <h2 className="text-2xl font-bold mb-4">Available Fonts</h2>
            <ul className="space-y-2">
                {fonts.map((font, index) => (
                    <li
                        key={index}
                        className="flex items-center p-2 border rounded hover:bg-gray-100 cursor-pointer"
                    >
                        {font.type === 'google' ? (
                            <FaGoogle className="mr-2 text-blue-500" />
                        ) : (
                            <FaFont className="mr-2 text-gray-500" />
                        )}
                        <span style={{ fontFamily: font.name }}>
                            {font.name} - {font.type}
                        </span>
                    </li>
                ))}
            </ul>
            <div className="mt-4">
                <h3 className="text-lg font-bold mb-2">Add New Fonts</h3>
                <div className="flex flex-col space-y-2">
                    <input
                        type="file"
                        accept=".otf,.ttf"
                        multiple // Allow multiple file selection
                        className="border rounded p-2"
                        onChange={handleFileUpload}
                    />
                    <button
                        className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                        onClick={handleFontSubmit}
                    >
                        Add Fonts
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FontList;
