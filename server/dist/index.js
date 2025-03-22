"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const mediasoup_1 = require("mediasoup");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const os_1 = __importDefault(require("os"));
const Helpers_1 = __importDefault(require("./utils/Helpers"));
const RoomManager_1 = __importStar(require("./RoomManager"));
const fileupload_1 = __importDefault(require("./routes/fileupload"));
const CorsOptions_1 = require("./utils/CorsOptions");
const app = (0, express_1.default)();
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    console.log(`shutting down the server for handling uncaught Exception`);
    process.exit(1);
});
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
const httpsServer = createServer(process.env.NODE_ENV);
const io = new socket_io_1.Server(httpsServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});
app.use((0, cors_1.default)(CorsOptions_1.options));
app.use(express_1.default.json());
const workers = [];
const numCPUs = os_1.default.cpus().length;
let nextWorkerIndex = 0;
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
function getNextWorker() {
    const worker = workers[nextWorkerIndex];
    nextWorkerIndex = (nextWorkerIndex + 1) % workers.length;
    return worker;
}
function createWorkerFunc() {
    return __awaiter(this, void 0, void 0, function* () {
        for (let i = 0; i < numCPUs; i++) {
            const worker = yield (0, mediasoup_1.createWorker)({
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
    });
}
console.log(Helpers_1.default.getPublicIp());
function createWebRtcTransport(router) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transport = yield router.createWebRtcTransport({
                listenIps: [
                    {
                        ip: '0.0.0.0',
                        announcedIp: Helpers_1.default.getPublicIp(),
                    },
                ],
                initialAvailableOutgoingBitrate: 1000000,
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
                enableSctp: true,
            });
            return transport;
        }
        catch (error) {
            console.error('Error creating WebRTC transport:', error);
            throw error;
        }
    });
}
io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
    socket.emit('connection-success', {
        socketId: socket.id,
    });
    socket.on('createRoom', (callback) => __awaiter(void 0, void 0, void 0, function* () {
        const worker = getNextWorker();
        const router = yield worker.createRouter({ mediaCodecs });
        const roomId = Math.random().toString(36).substring(2, 7);
        RoomManager_1.default.createRoom(roomId, router);
        RoomManager_1.default.addPeer(roomId, socket.id, socket);
        socket.join(roomId);
        callback({
            roomId,
            rtpCapabilities: router.rtpCapabilities,
        });
    }));
    socket.on('join', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId }, callback) {
        const router = RoomManager_1.default.getRouter(roomId);
        if (!router) {
            callback({ error: 'Room does not exist' });
            return;
        }
        RoomManager_1.default.addPeer(roomId, socket.id, socket);
        socket.join(roomId);
        const rtpCapabilities = router.rtpCapabilities;
        const producers = RoomManager_1.default.getAllProducers(roomId);
        const existingProducers = producers.map(producer => {
            var _a, _b;
            const producerSocketId = (_b = Array.from(((_a = RoomManager_1.default.getPeers(roomId)) === null || _a === void 0 ? void 0 : _a.entries()) || [])
                .find(([_, peer]) => peer.producers.has(producer))) === null || _b === void 0 ? void 0 : _b[0];
            return {
                producerId: producer.id,
                producerSocketId: producerSocketId,
                kind: producer.kind
            };
        });
        callback({ rtpCapabilities, existingProducers });
        socket.to(roomId).emit('peerJoined', { peerId: socket.id });
    }));
    socket.on('createWebRtcTransport', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId, direction }, callback) {
        try {
            const router = RoomManager_1.default.getRouter(roomId);
            if (!router) {
                console.error(`Room ${roomId} not found for transport creation`);
                callback({ params: { error: 'Room not found' } });
                return;
            }
            console.log(`Creating ${direction} transport for room ${roomId}`);
            const transport = yield createWebRtcTransport(router);
            transport.setMaxIncomingBitrate(1500000);
            transport.setMaxOutgoingBitrate(1500000);
            const success = RoomManager_1.default.addTransport(roomId, socket.id, { transport, direction });
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
        }
        catch (err) {
            console.error(`Failed to create ${direction} transport:`, err);
            callback({ params: { error: err instanceof Error ? err.message : 'Failed to create transport' } });
        }
    }));
    socket.on('connectTransport', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId, transportId, dtlsParameters }, callback) {
        try {
            const transportInfo = RoomManager_1.default.findTransport(roomId, socket.id, transportId);
            if (!transportInfo) {
                console.error(`Transport ${transportId} not found in room ${roomId}`);
                callback({ error: 'Transport not found' });
                return;
            }
            console.log(`Connecting transport ${transportId} in room ${roomId}`);
            yield transportInfo.transport.connect({ dtlsParameters });
            callback();
        }
        catch (error) {
            console.error(`Failed to connect transport ${transportId}:`, error);
            callback({ error: error.message });
        }
    }));
    socket.on('produce', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId, transportId, kind, rtpParameters, appData }, callback) {
        const router = RoomManager_1.default.getRouter(roomId);
        const transportInfo = RoomManager_1.default.findTransport(roomId, socket.id, transportId);
        if (!router || !transportInfo) {
            callback({ error: 'Room or Transport not found' });
            return;
        }
        try {
            const producer = yield transportInfo.transport.produce({
                kind,
                rtpParameters,
                appData
            });
            RoomManager_1.default.addProducer(roomId, socket.id, producer);
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
        }
        catch (error) {
            console.error('Failed to produce:', error);
            callback({ error: 'Failed to produce' });
        }
    }));
    socket.on('consume', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId, producerId, rtpCapabilities }, callback) {
        try {
            const router = RoomManager_1.default.getRouter(roomId);
            const producers = RoomManager_1.default.getAllProducers(roomId);
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
            const peer = RoomManager_1.default.getPeer(roomId, socket.id);
            const recvTransport = Array.from((peer === null || peer === void 0 ? void 0 : peer.transports) || [])
                .find(t => t.direction === 'recv');
            if (!recvTransport) {
                console.error('Receive transport not found for peer:', socket.id);
                callback({ error: 'Receive transport not found' });
                return;
            }
            console.log(`Creating consumer for producer ${producerId} in room ${roomId}`);
            const consumer = yield recvTransport.transport.consume({
                producerId,
                rtpCapabilities,
                paused: producer.kind === 'video',
            });
            RoomManager_1.default.addConsumer(roomId, socket.id, consumer);
            consumer.on('transportclose', () => {
                console.log(`Consumer ${consumer.id} transport closed`);
                consumer.close();
                RoomManager_1.default.removeConsumer(roomId, socket.id, consumer);
            });
            consumer.on('producerclose', () => {
                console.log(`Consumer ${consumer.id} producer closed`);
                consumer.close();
                RoomManager_1.default.removeConsumer(roomId, socket.id, consumer);
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
        }
        catch (error) {
            console.error('Failed to consume:', error);
            callback({ error: error.message });
        }
    }));
    socket.on('resumeConsumer', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId, consumerId }, callback) {
        try {
            console.log(`Attempting to resume consumer ${consumerId} in room ${roomId}`);
            const peer = RoomManager_1.default.getPeer(roomId, socket.id);
            const consumer = Array.from((peer === null || peer === void 0 ? void 0 : peer.consumers) || [])
                .find(c => c.id === consumerId);
            if (!consumer) {
                console.error(`Consumer ${consumerId} not found for peer ${socket.id}`);
                callback({ params: { error: 'Consumer not found' } });
                return;
            }
            yield consumer.resume();
            console.log(`Consumer ${consumerId} resumed successfully`);
            callback({ params: "success" });
        }
        catch (error) {
            console.error(`Error resuming consumer ${consumerId}:`, error);
            callback({ params: { error: error.message } });
        }
    }));
    socket.on('leaveRoom', ({ roomId }) => {
        RoomManager_1.default.removePeer(roomId, socket.id);
        socket.to(roomId).emit('peerLeft', { peerId: socket.id });
    });
    socket.on('disconnect', () => {
        RoomManager_1.rooms.forEach((_, roomId) => {
            if (RoomManager_1.default.getPeer(roomId, socket.id)) {
                const peer = RoomManager_1.default.getPeer(roomId, socket.id);
                if (peer) {
                    peer.transports.forEach(transportInfo => {
                        try {
                            transportInfo.transport.close();
                        }
                        catch (error) {
                            console.error('Error closing transport:', error);
                        }
                    });
                }
                RoomManager_1.default.removePeer(roomId, socket.id);
                socket.to(roomId).emit('peerLeft', { peerId: socket.id });
            }
        });
    });
}));
createWorkerFunc().then(() => {
    console.log('Workers created');
    const port = process.env.PORT || 9090;
    httpsServer === null || httpsServer === void 0 ? void 0 : httpsServer.listen(port, () => {
        console.log(`Server is running on https://localhost:${port}`);
    });
});
app.get('/', (req, res) => {
    res.json({ message: "server started successfully" });
});
app.use("/api", fileupload_1.default);
