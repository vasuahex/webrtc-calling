"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const mediasoup_1 = require("mediasoup");
const RoomManager_1 = require("./RoomManager");
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
const cors_1 = __importDefault(require("cors"));
const CorsOptions_1 = require("./utils/CorsOptions");
const Helpers_1 = __importDefault(require("./utils/Helpers"));
require("dotenv/config");
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    console.log(`shutting down the server for handling uncaught Exception`);
    process.exit(1);
});
const app = (0, express_1.default)();
const createServer = (environment) => {
    if (environment === 'development') {
        const privatePath = path_1.default.join(__dirname, '../whatsapp-clone-app-privateKey.key');
        const crtPath = path_1.default.join(__dirname, '../whatsapp-clone-app.crt');
        const privateKey = fs_1.default.readFileSync(privatePath, 'utf8');
        const certificate = fs_1.default.readFileSync(crtPath, 'utf8');
        const credentials = { key: privateKey, cert: certificate };
        return https_1.default.createServer(credentials, app);
    }
    if (environment === 'production') {
        return http_1.default.createServer(app);
    }
};
const server = createServer(process.env.NODE_ENV);
app.use((0, cors_1.default)(CorsOptions_1.options));
app.use(express_1.default.json());
const io = new socket_io_1.Server(server, { cors: { origin: '*' } });
const workers = [];
const numCPUs = os_1.default.cpus().length;
function createWorkers() {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < numCPUs; i++) {
            const worker = yield (0, mediasoup_1.createWorker)({
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
    });
}
const mediaCodecs = [
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
        parameters: {
            'profile-id': 2,
            'x-google-start-bitrate': 1000
        }
    },
    {
        kind: 'video',
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters: {
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
        parameters: {
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
    socket.on('createRoom', (callback) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(`Creating room for socket: ${socket.id}`);
        const worker = workers[Math.floor(Math.random() * workers.length)];
        const router = yield worker.createRouter({ mediaCodecs: mediaCodecs });
        const roomId = Math.random().toString(36).substring(2, 7);
        console.log(`Created room: ${roomId} with router: ${router.id}`);
        RoomManager_1.RoomManager.createRoom(roomId, router);
        RoomManager_1.RoomManager.addPeer(roomId, socket.id, socket);
        console.log(`Added peer ${socket.id} to room ${roomId}`);
        callback({ roomId, rtpCapabilities: router.rtpCapabilities });
    }));
    socket.on('join', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId }, callback) {
        console.log(`Socket ${socket.id} attempting to join room: ${roomId}`);
        const router = RoomManager_1.RoomManager.getRouter(roomId);
        if (!router) {
            console.error(`Room ${roomId} not found`);
            callback({ error: 'Room does not exist' });
            return;
        }
        RoomManager_1.RoomManager.addPeer(roomId, socket.id, socket);
        console.log(`Added peer ${socket.id} to room ${roomId}`);
        const rtpCapabilities = router.rtpCapabilities;
        const peers = RoomManager_1.RoomManager.getPeers(roomId);
        const existingProducers = RoomManager_1.RoomManager.getAllProducers(roomId).map(producer => {
            var _a;
            return ({
                producerId: producer.id,
                producerSocketId: (_a = Array.from((peers === null || peers === void 0 ? void 0 : peers.entries()) || []).find(([_, peer]) => peer.producers.has(producer))) === null || _a === void 0 ? void 0 : _a[0]
            });
        });
        console.log(`Found ${existingProducers.length} existing producers in room ${roomId}`);
        callback({ rtpCapabilities, existingProducers });
        socket.to(roomId).emit('peerJoined', { peerId: socket.id });
        console.log(`Notified room ${roomId} about new peer: ${socket.id}`);
    }));
    socket.on('createWebRtcTransport', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId, direction }, callback) {
        console.log(`Creating ${direction} WebRTC transport for socket ${socket.id} in room ${roomId}`);
        const router = RoomManager_1.RoomManager.getRouter(roomId);
        if (!router) {
            console.error(`Room ${roomId} not found for transport creation`);
            callback({ params: { error: 'Room not found' } });
            return;
        }
        try {
            const transport = yield router.createWebRtcTransport({
                listenIps: [{ ip: '0.0.0.0', announcedIp: Helpers_1.default.getPublicIp() }],
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
                initialAvailableOutgoingBitrate: 1000000,
            });
            console.log(`Created ${direction} transport: ${transport.id}`);
            RoomManager_1.RoomManager.addTransport(roomId, socket.id, { transport, direction });
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
        }
        catch (error) {
            console.error(`Error creating WebRTC transport:`, error);
            callback({ params: { error: 'Failed to create transport' } });
        }
    }));
    socket.on('connectTransport', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId, transportId, dtlsParameters }, callback) {
        console.log(`Connecting transport ${transportId} for socket ${socket.id} in room ${roomId}`);
        const transport = RoomManager_1.RoomManager.findTransport(roomId, socket.id, transportId);
        if (!transport) {
            console.error(`Transport ${transportId} not found for socket ${socket.id}`);
            callback({ error: 'Transport not found' });
            return;
        }
        try {
            yield transport.transport.connect({ dtlsParameters });
            console.log(`Successfully connected transport ${transportId}`);
            callback();
        }
        catch (error) {
            console.error(`Error connecting transport ${transportId}:`, error);
            callback({ error: 'Failed to connect transport' });
        }
    }));
    socket.on('produce', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId, transportId, kind, rtpParameters }, callback) {
        console.log(`Creating ${kind} producer for socket ${socket.id} in room ${roomId}`);
        try {
            const transport = RoomManager_1.RoomManager.findTransport(roomId, socket.id, transportId);
            if (!transport) {
                console.error(`Transport ${transportId} not found for socket ${socket.id}`);
                callback({ error: 'Transport not found' });
                return;
            }
            const producer = yield transport.transport.produce({
                kind,
                rtpParameters,
                appData: { socketId: socket.id }
            });
            console.log(`Created ${kind} producer: ${producer.id}`);
            RoomManager_1.RoomManager.addProducer(roomId, socket.id, producer);
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
        }
        catch (error) {
            console.error(`Error creating producer:`, error);
            callback({ error: 'Failed to produce' });
        }
    }));
    socket.on('consume', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId, producerId, rtpCapabilities }, callback) {
        console.log(`Creating consumer for producer ${producerId} in room ${roomId}`);
        try {
            const router = RoomManager_1.RoomManager.getRouter(roomId);
            const producer = RoomManager_1.RoomManager.getAllProducers(roomId).find(p => p.id === producerId);
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
            const transport = RoomManager_1.RoomManager.findTransportByDirection(roomId, socket.id, 'recv');
            if (!transport) {
                console.error(`Receive transport not found for socket ${socket.id}`);
                callback({ error: 'Recv transport not found' });
                return;
            }
            const consumer = yield transport.transport.consume({
                producerId,
                rtpCapabilities,
                paused: true,
            });
            console.log(`Created consumer: ${consumer.id} for producer: ${producerId}`);
            RoomManager_1.RoomManager.addConsumer(roomId, socket.id, consumer);
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
        }
        catch (error) {
            console.error(`Error creating consumer:`, error);
            callback({ error: 'Failed to consume' });
        }
    }));
    socket.on('resumeConsumer', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId, consumerId }, callback) {
        console.log(`Resuming consumer ${consumerId} in room ${roomId}`);
        const consumer = RoomManager_1.RoomManager.findConsumer(roomId, socket.id, consumerId);
        if (!consumer) {
            console.error(`Consumer ${consumerId} not found for socket ${socket.id}`);
            callback({ error: 'Consumer not found' });
            return;
        }
        try {
            yield consumer.resume();
            console.log(`Successfully resumed consumer ${consumerId}`);
            callback();
        }
        catch (error) {
            console.error(`Error resuming consumer ${consumerId}:`, error);
            callback({ error: 'Failed to resume consumer' });
        }
    }));
    socket.on('leaveRoom', ({ roomId }) => {
        console.log(`Socket ${socket.id} leaving room ${roomId}`);
        RoomManager_1.RoomManager.removePeer(roomId, socket.id);
        socket.to(roomId).emit('peerLeft', { peerId: socket.id });
        console.log(`Removed peer ${socket.id} from room ${roomId}`);
    });
    socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} disconnected`);
        RoomManager_1.RoomManager.removePeerFromAllRooms(socket.id);
    });
});
createWorkers().then(() => {
    const port = process.env.PORT || 9090;
    server === null || server === void 0 ? void 0 : server.listen(port, () => {
        console.log(`Server is running on https://localhost:${port}`);
    });
});
