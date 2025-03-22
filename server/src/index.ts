import express, { Request, Response } from 'express';
import https from 'https';
import http from 'http';
import { Server } from 'socket.io';
import { createWorker } from 'mediasoup';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import "dotenv/config";
import os from "os";
import Helpers from "./utils/Helpers";
import RoomManager, { rooms } from "./RoomManager"
import {
    Worker,
    Router,
    RtpCodecCapability,
} from 'mediasoup/node/lib/types';
import uploadRouter from "./routes/fileupload"
import { options } from "./utils/CorsOptions"
const app = express();

// Handle uncaught Exception
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    console.log(`shutting down the server for handling uncaught Exception`);
    process.exit(1);
});

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

const httpsServer = createServer(process.env.NODE_ENV as string);
const io = new Server(httpsServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

app.use(cors(options));
app.use(express.json());

// MediaSoup setup
const workers: Worker[] = [];
const numCPUs = os.cpus().length;
let nextWorkerIndex = 0;

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

function getNextWorker() {
    const worker = workers[nextWorkerIndex];
    nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
    return worker;
}

async function createWorkerFunc() {
    for (let i = 0; i < numCPUs; i++) {
        const worker = await createWorker({
            logLevel: 'debug',
            rtcMinPort: 10000 + (i * 1000),
            rtcMaxPort: 10999 + (i * 1000),
            logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp', 'rtx', 'bwe', 'score', 'simulcast', 'svc', 'sctp'],
        });

        worker.on('died', () => {
            console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
            setTimeout(() => process.exit(1), 2000);
        });

        workers.push(worker);
    }
}
console.log(Helpers.getPublicIp());

async function createWebRtcTransport(router: Router) {
    try {
        const transport = await router.createWebRtcTransport({
            listenIps: [
                {
                    ip: '0.0.0.0',
                    announcedIp: Helpers.getPublicIp(),
                },
            ],
            initialAvailableOutgoingBitrate: 1000000,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            enableSctp: true,
        });
        return transport;
    } catch (error) {
        console.error('Error creating WebRTC transport:', error);
        throw error;
    }
}

// Socket.IO handlers
io.on('connection', async (socket) => {
    socket.emit('connection-success', {
        socketId: socket.id,
    });

    socket.on('createRoom', async (callback) => {
        const worker = getNextWorker();
        const router = await worker.createRouter({ mediaCodecs });
        const roomId = Math.random().toString(36).substring(2, 7);

        // Create room using RoomManager
        RoomManager.createRoom(roomId, router);
        RoomManager.addPeer(roomId, socket.id, socket);

        socket.join(roomId);
        callback({
            roomId,
            rtpCapabilities: router.rtpCapabilities,
        });
    });

    socket.on('join', async ({ roomId }, callback) => {
        const router = RoomManager.getRouter(roomId);
        if (!router) {
            callback({ error: 'Room does not exist' });
            return;
        }

        RoomManager.addPeer(roomId, socket.id, socket);
        socket.join(roomId);

        const rtpCapabilities = router.rtpCapabilities;
        const producers = RoomManager.getAllProducers(roomId);

        const existingProducers = producers.map(producer => {
            const producerSocketId = Array.from(RoomManager.getPeers(roomId)?.entries() || [])
                .find(([_, peer]) => peer.producers.has(producer))?.[0];
            return {
                producerId: producer.id,
                producerSocketId: producerSocketId,
                kind: producer.kind
            };
        });

        callback({ rtpCapabilities, existingProducers });
        socket.to(roomId).emit('peerJoined', { peerId: socket.id });
    });

    socket.on('createWebRtcTransport', async ({ roomId, direction }, callback) => {
        try {
            const router = RoomManager.getRouter(roomId);
            if (!router) {
                console.error(`Room ${roomId} not found for transport creation`);
                callback({ params: { error: 'Room not found' } });
                return;
            }

            console.log(`Creating ${direction} transport for room ${roomId}`);
            const transport = await createWebRtcTransport(router);
            
            transport.setMaxIncomingBitrate(1500000);
            transport.setMaxOutgoingBitrate(1500000);
            
            // Store transport info
            const success = RoomManager.addTransport(roomId, socket.id, { transport, direction });
            if (!success) {
                console.error(`Failed to add transport to room ${roomId}`);
                transport.close();
                callback({ params: { error: 'Failed to add transport to room' } });
                return;
            }

            transport.on('dtlsstatechange', (dtlsState) => {
                console.log(`DTLS state changed to ${dtlsState} for ${direction} transport ${transport.id}`);
                if (dtlsState === 'closed') {
                    transport.close();
                }
            });

            transport.on('icestatechange', (iceState) => {
                console.log(`ICE State for ${direction} transport ${transport.id}:`, iceState);
            });

            transport.on('@close', () => {
                console.log(`${direction} transport ${transport.id} closed`);
            });

            callback({
                params: {
                    id: transport.id,
                    appData: transport.appData,
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters,
                },
            });
        } catch (err) {
            console.error(`Failed to create ${direction} transport:`, err);
            callback({ params: { error: err instanceof Error ? err.message : 'Failed to create transport' } });
        }
    });

    socket.on('connectTransport', async ({ roomId, transportId, dtlsParameters }, callback) => {
        try {
            const transportInfo = RoomManager.findTransport(roomId, socket.id, transportId);
            if (!transportInfo) {
                console.error(`Transport ${transportId} not found in room ${roomId}`);
                callback({ error: 'Transport not found' });
                return;
            }

            console.log(`Connecting transport ${transportId} in room ${roomId}`);
            await transportInfo.transport.connect({ dtlsParameters });
            callback();
        } catch (error: any) {
            console.error(`Failed to connect transport ${transportId}:`, error);
            callback({ error: error.message });
        }
    });

    socket.on('produce', async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {
        const router = RoomManager.getRouter(roomId);
        const transportInfo = RoomManager.findTransport(roomId, socket.id, transportId);

        if (!router || !transportInfo) {
            callback({ error: 'Room or Transport not found' });
            return;
        }

        try {
            const producer = await transportInfo.transport.produce({
                kind,
                rtpParameters,
                appData
            });

            RoomManager.addProducer(roomId, socket.id, producer);

            producer.on('transportclose', () => {
                producer.close();
                socket.to(roomId).emit('producerClosed', {
                    producerId: producer.id,
                    peerId: socket.id
                });
            });

            callback({ id: producer.id });
            
            // Notify all peers in the room about the new producer
            socket.to(roomId).emit('newProducer', {
                producerId: producer.id,
                producerSocketId: socket.id,
                roomId,
                kind
            });
        } catch (error) {
            console.error('Failed to produce:', error);
            callback({ error: 'Failed to produce' });
        }
    });

    socket.on('consume', async ({ roomId, producerId, rtpCapabilities }, callback) => {
        try {
            const router = RoomManager.getRouter(roomId);
            const producers = RoomManager.getAllProducers(roomId);
            const producer = producers.find(p => p.id === producerId);

            if (!router || !producer) {
                console.error('Room or Producer not found:', { roomId, producerId });
                callback({ error: 'Room or Producer not found' });
                return;
            }

            if (!router.canConsume({ producerId, rtpCapabilities })) {
                console.error('Cannot consume with given parameters:', { producerId, rtpCapabilities });
                callback({ error: "Can't consume - incompatible parameters" });
                return;
            }

            const peer = RoomManager.getPeer(roomId, socket.id);
            const recvTransport = Array.from(peer?.transports || [])
                .find(t => t.direction === 'recv');

            if (!recvTransport) {
                console.error('Receive transport not found for peer:', socket.id);
                callback({ error: 'Receive transport not found' });
                return;
            }

            console.log(`Creating consumer for producer ${producerId} in room ${roomId}`);
            const consumer = await recvTransport.transport.consume({
                producerId,
                rtpCapabilities,
                paused: producer.kind === 'video', // Only pause video consumers initially
            });

            RoomManager.addConsumer(roomId, socket.id, consumer);

            // Set up consumer event handlers
            consumer.on('transportclose', () => {
                console.log(`Consumer ${consumer.id} transport closed`);
                consumer.close();
                RoomManager.removeConsumer(roomId, socket.id, consumer);
            });

            consumer.on('producerclose', () => {
                console.log(`Consumer ${consumer.id} producer closed`);
                consumer.close();
                RoomManager.removeConsumer(roomId, socket.id, consumer);
                socket.emit('consumerClosed', { consumerId: consumer.id });
            });

            consumer.on('producerpause', () => {
                console.log(`Consumer ${consumer.id} producer paused`);
                consumer.pause();
            });

            consumer.on('producerresume', () => {
                console.log(`Consumer ${consumer.id} producer resumed`);
                consumer.resume();
            });

            console.log(`Consumer created successfully: ${consumer.id}`);
            callback({
                id: consumer.id,
                producerId: producer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
                producerPaused: consumer.producerPaused
            });
        } catch (error: any) {
            console.error('Failed to consume:', error);
            callback({ error: error.message });
        }
    });

    socket.on('resumeConsumer', async ({ roomId, consumerId }, callback) => {
        try {
            console.log(`Attempting to resume consumer ${consumerId} in room ${roomId}`);
            const peer = RoomManager.getPeer(roomId, socket.id);
            const consumer = Array.from(peer?.consumers || [])
                .find(c => c.id === consumerId);

            if (!consumer) {
                console.error(`Consumer ${consumerId} not found for peer ${socket.id}`);
                callback({ params: { error: 'Consumer not found' } });
                return;
            }

            await consumer.resume();
            console.log(`Consumer ${consumerId} resumed successfully`);
            callback({ params: "success" });
        } catch (error: any) {
            console.error(`Error resuming consumer ${consumerId}:`, error);
            callback({ params: { error: error.message } });
        }
    });

    socket.on('leaveRoom', ({ roomId }) => {
        RoomManager.removePeer(roomId, socket.id);
        socket.to(roomId).emit('peerLeft', { peerId: socket.id });
    });

    socket.on('disconnect', () => {
        // Find all rooms this socket is in and remove the peer
        rooms.forEach((_, roomId) => {
            if (RoomManager.getPeer(roomId, socket.id)) {
                // Close all transports before removing peer
                const peer = RoomManager.getPeer(roomId, socket.id);
                if (peer) {
                    peer.transports.forEach(transportInfo => {
                        try {
                            transportInfo.transport.close();
                        } catch (error) {
                            console.error('Error closing transport:', error);
                        }
                    });
                }
                RoomManager.removePeer(roomId, socket.id);
                socket.to(roomId).emit('peerLeft', { peerId: socket.id });
            }
        });
    });
});

// Initialize workers and start server
createWorkerFunc().then(() => {
    console.log('Workers created');
    const port = process.env.PORT || 9090;

    httpsServer?.listen(port, () => {
        console.log(`Server is running on https://localhost:${port}`);
    });
});
app.get('/', (req: Request, res: Response) => {
    res.json({ message: "server started successfully" });
});

app.use("/api", uploadRouter);