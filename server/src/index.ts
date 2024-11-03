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

app.use(cors());

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
        // rtcpFeedback: [
        //     { type: "nack" },
        //     { type: "nack", parameter: "pli" },
        // ],
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
            'x-google-start-bitrate': 1000
        },
        preferredPayloadType: 97,
        // rtcpFeedback: [
        //     { type: "nack" },
        //     { type: "ccm", parameter: "fir" },
        //     { type: "goog-remb" },
        // ],
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
console.log(Helpers.getPublicIp());

async function createWebRtcTransport(router: Router) {
    return router.createWebRtcTransport({
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
        iceConsentTimeout: 8000,
    });
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
        const router = RoomManager.getRouter(roomId);
        if (!router) {
            callback({ params: { error: 'Room not found' } });
            return;
        }

        try {
            const transport = await createWebRtcTransport(router);
            RoomManager.addTransport(roomId, socket.id, { transport, direction });

            transport.on('dtlsstatechange', (dtlsState) => {
                if (dtlsState === 'closed') {
                    transport.close();
                }
            });

            transport.on('@close', () => {
                console.log('Transport closed');
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
            callback({ params: { error: 'Failed to create transport' } });
        }
    });

    socket.on('connectTransport', async ({ roomId, transportId, dtlsParameters }, callback) => {
        try {
            const transportInfo = RoomManager.findTransport(roomId, socket.id, transportId);
            if (!transportInfo) {
                callback({ error: 'Transport not found' });
                return;
            }

            await transportInfo.transport.connect({ dtlsParameters });
            callback();
        } catch (error: any) {
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
        socket.to(roomId).emit('newProducer', {
            producerId: producer.id,
            producerSocketId: socket.id,
            roomId,
            kind
        });
    });

    socket.on('consume', async ({ roomId, producerId, rtpCapabilities }, callback) => {
        try {
            const router = RoomManager.getRouter(roomId);
            const producers = RoomManager.getAllProducers(roomId);
            const producer = producers.find(p => p.id === producerId);

            if (!router || !producer) {
                callback({ error: 'Room or Producer not found' });
                return;
            }

            if (!router.canConsume({ producerId, rtpCapabilities })) {
                callback({ error: "Can't consume" });
                return;
            }

            const peer = RoomManager.getPeer(roomId, socket.id);
            const recvTransport = Array.from(peer?.transports || [])
                .find(t => t.direction === 'recv');

            if (!recvTransport) {
                callback({ error: 'Receive transport not found' });
                return;
            }

            const consumer = await recvTransport.transport.consume({
                producerId,
                rtpCapabilities,
                paused: true,
            });

            RoomManager.addConsumer(roomId, socket.id, consumer);

            consumer.on('transportclose', () => {
                consumer.close();
            });

            consumer.on('producerclose', () => {
                consumer.close();
                socket.emit('consumerClosed', { consumerId: consumer.id });
            });

            callback({
                id: consumer.id,
                producerId: producer.id,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
            });
        } catch (error: any) {
            callback({ error: error.message });
        }
    });

    socket.on('resumeConsumer', async ({ roomId, consumerId }, callback) => {
        try {

            const peer = RoomManager.getPeer(roomId, socket.id);
            const consumer = Array.from(peer?.consumers || [])
                .find(c => c.id === consumerId);

            if (!consumer) {
                callback({ params: { error: 'Consumer not found' } });
                return;
            }

            await consumer.resume();
            callback({ params: "success" });
        } catch (error: any) {
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
                RoomManager.removePeer(roomId, socket.id);
                socket.to(roomId).emit('peerLeft', { peerId: socket.id });
            }
        });
    });
});

// Initialize workers and start server
createWorkerFunc().then(() => {
    console.log('Workers created');
    const port = process.env.PORT || 3000;

    httpsServer?.listen(port, () => {
        console.log(`Server is running on https://localhost:${port}`);
    });
});

app.get('/', (req: Request, res: Response) => {
    res.json({ message: "server started successfully" });
});