"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = exports.rooms = exports.mediaCodecs = void 0;
exports.mediaCodecs = [
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
        parameters: { 'x-google-start-bitrate': 1000 },
    },
];
exports.rooms = new Map();
class RoomManager {
    static createRoom(roomId, router) {
        exports.rooms.set(roomId, { router, peers: new Map() });
    }
    static addPeer(roomId, peerId, socket) {
        const room = exports.rooms.get(roomId);
        if (!room)
            return false;
        room.peers.set(peerId, {
            socket,
            transports: new Set(),
            producers: new Set(),
            consumers: new Set(),
        });
        return true;
    }
    static addTransport(roomId, peerId, transportInfo) {
        const room = exports.rooms.get(roomId);
        const peer = room === null || room === void 0 ? void 0 : room.peers.get(peerId);
        if (!peer)
            return false;
        peer.transports.add(transportInfo);
        return true;
    }
    static addProducer(roomId, peerId, producer) {
        const room = exports.rooms.get(roomId);
        const peer = room === null || room === void 0 ? void 0 : room.peers.get(peerId);
        if (!peer) {
            console.error(`Peer ${peerId} not found in room ${roomId}`);
            return false;
        }
        console.log(`Adding producer ${producer.id} (${producer.kind}) to peer ${peerId} in room ${roomId}`);
        peer.producers.add(producer);
        const allProducers = this.getAllProducers(roomId);
        console.log(`Current producers in room ${roomId}:`, allProducers.map(p => {
            var _a;
            return ({
                id: p.id,
                kind: p.kind,
                peerId: room ? (_a = Array.from(room.peers.entries())
                    .find(([_, peer]) => peer.producers.has(p))) === null || _a === void 0 ? void 0 : _a[0] : undefined
            });
        }));
        return true;
    }
    static addConsumer(roomId, peerId, consumer) {
        const room = exports.rooms.get(roomId);
        const peer = room === null || room === void 0 ? void 0 : room.peers.get(peerId);
        if (!peer)
            return false;
        peer.consumers.add(consumer);
        return true;
    }
    static removePeer(roomId, peerId) {
        const room = exports.rooms.get(roomId);
        if (!room) {
            console.error(`Room ${roomId} not found when removing peer`);
            return false;
        }
        const peer = room.peers.get(peerId);
        if (peer) {
            console.log(`Removing peer ${peerId} from room ${roomId}`);
            console.log(`Closing ${peer.transports.size} transports`);
            peer.transports.forEach(t => t.transport.close());
            console.log(`Closing ${peer.producers.size} producers`);
            peer.producers.forEach(p => {
                console.log(`Closing producer ${p.id} (${p.kind})`);
                p.close();
            });
            console.log(`Closing ${peer.consumers.size} consumers`);
            peer.consumers.forEach(c => {
                console.log(`Closing consumer ${c.id}`);
                c.close();
            });
            room.peers.delete(peerId);
            console.log(`Removed peer ${peerId} from room ${roomId}`);
            if (room.peers.size === 0) {
                console.log(`Room ${roomId} is empty, removing it`);
                exports.rooms.delete(roomId);
            }
            return true;
        }
        return false;
    }
    static removePeerFromAllRooms(peerId) {
        exports.rooms.forEach((_, roomId) => this.removePeer(roomId, peerId));
    }
    static getRouter(roomId) {
        var _a;
        return (_a = exports.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.router;
    }
    static getAllProducers(roomId) {
        const room = exports.rooms.get(roomId);
        if (!room) {
            console.error(`Room ${roomId} not found when getting producers`);
            return [];
        }
        const producers = [];
        room.peers.forEach((peer, peerId) => {
            peer.producers.forEach(producer => {
                console.log(`Found producer ${producer.id} (${producer.kind}) from peer ${peerId}`);
                producers.push(producer);
            });
        });
        return producers;
    }
    static findTransport(roomId, peerId, transportId) {
        var _a;
        const peer = (_a = exports.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.peers.get(peerId);
        if (!peer)
            return null;
        for (const transport of peer.transports) {
            if (transport.transport.id === transportId) {
                return transport;
            }
        }
        return null;
    }
    static findTransportByDirection(roomId, peerId, direction) {
        var _a;
        const peer = (_a = exports.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.peers.get(peerId);
        if (!peer)
            return null;
        for (const transport of peer.transports) {
            if (transport.direction === direction) {
                return transport;
            }
        }
        return null;
    }
    static findConsumer(roomId, peerId, consumerId) {
        var _a;
        const peer = (_a = exports.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.peers.get(peerId);
        if (!peer)
            return null;
        for (const consumer of peer.consumers) {
            if (consumer.id === consumerId) {
                return consumer;
            }
        }
        return null;
    }
    static getPeers(roomId) {
        var _a;
        return (_a = exports.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.peers;
    }
}
exports.RoomManager = RoomManager;
