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
const os_1 = __importDefault(require("os"));
const axios_1 = __importDefault(require("axios"));
const ifaces = os_1.default.networkInterfaces();
const getLocalIp = () => {
    let localIp = '127.0.0.1';
    Object.keys(ifaces).forEach((ifname) => {
        if (ifaces[ifname] !== undefined) {
            for (const iface of ifaces[ifname]) {
                if (iface.family !== 'IPv4' || iface.internal !== false) {
                    continue;
                }
                localIp = iface.address;
                return;
            }
        }
    });
    return localIp;
};
const getPublicIp = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield axios_1.default.get('https://ifconfig.me');
        return response.data;
    }
    catch (error) {
        console.error('Error fetching public IP:', error);
        return null;
    }
});
exports.default = {
    getLocalIp,
    getPublicIp
};
//# sourceMappingURL=Helpers.js.map