// src/components/Header.js
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">ShareMe</h1>
      <Link to="/draganddrop" className="bg-blue-500 text-white px-4 py-2 rounded">draganddrop</Link>
      <Link to="/waveform" className="bg-green-500 text-white px-4 py-2 rounded">waveform</Link>
      <Link to="/toasts" className="bg-yellow-500 text-white px-4 py-2 rounded">toasts</Link>
      <Link to="/test-peers" className="bg-pink-500 text-white px-4 py-2 rounded">test-peers</Link>
      <Link to="/themes" className="bg-red-500 text-white px-4 py-2 rounded">themes</Link>
      <Link to="/tooltip" className="bg-violet-600 text-white px-4 py-2 rounded">tooltip</Link>
    </header>
  );
};

export default Header;
