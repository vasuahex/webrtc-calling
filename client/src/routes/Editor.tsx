// import React from 'react';

// const App = () => {
//   return (
//     <div className="flex h-screen">
//       {/* Sidebar */}
//       <Sidebar />

//       {/* Main Board */}
//       <div className="flex-grow bg-gray-100">
//         <EditorBoard />
//       </div>
//     </div>
//   );
// };

// const Sidebar = () => {
//   const menuItems = [
//     { name: 'Template', icon: '📄' },
//     { name: 'Text', icon: '📝' },
//     { name: 'Shape', icon: '🔶' },
//     { name: 'Frame', icon: '🖼️' },
//     { name: 'Image', icon: '🖼️' },
//     { name: 'Graphic', icon: '🎨' },
//     { name: 'QR Code', icon: '🔳' },
//     { name: 'Video', icon: '🎥' },
//   ];

//   return (
//     <div className="w-1/5 bg-gray-900 text-white p-4 space-y-6">
//       <h1 className="text-2xl font-bold mb-6">LidoJS</h1>
//       <ul className="space-y-4">
//         {menuItems.map((item) => (
//           <li
//             key={item.name}
//             className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 p-2 rounded"
//           >
//             <span>{item.icon}</span>
//             <span>{item.name}</span>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };

// const EditorBoard = () => {
//   return (
//     <div className="flex justify-center items-center h-full bg-gray-300">
//       <div className="w-3/4 h-3/4 bg-white shadow-md flex justify-center items-center">
//         <p className="text-5xl font-bold text-gray-600">SALE</p>
//       </div>
//     </div>
//   );
// };

// export default App;

// import React, { useState } from 'react';
// import { FaUndo, FaRedo } from 'react-icons/fa';
// import { AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';

// const App = () => {
//     const [isMenuOpen, setIsMenuOpen] = useState(true);
//     const [texts, setTexts] = useState<string[]>([]);

//     const toggleMenu = () => {
//         setIsMenuOpen(!isMenuOpen);
//     };

//     const addTextField = () => {
//         setTexts([...texts, "New Text"]);
//     };

//     return (
//         <div className="flex h-screen">
//             {/* Sidebar */}
//             {isMenuOpen && <Sidebar addTextField={addTextField} />}

//             {/* Main Board */}
//             <div className="flex-grow flex flex-col">
//                 {/* Navbar */}
//                 <Navbar toggleMenu={toggleMenu} isMenuOpen={isMenuOpen} />

//                 {/* Editor Board */}
//                 <EditorBoard texts={texts} />
//             </div>
//         </div>
//     );
// };

// const Sidebar = ({ addTextField }: any) => {
//     return (
//         <div className="w-1/5 bg-gray-900 text-white p-4 space-y-6">
//             <ul className="space-y-4">
//                 <li
//                     onClick={addTextField}
//                     className="cursor-pointer hover:bg-gray-700 p-2 rounded"
//                 >
//                     Text
//                 </li>
//                 <li className="cursor-pointer hover:bg-gray-700 p-2 rounded">Shape</li>
//                 <li className="cursor-pointer hover:bg-gray-700 p-2 rounded">Image</li>
//                 {/* Add more items as needed */}
//             </ul>
//         </div>
//     );
// };

// const Navbar = ({ toggleMenu, isMenuOpen }: any) => {
//     return (
//         <div className="bg-gray-800 text-white flex justify-between items-center p-4">
//             <div className="flex items-center">
//                 {/* Logo */}
//                 <h1 className="text-lg font-bold">Safeer Editors</h1>
//                 {/* Menu Icon */}
//                 <button onClick={toggleMenu} className="ml-4">
//                     {isMenuOpen ? <AiOutlineClose size={24} /> : <AiOutlineMenu size={24} />}
//                 </button>
//             </div>
//             {/* Undo and Redo Icons */}
//             <div className="space-x-4">
//                 <FaUndo size={24} className="cursor-pointer hover:text-gray-300" />
//                 <FaRedo size={24} className="cursor-pointer hover:text-gray-300" />
//             </div>
//         </div>
//     );
// };

// const EditorBoard = ({ texts }: any) => {
//     return (
//         <div className="flex-grow bg-gray-100 p-4">
//             <div className="w-full h-full bg-white border border-gray-300 shadow-md p-4">
//                 {texts.map((text, index: number) => (
//                     <div
//                         key={index}
//                         className="border border-blue-400 text-2xl p-2 mb-4 cursor-pointer"
//                         contentEditable
//                     >
//                         {text}
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };

// export default App;


// import React, { useRef, useState } from 'react';

// const Editor = () => {
//     const contentRef = useRef(null);
//     const imageInputRef = useRef(null);
//     const [isResizing, setIsResizing] = useState(false);
//     const [resizingImage, setResizingImage] = useState(null);

//     const handleFormat = (format) => {
//         if (contentRef.current) {
//             document.execCommand(format, false, null);
//         }
//     };

//     const handleInsertImage = () => {
//         imageInputRef.current.click();
//     };

//     const handleImageUpload = (event) => {
//         const file = event.target.files[0];
//         if (file) {
//             const reader = new FileReader();
//             reader.onload = () => {
//                 const img = document.createElement('img');
//                 img.src = reader.result;
//                 img.addEventListener('mousedown', handleImageMouseDown);
//                 img.addEventListener('mousemove', handleImageMouseMove);
//                 img.addEventListener('mouseup', handleImageMouseUp);
//                 contentRef.current.appendChild(img);
//             };
//             reader.readAsDataURL(file);
//         }
//     };

