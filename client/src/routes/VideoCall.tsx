import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import { Device } from 'mediasoup-client';
import MediaSoupTypes, { RtpCapabilities, Transport, Producer, IceParameters, DtlsParameters, IceCandidate } from 'mediasoup-client/lib/types';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { RingLoader } from 'react-spinners';
import ReactPlayer from 'react-player';
import iceServers from "../static";

const cssOverride: CSSProperties = {
}

// Configuration for video and audio encodings
const videoParams = {
  encodings: [
    {
      rid: 'r0',
      maxBitrate: 100000,
      scaleResolutionDownBy: 4,
      scalabilityMode: 'S1T3',
    },
    {
      rid: 'r1',
      maxBitrate: 300000,
      scaleResolutionDownBy: 2,
      scalabilityMode: 'S1T3',
    },
    {
      rid: 'r2',
      maxBitrate: 900000,
      scaleResolutionDownBy: 1,
      scalabilityMode: 'S1T3',
    }
  ],
  codecOptions: {
    videoGoogleStartBitrate: 1000
  }
};

// const audioParams = {
//   codecOptions: {
//     opusStereo: true,
//     opusDtx: true
//   }
// };

// Interfaces for type safety
interface ExistingProducer {
  producerId: string;
  producerSocketId: string;
}

interface JoinResponse {
  error?: string;
  rtpCapabilities?: RtpCapabilities;
  existingProducers?: ExistingProducer[];
}

