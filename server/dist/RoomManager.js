"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rooms = void 0;
exports.rooms = new Map();
class RoomManager {
    static createRoom(roomId, router) {
        exports.rooms.set(roomId, {
            router,
            peers: new Map()
        });
    }
    static addPeer(roomId, peerId, socket) {
        const room = exports.rooms.get(roomId);
        if (!room)
            return false;
        room.peers.set(peerId, {
            socket,
            transports: new Set(),
            producers: new Set(),
            consumers: new Set()
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
        if (!peer)
            return false;
        peer.producers.add(producer);
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
        if (!room)
            return false;
        const peer = room.peers.get(peerId);
        if (peer) {
            peer.transports.forEach(t => t.transport.close());
            peer.producers.forEach(p => p.close());
            peer.consumers.forEach(c => c.close());
            room.peers.delete(peerId);
            if (room.peers.size === 0) {
                exports.rooms.delete(roomId);
            }
            return true;
        }
        return false;
    }
    static getPeers(roomId) {
        var _a;
        return (_a = exports.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.peers;
    }
    static getPeer(roomId, peerId) {
        var _a;
        return (_a = exports.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.peers.get(peerId);
    }
    static getRouter(roomId) {
        var _a;
        return (_a = exports.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.router;
    }
    static getAllProducers(roomId) {
        const room = exports.rooms.get(roomId);
        if (!room)
            return [];
        const producers = [];
        room.peers.forEach(peer => {
            peer.producers.forEach(producer => producers.push(producer));
        });
        return producers;
    }
    static findTransport(roomId, peerId, transportId) {
        const peer = this.getPeer(roomId, peerId);
        return Array.from((peer === null || peer === void 0 ? void 0 : peer.transports) || []).find(t => t.transport.id === transportId);
    }
}
exports.default = RoomManager;
