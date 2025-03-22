import { Router, Transport, Producer, Consumer } from 'mediasoup/node/lib/types';

export const mediaCodecs: any[] = [
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

export const rooms = new Map<string, RoomInfo>();

export class RoomManager {
  static createRoom(roomId: string, router: Router) {
    rooms.set(roomId, { router, peers: new Map() });
  }

  static addPeer(roomId: string, peerId: string, socket: any) {
    const room = rooms.get(roomId);
    if (!room) return false;

    room.peers.set(peerId, {
      socket,
      transports: new Set(),
      producers: new Set(),
      consumers: new Set(),
    });
    return true;
  }

  static addTransport(roomId: string, peerId: string, transportInfo: TransportInfo) {
    const room = rooms.get(roomId);
    const peer = room?.peers.get(peerId);
    if (!peer) return false;

    peer.transports.add(transportInfo);
    return true;
  }

  static addProducer(roomId: string, peerId: string, producer: Producer) {
    const room = rooms.get(roomId);
    const peer = room?.peers.get(peerId);
    if (!peer) {
      console.error(`Peer ${peerId} not found in room ${roomId}`);
      return false;
    }

    console.log(`Adding producer ${producer.id} (${producer.kind}) to peer ${peerId} in room ${roomId}`);
    peer.producers.add(producer);
    
    // Log all producers in the room
    const allProducers = this.getAllProducers(roomId);
    console.log(`Current producers in room ${roomId}:`, allProducers.map(p => ({
      id: p.id,
      kind: p.kind,
      peerId: room ? Array.from(room.peers.entries())
        .find(([_, peer]) => peer.producers.has(p))?.[0] : undefined
    })));
    
    return true;
  }

  static addConsumer(roomId: string, peerId: string, consumer: Consumer) {
    const room = rooms.get(roomId);
    const peer = room?.peers.get(peerId);
    if (!peer) return false;

    peer.consumers.add(consumer);
    return true;
  }

  static removePeer(roomId: string, peerId: string) {
    const room = rooms.get(roomId);
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
        rooms.delete(roomId);
      }
      return true;
    }
    return false;
  }

  static removePeerFromAllRooms(peerId: string) {
    rooms.forEach((_, roomId) => this.removePeer(roomId, peerId));
  }

  static getRouter(roomId: string) {
    return rooms.get(roomId)?.router;
  }

  static getAllProducers(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) {
      console.error(`Room ${roomId} not found when getting producers`);
      return [];
    }

    const producers: Producer[] = [];
    room.peers.forEach((peer, peerId) => {
      peer.producers.forEach(producer => {
        console.log(`Found producer ${producer.id} (${producer.kind}) from peer ${peerId}`);
        producers.push(producer);
      });
    });
    return producers;
  }

  static findTransport(roomId: string, peerId: string, transportId: string) {
    const peer = rooms.get(roomId)?.peers.get(peerId);
    if (!peer) return null;

    for (const transport of peer.transports) {
      if (transport.transport.id === transportId) {
        return transport;
      }
    }
    return null;
  }

  static findTransportByDirection(roomId: string, peerId: string, direction: 'send' | 'recv') {
    const peer = rooms.get(roomId)?.peers.get(peerId);
    if (!peer) return null;

    for (const transport of peer.transports) {
      if (transport.direction === direction) {
        return transport;
      }
    }
    return null;
  }

  static findConsumer(roomId: string, peerId: string, consumerId: string) {
    const peer = rooms.get(roomId)?.peers.get(peerId);
    if (!peer) return null;

    for (const consumer of peer.consumers) {
      if (consumer.id === consumerId) {
        return consumer;
      }
    }
    return null;
  }

  // Add this method to fix the error
  static getPeers(roomId: string): Map<string, PeerInfo> | undefined {
    return rooms.get(roomId)?.peers;
  }
}