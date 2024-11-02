import { Router, Transport, Producer, Consumer } from 'mediasoup/node/lib/types';

// Define interfaces for better type safety
interface TransportInfo {
    transport: Transport;
    direction: 'send' | 'recv';
}

interface PeerInfo {
    socket: any;
    transports: Set<TransportInfo>;
    producers: Set<Producer>;
    consumers: Set<Consumer>;
}

interface RoomInfo {
    router: Router;
    peers: Map<string, PeerInfo>;
}

// Main router variable
// let router: Router;

// Using Map instead of object literal for rooms
export const rooms = new Map<string, RoomInfo>();

// Helper functions for room management
class RoomManager {
    // Create a new room
    static createRoom(roomId: string, router: Router): void {
        rooms.set(roomId, {
            router,
            peers: new Map()
        });
    }

    // Add a peer to a room
    static addPeer(roomId: string, peerId: string, socket: any): boolean {
        const room = rooms.get(roomId);
        if (!room) return false;

        room.peers.set(peerId, {
            socket,
            transports: new Set<TransportInfo>(),
            producers: new Set<Producer>(),
            consumers: new Set<Consumer>()
        });
        return true;
    }

    // Add transport to a peer
    static addTransport(roomId: string, peerId: string, transportInfo: TransportInfo): boolean {
        const room = rooms.get(roomId);
        const peer = room?.peers.get(peerId);
        if (!peer) return false;

        peer.transports.add(transportInfo);
        return true;
    }

    // Add producer to a peer
    static addProducer(roomId: string, peerId: string, producer: Producer): boolean {
        const room = rooms.get(roomId);
        const peer = room?.peers.get(peerId);
        if (!peer) return false;

        peer.producers.add(producer);
        return true;
    }

    // Add consumer to a peer
    static addConsumer(roomId: string, peerId: string, consumer: Consumer): boolean {
        const room = rooms.get(roomId);
        const peer = room?.peers.get(peerId);
        if (!peer) return false;

        peer.consumers.add(consumer);
        return true;
    }

    // Remove a peer from a room
    static removePeer(roomId: string, peerId: string): boolean {
        const room = rooms.get(roomId);
        if (!room) return false;

        const peer = room.peers.get(peerId);
        if (peer) {
            // Clean up resources
            peer.transports.forEach(t => t.transport.close());
            peer.producers.forEach(p => p.close());
            peer.consumers.forEach(c => c.close());
            room.peers.delete(peerId);

            // Remove room if empty
            if (room.peers.size === 0) {
                rooms.delete(roomId);
            }
            return true;
        }
        return false;
    }

    // Get all peers in a room
    static getPeers(roomId: string): Map<string, PeerInfo> | undefined {
        return rooms.get(roomId)?.peers;
    }

    // Get specific peer
    static getPeer(roomId: string, peerId: string): PeerInfo | undefined {
        return rooms.get(roomId)?.peers.get(peerId);
    }

    // Get room router
    static getRouter(roomId: string): Router | undefined {
        return rooms.get(roomId)?.router;
    }

    // Get all producers in a room
    static getAllProducers(roomId: string): Producer[] {
        const room = rooms.get(roomId);
        if (!room) return [];

        const producers: Producer[] = [];
        room.peers.forEach(peer => {
            peer.producers.forEach(producer => producers.push(producer));
        });
        return producers;
    }

    // Find transport by ID
    static findTransport(roomId: string, peerId: string, transportId: string): TransportInfo | undefined {
        const peer = this.getPeer(roomId, peerId);
        return Array.from(peer?.transports || []).find(t => t.transport.id === transportId);
    }
}


export default RoomManager


