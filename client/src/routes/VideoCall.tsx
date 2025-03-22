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

const audioParams = {
  codecOptions: {
    opusStereo: true,
    opusDtx: true
  }
};

interface ExistingProducer {
  producerId: string;
  producerSocketId: string;
  kind: string;
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
  stream: MediaStream;
  consumer: MediaSoupTypes.Consumer;
}

interface WebRtcTransportParams {
  id: string;
  iceParameters: IceParameters;
  dtlsParameters: DtlsParameters;
  iceCandidates: IceCandidate[];
  error?: string
}

interface TransportResponse {
  params: WebRtcTransportParams;
}

interface ConsumeResponse {
  id: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: any;
  error?: string;
}

const VideoCall: React.FC = () => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socketId, setSocketId] = useState('');
  const [roomId, setRoomId] = useState<string>('');
  const [joinRoomId, setJoinRoomId] = useState<string>('');
  const [consumers, setConsumers] = useState<{ [consumerId: string]: Consumer }>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const deviceRef = useRef<MediaSoupTypes.Device | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const producersRef = useRef<{ [key: string]: Producer }>({});
  const recvTransportRef = useRef<Transport | null>(null);

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
        removeConsumersByPeerId(peerId);
      });

      socketRef.current!.on('producerClosed', ({ peerId }) => {
        removeConsumersByPeerId(peerId);
        toast.info(`User left the room: ${peerId}`, { position: "top-left" });
      });

      socketRef.current!.on('peerJoined', ({ peerId }) => {
        toast.info(`User joined the room: ${peerId}`, { position: "top-left" });
      });

      socketRef.current!.on('newProducer', async ({ producerId, roomId, producerSocketId, kind }) => {
        if (deviceRef.current && roomId) {
          await consumeNewProducer(producerId, roomId, producerSocketId, kind);
        }
      });
    };

    handleSocketEvents();

    return () => {
      if (socketRef.current) {
        socketRef.current.off('peerLeft');
        socketRef.current.off('connection-success');
        socketRef.current.off('producerClosed');
        socketRef.current.off('newProducer');
        socketRef.current.off('peerJoined');
        socketRef.current.disconnect();
      }
    };
  }, []);

  const removeConsumersByPeerId = (peerId: string) => {
    setConsumers(prevConsumers => {
      const newConsumers = { ...prevConsumers };
      Object.entries(newConsumers).forEach(([consumerId, consumer]) => {
        if (consumer.peerId === peerId) {
          consumer.stream.getTracks().forEach(track => track.stop());
          consumer.consumer.close();
          delete newConsumers[consumerId];
        }
      });
      return newConsumers;
    });
  };

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

  const joinRoom = async () => {
    if (!socketRef.current || !joinRoomId) return;
    setIsLoading(true);
    socketRef.current.emit('join', { roomId: joinRoomId }, async (response: JoinResponse) => {
      if (response.error) {
        toast.error(response.error, { position: "top-left" });
        setIsLoading(false);
        return;
      }

      const { rtpCapabilities, existingProducers } = response;
      try {
        if (!deviceRef.current) {
          deviceRef.current = new Device();
        }
        if (!rtpCapabilities) {
          throw new Error('RTP Capabilities are missing');
        }
        await deviceRef.current.load({ routerRtpCapabilities: rtpCapabilities });
        setRoomId(joinRoomId);

        await createSendTransport(deviceRef.current, joinRoomId);

        if (existingProducers && existingProducers.length > 0) {
          for (const producer of existingProducers) {
            await consumeNewProducer(producer.producerId, joinRoomId, producer.producerSocketId, producer.kind);
          }
        }
      } catch (error) {
        console.error('Failed to join room', error);
        setIsLoading(false);
      }
    });
  };

  const createSendTransport = async (device: Device, roomId: string) => {
    if (!socketRef.current) return;
    try {
      const { params } = await new Promise<TransportResponse>((resolve) => {
        socketRef.current!.emit('createWebRtcTransport', { roomId, direction: 'send' }, resolve);
      });

      if (params.error) {
        console.error('Transport creation error:', params.error);
        toast.error(`Failed to create transport: ${params.error}`, { position: "top-left" });
        return;
      }

      const transport = device.createSendTransport({ ...params, iceServers });

      transport.on('connect', async ({ dtlsParameters }, callback: any) => {
        try {
          socketRef.current!.emit('connectTransport', { roomId, transportId: transport.id, dtlsParameters }, (response: any) => {
            if (response?.error) {
              callback(new Error(response.error));
            } else {
              callback();
            }
          });
        } catch (error: any) {
          callback(error);
        }
      });

      transport.on('produce', async (parameters, callback, errback) => {
        try {
          socketRef.current!.emit('produce', {
            roomId,
            transportId: transport.id,
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData
          }, ({ id, error }: { id: string, error?: string }) => {
            if (error) {
              errback(new Error(error));
            } else {
              callback({ id });
            }
          });
        } catch (error: any) {
          errback(error);
        }
      });

      await createProducers(transport);
    } catch (error) {
      console.error('Create send transport error:', error);
      toast.error('Failed to create send transport', { position: "top-left" });
    }
  };

  const consumeNewProducer = async (producerId: string, roomId: string, peerId: string, kind: string) => {
    try {
      if (!recvTransportRef.current) {
        const { params } = await new Promise<TransportResponse>((resolve) => {
          socketRef.current!.emit('createWebRtcTransport', { roomId, direction: 'recv' }, resolve);
        });

        if (params.error) {
          throw new Error(params.error);
        }

        const transport = deviceRef.current!.createRecvTransport({ ...params, iceServers });

        transport.on('connect', ({ dtlsParameters }, callback) => {
          socketRef.current!.emit('connectTransport', { roomId, transportId: transport.id, dtlsParameters }, callback);
        });

        recvTransportRef.current = transport;
      }

      const { id, rtpParameters, error } = await new Promise<ConsumeResponse>((resolve) => {
        socketRef.current!.emit('consume', {
          roomId,
          producerId,
          rtpCapabilities: deviceRef.current!.rtpCapabilities
        }, resolve);
      });

      if (error) {
        throw new Error(error);
      }

      const consumer = await recvTransportRef.current.consume({
        id,
        producerId,
        kind: kind as 'audio' | 'video',
        rtpParameters,
      });

      const stream = new MediaStream([consumer.track]);

      await new Promise<void>((resolve, reject) => {
        socketRef.current!.emit('resumeConsumer', { roomId, consumerId: consumer.id }, (response: any) => {
          if (response?.params?.error) {
            reject(new Error(response.params.error));
          } else {
            resolve();
          }
        });
      });

      setConsumers(prev => ({
        ...prev,
        [consumer.id]: {
          peerId,
          consumerId: consumer.id,
          kind: consumer.kind,
          stream,
          consumer
        }
      }));

    } catch (error) {
      console.error('Error consuming new producer:', error);
      toast.error('Failed to consume media', { position: "top-left" });
    }
  };

  const createProducers = async (transport: Transport) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { min: 640, max: 1920 },
          height: { min: 400, max: 1080 },
        },
      });
      setLocalStream(stream);

      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        const videoProducer = await transport.produce({
          track: videoTrack,
          encodings: videoParams.encodings,
          codecOptions: videoParams.codecOptions,
          appData: { mediaTag: 'video' }
        });
        producersRef.current.video = videoProducer;
      }

      if (audioTrack) {
        const audioProducer = await transport.produce({
          track: audioTrack,
          codecOptions: audioParams.codecOptions,
          appData: { mediaTag: 'audio' }
        });
        producersRef.current.audio = audioProducer;
      }

      setIsLoading(false);
      setIsInRoom(true);
    } catch (error) {
      console.error('Error creating producers:', error);
      setIsLoading(false);
    }
  };

  const handleDisconnectLeave = () => {
    Object.values(producersRef.current).forEach(producer => producer?.close());
    producersRef.current = {};

    Object.values(consumers).forEach(consumer => {
      consumer.stream.getTracks().forEach(track => track.stop());
      consumer.consumer.close();
    });

    if (recvTransportRef.current) {
      recvTransportRef.current.close();
      recvTransportRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    setLocalStream(null);
    setConsumers({});
    setRoomId('');
    setIsInRoom(false);
    deviceRef.current = null;

    if (socketRef.current) {
      socketRef.current.emit('leaveRoom', { roomId });
    }
  };

  const getVideoConsumers = () => {
    return Object.values(consumers).filter(consumer => consumer.kind === 'video');
  };

  const getAudioConsumers = () => {
    return Object.values(consumers).filter(consumer => consumer.kind === 'audio');
  };

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
              <div className='space-y-2'>
                <h3 className="text-lg gap-5 font-semibold">Remote Videos</h3>
                <div className="grid grid-cols-2 gap-4">
                  {getVideoConsumers().map(({ consumerId, stream, peerId }) => (
                    <div key={consumerId} className='w-80 h-60 bg-black'>
                      <ReactPlayer
                        style={{ transform: "scaleX(-1)" }}
                        url={stream}
                        playing
                        width="100%"
                        height="80%"
                      />
                      <p className='bg-white p-2'>Peer ID: {peerId}</p>
                    </div>
                  ))}
                </div>
                {getAudioConsumers().map(({ consumerId, stream }) => (
                  <audio
                    key={consumerId}
                    autoPlay
                    playsInline
                    ref={(audio) => {
                      if (audio) {
                        audio.srcObject = stream;
                        audio.volume = 1.0;
                      }
                    }}
                  />
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
      {isLoading && (
        <div className="fixed top-0 left-0 flex justify-center items-center bg-black bg-opacity-70 w-full h-screen z-40">
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
      )}
    </div>
  );
};

export default VideoCall;