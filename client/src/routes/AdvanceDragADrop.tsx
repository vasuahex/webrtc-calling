


import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { FiTrash, FiPlusCircle, FiMove } from 'react-icons/fi'; // Importing icons
import { Link } from 'react-router-dom';

const KanbanBoard = () => {
    const data = localStorage.getItem('draganddrop')
    console.log(data);

    const [columns, setColumns] = useState<any>(data !== null ? JSON.parse(data) : {});
    const [newEnvTitle, setNewEnvTitle] = useState('');

    const onDragEnd = (result: any) => {
        const { source, destination } = result;
        if (!destination) return;

        if (source.droppableId === destination.droppableId) {
            const column = columns[source.droppableId];
            const newTickets = Array.from(column.tickets);
            const [reorderedItem] = newTickets.splice(source.index, 1);
            newTickets.splice(destination.index, 0, reorderedItem);

            setColumns({
                ...columns,
                [source.droppableId]: {
                    ...column,
                    tickets: newTickets,
                },
            });
        } else {
            const sourceColumn = columns[source.droppableId];
            const destColumn = columns[destination.droppableId];
            const sourceTickets = Array.from(sourceColumn.tickets);
            const destTickets = Array.from(destColumn.tickets);
            const [movedItem] = sourceTickets.splice(source.index, 1);
            destTickets.splice(destination.index, 0, movedItem);

            setColumns({
                ...columns,
                [source.droppableId]: {
                    ...sourceColumn,
                    tickets: sourceTickets,
                },
                [destination.droppableId]: {
                    ...destColumn,
                    tickets: destTickets,
                },
            });
        }
    };

    useEffect(() => {
        localStorage.setItem('draganddrop', JSON.stringify(columns))
    }, [columns])

    const createNewEnvironment = () => {
        if (!newEnvTitle) return;

        const newColumnId = newEnvTitle.toLowerCase().replace(/\s+/g, '-');

        setColumns({
            ...columns,
            [newColumnId]: {
                id: newColumnId,
                title: newEnvTitle,
                tickets: [],
            },
        })
        setNewEnvTitle(''); // Clear the input
    };

    const deleteTicket = (columnId: any, ticketId: any) => {
        const column = columns[columnId];
        const updatedTickets = column.tickets.filter((ticket: any) => ticket.id !== ticketId);
        setColumns({
            ...columns,
            [columnId]: {
                ...column,
                tickets: updatedTickets,
            },
        });
    };

    const deleteEnvironment = (columnId: any) => {
        const updatedColumns = { ...columns };
        delete updatedColumns[columnId];
        setColumns(updatedColumns);
    };

    return (
        <div className="flex flex-col p-4 bg-gray-100 h-screen">
            {/* New Environment Section */}
            <div className="mb-4 flex items-center gap-3">
                <Link className='px-3 py-2 bg-blue-200 rounded-md shadow-lg' to="/">back</Link>
                <input
                    type="text"
                    placeholder="New Environment Title"
                    value={newEnvTitle}
                    onChange={(e) => setNewEnvTitle(e.target.value)}
                    className="p-2 border border-gray-300 rounded mr-2"
                />
                <button
                    onClick={createNewEnvironment}
                    className="p-2 bg-blue-500 text-white rounded flex items-center"
                >
                    <FiPlusCircle className="mr-1" /> Create New Environment
                </button>
            </div>

            <div className="flex flex-1">
                <DragDropContext onDragEnd={onDragEnd}>
                    {Object.values(columns).map((column: any) => (
                        <div key={column.id} className="flex-1 mx-2">
                            <div contentEditable className="flex justify-between items-center py-2 px-3 mb-2">
                                <h2 className="text-lg font-bold">{column.title}</h2>
                                <button
                                    onClick={() => deleteEnvironment(column.id)}
                                    className="text-red-500 p-2"
                                >
                                    <FiTrash />
                                </button>
                            </div>
                            <Droppable droppableId={column.id}>
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="bg-gray-200 p-2 rounded min-h-[500px]"
                                    >
                                        {column.tickets.map((ticket: any, index: number) => (
                                            <Draggable
                                                key={ticket.id}
                                                draggableId={ticket.id}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`bg-white p-4 mb-2 rounded shadow flex justify-between items-center ${snapshot.isDragging ? 'opacity-75' : ''
                                                            }`}
                                                    >
                                                        <div className="flex items-center">
                                                            <FiMove className="mr-2 cursor-pointer" />
                                                            {ticket.content} dfdf
                                                        </div>
                                                        <button
                                                            onClick={() => deleteTicket(column.id, ticket.id)}
                                                            className="text-red-500 p-2"
                                                        >
                                                            <FiTrash />
                                                        </button>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                        {/* Add new ticket form */}
                                        <Component columnId={column.id} columns={columns} setColumns={setColumns} />
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </DragDropContext>
            </div>
        </div>
    );
};




const Component = ({ columns, setColumns, columnId }: any) => {
    const [newTicketContent, setNewTicketContent] = useState('');
    const addNewTicket = (columnId: any) => {
        if (!newTicketContent) return;

        const newTicket = {
            id: `task-${Date.now()}`, // Unique ID
            content: newTicketContent,
        };

        const column = columns[columnId];
        setColumns({
            ...columns,
            [columnId]: {
                ...column,
                tickets: [...column.tickets, newTicket],
            },
        });
        setNewTicketContent(''); // Clear the input
    };
    return (
        <div className="my-auto space-y-3">
            <input
                type="text"
                placeholder="New Ticket"
                value={newTicketContent}
                onChange={(e) => setNewTicketContent(e.target.value)}
                className="p-2 border border-gray-300 rounded mr-2"
            />
            <button
                onClick={() => addNewTicket(columnId)}
                className="p-2 flex justify-center items-center gap-2 bg-green-500 text-white rounded"
            >
                <FiPlusCircle className="mr-1" /> Add Ticket
            </button>
        </div>
    )
}


export default KanbanBoard;
