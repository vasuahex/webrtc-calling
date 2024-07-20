
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';

type Position = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
type Status = 'success' | 'failure' | 'info' | 'processing';

interface ToastProps {
    position: Position;
    status?: Status;
    message: string;
    onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({ position, message, status, onClose }) => {
    const [isVisible, setIsVisible] = useState<boolean>(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onClose) {
                onClose();
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const getPositionClasses = (): string => {
        switch (position) {
            case 'top-right': return 'top-4 right-4';
            case 'top-left': return 'top-4 left-4';
            case 'bottom-right': return 'bottom-4 right-4';
            case 'bottom-left': return 'bottom-4 left-4';
            case 'top-center': return 'top-4  left-[40%] -translate-x-1/2';
            case 'bottom-center': return 'bottom-4  left-[40%] -translate-x-1/2';
            default: return 'top-4 right-4';
        }
    };

    const getStatusClasses = (): string => {
        switch (status) {
            case 'success': return 'bg-green-500';
            case 'failure': return 'bg-red-500';
            case 'info': return 'bg-blue-500';
            case 'processing': return 'bg-yellow-500';
            default: return 'bg-gray-500';
        }
    };

    const variants: Record<string, Variants> = {
        topCenter: {
            hidden: { y: -50, opacity: 0 },
            visible: { y: 0, opacity: 1 },
            exit: { y: -50, opacity: 0 },
        },
        bottomCenter: {
            hidden: { y: 50, opacity: 0 },
            visible: { y: 0, opacity: 1 },
            exit: { y: 50, opacity: 0 },
        },
        left: {
            hidden: { x: -300, opacity: 0 },
            visible: { x: 0, opacity: 1 },
            exit: { x: -300, opacity: 0 },
        },
        right: {
            hidden: { x: 300, opacity: 0 },
            visible: { x: 0, opacity: 1 },
            exit: { x: 300, opacity: 0 },
        },
    };

    const getVariant = (): Variants => {
        if (position === 'top-center' || position === 'bottom-center') {
            return position === 'top-center' ? variants.topCenter : variants.bottomCenter;
        }
        return position.includes('left') ? variants.left : variants.right;
    };
    console.log(getPositionClasses());
    // ${getPositionClasses()}
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    className={`fixed ${getPositionClasses()} ${getStatusClasses()} text-white p-4 rounded-md shadow-lg max-w-sm`}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={getVariant()}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                    {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;

