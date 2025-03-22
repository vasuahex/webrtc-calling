import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { createWorker } from 'mediasoup';
import { RoomManager } from './RoomManager';
import os from 'os';
import path from "path";
import fs from "fs"
import https from "https"
import cors from "cors";
import { options } from './utils/CorsOptions';
import { RtpCodecCapability } from 'mediasoup/node/lib/rtpParametersTypes';
import Helpers from './utils/Helpers';
import "dotenv/config"
// Handle uncaught Exception
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    console.log(`shutting down the server for handling uncaught Exception`);
    process.exit(1);
});




const app = express();
const createServer = (environment: string) => {
    if (environment === 'development') {
        const privatePath = path.join(__dirname, '../whatsapp-clone-app-privateKey.key');
        const crtPath = path.join(__dirname, '../whatsapp-clone-app.crt');
        const privateKey = fs.readFileSync(privatePath, 'utf8');
        const certificate = fs.readFileSync(crtPath, 'utf8');
        const credentials = { key: privateKey, cert: certificate };
        return https.createServer(credentials, app);
    }
    if (environment === 'production') {
        return http.createServer(app)
    }
}

const server = createServer(process.env.NODE_ENV as string);
app.use(cors(options));
app.use(express.json());
const io = new Server(server, { cors: { origin: '*' } });

const workers: any[] = [];
const numCPUs = os.cpus().length;

async function createWorkers() {
    for (let i = 0; i < numCPUs; i++) {
        const worker = await createWorker({
            logLevel: 'debug',
            rtcMinPort: 10000,
            rtcMaxPort: 20100 + i * 100,
            logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp', 'rtx', 'bwe', 'score', 'simulcast', 'svc', 'sctp'],
        });

        worker.on('died', () => {
            console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
            setTimeout(() => process.exit(1), 2000);
        });

        workers.push(worker);
    }
}

const mediaCodecs: RtpCodecCapability[] = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
        preferredPayloadType: 96,
        rtcpFeedback: [
            { type: "nack" },
            { type: "nack", parameter: "pli" },
        ],
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
            'x-google-start-bitrate': 1000
        },
        preferredPayloadType: 97,
        rtcpFeedback: [
            { type: "nack" },
            { type: "ccm", parameter: "fir" },
            { type: "goog-remb" },
        ],
    },
    {
        kind: 'video',
        mimeType: 'video/VP9',
        clockRate: 90000,
        parameters:
        {
            'profile-id': 2,
            'x-google-start-bitrate': 1000
        }
    },
    {
        kind: 'video',
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters:
        {
            'packetization-mode': 1,
            'profile-level-id': '4d0032',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000
        }
    },
    {
        kind: 'video',
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters:
        {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': 1000
        }
    }
];


