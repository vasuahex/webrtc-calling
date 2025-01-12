import { CorsOptions } from "cors";

// cors and session
export const options: CorsOptions = {
    origin: [
        "https://localhost:3001",
        "http://localhost:5173",
        "https://localhost:4200",
        "https://localhost:3000",
        "https://admin.socket.io"
    ],
    credentials: true,
    exposedHeaders: ["sessionid", "token", "resettoken", 'Content-Range', 'Content-Length', 'Accept-Ranges'],
    allowedHeaders: ["sessionid", "Content-Type", "Authorization", "token", 'range'],
};