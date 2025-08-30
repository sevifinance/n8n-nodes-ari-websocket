"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AriWebSocketTrigger = void 0;
const ws_1 = __importDefault(require("ws"));
class AriWebSocketTrigger {
    constructor() {
        this.name = 'ariWebSocketTrigger';
        this.description = {
            displayName: 'ARI WebSocket Trigger',
            name: 'ariWebSocketTrigger',
            icon: 'file:websocket.svg',
            group: ['trigger'],
            version: 1,
            description: 'Subscribe to Asterisk ARI events over WebSocket',
            defaults: { name: 'ARI WebSocket Trigger' },
            inputs: [],
            outputs: ['main'],
            credentials: [],
            properties: [
                {
                    displayName: 'Protocol',
                    name: 'protocol',
                    type: 'options',
                    default: 'ws',
                    options: [
                        { name: 'ws', value: 'ws' },
                        { name: 'wss', value: 'wss' },
                    ],
                },
                {
                    displayName: 'Host',
                    name: 'host',
                    type: 'string',
                    default: 'sip.sevi.io',
                },
                {
                    displayName: 'Port',
                    name: 'port',
                    type: 'number',
                    typeOptions: { minValue: 1, maxValue: 65535 },
                    default: 8088,
                },
                {
                    displayName: 'Application',
                    name: 'application',
                    type: 'string',
                    default: 'smile',
                    required: true,
                    description: 'ARI application name',
                },
                {
                    displayName: 'Username',
                    name: 'username',
                    type: 'string',
                    default: '',
                    required: true,
                },
                {
                    displayName: 'Password',
                    name: 'password',
                    type: 'string',
                    typeOptions: { password: true },
                    default: '',
                    required: true,
                },
                {
                    displayName: 'Subscribe All',
                    name: 'subscribeAll',
                    type: 'boolean',
                    default: true,
                },
                {
                    displayName: 'Extra Query (optional)',
                    name: 'extraQuery',
                    type: 'string',
                    default: '',
                    placeholder: 'key=value&key2=value2',
                },
                {
                    displayName: 'Heartbeat Interval (ms)',
                    name: 'heartbeatMs',
                    type: 'number',
                    default: 25000,
                },
                {
                    displayName: 'Emit Connection Events',
                    name: 'emitConnectionEvents',
                    type: 'boolean',
                    default: false,
                    description: 'If enabled, emit items for open/close/error in addition to messages',
                },
            ],
        };
    }
    async trigger() {
        const protocol = this.getNodeParameter('protocol', 0);
        const host = this.getNodeParameter('host', 0);
        const port = this.getNodeParameter('port', 0);
        const application = this.getNodeParameter('application', 0);
        const username = this.getNodeParameter('username', 0);
        const password = this.getNodeParameter('password', 0);
        const subscribeAll = this.getNodeParameter('subscribeAll', 0);
        const extraQuery = (this.getNodeParameter('extraQuery', 0) || '').trim();
        const heartbeatMs = this.getNodeParameter('heartbeatMs', 0);
        const emitConnectionEvents = this.getNodeParameter('emitConnectionEvents', 0);
        const qs = new URLSearchParams();
        qs.set('api_key', `${username}:${password}`);
        qs.set('app', application);
        if (subscribeAll)
            qs.set('subscribeAll', 'true');
        if (extraQuery)
            qs.append('', extraQuery);
        const url = `${protocol}://${host}:${port}/ari/events?${qs.toString().replace('=&', '&')}`;
        let ws;
        let heartbeatTimer;
        let backoff = 1000;
        const connect = () => {
            ws = new ws_1.default(url);
            ws.on('open', () => {
                backoff = 1000;
                if (heartbeatTimer)
                    clearInterval(heartbeatTimer);
                heartbeatTimer = setInterval(() => {
                    if (ws && ws.readyState === ws_1.default.OPEN) {
                        try {
                            ws.ping();
                        }
                        catch { }
                    }
                }, heartbeatMs);
                if (emitConnectionEvents) {
                    this.emit([this.helpers.returnJsonArray([{ event: 'open', ws: true }])]);
                }
            });
            ws.on('message', (buf) => {
                var _a, _b, _c, _d, _e, _f, _g;
                const text = buf.toString();
                let payload = text;
                try {
                    payload = JSON.parse(text);
                }
                catch { }
                let normalized = {};
                if (typeof payload === 'object' && payload !== null) {
                    const p = payload;
                    normalized = {
                        type: p.type,
                        timestamp: p.timestamp,
                        application: p.application,
                        asterisk_id: p.asterisk_id,
                        channelId: (_a = p === null || p === void 0 ? void 0 : p.channel) === null || _a === void 0 ? void 0 : _a.id,
                        channelName: (_b = p === null || p === void 0 ? void 0 : p.channel) === null || _b === void 0 ? void 0 : _b.name,
                        callerNumber: (_d = (_c = p === null || p === void 0 ? void 0 : p.channel) === null || _c === void 0 ? void 0 : _c.caller) === null || _d === void 0 ? void 0 : _d.number,
                        connectedNumber: (_f = (_e = p === null || p === void 0 ? void 0 : p.channel) === null || _e === void 0 ? void 0 : _e.connected) === null || _f === void 0 ? void 0 : _f.number,
                        dialplan: (_g = p === null || p === void 0 ? void 0 : p.channel) === null || _g === void 0 ? void 0 : _g.dialplan,
                        raw: p,
                    };
                }
                else {
                    normalized = { raw: payload };
                }
                this.emit([this.helpers.returnJsonArray([normalized])]);
            });
            ws.on('close', (code) => {
                if (heartbeatTimer)
                    clearInterval(heartbeatTimer);
                if (emitConnectionEvents) {
                    this.emit([this.helpers.returnJsonArray([{ event: 'close', code }])]);
                }
                setTimeout(connect, Math.min(backoff, 30000));
                backoff = Math.min(backoff * 2, 30000);
            });
            ws.on('error', (err) => {
                if (emitConnectionEvents) {
                    this.emit([this.helpers.returnJsonArray([{ event: 'error', message: err.message }])]);
                }
            });
        };
        connect();
        return {
            closeFunction: async () => {
                if (heartbeatTimer)
                    clearInterval(heartbeatTimer);
                if (ws && ws.readyState === ws_1.default.OPEN)
                    ws.close();
            },
        };
    }
}
exports.AriWebSocketTrigger = AriWebSocketTrigger;
