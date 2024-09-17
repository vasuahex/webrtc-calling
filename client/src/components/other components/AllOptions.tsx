import { useState, useEffect } from 'react';
import {
    BiUndo, BiRedo, BiBrush, BiSearch, BiPrinter,
    BiBold, BiItalic, BiUnderline, BiStrikethrough, BiLink, BiImage,
    BiAlignLeft, BiAlignMiddle, BiAlignRight, BiAlignJustify,
    BiListOl, BiListUl, BiMinus, BiPlus, BiDotsVerticalRounded
} from 'react-icons/bi';
import { FaPlus } from 'react-icons/fa';

const Toolbar = ({ addElement, handleStyleChange, handleLinkInsert }: any) => {
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const [showMore, setShowMore] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsSmallScreen(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLinkButtonClick = () => {
        setShowLinkInput(!showLinkInput);
    };

    const handleLinkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleLinkInsert(linkUrl);
        setLinkUrl('');
        setShowLinkInput(false);
    };

    const ToolbarButton = ({ icon: Icon, label, onClick }: any) => (
        <button onClick={onClick} className="p-1.5 hover:bg-gray-100 rounded" title={label}>
            <Icon size={20} />
        </button>
    );
    const toolbarItems = [
        { icon: FaPlus, label: 'Add Text', onClick: () => addElement('text') },
        { icon: BiSearch, label: 'Search' },
        { icon: BiUndo, label: 'Undo' },
        { icon: BiRedo, label: 'Redo' },
        { icon: BiPrinter, label: 'Print' },
        { icon: BiBrush, label: 'Paint format' },
        { icon: BiBold, label: 'Bold', onClick: () => handleStyleChange('bold') },
        { icon: BiItalic, label: 'Italic', onClick: () => handleStyleChange('italic') },
        { icon: BiUnderline, label: 'Underline', onClick: () => handleStyleChange('underline') },
        { icon: BiStrikethrough, label: 'Strikethrough', onClick: () => handleStyleChange('strikeThrough') },        { icon: BiLink, label: 'Insert link', onClick: handleLinkButtonClick },
        { icon: BiImage, label: 'Insert image' },
        { icon: BiAlignLeft, label: 'Align left', onClick: () => handleStyleChange('alignLeft') },
        { icon: BiAlignMiddle, label: 'Align center', onClick: () => handleStyleChange('alignCenter') },
        { icon: BiAlignRight, label: 'Align right', onClick: () => handleStyleChange('alignRight') },
        { icon: BiAlignJustify, label: 'Justify', onClick: () => handleStyleChange('justify') },
        { icon: BiListUl, label: 'Bulleted list' },
        { icon: BiListOl, label: 'Numbered list' },
    ];

    return (
        <div className="flex gap-2 flex-wrap items-center space-x-1 bg-white border-b border-gray-200 p-2">
            <div className="flex items-center space-x-1 mr-2">
                <select className="border rounded px-2 py-1 text-sm">
                    <option>Normal text</option>
                </select>
                <select className="border rounded px-2 py-1 text-sm">
                    <option>Arial</option>
                </select>
                <div className="flex items-center border rounded">
                    <button className="px-1 py-1 hover:bg-gray-100"><BiMinus size={25} /></button>
                    <span className="px-2">11</span>
                    <button className="px-1 py-1 hover:bg-gray-100"><BiPlus size={25} /></button>
                </div>
            </div>

            {isSmallScreen ? (
                <>
                    {toolbarItems.slice(0, 5).map((item, index) => (
                        <ToolbarButton key={index} icon={item.icon} label={item.label} onClick={item.onClick} />
                    ))}
                    <button
                        className="p-1 hover:bg-gray-100 rounded"
                        onClick={() => setShowMore(!showMore)}
                    >
                        <BiDotsVerticalRounded size={22} />
                    </button>
                    {showMore && (
                        <div className="absolute right-0 top-14 bg-white border rounded shadow-lg p-2 flex flex-wrap gap-1">
                            {toolbarItems.slice(5).map((item, index) => (
                                <ToolbarButton key={index} icon={item.icon} label={item.label} onClick={item.onClick} />
                            ))}
                        </div>
                    )}
                </>
            ) : (
                toolbarItems.map((item, index) => (
                    <ToolbarButton key={index} icon={item.icon} label={item.label} onClick={item.onClick} />
                ))
            )}

            <div className="flex items-center ml-auto">
                <select className="border rounded px-2 py-1 text-sm mr-2">
                    <option>100%</option>
                </select>
            </div>
            {showLinkInput && !isSmallScreen && (
                <form onSubmit={handleLinkSubmit} className="absolute top-14 right-1/3 flex items-center">
                    <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="Enter URL"
                        className="border rounded px-2 py-1 text-sm mr-2"
                    />
                    <button type="submit" className="bg-blue-500 text-white px-2 py-1 rounded text-sm">
                        Insert
                    </button>
                </form>
            )}
        </div>
    );
};

export default Toolbar;