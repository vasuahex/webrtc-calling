import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './routes/Home'
import AdvanceDragADrop from './routes/AdvanceDragADrop'
import Drop from './routes/Drop'
import ToolTip from './routes/ToolTip'
import Toasts from './routes/Toasts'
import DragAndDrop from './routes/DragAndDrop'
import PeerTest from './PeerTest'
import { ToastContainer } from "react-toastify"
import WaveForm from './routes/WaveForm'
import "./css/App.css"
import 'react-toastify/dist/ReactToastify.css';
import Themes from './routes/Themes'
import Pintrest from './routes/Pintrest'
import VideoCall from './routes/VideoCall'
const App = () => {
  return (
    <div className=''>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false}
        pauseOnFocusLoss draggable pauseOnHover theme="light" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/videocall" element={<VideoCall />} />
        <Route path="/adwancedraganddrop" element={< AdvanceDragADrop />} />
        <Route path="/drag" element={<Drop />} />
        <Route path="/pintrest" element={<Pintrest />} />
        <Route path="/draganddrop" element={<DragAndDrop />} />
        <Route path="/waveform" element={<WaveForm />} />
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