import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';

type Message = {
  id: number;
  text: string;
  sender: 'user' | 'other';
};

const ChatWindow = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      setMessages([...messages, { id: Date.now(), text: inputMessage, sender: 'user' }]);
      setInputMessage('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Chat</h2>
      <div className="flex-1 overflow-y-auto mb-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-2 p-2 rounded-lg ${
              message.sender === 'user' ? 'bg-blue-500 ml-auto' : 'bg-gray-700'
            } max-w-[80%]`}
          >
            {message.text}
          </motion.div>
        ))}
      </div>
      <div className="flex">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 bg-gray-700 text-white p-2 rounded-l-md"
          placeholder="Type a message..."
        />
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleSendMessage}
          className="bg-blue-500 p-2 rounded-r-md"
        >
          <Send size={20} />
        </motion.button>
      </div>
    </div>
  );
};

export default ChatWindow;