io.on('connection', (socket) => {
    console.log(`New socket connection: ${socket.id}`);
    socket.emit('connection-success', {
        socketId: socket.id,
    });

    socket.on('createRoom', async (callback) => {
        console.log(`Creating room for socket: ${socket.id}`);
        const worker = workers[Math.floor(Math.random() * workers.length)];
        const router = await worker.createRouter({ mediaCodecs: mediaCodecs });
        const roomId = Math.random().toString(36).substring(2, 7);
        console.log(`Created room: ${roomId} with router: ${router.id}`);

        RoomManager.createRoom(roomId, router);
        RoomManager.addPeer(roomId, socket.id, socket);
        console.log(`Added peer ${socket.id} to room ${roomId}`);

        callback({ roomId, rtpCapabilities: router.rtpCapabilities });
    });

    socket.on('join', async ({ roomId }, callback) => {
        console.log(`Socket ${socket.id} attempting to join room: ${roomId}`);
        const router = RoomManager.getRouter(roomId);
        if (!router) {
            console.error(`Room ${roomId} not found`);
            callback({ error: 'Room does not exist' });
            return;
        }

        RoomManager.addPeer(roomId, socket.id, socket);
        console.log(`Added peer ${socket.id} to room ${roomId}`);
        
        const rtpCapabilities = router.rtpCapabilities;
        const peers = RoomManager.getPeers(roomId);
        const existingProducers = RoomManager.getAllProducers(roomId).map(producer => ({
            producerId: producer.id,
            producerSocketId: Array.from(peers?.entries() || []).find(([_, peer]) => peer.producers.has(producer))?.[0]
        }));
        console.log(`Found ${existingProducers.length} existing producers in room ${roomId}`);
        
        callback({ rtpCapabilities, existingProducers });
        socket.to(roomId).emit('peerJoined', { peerId: socket.id });
        console.log(`Notified room ${roomId} about new peer: ${socket.id}`);
    });

    socket.on('createWebRtcTransport', async ({ roomId, direction }, callback) => {
        console.log(`Creating ${direction} WebRTC transport for socket ${socket.id} in room ${roomId}`);
        const router = RoomManager.getRouter(roomId);
        if (!router) {
            console.error(`Room ${roomId} not found for transport creation`);
            callback({ params: { error: 'Room not found' } });
            return;
        }

        try {
            const transport = await router.createWebRtcTransport({
                listenIps: [{ ip: '0.0.0.0', announcedIp: Helpers.getPublicIp() }],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
                initialAvailableOutgoingBitrate: 1000000,
            });
            console.log(`Created ${direction} transport: ${transport.id}`);

            RoomManager.addTransport(roomId, socket.id, { transport, direction });
            console.log(`Added ${direction} transport ${transport.id} to peer ${socket.id}`);
            
            transport.on('dtlsstatechange', (dtlsState) => {
                console.log(`Transport ${transport.id} DTLS state changed to: ${dtlsState}`);
                if (dtlsState === 'closed') {
                    transport.close();
                }
            });

            transport.on('icestatechange', (iceState) => {
                console.log(`Transport ${transport.id} ICE state changed to: ${iceState}`);
            });

            transport.on('@close', () => {
                console.log(`Transport ${transport.id} closed`);
            });

            callback({
                params: {
                    id: transport.id,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters,
                },
            });
        } catch (error) {
            console.error(`Error creating WebRTC transport:`, error);
            callback({ params: { error: 'Failed to create transport' } });
        }
    });

    socket.on('connectTransport', async ({ roomId, transportId, dtlsParameters }, callback) => {
        console.log(`Connecting transport ${transportId} for socket ${socket.id} in room ${roomId}`);
        const transport = RoomManager.findTransport(roomId, socket.id, transportId);
        if (!transport) {
            console.error(`Transport ${transportId} not found for socket ${socket.id}`);
            callback({ error: 'Transport not found' });
            return;
        }

        try {
            await transport.transport.connect({ dtlsParameters });
            console.log(`Successfully connected transport ${transportId}`);
            callback();
        } catch (error) {
            console.error(`Error connecting transport ${transportId}:`, error);
            callback({ error: 'Failed to connect transport' });
        }
    });

    socket.on('produce', async ({ roomId, transportId, kind, rtpParameters }, callback) => {
        console.log(`Creating ${kind} producer for socket ${socket.id} in room ${roomId}`);
        try {
            const transport = RoomManager.findTransport(roomId, socket.id, transportId);
            if (!transport) {
                console.error(`Transport ${transportId} not found for socket ${socket.id}`);
                callback({ error: 'Transport not found' });
                return;
            }

            const producer = await transport.transport.produce({ 
                kind, 
                rtpParameters,
                appData: { socketId: socket.id }
            });
            console.log(`Created ${kind} producer: ${producer.id}`);

            RoomManager.addProducer(roomId, socket.id, producer);
            console.log(`Added producer ${producer.id} to peer ${socket.id}`);

            producer.on('transportclose', () => {
                console.log(`Producer ${producer.id} transport closed`);
                producer.close();
            });

            producer.on('videoorientationchange', (videoOrientation) => {
                console.log(`Producer ${producer.id} video orientation changed:`, videoOrientation);
            });

            callback({ id: producer.id });
            socket.to(roomId).emit('newProducer', { producerId: producer.id, producerSocketId: socket.id });
            console.log(`Notified room ${roomId} about new producer: ${producer.id}`);
        } catch (error) {
            console.error(`Error creating producer:`, error);
            callback({ error: 'Failed to produce' });
        }
    });

    socket.on('consume', async ({ roomId, producerId, rtpCapabilities }, callback) => {
        console.log(`Creating consumer for producer ${producerId} in room ${roomId}`);
        try {
            const router = RoomManager.getRouter(roomId);
            const producer = RoomManager.getAllProducers(roomId).find(p => p.id === producerId);

            if (!router || !producer) {
                console.error(`Producer ${producerId} not found in room ${roomId}`);
                callback({ error: 'Producer not found' });
                return;
            }

            if (!router.canConsume({ producerId, rtpCapabilities })) {
                console.error(`Cannot consume producer ${producerId} with given RTP capabilities`);
                callback({ error: 'Cannot consume' });
                return;
            }

            const transport = RoomManager.findTransportByDirection(roomId, socket.id, 'recv');
            if (!transport) {
                console.error(`Receive transport not found for socket ${socket.id}`);
                callback({ error: 'Recv transport not found' });
                return;
            }

            const consumer = await transport.transport.consume({
                producerId,
                rtpCapabilities,
                paused: true,
            });
            console.log(`Created consumer: ${consumer.id} for producer: ${producerId}`);

            RoomManager.addConsumer(roomId, socket.id, consumer);
            console.log(`Added consumer ${consumer.id} to peer ${socket.id}`);

            consumer.on('transportclose', () => {
                console.log(`Consumer ${consumer.id} transport closed`);
                consumer.close();
            });

            callback({ 
                id: consumer.id, 
                kind: consumer.kind, 
                rtpParameters: consumer.rtpParameters 
            });
        } catch (error) {
            console.error(`Error creating consumer:`, error);
            callback({ error: 'Failed to consume' });
        }
    });

    socket.on('resumeConsumer', async ({ roomId, consumerId }, callback) => {
        console.log(`Resuming consumer ${consumerId} in room ${roomId}`);
        const consumer = RoomManager.findConsumer(roomId, socket.id, consumerId);
        if (!consumer) {
            console.error(`Consumer ${consumerId} not found for socket ${socket.id}`);
            callback({ error: 'Consumer not found' });
            return;
        }

        try {
            await consumer.resume();
            console.log(`Successfully resumed consumer ${consumerId}`);
            callback();
        } catch (error) {
            console.error(`Error resuming consumer ${consumerId}:`, error);
            callback({ error: 'Failed to resume consumer' });
        }
    });

    socket.on('leaveRoom', ({ roomId }) => {
        console.log(`Socket ${socket.id} leaving room ${roomId}`);
        RoomManager.removePeer(roomId, socket.id);
        socket.to(roomId).emit('peerLeft', { peerId: socket.id });
        console.log(`Removed peer ${socket.id} from room ${roomId}`);
    });

    socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} disconnected`);
        RoomManager.removePeerFromAllRooms(socket.id);
    });
});


createWorkers().then(() => {
    const port = process.env.PORT || 9090;
    server?.listen(port, () => {
        console.log(`Server is running on https://localhost:${port}`);
    });
});