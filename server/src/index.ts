
// import fs from "fs"
// import path from "path"
// import cors from "cors";

// import express from 'express';
// import https from 'https';
// import cookieParser from "cookie-parser";
// import { Server } from 'socket.io';
// import { createWorker } from 'mediasoup';
// import { instrument } from "@socket.io/admin-ui";

// import {
//     Worker, Router, WorkerLogLevel,
//     Producer, Consumer, Transport, RtpCodecCapability
// } from "mediasoup/node/lib/types";
// const privatePath = path.join(__dirname, '../whatsapp-clone-app-privateKey.key');
// const crtPath = path.join(__dirname, '../whatsapp-clone-app.crt');
// const privateKey = fs.readFileSync(privatePath, 'utf8');
// const certificate = fs.readFileSync(crtPath, 'utf8');

// // Handle uncaught Exception
// process.on("uncaughtException", (err) => {
//     console.error("Uncaught Exception:", err);
//     console.log(`shutting down the server for handling uncaught Exception`);
//     process.exit(1);
// });


// const app = express();

// import { options } from "./utils/CorsOptions"
// const credentials = { key: privateKey, cert: certificate };
// const server = https.createServer(credentials, app);
// const io = new Server(server, { cors: options });
// app.use(cors(options));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());

// let worker: Worker;
// let router: Router;
// const rooms: { [key: string]: { router: Router; transports: { [key: string]: Transport }; producers: { [key: string]: Producer }; consumers: { [key: string]: { [key: string]: Consumer } } } } = {};

// (async () => {
//     worker = await createWorker();
//     router = await worker.createRouter({
//         mediaCodecs: [
//             { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
//             { kind: 'video', mimeType: 'video/VP8', clockRate: 90000, parameters: { 'x-google-start-bitrate': 1000 } },
//         ],
//     });
// })();

// io.on('connection', (socket) => {
//     console.log("connected with ", socket.id);

//     let room: string;
//     let transport: Transport;
//     let producer: Producer;
//     let consumers: { [key: string]: Consumer } = {};

//     socket.on('create-room', () => {
//         room = Math.random().toString(36).substring(2, 8);
//         socket.join(room);
//         rooms[room] = { router, transports: {}, producers: {}, consumers: {} };
//         socket.emit('room-created', room);
//     });

//     socket.on('join-room', async (roomCode) => {
//         room = roomCode;
//         socket.join(room);
//         io.to(room).emit('user-joined', socket.id);

//         transport = await rooms[room].router.createWebRtcTransport({
//             listenIps: [
//                 { ip: '127.0.0.1', announcedIp: undefined },
//             ],
//             enableUdp: true,
//             enableTcp: true,
//             preferUdp: true,
//         });
//         rooms[room].transports[socket.id] = transport;

//         socket.emit('transport-created', {
//             id: transport.id,
//             iceParameters: transport.iceParameters(),
//             iceCandidates: transport.iceCandidates(),
//             dtlsParameters: transport.dtlsParameters(),
            
//         });
//     });

//     socket.on('produce', async ({ kind, rtpParameters }) => {
//         producer = await rooms[room].transports[socket.id].produce({ kind, rtpParameters });
//         rooms[room].producers[socket.id] = producer;

//         producer.on('transportclose', () => {
//             producer.close();
//         });

//         socket.emit('producer-created', { id: producer.id });

//         Object.keys(rooms[room].transports).forEach(async (id) => {
//             if (id !== socket.id) {
//                 const consumer = await rooms[room].transports[id].consume({
//                     producerId: producer.id,
//                     rtpCapabilities: await rooms[room].router.rtpCapabilities,
//                 });
//                 rooms[room].consumers[socket.id] = { [id]: consumer };


//                 consumer.on('transportclose', () => {
//                     consumer.close();
//                 });

//                 socket.to(id).emit('consume', {
//                     producerId: producer.id,
//                     id: consumer.id,
//                     kind: consumer.kind,
//                     rtpParameters: consumer.rtpParameters,
//                 });
//             }
//         });
//     });

