"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.options = void 0;
exports.options = {
    origin: [
        "https://localhost:5173",
        "http://localhost:5173",
        "https://localhost:4200",
        "https://localhost:3000",
        "https://admin.socket.io"
    ],
    credentials: true,
    exposedHeaders: ["sessionid", "token", "resettoken"],
    allowedHeaders: ["sessionid", "Content-Type", "Authorization", "token"],
};
//# sourceMappingURL=CorsOptions.js.map