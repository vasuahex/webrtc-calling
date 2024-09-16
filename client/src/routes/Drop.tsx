import { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import ReactDraggable from 'react-draggable';
import { Link } from 'react-router-dom';
import { MdOutlineDragIndicator, MdSave } from "react-icons/md"; // Import save icon
import html2canvas from 'html2canvas';

const DraggableItem = ({ id, content, position, zIndex }: any) => {
    return (
        <ReactDraggable
            bounds="parent"
            defaultPosition={position}
            onStop={(e, data) => console.log('Stopped', { id, x: data.x, y: data.y })}
        >
            <div
                id={id}
                style={{ zIndex }} // Apply dynamic z-index here
                className="absolute cursor-move bg-white border-2 hover:scale-105 hover:border-blue-500 rounded-lg shadow-lg p-4 w-32 h-32 flex items-center justify-center text-center"
            >
                {content}
            </div>
        </ReactDraggable>
    );
};

const DesignEditor = () => {
    const localLayers = localStorage.getItem('layers')
    const intialValue = localLayers !== null ? JSON.parse(localLayers as string) : []
    const [layers, setLayers] = useState(intialValue);
    const [selectedLayer, setSelectedLayer] = useState(null);
    const [newItemContent, setNewItemContent] = useState('');
    const designRef = useRef<HTMLDivElement>(null); // Ref for design area

    const addNewItem = () => {
        if (newItemContent.trim() !== '') {
            const newItem = {
                id: `layer${layers.length + 1}`,
                content: newItemContent,
                position: { x: 50, y: 50 },
                zIndex: layers.length + 1, // Give new layer the highest z-index
            };
            setLayers([newItem, ...layers]);
            setNewItemContent('');
        }
    };

    useEffect(() => {
        localStorage.setItem('layers', JSON.stringify(layers))
    }, [layers])

    const onDragEnd = (result: any) => {
        if (!result.destination) return;

        const items = Array.from(layers);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Update z-index of layers based on their new order
        const updatedLayers = items.map((layer: any, index) => ({
            ...layer,
            zIndex: layers.length - index, // Highest index gets the highest z-index
        }));

        setLayers(updatedLayers);
    };

    const handleLayerClick = (id: any) => {
        const maxZIndex = Math.max(...layers.map((layer: any) => layer.zIndex));
        const updatedLayers = layers.map((layer: any) =>
            layer.id === id ? { ...layer, zIndex: maxZIndex + 1 } : layer
        );
        setLayers(updatedLayers);
        setSelectedLayer(id);
    };

    const saveAsImage = () => {
        if (designRef.current) {
            html2canvas(designRef.current).then((canvas: any) => {
                const link = document.createElement('a');
                link.download = 'design.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <nav className="bg-slate-100 shadow-md p-4">
                <div className="container mx-auto flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-gray-800">Design Editor</h1>
                    <div className="flex gap-4">
                        <button
                            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md shadow-lg hover:bg-blue-600 transition-colors"
                            onClick={saveAsImage} // Trigger save function
                        >
                            <MdSave size={20} className="mr-2" />
                            Save as Image
                        </button>
                        <Link
                            className="px-4 py-2 bg-blue-500 text-white rounded-md shadow-lg hover:bg-blue-600 transition-colors"
                            to="/"
                        >
                            Back
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="flex flex-1 overflow-hidden">
                <div className="w-1/4 bg-gray-300 shadow-lg p-4 overflow-y-auto">
                    <h2 className="text-xl font-bold mb-4 text-gray-700">Layers</h2>
                    <div className="mb-4">
                        <input
                            type="text"
                            value={newItemContent}
                            onChange={(e) => setNewItemContent(e.target.value)}
                            placeholder="New layer content"
                            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={addNewItem}
                            className="mt-2 w-full bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                        >
                            Add Layer
                        </button>
                    </div>
                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="layers">
                            {(provided) => (
                                <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                    {layers.map((layer: any, index: number) => (
                                        <Draggable key={layer.id} draggableId={layer.id} index={index}>
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className={`p-2 flex gap-5 bg-gray-100 rounded cursor-move ${selectedLayer === layer.id ? 'border-2 border-blue-500' : ''
                                                        } hover:bg-gray-200 transition-colors`}
                                                    onClick={() => handleLayerClick(layer.id)} // Handle click to bring to top
                                                >
                                                    <MdOutlineDragIndicator size={25} />
                                                    {layer.content}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </ul>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
                <div className="flex-1 p-4">
                    <div ref={designRef} className="relative w-full h-full border-2 border-dashed border-gray-300 rounded-lg bg-gray-100 overflow-hidden">
                        {layers.map((layer: any) => (
                            <DraggableItem
                                key={layer.id}
                                id={layer.id}
                                content={layer.content}
                                position={layer.position}
                                zIndex={layer.zIndex} // Pass zIndex to DraggableItem
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DesignEditor;