//     socket.on('consume', async ({ producerId, rtpCapabilities }) => {
//         const consumer = await rooms[room].transports[socket.id].consume({
//             producerId,
//             rtpCapabilities,
//         });
//         rooms[room].consumers[producerId] = { [socket.id]: consumer };

//         consumer.on('transportclose', () => {
//             consumer.close();
//         });

//         socket.emit('consume-done', {
//             id: consumer.id,
//             producerId: consumer.producerId,
//             kind: consumer.kind,
//             rtpParameters: consumer.rtpParameters,
//         });
//     });

//     socket.on('leave-room', () => {
//         socket.leave(room);
//         io.to(room).emit('user-left', socket.id);

//         if (rooms[room].transports[socket.id]) {
//             rooms[room].transports[socket.id].close();
//             delete rooms[room].transports[socket.id];
//         }

//         if (rooms[room].producers[socket.id]) {
//             rooms[room].producers[socket.id].close();
//             delete rooms[room].producers[socket.id];
//         }

//         Object.keys(rooms[room].consumers[socket.id] || {}).forEach((id) => {
//             rooms[room].consumers[socket.id][id].close();
//         });
//         delete rooms[room].consumers[socket.id];
//     });

//     socket.on('disconnect', () => {
//         io.to(room).emit('user-left', socket.id);

//         if (rooms[room].transports[socket.id]) {
//             rooms[room].transports[socket.id].close();
//             delete rooms[room].transports[socket.id];
//         }

//         if (rooms[room].producers[socket.id]) {
//             rooms[room].producers[socket.id].close();
//             delete rooms[room].producers[socket.id];
//         }

//         Object.keys(rooms[room].consumers[socket.id] || {}).forEach((id) => {
//             rooms[room].consumers[socket.id][id].close();
//         });
//         delete rooms[room].consumers[socket.id];
//     });
// });



// app.get('/', (req, res) => {
//     res.send('backend home route successful');
// });

// instrument(io, { auth: false });
// const port = process.env.PORT || 5000
// const newServer = server.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });


// process.on("uncaughtException", (err) => {
//     console.log(`Error: ${err.message}`);
//     console.log(`Shutting down the server for handling uncaught Exception`);
//     newServer.close(() => {
//         process.exit(1);
//     });
// });

// process.on("unhandledRejection", (err: Error) => {
//     console.log(`Error: ${err.message}`);
//     console.log(`Shutting down the server for unhandled promise rejection`);
//     newServer.close(() => {
//         process.exit(1);
//     });
// });


// server/src/index.ts

import express from 'express';
import https from 'https';
import { Server } from 'socket.io';
import { createWorker } from 'mediasoup';
import fs from 'fs';
import path from 'path';
import cors from 'cors';

import {
  Worker,
  Router,
  Transport,
  Producer,
  Consumer,
  RtpCodecCapability,
} from 'mediasoup/node/lib/types';

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

async function createWebRtcTransport(router: Router) {
  return router.createWebRtcTransport({
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: '127.0.0.1', // Change this to your server's public IP
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

    callback({
      roomId,
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

    const rtpCapabilities = router.rtpCapabilities;

    callback({ rtpCapabilities });
  });

  socket.on('createWebRtcTransport', async ({ roomId }, callback) => {
    const router = rooms[roomId]?.router;

    if (!router) {
      callback({ error: 'Room not found' });
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
      console.error(err);
      callback({ error: 'Failed to create transport' });
    }
  });

  socket.on(
    'connectTransport',
    async ({ roomId, transportId, dtlsParameters }, callback) => {
      const transport = rooms[roomId]?.peers[socket.id].transports.find(
        (t) => t.id === transportId
      );

      if (!transport) {
        callback({ error: 'Transport not found' });
        return;
      }

      await transport.connect({ dtlsParameters });
      callback();
    }
  );

  socket.on(
    'produce',
    async ({ roomId, transportId, kind, rtpParameters }, callback) => {
      const router = rooms[roomId]?.router;
      const transport = rooms[roomId]?.peers[socket.id].transports.find(
        (t) => t.id === transportId
      );

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
    }
  );

  socket.on(
    'consume',
    async ({ roomId, producerId, rtpCapabilities }, callback) => {
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