// src/App.js
import React, { useState } from 'react';
import Sidebar from '../components/pinsert components/SideBar';
import Header from '../components/pinsert components/Header';
import MainContent from '../components/pinsert components/MainComponent';

const Pintrest: React.FC = () => {
    const defaultCategories = ["Cars", "Fitness", "Wallpaper", "Websites", "Photo", "Food", "Nature", "Art", "Travel", "Quotes", "Cats", "Dogs"];
    const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategories[0]);

    const selectCategory = (category: string) => {
        setSelectedCategory(category);
    };

    return (
        <div className="flex">
            <Sidebar onClick={selectCategory} categories={defaultCategories} />
            <div className="flex-1 flex flex-col ml-64"> {/* Adjusted margin for fixed sidebar */}
                <Header />
                <MainContent category={selectedCategory} />
            </div>
        </div>
    );
};

export default Pintrest;