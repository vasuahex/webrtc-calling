import React, { useState } from 'react';
import Toast from '../reuse/Toast'; // Make sure to import your Toast component

type Position = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
type Status = 'success' | 'failure' | 'info' | 'processing';

interface ToastData {
  id: number;
  position: Position;
  status: Status;
  message: string;
}

const ToastDemo: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const toastMap: { [key in Position]: Status } = {
    'top-left': 'failure',
    'top-center': 'info',
    'top-right': 'processing',
    'bottom-left': 'success',
    'bottom-center': 'failure',
    'bottom-right': 'success'
  };

  const handleShowToast = (position: Position) => {
    const newToast: ToastData = {
      id: Date.now(),
      position: position,
      status: toastMap[position],
      message: `This is a ${position} toast!`,
    };
    setToasts((prevToasts) => [...prevToasts, newToast]);
  };

  const handleCloseToast = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter(toast => toast.id !== id));
  };

  return (
    <div className='w-screen bg-gray-400 h-screen p-8'>
      <div className='grid grid-cols-3 gap-4 mb-8'>
        {Object.keys(toastMap).map((position) => (
          <button
            key={position}
            onClick={() => handleShowToast(position as Position)}
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
          >
            Show {position} Toast
          </button>
        ))}
      </div>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          position={toast.position}
          status={toast.status}
          message={toast.message}
          onClose={() => handleCloseToast(toast.id)}
        />
      ))}
    </div>
  );
};

export default ToastDemo;
