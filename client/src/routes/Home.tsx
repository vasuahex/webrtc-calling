import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className='m-5 h-screen border-black border-dotted border-2'>
      <div className='h-full flex-grow space-y-3 p-5 '>
        <Link to="/adwancedraganddrop" className='px-3 py-2 border-2 rounded-sm bg-blue-300'>advance drag and drop</Link>
        <Link to="/drag" className='px-3 py-2 border-2 rounded-sm bg-yellow-100'>simple drag and drop</Link>
        <Link to="/draganddrop" className='px-3 py-2 border-2 rounded-sm bg-green-300'>basic drag and drop</Link>
        <Link to="/toasts" className='px-3 py-2 border-2 rounded-sm bg-yellow-100'>custom toasts</Link>
        <Link to="/pintrest" className='px-3 py-2 border-2 rounded-sm block min-w-[200px] w-fit bg-blue-300'>scroll images</Link>
        <Link to="/videocall" className='px-3 py-2 border-2 rounded-sm block min-w-[200px] w-fit bg-green-300'>Video Call</Link>
        <Link to="/waveform" className='px-3 py-2 border-2 rounded-sm block min-w-[200px] w-fit bg-yellow-100'>waveform</Link>
        <Link to="/editor" className='px-3 py-2 border-2 rounded-sm block min-w-[200px] w-fit bg-slate-300'>editor</Link>
      </div>

    </div>
  )
}

export default Home