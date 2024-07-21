import cookieParser from "cookie-parser";
import express, { Application } from "express";
import cors, { CorsOptions } from "cors";
import morgan from "morgan";
import http from 'http';
import { Server } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import "dotenv/config";

const app: Application = express();
const server = http.createServer(app);

// const pcConfig = {
//     iceServers: [
//         { urls: 'stun:stun.l.google.com:19302' },
//         { urls: 'turn:192.0.2.1:3478?relay=udp', username: 'user', credential: 'pass' },
//         { urls: 'turns:192.0.2.1:3479?relay=udp', username: 'user', credential: 'pass' }
//     ]
// };
import { StunServers } from "./utils/StunServer";

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", 'https://admin.socket.io', 'https://whatsapp-chat-imbu.onrender.com'],
        credentials: true,
    }
});


const options: CorsOptions = {
    origin: ['http://localhost:5173', 'https://whatsapp-chat-imbu.onrender.com'],
    credentials: true,
    exposedHeaders: ["sessionID", "sessionId", "sessionid"]
};

app.use(cors(options));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.send('backend home route successful');
});

const port = process.env.PORT || 5000;
const newServer = server.listen(port, () => {
    console.log(`server is running on port number ${port}`);
});

instrument(io, { auth: false });

process.on("uncaughtException", (err) => {
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down the server for handling uncaught Exception`);
    newServer.close(() => {
        process.exit(1);
    });
});

process.on("unhandledRejection", (err: Error) => {
    console.log(`Error: ${err.message}`);
    console.log(`Shutting down the server for unhandled promise rejection`);
    newServer.close(() => {
        process.exit(1);
    });
});
