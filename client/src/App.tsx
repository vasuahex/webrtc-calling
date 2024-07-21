import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './routes/Home'
import ToolTip from './routes/ToolTip'
import Toasts from './routes/Toasts'
import PeerTest from './PeerTest'
import { ToastContainer } from "react-toastify"
import "./css/App.css"
import 'react-toastify/dist/ReactToastify.css';
import Themes from './routes/Themes'
const App = () => {
  return (
    <div className=''>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false}
        pauseOnFocusLoss draggable pauseOnHover theme="light" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/toasts" element={<Toasts />} />
        <Route path="/test-peers" element={<PeerTest />} />
        <Route path="/themes" element={<Themes />} />
        <Route path="/tooltip" element={<ToolTip />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}

export default App