interface Consumer {
  peerId: string;
  consumerId: string;
  kind: string;
  combinedStream?: MediaStream;
  consumer?: MediaSoupTypes.Consumer;
}
interface WebRtcTransportParams {
  id: string;
  iceParameters: IceParameters;
  dtlsParameters: DtlsParameters;
  iceCandidates: IceCandidate[];
  error?: string
}
const VideoCall: React.FC = () => {
  // State management
  const [isInRoom, setIsInRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socketId, setSocketId] = useState('');
  const [roomId, setRoomId] = useState<string>('');
  const [joinRoomId, setJoinRoomId] = useState<string>('');
  const [consumers, setConsumers] = useState<{ [consumerId: string]: Consumer }>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Refs for persistent references
  const deviceRef = useRef<MediaSoupTypes.Device | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const producersRef = useRef<{ video?: Producer, audio?: Producer }>({});

  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Socket connection and event listeners
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_API_SOCKET_URL, {
      transports: ['websocket'],
    });
    const handleSocketEvents = () => {
      socketRef.current!.on('connection-success', ({ socketId }) => {
        setSocketId(socketId);
        setIsConnected(true);
      });

      socketRef.current!.on("disconnect", handleDisconnectLeave);

      socketRef.current!.on('peerLeft', ({ peerId }) => {
        removeConsumer(peerId);
      });

      socketRef.current!.on('producerClosed', ({ peerId }) => {
        removeConsumer(peerId);
        toast.info(`User left the room: ${peerId}`, { position: "top-left" });
      });

      socketRef.current!.on('peerJoined', ({ peerId }) => {
        toast.info(`User joined the room: ${peerId}`, { position: "top-left" });
      });

      socketRef.current!.on('newProducer', async ({ producerId, roomId, producerSocketId }) => {
        if (deviceRef.current && roomId) {
          await createRecvTransport(producerId, deviceRef.current, roomId, producerSocketId);
        } else {
          toast.error("Device not set when trying to create receive transport", { position: "top-left" });
        }
      });
    };

    handleSocketEvents();

    return () => {
      if (socketRef.current) {
        socketRef.current.off('peerLeft');
        socketRef.current.off('connection-success')
        socketRef.current.off('producerClosed');
        socketRef.current.off('newProducer');
        socketRef.current.off('peerJoined');
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Remove consumer for a specific peer
  const removeConsumer = (peerId: string) => {
    setConsumers((prevConsumers) => {
      const newConsumers = { ...prevConsumers };
      Object.keys(newConsumers).forEach((consumerId) => {
        if (newConsumers[consumerId].peerId === peerId && newConsumers[consumerId].combinedStream) {
          newConsumers[consumerId].combinedStream!.getTracks().forEach(track => track.stop());
          delete newConsumers[consumerId];
        }
      });
      return newConsumers;
    });
  };

  // Room creation
  const createRoom = async () => {
    try {
      if (!socketRef.current) return;
      setIsLoading(true);
      socketRef.current.emit('createRoom', async (response: { rtpCapabilities: RtpCapabilities, roomId: string }) => {
        const { roomId, rtpCapabilities } = response;
        setRoomId(roomId);

        const device = new Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        deviceRef.current = device;
        await createSendTransport(device, roomId);
      });
    } catch (error) {
      console.error(error);
      setIsLoading(false);
    }
  };

  // Join existing room
  const joinRoom = async () => {
    if (!socketRef.current || !joinRoomId) return;
    setIsLoading(true);
    socketRef.current.emit('join', { roomId: joinRoomId }, async (response: JoinResponse) => {
      if (response.error) {
        toast.error(`${response.error}`, { position: "top-left" });
        setIsLoading(false);
        return;
      }

      const { rtpCapabilities, existingProducers } = response;
      try {
        if (rtpCapabilities && existingProducers && existingProducers?.length > 0) {
          if (!deviceRef.current) {
            deviceRef.current = new Device();
          }
          await deviceRef.current.load({ routerRtpCapabilities: rtpCapabilities });
          // deviceRef.current = device;
          setRoomId(joinRoomId);

          await createSendTransport(deviceRef.current, joinRoomId);
          existingProducers.forEach(producer => {
            createRecvTransport(producer.producerId, deviceRef.current as Device, joinRoomId, producer.producerSocketId);
          });
        } else {
          toast.error(`Existing producers or RTP capabilities are missing.`);
        }
      } catch (error) {
        console.error('Failed to join room', error);
        setIsLoading(false);
      }
    });
  };

  // Create send transport for media
  const createSendTransport = async (device: Device, roomId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('createWebRtcTransport', { roomId, direction: 'send' }, async ({ params }: { params: WebRtcTransportParams }) => {
      if (params.error) {
        toast.error(`${params.error}`, { position: "top-left" });
        return;
      }
      const transport = device.createSendTransport({ ...params, iceServers });
      transport.on('connectionstatechange', (state) => {
        console.log(`Sender transport ${transport.id} connection state changed to ${state}`);
      })
      transport.on('connect', async ({ dtlsParameters }, callback) => {
        socketRef.current!.emit('connectTransport', { roomId, transportId: transport.id, dtlsParameters }, callback);
      });
      transport.on('produce', async (parameters, callback, errback) => {
        try {
          socketRef.current!.emit('produce', {
            roomId,
            transportId: transport.id,
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData
          }, ({ id }: { id: string }) => {
            callback({ id });
          });
        } catch (error: any) {
          errback(error);
        }
      });
      await createProducers(transport);

    });
  };

  // Create producers for audio and video
  const createProducers = async (transport: Transport) => {
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { min: 640, max: 1920 },
          height: { min: 400, max: 1080 },
        },
      });
      setLocalStream(localStream);

      const videoTrack = localStream.getVideoTracks()[0];
      // const audioTrack = localStream.getAudioTracks()[0];

      // Produce video
      if (videoTrack) {
        const videoProducer = await transport.produce({
          track: videoTrack,
          codecOptions: videoParams.codecOptions,
          encodings: videoParams.encodings,
          appData: { mediaTag: 'video' },
        });
        setupProducerEvents(videoProducer, 'video');
        producersRef.current.video = videoProducer;
      }

      // Produce audio
      // if (audioTrack) {
      //   const audioProducer = await transport.produce({
      //     track: audioTrack,
      //     codecOptions: audioParams.codecOptions,
      //     appData: { mediaTag: 'audio' },
      //   });

      //   setupProducerEvents(audioProducer, 'audio');
      //   producersRef.current.audio = audioProducer;
      // }

      setIsLoading(false);
      setIsInRoom(true);
    } catch (error) {
      console.error('Error creating producers:', error);
      setIsLoading(false);
    }
  };

  // Setup common producer events
  const setupProducerEvents = (producer: Producer, type: 'video' | 'audio') => {
    producer.on('trackended', () => {
      console.log(`${type} track ended`);
      producer.close();
    });

    producer.on('transportclose', () => {
      console.log(`${type} transport closed`);
      producer.close();
    });
  };

  // Create receive transport for incoming media
  const createRecvTransport = async (producerId: string, currentDevice: MediaSoupTypes.Device, roomId: string, peerId: string) => {
    if (!socketRef.current || !currentDevice) return;
    socketRef.current.emit('createWebRtcTransport', { roomId, direction: 'recv' }, async ({ params }: { params: WebRtcTransportParams }) => {
      if (params.error) {
        toast.error(params.error, { position: "top-left" });
        return;
      }

      const transport = currentDevice.createRecvTransport({ ...params, iceServers });
      transport.on('connectionstatechange', (state) => {
        console.log(`Recv transport ${transport.id} connection state changed to ${state}`);
      })
      transport.on('connect', ({ dtlsParameters }, callback) => {
        socketRef.current!.emit('connectTransport', { roomId, transportId: transport.id, dtlsParameters }, callback);
      });


      await connectRecvTransport(transport, producerId, currentDevice, roomId, peerId);
    });
  };

  // Connect and consume incoming media
  const connectRecvTransport = async (transport: Transport, producerId: string, device: MediaSoupTypes.Device, roomId: string, peerId: string) => {
    if (!socketRef.current || !roomId) return;

    socketRef.current.emit('consume', { roomId, producerId, rtpCapabilities: device!.rtpCapabilities },
      async ({ id, producerId, kind, rtpParameters, error }: any) => {
        if (error) {
          console.error('Consume error:', error);
          return;
        }

        try {
          const consumer = await transport.consume({
            id,
            producerId,
            kind,
            rtpParameters,
          });

          const stream = new MediaStream([consumer.track]);

          // Resume consumer
          socketRef.current!.emit('resumeConsumer', { roomId, consumerId: id }, ({ params }: any) => {
            if (params.error) {
              console.error('Error resuming consumer:', params.error);
            }

          }
          );

          setConsumers(prevConsumers => {
            if (prevConsumers[consumer.id]) {
              return prevConsumers;
            }

            return {
              ...prevConsumers,
              [consumer.id]: {
                peerId,
                consumerId: consumer.id,
                kind: consumer.kind,
                combinedStream: stream,
                consumer: consumer
              }
            };
          });
          // Setup cleanup
          consumer.on('transportclose', () => {
            removeConsumer(peerId);
          });

        } catch (error) {
          console.error('Error in consume handler:', error);
        }
      });
  };

  // Handle disconnection and room leaving
  const handleDisconnectLeave = () => {
    // Close producers
    Object.values(producersRef.current).forEach(producer => producer?.close());
    producersRef.current = {};

    setRoomId('');
    deviceRef.current = null;
    setConsumers({});

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);
    setIsInRoom(false);
    socketRef.current?.emit('leaveRoom', { roomId });
  };

  // Render UI (remains mostly the same as previous implementation)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-500">
      <div className="space-y-4">
        {!isConnected ? (
          <div>Connecting to server...</div>
        ) : !isInRoom ? (
          <div className="space-y-2">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={createRoom}>
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
              <div>
                <h3 className="text-lg font-semibold">Local Video</h3>
                <div className='w-80 h-60 bg-black'>
                  {localStream && (
                    <ReactPlayer
                      style={{ transform: "scaleX(-1)" }}
                      url={localStream}
                      playing
                      muted
                      width="100%"
                      height="100%"
                    />
                  )}
                  <p className='px-3 py-2 bg-white'>{socketId}</p>
                </div>
              </div>
              <div className=' space-y-2'>
                <h3 className="text-lg gap-5 font-semibold">Remote Videos</h3>
                {Object.entries(consumers).map(([consumerId, { combinedStream, peerId }]) => (
                  <div key={consumerId} className='w-80 h-60  bg-black'>
                    <ReactPlayer
                      style={{ transform: "scaleX(-1)" }}
                      url={combinedStream}
                      playing
                      width="100%"
                      height="80%"
                    />
                    <p className='bg-white p-2'>Peer ID: {peerId}</p>
                  </div>
                ))}
              </div>
            </div>
            <button
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={handleDisconnectLeave}
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

export default VideoCall;