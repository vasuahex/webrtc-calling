import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className='p-4 h-screen'>
      <div className='h-full flex-grow  p-5 border-black border-dotted border-2'>
        <Link to="/adwancedraganddrop" className='px-3 py-2 border-2 rounded-sm bg-blue-300'>advance drag and drop</Link>
        <Link to="/drag" className='px-3 py-2 border-2 rounded-sm bg-yellow-100'>simple drag and drop</Link>
        <Link to="/draganddrop" className='px-3 py-2 border-2 rounded-sm bg-green-300'>basic drag and drop</Link>
      </div>

    </div>
  )
}

export default Home