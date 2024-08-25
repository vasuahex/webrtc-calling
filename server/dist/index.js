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
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const mediasoup_1 = require("mediasoup");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const Helpers_1 = __importDefault(require("./utils/Helpers"));
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
app.use((0, cors_1.default)());
const mediaCodecs = [
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
        parameters: {
            'x-google-start-bitrate': 1000
        }
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
let worker;
let router;
const rooms = {};
function createWorkerFunc() {
    return __awaiter(this, void 0, void 0, function* () {
        worker = yield (0, mediasoup_1.createWorker)({
            logLevel: 'warn',
            rtcMinPort: 10000,
            rtcMaxPort: 10100,
            logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp', 'rtx', 'bwe', 'score', 'simulcast', 'svc', 'sctp'],
            disableLiburing: false
        });
        worker.on('died', () => {
            console.error('mediasoup worker died, exiting in 2 seconds... [pid:%d]', worker.pid);
            setTimeout(() => process.exit(1), 2000);
        });
        console.log(`Worker pid ${worker.pid}`);
        return worker;
    });
}
function createWebRtcTransport(router) {
    return __awaiter(this, void 0, void 0, function* () {
        return router.createWebRtcTransport({
            listenIps: [
                {
                    ip: Helpers_1.default.getLocalIp(),
                    announcedIp: yield Helpers_1.default.getPublicIp(),
                },
            ],
            initialAvailableOutgoingBitrate: 1000000,
            maxSctpMessageSize: 262144,
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        });
    });
}
io.on('connection', (socket) => __awaiter(void 0, void 0, void 0, function* () {
    socket.emit('connection-success', {
        socketId: socket.id,
    });
    socket.on('createRoom', (callback) => __awaiter(void 0, void 0, void 0, function* () {
        if (!worker) {
            worker = yield createWorkerFunc();
        }
        router = yield worker.createRouter({ mediaCodecs });
        const roomId = Math.random().toString(36).substring(2, 7);
        rooms[roomId] = {
            router: router,
            peers: {},
        };
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
    }));
    socket.on('join', (_a, callback_1) => __awaiter(void 0, [_a, callback_1], void 0, function* ({ roomId }, callback) {
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
        socket.join(roomId);
        const rtpCapabilities = room.router.rtpCapabilities;
        const existingProducers = Object.values(room.peers).flatMap(peer => peer.producers.map(producer => ({
            producerId: producer.id,
            producerSocketId: peer.socket.id
        })));
        callback({ rtpCapabilities, existingProducers });
        socket.to(roomId).emit('peerJoined', { peerId: socket.id });
    }));
    socket.on('createWebRtcTransport', (_b, callback_2) => __awaiter(void 0, [_b, callback_2], void 0, function* ({ roomId, direction }, callback) {
        var _c;
        const router = (_c = rooms[roomId]) === null || _c === void 0 ? void 0 : _c.router;
        if (!router) {
            callback({ params: { error: 'Room not found' } });
            return;
        }
        try {
            const transport = yield createWebRtcTransport(router);
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
                    iceParameters: transport.iceParameters,
                    iceCandidates: transport.iceCandidates,
                    dtlsParameters: transport.dtlsParameters,
                },
            });
        }
        catch (err) {
            console.error("err", err);
            callback({ params: { error: 'Failed to create transport' } });
        }
    }));
    socket.on('connectTransport', (_d, callback_3) => __awaiter(void 0, [_d, callback_3], void 0, function* ({ roomId, transportId, dtlsParameters }, callback) {
        var _e;
        try {
            const transportObject = (_e = rooms[roomId]) === null || _e === void 0 ? void 0 : _e.peers[socket.id].transports.find((t) => t.transport.id === transportId);
            if (!transportObject) {
                callback({ error: 'Transport not found' });
                return;
            }
            yield transportObject.transport.connect({ dtlsParameters });
            callback();
        }
        catch (error) {
            console.log(218, error);
        }
    }));
    socket.on('produce', (_f, callback_4) => __awaiter(void 0, [_f, callback_4], void 0, function* ({ roomId, transportId, kind, rtpParameters, appData }, callback) {
        var _g, _h;
        const router = (_g = rooms[roomId]) === null || _g === void 0 ? void 0 : _g.router;
        const transportObject = (_h = rooms[roomId]) === null || _h === void 0 ? void 0 : _h.peers[socket.id].transports.find((t) => t.transport.id === transportId);
        if (!router || !transportObject) {
            callback({ error: 'Room or Transport not found' });
            return;
        }
        const producer = yield transportObject.transport.produce({ kind, rtpParameters, appData });
        rooms[roomId].peers[socket.id].producers.push(producer);
        producer.on('transportclose', () => {
            producer.close();
        });
        callback({ id: producer.id });
        socket.to(roomId).emit('newProducer', {
            producerId: producer.id,
            producerSocketId: socket.id,
            roomId,
            kind
        });
    }));
    socket.on('consume', (_j, callback_5) => __awaiter(void 0, [_j, callback_5], void 0, function* ({ roomId, producerId, rtpCapabilities }, callback) {
        var _k;
        try {
            const router = (_k = rooms[roomId]) === null || _k === void 0 ? void 0 : _k.router;
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
            const consumer = yield recvTransport.transport.consume({
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
        catch (error) {
            callback({ error: error.message });
            console.log("252", error);
        }
    }));
    socket.on('resumeConsumer', (_l, callback_6) => __awaiter(void 0, [_l, callback_6], void 0, function* ({ roomId, consumerId }, callback) {
        var _m;
        try {
            const consumer = (_m = rooms[roomId]) === null || _m === void 0 ? void 0 : _m.peers[socket.id].consumers.find((c) => c.id === consumerId);
            if (!consumer) {
                callback({ params: { error: 'Consumer not found' } });
                return;
            }
            yield consumer.resume();
            callback({ params: "success" });
        }
        catch (error) {
            console.log(310, error);
            callback({ params: { error: error.message } });
            return;
        }
    }));
    socket.on('leaveRoom', ({ roomId }) => {
        if (rooms[roomId] && rooms[roomId].peers[socket.id]) {
            console.log('User left room', socket.id);
            rooms[roomId].peers[socket.id].transports.forEach((transport) => transport.transport.close());
            rooms[roomId].peers[socket.id].producers.forEach((producer) => producer.close());
            rooms[roomId].peers[socket.id].consumers.forEach((consumer) => consumer.close());
            delete rooms[roomId].peers[socket.id];
            socket.to(roomId).emit('peerLeft', { peerId: socket.id });
            if (Object.keys(rooms[roomId].peers).length === 0) {
                delete rooms[roomId];
            }
        }
    });
    socket.on('disconnect', () => {
        for (const roomId in rooms) {
            if (rooms[roomId].peers[socket.id]) {
                socket.emit('leaveRoom', { roomId });
            }
        }
    });
}));
const PORT = process.env.PORT || 3000;
httpsServer === null || httpsServer === void 0 ? void 0 : httpsServer.listen(PORT, () => {
    console.log(`Server is running on https://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map