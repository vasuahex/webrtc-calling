
import { Button } from '../reuse/ButtonNew';
import {
  Home,
  Bell,
  MessageCircle,
  Video,
  Calendar,
  Settings,
  HelpCircle,
  Users,
  Mic,
  Share2,
  Camera,
  MoreHorizontal,
  ChevronLeft,
  Plus,
  Send,
  Image,
} from 'lucide-react';

function App() {


  const participants = [
    { name: 'Alyssa Syakieb', status: '(Me)', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' },
    { name: 'Aldo Bareto', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d' },
    { name: 'Bastian Baja', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e' },
    { name: 'Chintya Claudia', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80' },
    { name: 'Darren Johnson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e' },
  ];

  const messages = [
    { user: 'Darren Johnson', message: 'Hey Guys 👋', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e' },
    { user: 'Chintya Claudia', message: 'Nice to meet you guysss', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80' },
    { user: 'Aldo Bareto', message: 'Good guyyss. We are ready and hope us well', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d' },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-4">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-indigo-600 rounded"></div>
            <span className="text-xl font-bold text-indigo-600">Methink</span>
          </div>
          
          <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start">
              <Home className="w-5 h-5 mr-3" />
              Homepage
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Bell className="w-5 h-5 mr-3" />
              Notification
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <MessageCircle className="w-5 h-5 mr-3" />
              Chats
            </Button>
            <Button variant="ghost" className="w-full justify-start bg-indigo-50 text-indigo-600">
              <Video className="w-5 h-5 mr-3" />
              Video
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Calendar className="w-5 h-5 mr-3" />
              Schedule
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </Button>
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <HelpCircle className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
            <h3 className="font-semibold mb-1">Help Center</h3>
            <p className="text-sm text-gray-500 mb-3">
              Having trouble in video conference. Please contact us for more questions.
            </p>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
              Go To Help Center
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold">Design All Hands 🎯 🥑 🏀</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">👥 24 peoples</span>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add People
              </Button>
            </div>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4 bg-gray-50">
          <div className="grid grid-cols-3 gap-4 h-full">
            <div className="col-span-3 aspect-video bg-white rounded-lg relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e"
                alt="Main speaker"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-white rounded-full px-3 py-1 flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-sm">Johanna Cordoba</span>
              </div>
              <div className="absolute top-4 right-4 flex space-x-2">
                <Button size="icon" className="bg-white/20 backdrop-blur-sm hover:bg-white/30">
                  <Camera className="w-4 h-4 text-white" />
                </Button>
                <Button size="icon" className="bg-indigo-600 hover:bg-indigo-700">
                  <Mic className="w-4 h-4 text-white" />
                </Button>
              </div>
            </div>
            <div className="aspect-video bg-white rounded-lg relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"
                alt="Participant"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-white rounded-full px-3 py-1 flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-sm">Albert S.</span>
              </div>
              <Button size="icon" className="absolute top-4 right-4 bg-indigo-600 hover:bg-indigo-700">
                <Mic className="w-4 h-4 text-white" />
              </Button>
            </div>
            <div className="aspect-video bg-white rounded-lg relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e"
                alt="Participant"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-white rounded-full px-3 py-1 flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-sm">Jonas K.</span>
              </div>
              <Button size="icon" className="absolute top-4 right-4 bg-indigo-600 hover:bg-indigo-700">
                <Mic className="w-4 h-4 text-white" />
              </Button>
            </div>
            <div className="aspect-video bg-white rounded-lg relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80"
                alt="Participant"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-4 bg-white rounded-full px-3 py-1 flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <span className="text-sm">Anna B.</span>
              </div>
              <Button size="icon" className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm hover:bg-white/30">
                <Camera className="w-4 h-4 text-white" />
              </Button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button size="icon" variant="outline">
              <Users className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="outline">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="outline">
              <Mic className="w-5 h-5" />
            </Button>
          </div>
          <Button className="bg-red-500 hover:bg-red-600 px-6">
            End Meeting
          </Button>
          <div className="flex items-center space-x-2">
            <Button size="icon" variant="outline">
              <Share2 className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="outline">
              <Camera className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="outline">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-80 border-l border-gray-200 flex flex-col">
        {/* Participants Section */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Participants</h2>
            <Button variant="ghost" className="text-indigo-600">
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {participants.map((participant) => (
              <div key={participant.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <span className="text-sm font-medium">
                      {participant.name} {participant.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button size="icon" variant="ghost" className="w-7 h-7">
                    <Camera className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-7 h-7">
                    <Mic className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Section */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="font-semibold">Chats</h2>
            <Button variant="ghost" className="text-indigo-600">
              View All
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div key={index} className="flex space-x-3">
                <img
                  src={message.avatar}
                  alt={message.user}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <span className="text-sm font-medium">{message.user}</span>
                  <p className="text-sm bg-gray-100 rounded-lg p-2 mt-1">
                    {message.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <Button size="icon" variant="ghost">
                <Image className="w-5 h-5 text-gray-500" />
              </Button>
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 bg-gray-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button size="icon" className="bg-indigo-600 hover:bg-indigo-700">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;


