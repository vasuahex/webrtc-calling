
import express from 'express';
import https from 'https';
import http from 'http';
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
    WorkerLogTag,
} from 'mediasoup/node/lib/types';
import Helpers from "./utils/Helpers"
const app = express();
import os from "os"
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
const httpsServer = createServer(process.env.NODE_ENV as string)

const io = new Server(httpsServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});


app.use(cors());
const workers: Worker[] = [];
const mediaCodecs: RtpCodecCapability[] =
    [
        {
            kind: 'audio',
            mimeType: 'audio/opus',
            clockRate: 48000,
            channels: 2
        },
        {
            kind: 'video',
            mimeType: 'video/VP8',
            clockRate: 90000,
            parameters:
            {
                'x-google-start-bitrate': 1000
            }
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
    ]
const numCPUs = os.cpus().length;


// let workers: Worker[];
let router: Router;
const rooms: {
    [roomId: string]: {
        router: Router;
        peers: {
            [peerId: string]: {
                socket: any;
                transports: { transport: Transport, direction: 'send' | 'recv' }[];
                producers: Producer[];
                consumers: Consumer[];
            };
        };
    };
} = {};
let nextWorkerIndex = 0;
function getNextWorker() {
    // Simple round-robin
    const worker = workers[nextWorkerIndex];
    nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
    return worker;
}
async function createWorkerFunc() {
    console.log(numCPUs);
    
    for (let i = 0; i < numCPUs; i++) {
        let worker = await createWorker({
            logLevel: 'warn',
            rtcMinPort: 10000,
            rtcMaxPort: 10200,
            logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp', 'rtx', 'bwe', 'score', 'simulcast', 'svc', 'sctp'],
            disableLiburing: false
        });

        worker.on('died', () => {
            console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid)
            setTimeout(() => process.exit(1), 2000)
        })
        workers.push(worker);
        console.log(`Worker pid ${worker.pid}`);
    }
    // return worker;
}
createWorkerFunc().then(() => {
    console.log(`workers created.`);

})
async function createWebRtcTransport(router: Router) {
    return router.createWebRtcTransport({
        listenIps: [
            {
                // ip: Helpers.getLocalIp(),
                ip: '0.0.0.0',
                // announcedIp: await Helpers.getPublicIp(),
                announcedIp: '127.0.0.1',
                // Change this to your server's public IP
            },
        ],

        // maxIncomingBitrate: 1500000,
        initialAvailableOutgoingBitrate: 1000000,
        maxSctpMessageSize: 262144,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
    });
}

