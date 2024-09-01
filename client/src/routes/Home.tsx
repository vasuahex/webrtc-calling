// client/src/App.tsx

import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import { Device } from 'mediasoup-client';
import MediaSoupTypes, { RtpCapabilities, Transport, Producer } from 'mediasoup-client/lib/types';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { RingLoader } from 'react-spinners';
import ReactPlayer from 'react-player';

const cssOverride: CSSProperties = {
}
const params = {
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
}
interface Consumer {
  peerId: string;
  consumerId: string;
  combinedStream?: MediaStream;
}
const App: React.FC = () => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socketId, setSocketId] = useState('')
  const [roomId, setRoomId] = useState<string>(''); // room id from socket create room
  const [joinRoomId, setJoinRoomId] = useState<string>(''); // room id from input field
  // const [consumers, setConsumers] = useState<{ [producerId: string]: { combinedStream?: MediaStream } }>({});
  const [consumers, setConsumers] = useState<{ [consumerId: string]: Consumer }>({});

  // const [consumers, setConsumers] = useState<{ [producerId: string]: { audio?: MediaStream, video?: MediaStream } }>({});
  const deviceRef = useRef<MediaSoupTypes.Device | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [localStream, setLocalstream] = useState<MediaStream | null>(null);

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_API_SOCKET_URL, {
      transports: ['websocket'],
    });

    socketRef.current.on('connection-success', ({ socketId }) => {
      // toast.success(socketId, { position: "top-left" })
      setSocketId(socketId)
      setIsConnected(true);
    });
    socketRef.current.on("disconnect", () => {
      console.log("calling disconnect");
      handleDisconnectLeave();
    })
    socketRef.current.on('peerLeft', ({ peerId }) => {
      console.log(`Peer ${peerId} left the room`);
      removeConsumer(peerId);
    });
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current.off('peerLeft');
      }
    };
  }, []);

  const removeConsumer = (peerId: string) => {
    setConsumers((prevConsumers) => {
      const newConsumers = { ...prevConsumers };
      Object.keys(newConsumers).forEach((consumerId) => {
        if (newConsumers[consumerId].peerId === peerId) {
          if (newConsumers[consumerId].combinedStream) {
            newConsumers[consumerId].combinedStream.getTracks().forEach(track => track.stop());
          }
          delete newConsumers[consumerId];
        }
      });
      return newConsumers;
    });
  };

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on('newProducer', async ({ producerId, roomId, producerSocketId }) => {
      if (deviceRef.current && roomId) {
        console.log(`Received newProducer event for producer ${producerId} in room ${roomId}`);

        await createRecvTransport(producerId, deviceRef.current, roomId, producerSocketId);
      } else {
        toast.error("Device not set when trying to create receive transport", { position: "top-left" })
      }
    });
    socketRef.current.on('peerJoined', async ({ peerId }) => {
      toast.info(`user joined the room: ${peerId}`, { position: "top-left" })
    });



    return () => {
      if (socketRef.current) {
        socketRef.current.off('newProducer');
      }
    };
  }, [socketRef.current]);


  const createRoom = async () => {
    try {
      if (!socketRef.current) return;
      setIsLoading(true)
      socketRef.current.emit('createRoom', async (response: { rtpCapabilities: RtpCapabilities, roomId: string }) => {
        const { roomId, rtpCapabilities } = response;
        setRoomId(roomId);

        // Set up WebRTC connection
        const device = new Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        deviceRef.current = device
        await createSendTransport(device, roomId);
      });
    } catch (error: any) {
      console.log(error);
      setIsLoading(false)
    }
  };


  const joinRoom = async () => {
    if (!socketRef.current || !joinRoomId) return;
    setIsLoading(true)
    socketRef.current.emit('join', { roomId: joinRoomId }, async (response: any) => {
      if (response.error) {
        toast.error(`${response.error}`, { position: "top-left" })
        setIsLoading(false)
        console.error("Error joining room:", response.error);
        return;
      }

      const { rtpCapabilities, existingProducers } = response;

      // setRtpCapabilities(rtpCapabilities);

      try {
        const device = new Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        deviceRef.current = device

        setRoomId(joinRoomId)
        await createSendTransport(device, joinRoomId);

        // Create receive transports for existing producers
        for (const producer of existingProducers) {
          await createRecvTransport(producer.producerId, device, joinRoomId, producer.producerSocketId);
        }
      } catch (error) {
        setIsLoading(false)
        console.error('Failed to join room', error);
      }
    });
  };

  // when creates a call or when joins a call
  const createSendTransport = async (device: Device, roomId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('createWebRtcTransport', { roomId, direction: 'send' }, async ({ params }: any) => {
      if (params.error) {
        toast.error(`${params.error}`, { position: "top-left" })
        return;
      }
      // through which audio/video transfers. (medium)
      const transport = device!.createSendTransport(params);

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
          errback(error)
        }
      });
      await createProducers(transport);

    }
    );
  };

  // it will create streams.
  const createProducers = async (transport: Transport) => {
    // Set up local video
    const localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        width: { min: 640, max: 1920, },
        height: { min: 400, max: 1080, },
      },
    });
    // console.log(localStream.getVideoTracks()[0]);

    // const stream = new MediaStream([localStream.getVideoTracks()[0]]);
    // console.log(stream);

    setLocalstream(localStream)
    if (!localStream) {
      console.error('No local stream available');
      return;
    }

    const audioTrack = localStream.getAudioTracks()[0];
    const videoTrack = localStream.getVideoTracks()[0];
    let producer: Producer | undefined;

    if (videoTrack) {
      producer = await transport.produce({ track: videoTrack, codecOptions: params.codecOptions, encodings: params.encodings });
    }
    // if (audioTrack) {
    //   producer = await transport.produce({ track: audioTrack });
    // }
    if (producer) {
      producer.on('trackended', () => {
        console.log("track ended");
        // close video track
      })
      producer.on('transportclose', () => {
        console.log("transport closed");
        producer.close()
        // close video track

      })
    }
    setIsLoading(false)
    setIsInRoom(true)
  };

  const createRecvTransport = async (producerId: string, currentDevice: MediaSoupTypes.Device, roomId: string, peerId: string) => {
    if (!socketRef.current || !currentDevice) return;
    socketRef.current.emit('createWebRtcTransport', { roomId, direction: 'recv' }, async ({ params }: any) => {

      if (params.error) {
        toast.error(params.error, { position: "top-left" })
        console.error(params.error);
        return;
      }

      const transport = currentDevice.createRecvTransport(params);

      transport.on('connect', ({ dtlsParameters }, callback) => {
        socketRef.current!.emit('connectTransport', { roomId, transportId: transport.id, dtlsParameters }, callback);
      });
      // create recv tranport completed.
      await connectRecvTransport(transport, producerId, currentDevice, roomId, peerId);
    });
  };

  const connectRecvTransport = async (transport: Transport, producerId: string, device: MediaSoupTypes.Device, roomId: string, peerId: string) => {
    if (!socketRef.current || !roomId) return;

    socketRef.current.emit('consume', { roomId, producerId, rtpCapabilities: device!.rtpCapabilities },
      async ({ id, producerId, kind, rtpParameters }: any) => {
        const consumer = await transport.consume({
          id,
          producerId,
          kind,
          rtpParameters,
        });
        consumer.on('transportclose', () => {
          console.log("consumer transport closed.");
        })
        const stream = new MediaStream([consumer.track]);
        setConsumers((prevConsumers) => {
          const newConsumers = {
            ...prevConsumers,
            [consumer.id]: {
              peerId: peerId,
              consumerId: consumer.id,
              combinedStream: stream,
            },
          };
          console.log(`Updated consumers state. Total consumers: ${Object.keys(newConsumers).length}`);
          return newConsumers;
        });

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

  const handleDisconnectLeave = () => {
    setRoomId('');
    deviceRef.current = null;
    setConsumers({});
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalstream(null);
    setIsInRoom(false);
    socketRef.current!.emit('leaveRoom', { roomId });
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

export default App;
