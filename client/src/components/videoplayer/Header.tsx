// components/Header.tsx
import React from 'react';
import { Search, Upload } from 'lucide-react';

const Header: React.FC = () => {
    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-50">
            <div className="flex-1 max-w-2xl mx-auto flex items-center gap-4">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Search videos..."
                        className="w-full h-10 px-4 pr-10 rounded-full border border-gray-300 focus:outline-none focus:border-blue-500"
                    />
                    <Search className="absolute right-3 top-2.5 text-gray-400" size={20} />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                    <Upload size={20} />
                    <span>Upload</span>
                </button>
            </div>
        </header>
    );
};

export default Header