io.on('connection', async (socket) => {
    socket.emit('connection-success', {
        socketId: socket.id,
    });

    socket.on('createRoom', async (callback) => {
        // if (workers.length===0) {
        //     worker = await createWorkerFunc();
        // }
        const worker = getNextWorker();
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
        const room = rooms[roomId];
        if (!room) {
            callback({
                error: 'Room does not exist',
            });
            return;
        }
        room.peers[socket.id] = {
            socket,
            transports: [],
            producers: [],
            consumers: [],
        };
        socket.join(roomId); // Join the socket.io room

        const rtpCapabilities = room.router.rtpCapabilities;

        // Get all current producers in the room
        const existingProducers = Object.values(room.peers).flatMap(peer =>
            peer.producers.map(producer => ({
                producerId: producer.id,
                producerSocketId: peer.socket.id
            }))
        );

        callback({ rtpCapabilities, existingProducers });
        // Notify other peers in the room about the new peer
        socket.to(roomId).emit('peerJoined', { peerId: socket.id });

    });

    socket.on('createWebRtcTransport', async ({ roomId, direction }, callback) => {
        const router = rooms[roomId]?.router;
        if (!router) {
            callback({ params: { error: 'Room not found' } });
            return;
        }

        try {
            const transport = await createWebRtcTransport(router);
            // EXTRA LINE for safeside.
            if (!rooms[roomId].peers[socket.id]) {
                rooms[roomId].peers[socket.id] = {
                    socket,
                    transports: [],
                    producers: [],
                    consumers: [],
                };
            }
            rooms[roomId].peers[socket.id].transports.push({ transport, direction });

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

            const transportObject = rooms[roomId]?.peers[socket.id].transports.find((t) => t.transport.id === transportId);

            if (!transportObject) {
                callback({ error: 'Transport not found' });
                return;
            }

            await transportObject.transport.connect({ dtlsParameters });
            callback();
        } catch (error: any) {
            callback({ error: error.message });
        }
    });

    socket.on('produce', async ({ roomId, transportId, kind, rtpParameters, appData }, callback) => {

        const router = rooms[roomId]?.router;
        const transportObject = rooms[roomId]?.peers[socket.id].transports.find((t) => t.transport.id === transportId);

        if (!router || !transportObject) {
            callback({ error: 'Room or Transport not found' });
            return;
        }

        const producer = await transportObject.transport.produce({ kind, rtpParameters, appData, });

        rooms[roomId].peers[socket.id].producers.push(producer);

        producer.on('transportclose', () => {
            producer.close();
        });

        callback({ id: producer.id });

        // Inform other peers in the room about the new producer
        socket.to(roomId).emit('newProducer', {
            producerId: producer.id,
            producerSocketId: socket.id,
            roomId,
            kind
        });


    });

    socket.on('consume', async ({ roomId, producerId, rtpCapabilities }, callback) => {
        try {
            const router = rooms[roomId]?.router;
            const producer = Object.values(rooms[roomId].peers).flatMap((peer) => peer.producers).find((p) => p.id === producerId);

            if (!router || !producer) {
                callback({ error: 'Room or Producer not found' });
                return;
            }

            if (!router.canConsume({ producerId, rtpCapabilities })) {
                callback({ error: "Can't consume" });
                return;
            }

            const recvTransport = rooms[roomId].peers[socket.id].transports.find(t => t.direction === 'recv');

            if (!recvTransport) {
                callback({ error: 'Receive transport not found' });
                return;
            }

            const consumer = await recvTransport.transport.consume({
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
        } catch (error: any) {
            callback({ error: error.message });
        }

    });
    socket.on('resumeConsumer', async ({ roomId, consumerId }, callback) => {
        try {
            const consumer = rooms[roomId]?.peers[socket.id].consumers.find((c) => c.id === consumerId);

            if (!consumer) {
                callback({ params: { error: 'Consumer not found' } });
                return;
            }

            await consumer.resume();
            callback({ params: "success" });
        } catch (error: any) {
            callback({ params: { error: error.message } });
            return
        }
    });

    const handlePeerLeave = (roomId: string, socketId: string) => {
        if (rooms[roomId] && rooms[roomId].peers[socketId]) {
            console.log('User left room', socketId);

            // Close transports, producers, and consumers
            rooms[roomId].peers[socketId].transports.forEach((transport) => transport.transport.close());
            rooms[roomId].peers[socketId].producers.forEach((producer) => producer.close());
            rooms[roomId].peers[socketId].consumers.forEach((consumer) => consumer.close());

            // Remove the peer from the room
            delete rooms[roomId].peers[socketId];

            // Notify other peers in the room
            socket.to(roomId).emit('peerLeft', { peerId: socketId });

            // If the room is empty, remove it
            if (Object.keys(rooms[roomId].peers).length === 0) {
                delete rooms[roomId];
            }
        }
    };
    socket.on('leaveRoom', ({ roomId }) => {
        handlePeerLeave(roomId, socket.id);
    });

    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            if (rooms[roomId].peers[socket.id]) {
                socket.emit('leaveRoom', { roomId });
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
httpsServer?.listen(PORT, () => {
    console.log(`Server is running on https://localhost:${PORT}`);
});