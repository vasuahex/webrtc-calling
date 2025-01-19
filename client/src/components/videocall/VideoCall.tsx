import { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, MicOff, Camera, CameraOff, Monitor, MessageSquare, X } from 'lucide-react';
import ChatWindow from './ChatWindow';

const VideoCallComponent = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const isPrivate = location.state?.isPrivate;
  const password = location.state?.password;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Call ID: {id}</h1>
        {isPrivate && <p className="mb-4">This is a private call</p>}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-800 aspect-video rounded-lg flex items-center justify-center">
            <p>Your Video</p>
          </div>
          <div className="bg-gray-800 aspect-video rounded-lg flex items-center justify-center">
            <p>Participant Video</p>
          </div>
        </div>
        <div className="flex justify-center space-x-4 mb-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsCameraOff(!isCameraOff)}
            className={`p-2 rounded-full ${isCameraOff ? 'bg-red-500' : 'bg-green-500'}`}
          >
            {isCameraOff ? <CameraOff /> : <Camera />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsScreenSharing(!isScreenSharing)}
            className={`p-2 rounded-full ${isScreenSharing ? 'bg-blue-500' : 'bg-gray-500'}`}
          >
            <Monitor />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="p-2 rounded-full bg-purple-500"
          >
            <MessageSquare />
          </motion.button>
        </div>
      </div>
      {isChatOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 right-0 h-full w-80 bg-gray-800 p-4"
        >
          <button
            onClick={() => setIsChatOpen(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-white"
          >
            <X />
          </button>
          <ChatWindow />
        </motion.div>
      )}
    </div>
  );
};

export default VideoCallComponent;

