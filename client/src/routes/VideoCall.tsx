import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import { Device } from 'mediasoup-client';
import MediaSoupTypes, { RtpCapabilities, Transport, Producer, IceParameters, DtlsParameters, IceCandidate } from 'mediasoup-client/lib/types';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { RingLoader } from 'react-spinners';
import ReactPlayer from 'react-player';
import iceServers from "../static";

const cssOverride: CSSProperties = {};

const videoParams = {
  encodings: [
    { rid: 'r0', maxBitrate: 100000, scaleResolutionDownBy: 4, scalabilityMode: 'S1T3' },
    { rid: 'r1', maxBitrate: 300000, scaleResolutionDownBy: 2, scalabilityMode: 'S1T3' },
    { rid: 'r2', maxBitrate: 900000, scaleResolutionDownBy: 1, scalabilityMode: 'S1T3' }
  ],
  codecOptions: { videoGoogleStartBitrate: 1000 }
};

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
  error?: string;
}

interface IProducer {
  id: string;
  kind: string;
  track: MediaStreamTrack;
}

const VideoCall: React.FC = () => {
  const [isInRoom, setIsInRoom] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socketId, setSocketId] = useState('');
  const [roomId, setRoomId] = useState<string>('');
  const [joinRoomId, setJoinRoomId] = useState<string>('');
  const [consumers, setConsumers] = useState<{ [consumerId: string]: Consumer }>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [producers, setProducers] = useState<{ [producerId: string]: IProducer }>({});

  const deviceRef = useRef<MediaSoupTypes.Device | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const producersRef = useRef<{ video?: Producer, audio?: Producer }>({});
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_API_SOCKET_URL, { transports: ['websocket'] });

    const handleSocketEvents = () => {
      socketRef.current!.on('connection-success', ({ socketId }) => {
        setSocketId(socketId);
        // setIsConnected(true);
      });

      socketRef.current!.on('disconnect', handleDisconnectLeave);

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

      socketRef.current!.on('newProducer', async ({ producerId, producerSocketId }) => {
        if (recvTransportRef.current && deviceRef.current) {
          await consumeProducer(producerId, producerSocketId);
        }
      });
    };

    handleSocketEvents();

    return () => {
      if (socketRef.current) {
        // Remove all event listeners
        socketRef.current.off('connection-success');
        socketRef.current.off('disconnect');
        socketRef.current.off('peerLeft');
        socketRef.current.off('producerClosed');
        socketRef.current.off('peerJoined');
        socketRef.current.off('newProducer');

        // Disconnect the socket
        socketRef.current.disconnect();
      }
    };
  }, []);
  console.log(consumers);
  const removeConsumer = (peerId: string) => {
    setConsumers((prevConsumers) => {
      const newConsumers = { ...prevConsumers };
      Object.keys(newConsumers).forEach((consumerId) => {
        if (newConsumers[consumerId].peerId === peerId) {
          newConsumers[consumerId].combinedStream?.getTracks().forEach(track => track.stop());
          delete newConsumers[consumerId];
        }
      });
      return newConsumers;
    });
  };


  const createRoom = async () => {
    if (!socketRef.current) return;
    setIsLoading(true);

    socketRef.current.emit('createRoom', async (response: { rtpCapabilities: RtpCapabilities, roomId: string }) => {
      const { roomId, rtpCapabilities } = response;
      setRoomId(roomId);

      const device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;

      await createSendTransport(device, roomId);
      await createRecvTransport(device, roomId);
    });
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
      if (rtpCapabilities && existingProducers) {
        const device = new Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });
        deviceRef.current = device;
        setRoomId(joinRoomId);

        // Create transports first
        await createSendTransport(device, joinRoomId);
        await createRecvTransport(device, joinRoomId);

        // Wait a short moment to ensure transports are ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Now consume existing producers
        for (const producer of existingProducers) {
          console.log('Attempting to consume producer:', producer);
          await consumeProducer(producer.producerId, producer.producerSocketId);
        }
      }
      setIsLoading(false);
    });
  };

  const createSendTransport = async (device: Device, roomId: string) => {
    console.log('Starting createSendTransport');
    if (!socketRef.current || sendTransportRef.current) {
      console.log('Transport creation skipped:', { 
        hasSocket: !!socketRef.current, 
        hasExistingTransport: !!sendTransportRef.current 
      });
      return;
    }

    socketRef.current.emit('createWebRtcTransport', { roomId, direction: 'send' }, async ({ params }: { params: WebRtcTransportParams }) => {
      if (params.error) {
        console.error('Transport creation error:', params.error);
        toast.error(params.error, { position: "top-left" });
        return;
      }
      console.log('Received transport params:', { 
        transportId: params.id,
        hasIceParameters: !!params.iceParameters,
        hasDtlsParameters: !!params.dtlsParameters,
        iceCandidatesCount: params.iceCandidates.length
      });

      const transport = device.createSendTransport({ ...params, iceServers });
      sendTransportRef.current = transport;
      console.log('Created send transport:', { transportId: transport.id });

      transport.on('connectionstatechange', (state) => {
        console.log('Send transport connection state:', state);
      });

      transport.on('connect', async ({ dtlsParameters }, callback) => {
        console.log('Send transport connect event');
        socketRef.current!.emit('connectTransport', { roomId, transportId: transport.id, dtlsParameters }, callback);
      });

      transport.on('produce', async (parameters, callback, errback) => {
        console.log('Send transport produce event:', { 
          kind: parameters.kind,
          hasRtpParameters: !!parameters.rtpParameters
        });
        try {
          socketRef.current!.emit('produce', {
            roomId,
            transportId: transport.id,
            kind: parameters.kind,
            rtpParameters: parameters.rtpParameters,
            appData: parameters.appData
          }, ({ id }: { id: string }) => {
            console.log('Producer created on server:', { producerId: id });
            callback({ id });
          });
        } catch (error: any) {
          console.error('Error in produce event:', error);
          errback(error);
        }
      });

      await createProducers(transport);
    });
  };

  const createRecvTransport = async (device: Device, roomId: string) => {
    console.log('Starting createRecvTransport');
    if (!socketRef.current || recvTransportRef.current) {
      console.log('Transport creation skipped:', { 
        hasSocket: !!socketRef.current, 
        hasExistingTransport: !!recvTransportRef.current 
      });
      return;
    }

    socketRef.current.emit('createWebRtcTransport', { roomId, direction: 'recv' }, async ({ params }: { params: WebRtcTransportParams }) => {
      if (params.error) {
        console.error('Transport creation error:', params.error);
        toast.error(params.error, { position: "top-left" });
        return;
      }
      console.log('Received transport params:', { 
        transportId: params.id,
        hasIceParameters: !!params.iceParameters,
        hasDtlsParameters: !!params.dtlsParameters,
        iceCandidatesCount: params.iceCandidates.length
      });

      const transport = device.createRecvTransport({ ...params, iceServers });
      recvTransportRef.current = transport;
      console.log('Created recv transport:', { transportId: transport.id });

      transport.on('connectionstatechange', (state) => {
        console.log('Recv transport connection state:', state);
      });

      transport.on('connect', ({ dtlsParameters }, callback) => {
        console.log('Recv transport connect event');
        socketRef.current!.emit('connectTransport', { roomId, transportId: transport.id, dtlsParameters }, callback);
      });
    });
  };

  const consumeProducer = async (producerId: string, peerId: string) => {
    console.log('Starting consumeProducer:', { producerId, peerId });
    if (!recvTransportRef.current || !deviceRef.current || !roomId) {
      console.error('Missing required refs:', { 
        hasRecvTransport: !!recvTransportRef.current, 
        hasDevice: !!deviceRef.current, 
        roomId,
        recvTransportState: recvTransportRef.current?.connectionState,
        deviceLoaded: deviceRef.current?.loaded
      });
      return;
    }

    try {
      console.log('Emitting consume event with:', {
        roomId,
        producerId,
        hasRtpCapabilities: !!deviceRef.current.rtpCapabilities
      });

      socketRef.current!.emit('consume', { 
        roomId, 
        producerId, 
        rtpCapabilities: deviceRef.current.rtpCapabilities 
      }, async ({ id, kind, rtpParameters, error }: any) => {
        if (error) {
          console.error('Consume error from server:', error);
          return;
        }
        console.log('Received consume response:', { id, kind, hasRtpParameters: !!rtpParameters });

        try {
          console.log('Creating consumer with params:', { id, producerId, kind });
          const consumer = await recvTransportRef.current!.consume({
            id,
            producerId,
            kind,
            rtpParameters,
          });
          console.log('Consumer created successfully:', { 
            consumerId: consumer.id, 
            kind: consumer.kind,
            trackEnabled: consumer.track.enabled,
            trackReadyState: consumer.track.readyState
          });

          const stream = new MediaStream([consumer.track]);
          console.log('Created MediaStream with track:', { 
            trackKind: consumer.track.kind,
            trackId: consumer.track.id,
            trackEnabled: consumer.track.enabled,
            trackReadyState: consumer.track.readyState
          });

          setConsumers((prevConsumers) => {
            const newConsumers = {
              ...prevConsumers,
              [consumer.id]: { peerId, consumerId: consumer.id, kind, combinedStream: stream, consumer }
            };
            console.log('Updated consumers state:', { 
              totalConsumers: Object.keys(newConsumers).length,
              consumerIds: Object.keys(newConsumers),
              peerIds: Object.values(newConsumers).map(c => c.peerId)
            });
            return newConsumers;
          });

          console.log('Emitting resumeConsumer event');
          socketRef.current!.emit('resumeConsumer', { roomId, consumerId: id });
        } catch (error) {
          console.error('Error in consumeProducer:', error);
        }
      });
    } catch (error) {
      console.error('Error in consumeProducer outer try block:', error);
    }
  };

  const createProducers = async (transport: Transport) => {
    try {
      console.log('Starting createProducers');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        }, 
        audio: true 
      });
      console.log('Got user media stream:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      setLocalStream(stream);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        console.log('Creating video producer with track:', {
          trackId: videoTrack.id,
          trackKind: videoTrack.kind,
          trackEnabled: videoTrack.enabled
        });
        const videoProducer = await transport.produce({
          track: videoTrack,
          encodings: videoParams.encodings,
          codecOptions: videoParams.codecOptions,
          appData: { mediaTag: 'video' }
        });
        console.log('Video producer created:', { producerId: videoProducer.id });
        producersRef.current.video = videoProducer;
        
        setProducers(prev => ({
          ...prev,
          [videoProducer.id]: {
            id: videoProducer.id,
            kind: 'video',
            track: videoTrack
          }
        }));
      }

      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        console.log('Creating audio producer with track:', {
          trackId: audioTrack.id,
          trackKind: audioTrack.kind,
          trackEnabled: audioTrack.enabled
        });
        const audioProducer = await transport.produce({
          track: audioTrack,
          appData: { mediaTag: 'audio' }
        });
        console.log('Audio producer created:', { producerId: audioProducer.id });
        producersRef.current.audio = audioProducer;
        
        setProducers(prev => ({
          ...prev,
          [audioProducer.id]: {
            id: audioProducer.id,
            kind: 'audio',
            track: audioTrack
          }
        }));
      }

      setIsInRoom(true);
      setIsLoading(false);
      console.log('Producers created successfully:', producers);
    } catch (error) {
      console.error('Error in createProducers:', error);
      setIsLoading(false);
    }
  };

  const handleDisconnectLeave = () => {
    if (sendTransportRef.current) sendTransportRef.current.close();
    if (recvTransportRef.current) recvTransportRef.current.close();
    if (localStream) localStream.getTracks().forEach(track => track.stop());

    setRoomId('');
    setLocalStream(null);
    setIsInRoom(false);
    setProducers({});
    socketRef.current?.emit('leaveRoom', { roomId });
  };

  useEffect(() => {
    console.log('Producers state updated:', producers);
  }, [producers]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-500">
      <div className="space-y-4">
        {!socketRef.current?.connected ? (
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
                  <p className='px-3 py-2 bg-white dark:bg-black dark:text-white'>{socketId}</p>
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
                    <p className='bg-white dark:bg-black dark:text-white p-2'>Peer ID: {peerId}</p>
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