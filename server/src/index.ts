
import express from 'express';
import https from 'https';
import { Server } from 'socket.io';
import { createWorker } from 'mediasoup';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import "dotenv/config";


import {
    Worker,
    Router,
    Transport,
    Producer,
    Consumer,
    RtpCodecCapability,
} from 'mediasoup/node/lib/types';
import Helpers from "./utils/Helpers"
const app = express();


const privatePath = path.join(__dirname, '../whatsapp-clone-app-privateKey.key');
const crtPath = path.join(__dirname, '../whatsapp-clone-app.crt');
const privateKey = fs.readFileSync(privatePath, 'utf8');
const certificate = fs.readFileSync(crtPath, 'utf8');
const credentials = { key: privateKey, cert: certificate };

// Handle uncaught Exception
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    console.log(`shutting down the server for handling uncaught Exception`);
    process.exit(1);
});

const httpsServer = https.createServer(credentials, app);
const io = new Server(httpsServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});


app.use(cors());

const mediaCodecs: RtpCodecCapability[] = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
            'x-google-start-bitrate': 1000,
        },
    },
];

let worker: Worker;
let router: Router;
const rooms: {
    [roomId: string]: {
        router: Router;
        peers: {
            [peerId: string]: {
                socket: any;
                transports: Transport[];
                producers: Producer[];
                consumers: Consumer[];
            };
        };
    };
} = {};

async function createWorkerFunc() {
    worker = await createWorker({
        logLevel: 'warn',
        rtcMinPort: 10000,
        rtcMaxPort: 10100,
    });
    console.log(`Worker pid ${worker.pid}`);
    return worker;
}
console.log("ip : ", Helpers.getLocalIp());

async function createWebRtcTransport(router: Router) {
    return router.createWebRtcTransport({
        listenIps: [
            {
                ip: '0.0.0.0',
                announcedIp: Helpers.getLocalIp()
                // announcedIp: '127.0.0.1', // Change this to your server's public IP
            },
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
    });
}

io.on('connection', async (socket) => {
    console.log('New connection', socket.id);
    socket.emit('connection-success', {
        socketId: socket.id,
    });

    socket.on('createRoom', async (callback) => {
        if (!worker) {
            worker = await createWorkerFunc();
        }

        router = await worker.createRouter({ mediaCodecs });
        const roomId = Math.random().toString(36).substring(2, 7);
        rooms[roomId] = {
            router: router,
            peers: {},
        };
        // Join the room immediately after creating it
        rooms[roomId].peers[socket.id] = {
            socket,
            transports: [],
            producers: [],
            consumers: []
        };
        socket.join(roomId);
        callback({
            roomId,
            rtpCapabilities: router.rtpCapabilities,
        });
    });
    socket.on('join', async ({ roomId }, callback) => {
        const router = rooms[roomId]?.router;

        if (!router) {
            callback({
                error: 'Room does not exist',
            });
            return;
        }

        rooms[roomId].peers[socket.id] = {
            socket,
            transports: [],
            producers: [],
            consumers: [],
        };
        socket.join(roomId); // Join the socket.io room

        const rtpCapabilities = router.rtpCapabilities;
        callback({ rtpCapabilities });
        // Notify other peers in the room about the new peer
        socket.to(roomId).emit('peerJoined', { peerId: socket.id });

    });

    socket.on('createWebRtcTransport', async ({ roomId }, callback) => {
        const router = rooms[roomId]?.router;
        if (!router) {
            callback({ params: { error: 'Room not found' } });
            return;
        }

        try {
            const transport = await createWebRtcTransport(router);
            rooms[roomId].peers[socket.id].transports.push(transport);

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
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters,
                },
            });
        } catch (err) {
            console.error("err", err);
            callback({ params: { error: 'Failed to create transport' } });
        }
    });

    socket.on('connectTransport', async ({ roomId, transportId, dtlsParameters }, callback) => {
        const transport = rooms[roomId]?.peers[socket.id].transports.find((t) => t.id === transportId);

        if (!transport) {
            callback({ error: 'Transport not found' });
            return;
        }

        await transport.connect({ dtlsParameters });
        callback();
    });

    socket.on('produce', async ({ roomId, transportId, kind, rtpParameters }, callback) => {
        const router = rooms[roomId]?.router;
        const transport = rooms[roomId]?.peers[socket.id].transports.find((t) => t.id === transportId);

        if (!router || !transport) {
            callback({ error: 'Room or Transport not found' });
            return;
        }

        const producer = await transport.produce({ kind, rtpParameters });
        rooms[roomId].peers[socket.id].producers.push(producer);

        producer.on('transportclose', () => {
            producer.close();
        });

        callback({ id: producer.id });

        // Inform other peers in the room about the new producer
        socket.to(roomId).emit('newProducer', {
            producerId: producer.id,
            producerSocketId: socket.id,
        });
    });

    socket.on('consume', async ({ roomId, producerId, rtpCapabilities }, callback) => {
        const router = rooms[roomId]?.router;
        const producer = Object.values(rooms[roomId].peers).flatMap(
            (peer) => peer.producers
        ).find((p) => p.id === producerId);

        if (!router || !producer) {
            callback({ error: 'Room or Producer not found' });
            return;
        }

        if (!router.canConsume({ producerId, rtpCapabilities })) {
            callback({ error: 'Can\'t consume' });
            return;
        }

        const transport = rooms[roomId].peers[socket.id].transports[0]; // Assuming the first transport is for consuming

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: true,
        });

        rooms[roomId].peers[socket.id].consumers.push(consumer);

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
    }
    );

    socket.on('resumeConsumer', async ({ roomId, consumerId }, callback) => {
        const consumer = rooms[roomId]?.peers[socket.id].consumers.find(
            (c) => c.id === consumerId
        );

        if (!consumer) {
            callback({ error: 'Consumer not found' });
            return;
        }

        await consumer.resume();
        callback();
    });

    socket.on('leaveRoom', ({ roomId }) => {
        if (rooms[roomId] && rooms[roomId].peers[socket.id]) {
            console.log('User left room', socket.id);

            // Close transports, producers, and consumers
            rooms[roomId].peers[socket.id].transports.forEach((transport) => transport.close());
            rooms[roomId].peers[socket.id].producers.forEach((producer) => producer.close());
            rooms[roomId].peers[socket.id].consumers.forEach((consumer) => consumer.close());

            // Remove the peer from the room
            delete rooms[roomId].peers[socket.id];

            // Notify other peers in the room
            socket.to(roomId).emit('peerLeft', { peerId: socket.id });

            // If the room is empty, remove it
            if (Object.keys(rooms[roomId].peers).length === 0) {
                delete rooms[roomId];
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected', socket.id);
        for (const roomId in rooms) {
            if (rooms[roomId].peers[socket.id]) {
                socket.emit('leaveRoom', { roomId });
            }
        }
    });
});
const PORT = process.env.PORT || 3000;
httpsServer.listen(PORT, () => {
    console.log(`Server is running on https://localhost:${PORT}`);
});