//     const handleImageMouseDown = (event) => {
//         if (event.target.tagName === 'IMG') {
//             setIsResizing(true);
//             setResizingImage(event.target);
//         }
//     };

//     const handleImageMouseMove = (event) => {
//         if (isResizing && resizingImage) {
//             const rect = resizingImage.getBoundingClientRect();
//             const deltaX = event.clientX - rect.left;
//             const deltaY = event.clientY - rect.top;
//             resizingImage.style.width = `${deltaX}px`;
//             resizingImage.style.height = `${deltaY}px`;
//         }
//     };

//     const handleImageMouseUp = () => {
//         setIsResizing(false);
//         setResizingImage(null);
//     };

//     return (
//         <div className="editor">
//             <div className="toolbar">
//                 <button onClick={() => handleFormat('bold')}>Bold</button>
//                 <button onClick={() => handleFormat('italic')}>Italic</button>
//                 <button onClick={() => handleFormat('underline')}>Underline</button>
//                 <button onClick={handleInsertImage}>Insert Image</button>
//             </div>
//             <div className="content" ref={contentRef} contentEditable={true}></div>
//             <input type="file" ref={imageInputRef} onChange={handleImageUpload} hidden />
//         </div>
//     );
// };

// export default Editor;


// import React, { useState, useRef } from 'react';

// const App = () => {
//   return (
//     <div className="flex h-screen">
//       <Sidebar />
//       <div className="flex-grow bg-gray-100">
//         <EditorBoard />
//       </div>
//     </div>
//   );
// };

// const Sidebar = () => {
//   const menuItems = [
//     { name: 'Template', icon: '📄' },
//     { name: 'Text', icon: '📝' },
//     { name: 'Shape', icon: '🔶' },
//     { name: 'Frame', icon: '🖼️' },
//     { name: 'Image', icon: '🖼️' },
//     { name: 'Graphic', icon: '🎨' },
//     { name: 'QR Code', icon: '🔳' },
//     { name: 'Video', icon: '🎥' },
//   ];

//   return (
//     <div className="w-1/5 bg-gray-900 text-white p-4 space-y-6">
//       <h1 className="text-2xl font-bold mb-6">LidoJS</h1>
//       <ul className="space-y-4">
//         {menuItems.map((item) => (
//           <li
//             key={item.name}
//             className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 p-2 rounded"
//           >
//             <span>{item.icon}</span>
//             <span>{item.name}</span>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// };

// const EditorBoard = () => {
//   const [images, setImages] = useState([]);
//   const [selectedImage, setSelectedImage] = useState(null);
//   const boardRef = useRef(null);

//   const addImage = () => {
//     const newImage = {
//       id: Date.now(),
//       src: '/api/placeholder/200/200',
//       x: 100,
//       y: 100,
//       width: 200,
//       height: 200,
//     };
//     setImages([...images, newImage]);
//   };

//   const handleImageClick = (image) => {
//     setSelectedImage(image);
//   };

//   const handleImageDrag = (e, id) => {
//     const boardRect = boardRef.current.getBoundingClientRect();
//     const newX = e.clientX - boardRect.left;
//     const newY = e.clientY - boardRect.top;

//     setImages(images.map(img => 
//       img.id === id ? { ...img, x: newX, y: newY } : img
//     ));
//   };

//   const handleImageResize = (id, newWidth, newHeight) => {
//     setImages(images.map(img =>
//       img.id === id ? { ...img, width: newWidth, height: newHeight } : img
//     ));
//   };

//   return (
//     <div className="relative h-full" ref={boardRef}>
//       <button 
//         onClick={addImage}
//         className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded"
//       >
//         Add Image
//       </button>
//       {images.map((image) => (
//         <div
//           key={image.id}
//           style={{
//             position: 'absolute',
//             left: `${image.x}px`,
//             top: `${image.y}px`,
//             width: `${image.width}px`,
//             height: `${image.height}px`,
//             cursor: 'move',
//           }}
//           onClick={() => handleImageClick(image)}
//           draggable
//           onDragEnd={(e) => handleImageDrag(e, image.id)}
//         >
//           <img 
//             src={image.src} 
//             alt="Placeholder" 
//             className="w-full h-full object-cover"
//           />
//           {selectedImage && selectedImage.id === image.id && (
//             <ImageOptions 
//               image={image} 
//               onResize={handleImageResize}
//             />
//           )}
//         </div>
//       ))}
//     </div>
//   );
// };

// const ImageOptions = ({ image, onResize }) => {
//   const handleResize = (e) => {
//     const newWidth = parseInt(e.target.value);
//     const newHeight = (newWidth / image.width) * image.height;
//     onResize(image.id, newWidth, newHeight);
//   };

//   return (
//     <div className="absolute -top-10 left-0 bg-white p-2 rounded shadow">
//       <input 
//         type="range" 
//         min="50" 
//         max="500" 
//         value={image.width} 
//         onChange={handleResize}
//       />
//       <button className="ml-2 bg-red-500 text-white px-2 py-1 rounded">
//         Delete
//       </button>
//     </div>
//   );
// };

// export default App;

// import React from 'react'

const Editor = () => {
  return (
    <div>Editor</div>
  )
}

export default Editor