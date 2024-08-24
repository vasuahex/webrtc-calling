// client/src/App.tsx

import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import { Device } from 'mediasoup-client';
import MediaSoupTypes, { RtpCapabilities, Transport, Producer, Consumer } from 'mediasoup-client/lib/types';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { RingLoader } from 'react-spinners';
import ReactPlayer from 'react-player';

const cssOverride: CSSProperties = {
}
const App: React.FC = () => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [roomId, setRoomId] = useState<string>(''); // room id from socket create room
  const [joinRoomId, setJoinRoomId] = useState<string>(''); // room id from input field
  // const [device, setDevice] = useState<MediaSoupTypes.Device | null>(null);
  const deviceRef = useRef<MediaSoupTypes.Device | null>(null);
  // const [rtpCapabilities, setRtpCapabilities] = useState<any>(null);
  const [producerTransport, setProducerTransport] = useState<any>(null);
  const [consumerTransports, setConsumerTransports] = useState<any[]>([]);
  const [audioProducer, setAudioProducer] = useState<any>(null);
  const [videoProducer, setVideoProducer] = useState<any>(null);
  const [consumers, setConsumers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
  const [localStream, setLocalstream] = useState<MediaStream | null>(null);
  const remoteVideosRef = useRef<HTMLDivElement>(null);
  // console.log(rtpCapabilities, producerTransport, consumerTransports, audioProducer, videoProducer);

  useEffect(() => {
    socketRef.current = io('https://localhost:5000', {
      transports: ['websocket'],
    });

    socketRef.current.on('connection-success', ({ socketId }) => {
      console.log('Connected to server', socketId);
      setIsConnected(true);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on('newProducer', async ({ producerId, producerSocketId, roomId }) => {
      if (deviceRef.current && roomId) {
        await createRecvTransport(producerId, deviceRef.current, roomId);
      } else {
        toast.error("Device not set when trying to create receive transport", { position: "top-left" })
      }
    });
    // socketRef.current.on('peerJoined', async ({ peerId }) => {
    //   toast.info(`user joined the room: ${peerId}`, { position: "top-left" })
    // });

    socketRef.current.on('peerLeft', ({ peerId }) => {
      console.log('Peer Left:', peerId);
      setConsumers(prevConsumers =>
        prevConsumers.filter(consumer => consumer.consumer.producerId !== peerId)
      );
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('newProducer');
        socketRef.current.off('peerLeft');
      }
    };
  }, [socketRef.current]);


  const createRoom = async () => {
    if (!socketRef.current) return;
    setIsLoading(true)
    socketRef.current.emit('createRoom', async (response: any) => {
      const { roomId, rtpCapabilities } = response;
      setRoomId(roomId);

      // Set up WebRTC connection
      const device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device
      await createSendTransport(device, roomId);
    });
  };


  const joinRoom = async () => {
    if (!socketRef.current || !joinRoomId) return;
    setIsLoading(true)
    socketRef.current.emit('join', { roomId: joinRoomId }, async (response: any) => {
      if (response.error) {
        toast.error(`${response.error}`, { position: "top-left" })
        console.error("Error joining room:", response.error);
        return;
      }

      const { rtpCapabilities } = response;

      // setRtpCapabilities(rtpCapabilities);

      try {
        const device = new Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        deviceRef.current = device

        setRoomId(joinRoomId)
        await createSendTransport(device, joinRoomId);
      } catch (error) {
        console.error('Failed to join room', error);
      }
    });
  };

  // when creates a call or when joins a call
  const createSendTransport = async (device: Device, roomId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('createWebRtcTransport', { roomId }, async ({ params }: any) => {
      if (params.error) {
        toast.error(`${params.error}`, { position: "top-left" })
        return;
      }

      const transport = device!.createSendTransport(params);

      transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        socketRef.current!.emit('connectTransport',
          { roomId, transportId: transport.id, dtlsParameters }, callback);
      });

      transport.on('produce', async (parameters, callback, errback) => {

        socketRef.current!.emit('produce', {
          roomId,
          transportId: transport.id,
          kind: parameters.kind,
          rtpParameters: parameters.rtpParameters,
        }, ({ id }: { id: string }) => {

          callback({ id });
        });
      });
      setProducerTransport(transport);
      await createProducers(transport);
    }
    );
  };

  // it will create streams.
  const createProducers = async (transport: any) => {
    // Set up local video
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        width: { min: 640, max: 1920, },
        height: { min: 400, max: 1080, },
      },
    });
    setLocalstream(localStream)
    if (!localStream) {
      console.error('No local stream available');
      return;
    }

    const audioTrack = localStream.getAudioTracks()[0];
    const videoTrack = localStream.getVideoTracks()[0];

    if (audioTrack) {
      const audioProducer = await transport.produce({ track: audioTrack });
      setAudioProducer(audioProducer);
    }

    if (videoTrack) {
      const videoProducer = await transport.produce({ track: videoTrack });
      setVideoProducer(videoProducer);
    }
    setIsLoading(false)
    setIsInRoom(true)
  };

  const createRecvTransport = async (producerId: string, currentDevice: MediaSoupTypes.Device, roomId: string) => {
    if (!socketRef.current || !currentDevice) return;

    socketRef.current.emit('createWebRtcTransport', { roomId }, async ({ params }: any) => {

      if (params.error) {
        toast.error(params.error, { position: "top-left" })
        console.error(params.error);
        return;
      }

      const transport = currentDevice.createRecvTransport(params);

      transport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socketRef.current!.emit('connectTransport', { roomId, transportId: transport.id, dtlsParameters }, callback);
      });
      // create recv tranport completed.
      await connectRecvTransport(transport, producerId, currentDevice, roomId);
    });
  };

  const connectRecvTransport = async (transport: any, producerId: string, device: MediaSoupTypes.Device, roomId: string) => {
    if (!socketRef.current || !roomId) return;

    socketRef.current.emit('consume', { roomId, producerId, rtpCapabilities: device!.rtpCapabilities },
      async ({ id, producerId, kind, rtpParameters }: any) => {
        const consumer = await transport.consume({
          id,
          producerId,
          kind,
          rtpParameters,
        });

        const stream = new MediaStream([consumer.track]);

        setConsumers((prevConsumers) => [...prevConsumers, { consumer, stream }]);

        socketRef.current!.emit('resumeConsumer', { roomId, consumerId: id }, ({ params }: any) => {
          if (params.error) {
            toast.error(params.error, { position: "top-left" })
            console.error(params.error);
            return;
          }
        });
      }
    );
  };

  const leaveRoom = () => {
    if (!socketRef.current || !roomId) return;

    socketRef.current.emit('leaveRoom', { roomId });
    setRoomId('');
    // setDevice(null);
    deviceRef.current = null
    // setRtpCapabilities(null);
    setProducerTransport(null);
    setConsumerTransports([]);
    setAudioProducer(null);
    setVideoProducer(null);
    setConsumers([]);

    // Close local media stream
    if (localStream) {
      const tracks = (localStream as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    // if (localVideoRef.current) {
    //   localVideoRef.current.srcObject = null;
    // }

    // Remove all remote video elements
    if (remoteVideosRef.current) {
      remoteVideosRef.current.innerHTML = '';
    }
    setIsInRoom(false)
  };


  useEffect(() => {
    console.log("consumers ", consumers);

    consumers.forEach(({ stream }, index) => {
      if (remoteVideosRef.current) {
        const videoElement = document.createElement('video');
        videoElement.srcObject = stream;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.style.width = '320px';
        videoElement.style.height = '240px';
        remoteVideosRef.current.appendChild(videoElement);
        console.log("Remote video element appended");
      }
    });

    return () => {
      if (remoteVideosRef.current) {
        remoteVideosRef.current.innerHTML = '';
      }
    };
  }, [consumers]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-500">
      <div className="space-y-4">
        {!isConnected ? (
          <div>Connecting to server...</div>
        ) : !isInRoom ? (
          <div className="space-y-2">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={createRoom}
            >
              Create Room
            </button>
            <div className="flex space-x-2">
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="px-2 py-1 border rounded"
              />
              <button
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                onClick={joinRoom}
              >
                Join Room
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            <div>Room ID: {roomId}</div>
            <div className="flex space-x-4">
              <div className='w-80 h-60 bg-black'>
                <h3 className="text-lg font-semibold">Local Video</h3>
                {localStream && (
                  <ReactPlayer
                    url={localStream}
                    playing
                    muted
                    width="100%"
                    height="100%"
                  />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold">Remote Videos</h3>
                <div ref={remoteVideosRef} className="flex flex-wrap gap-2" />
              </div>
            </div>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={leaveRoom}
            >
              Leave Room
            </button>
          </div>
        )}
      </div>
      <div className={`${isLoading === true ? "fixed top-0 left-0 flex justify-center items-center bg-black bg-opacity-70 w-full h-screen z-40" : "hidden"} `}>
        <RingLoader
          color="#36d7b7"
          size={500}
          cssOverride={cssOverride}
          loading={true}
          aria-label="Loading Spinner"
          speedMultiplier={.51}
          data-testid="loader"
        />
      </div>
    </div>
  );
};

export default App;
