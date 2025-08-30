import type { ITriggerFunctions, INodeType, INodeTypeDescription, ITriggerResponse, IDataObject } from 'n8n-workflow';
import WebSocket from 'ws';

export class AriWebSocketTrigger implements INodeType {
    name = 'ariWebSocketTrigger';

    description: INodeTypeDescription = {
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

    async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
        const protocol = this.getNodeParameter('protocol', 0) as string;
        const host = this.getNodeParameter('host', 0) as string;
        const port = this.getNodeParameter('port', 0) as number;
        const application = this.getNodeParameter('application', 0) as string;
        const username = this.getNodeParameter('username', 0) as string;
        const password = this.getNodeParameter('password', 0) as string;
        const subscribeAll = this.getNodeParameter('subscribeAll', 0) as boolean;
        const extraQuery = (this.getNodeParameter('extraQuery', 0) as string || '').trim();
        const heartbeatMs = this.getNodeParameter('heartbeatMs', 0) as number;
        const emitConnectionEvents = this.getNodeParameter('emitConnectionEvents', 0) as boolean;

        const qs = new URLSearchParams();
        qs.set('api_key', `${username}:${password}`);
        qs.set('app', application);
        if (subscribeAll) qs.set('subscribeAll', 'true');
        if (extraQuery) qs.append('', extraQuery);

        const url = `${protocol}://${host}:${port}/ari/events?${qs.toString().replace('=&', '&')}`;

        let ws: WebSocket | undefined;
        let heartbeatTimer: NodeJS.Timeout | undefined;
        let backoff = 1000;

        const connect = () => {
            ws = new WebSocket(url);

            ws.on('open', () => {
                backoff = 1000;
                if (heartbeatTimer) clearInterval(heartbeatTimer);
                heartbeatTimer = setInterval(() => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        try { ws.ping(); } catch { }
                    }
                }, heartbeatMs);
                if (emitConnectionEvents) {
                    this.emit([this.helpers.returnJsonArray([{ event: 'open', ws: true }])]);
                }
            });

            ws.on('message', (buf: WebSocket.RawData) => {
                const text = buf.toString();
                let payload: unknown = text;
                try { payload = JSON.parse(text); } catch { }

                let normalized: Record<string, unknown> = {};
                if (typeof payload === 'object' && payload !== null) {
                    const p = payload as Record<string, unknown>;
                    normalized = {
                        type: p.type,
                        timestamp: p.timestamp,
                        application: p.application,
                        asterisk_id: (p as any).asterisk_id,
                        channelId: (p as any)?.channel?.id,
                        channelName: (p as any)?.channel?.name,
                        callerNumber: (p as any)?.channel?.caller?.number,
                        connectedNumber: (p as any)?.channel?.connected?.number,
                        dialplan: (p as any)?.channel?.dialplan,
                        raw: p,
                    };
                } else {
                    normalized = { raw: payload } as any;
                }

                this.emit([this.helpers.returnJsonArray([normalized as IDataObject])]);
            });

            ws.on('close', (code: number) => {
                if (heartbeatTimer) clearInterval(heartbeatTimer);
                if (emitConnectionEvents) {
                    this.emit([this.helpers.returnJsonArray([{ event: 'close', code }])]);
                }
                setTimeout(connect, Math.min(backoff, 30000));
                backoff = Math.min(backoff * 2, 30000);
            });

            ws.on('error', (err: Error) => {
                if (emitConnectionEvents) {
                    this.emit([this.helpers.returnJsonArray([{ event: 'error', message: err.message }])]);
                }
            });
        };

        connect();

        return {
            closeFunction: async () => {
                if (heartbeatTimer) clearInterval(heartbeatTimer);
                if (ws && ws.readyState === WebSocket.OPEN) ws.close();
            },
        };
    }
}
