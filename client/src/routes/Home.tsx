// client/src/App.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Device } from 'mediasoup-client';
import { io, Socket } from 'socket.io-client';

const App: React.FC = () => {
  const [roomId, setRoomId] = useState<string>('');
  const [device, setDevice] = useState<Device | null>(null);
  const [rtpCapabilities, setRtpCapabilities] = useState<any>(null);
  const [producerTransport, setProducerTransport] = useState<any>(null);
  const [consumerTransports, setConsumerTransports] = useState<any[]>([]);
  const [audioProducer, setAudioProducer] = useState<any>(null);
  const [videoProducer, setVideoProducer] = useState<any>(null);
  const [consumers, setConsumers] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socketRef.current = io('https://localhost:3000', {
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

  const createRoom = async () => {
    if (!socketRef.current) return;

    socketRef.current.emit('createRoom', (response: any) => {
      const { roomId } = response;
      setRoomId(roomId);
      console.log('Room created', roomId);
    });
  };

  const joinRoom = async () => {
    if (!socketRef.current || !roomId) return;

    socketRef.current.emit('join', { roomId }, async (response: any) => {
      const { rtpCapabilities } = response;
      setRtpCapabilities(rtpCapabilities);

      try {
        const device = new Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        setDevice(device);

        await createSendTransport();
      } catch (error) {
        console.error('Failed to join room', error);
      }
    });
  };

  const createSendTransport = async () => {
    if (!socketRef.current) return;

    socketRef.current.emit(
      'createWebRtcTransport',
      { roomId },
      async ({ params }: any) => {
        if (params.error) {
          console.error(params.error);
          return;
        }

        const transport = device!.createSendTransport(params);

        transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
          socketRef.current!.emit(
            'connectTransport',
            { roomId, transportId: transport.id, dtlsParameters },
            callback
          );
        });

        transport.on('produce', async (parameters, callback, errback) => {
          socketRef.current!.emit(
            'produce',
            {
              roomId,
              transportId: transport.id,
              kind: parameters.kind,
              rtpParameters: parameters.rtpParameters,
            },
            ({ id }: { id: string }) => {
              callback({ id });
            }
          );
        });

        setProducerTransport(transport);
        await createProducers(transport);
      }
    );
  };

  const createProducers = async (transport: any) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }

    const audioTrack = stream.getAudioTracks()[0];
    const videoTrack = stream.getVideoTracks()[0];

    const audioProducer = await transport.produce({ track: audioTrack });
    const videoProducer = await transport.produce({ track: videoTrack });

    setAudioProducer(audioProducer);
    setVideoProducer(videoProducer);
  };

  const createRecvTransport = async (producerId: string) => {
    if (!socketRef.current || !device) return;

    socketRef.current.emit(
      'createWebRtcTransport',
      { roomId },
      async ({ params }: any) => {
        if (params.error) {
          console.error(params.error);
          return;
        }

        const transport = device.createRecvTransport(params);

        transport.on('connect', ({ dtlsParameters }, callback, errback) => {
          socketRef.current!.emit(
            'connectTransport',
            { roomId, transportId: transport.id, dtlsParameters },
            callback
          );
        });

        await connectRecvTransport(transport, producerId);
      }
    );
  };

  const connectRecvTransport = async (transport: any, producerId: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit(
      'consume',
      { roomId, producerId, rtpCapabilities: device!.rtpCapabilities },
      async ({ id, producerId, kind, rtpParameters }: any) => {
        const consumer = await transport.consume({
          id,
          producerId,
          kind,
          rtpParameters,
        });

        const stream = new MediaStream([consumer.track]);

        setConsumers((prevConsumers) => [...prevConsumers, { consumer, stream }]);

        socketRef.current!.emit('resumeConsumer', { roomId, consumerId: id });
      }
    );
  };
  const leaveRoom = () => {
    if (!socketRef.current || !roomId) return;

    socketRef.current.emit('leaveRoom', { roomId });
    setRoomId('');
    setDevice(null);
    setRtpCapabilities(null);
    setProducerTransport(null);
    setConsumerTransports([]);
    setAudioProducer(null);
    setVideoProducer(null);
    setConsumers([]);

    // Close local media stream
    if (localVideoRef.current && localVideoRef.current.srcObject) {
        const tracks = (localVideoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
    }
    if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
    }

    // Remove all remote video elements
    if (remoteVideosRef.current) {
        remoteVideosRef.current.innerHTML = '';
    }
};

useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on('newProducer', ({ producerId, producerSocketId }) => {
        createRecvTransport(producerId);
    });

    socketRef.current.on('peerLeft', ({ peerId }) => {
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

useEffect(() => {
    consumers.forEach(({ stream }, index) => {
        if (remoteVideosRef.current) {
            const videoElement = document.createElement('video');
            videoElement.srcObject = stream;
            videoElement.autoplay = true;
            videoElement.playsInline = true;
            videoElement.style.width = '320px';
            videoElement.style.height = '240px';
            remoteVideosRef.current.appendChild(videoElement);
        }
    });

    return () => {
        if (remoteVideosRef.current) {
            remoteVideosRef.current.innerHTML = '';
        }
    };
}, [consumers]);

return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="space-y-4">
            {!isConnected ? (
                <div>Connecting to server...</div>
            ) : !roomId ? (
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
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
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
                <div className="space-y-4">
                    <div>Room ID: {roomId}</div>
                    <div className="flex space-x-4">
                        <div>
                            <h3 className="text-lg font-semibold">Local Video</h3>
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-80 h-60 bg-black"
                            />
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
    </div>
);
};

export default App;