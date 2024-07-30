// src/components/Sidebar.tsx
import React from 'react';

interface SidebarProps {
  categories: string[];
  onClick: (category: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ categories, onClick }) => {
  return (
    <div className="fixed w-64 h-screen bg-gray-100 p-4">
      <h2 className="text-2xl font-bold mb-4">Discover categories</h2>
      <ul>
        {categories.map((category, index) => (
          <button
            onClick={() => onClick(category)}
            className="cursor-pointer w-full hover:text-white flex py-1"
            key={index}
          >
            {category}
          </button>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
