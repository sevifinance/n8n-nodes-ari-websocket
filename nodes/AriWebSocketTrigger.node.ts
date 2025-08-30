import type { ITriggerFunctions, INodeType, INodeTypeDescription, ITriggerResponse, IDataObject } from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';
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
        outputs: [NodeConnectionType.Main],
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
                displayName: 'Event Type Filtering',
                name: 'eventTypeFiltering',
                type: 'boolean',
                default: false,
                description: 'Enable filtering by specific event types',
            },
            {
                displayName: 'Event Types',
                name: 'eventTypes',
                type: 'multiOptions',
                displayOptions: {
                    show: {
                        eventTypeFiltering: [true],
                    },
                },
                options: [
                    // Channel Events
                    { name: 'ChannelCreated', value: 'ChannelCreated' },
                    { name: 'ChannelDestroyed', value: 'ChannelDestroyed' },
                    { name: 'ChannelDtmfBegin', value: 'ChannelDtmfBegin' },
                    { name: 'ChannelDtmfEnd', value: 'ChannelDtmfEnd' },
                    { name: 'ChannelDtmfReceived', value: 'ChannelDtmfReceived' },
                    { name: 'ChannelEnteredBridge', value: 'ChannelEnteredBridge' },
                    { name: 'ChannelLeftBridge', value: 'ChannelLeftBridge' },
                    { name: 'ChannelStateChange', value: 'ChannelStateChange' },
                    { name: 'ChannelUserevent', value: 'ChannelUserevent' },
                    { name: 'ChannelVarset', value: 'ChannelVarset' },
                    { name: 'ChannelCallerId', value: 'ChannelCallerId' },
                    { name: 'ChannelConnectedLine', value: 'ChannelConnectedLine' },
                    { name: 'ChannelDialplan', value: 'ChannelDialplan' },
                    { name: 'ChannelHold', value: 'ChannelHold' },
                    { name: 'ChannelUnhold', value: 'ChannelUnhold' },
                    { name: 'ChannelTalkingStarted', value: 'ChannelTalkingStarted' },
                    { name: 'ChannelTalkingFinished', value: 'ChannelTalkingFinished' },
                    { name: 'ChannelHangupRequest', value: 'ChannelHangupRequest' },

                    // Bridge Events
                    { name: 'BridgeCreated', value: 'BridgeCreated' },
                    { name: 'BridgeDestroyed', value: 'BridgeDestroyed' },
                    { name: 'BridgeMerged', value: 'BridgeMerged' },
                    { name: 'BridgeAttendedTransfer', value: 'BridgeAttendedTransfer' },
                    { name: 'BridgeBlindTransfer', value: 'BridgeBlindTransfer' },
                    { name: 'BridgeVideoSourceChanged', value: 'BridgeVideoSourceChanged' },

                    // Dial Events
                    { name: 'Dial', value: 'Dial' },
                    { name: 'DialBegin', value: 'DialBegin' },
                    { name: 'DialEnd', value: 'DialEnd' },

                    // Playback Events
                    { name: 'PlaybackStarted', value: 'PlaybackStarted' },
                    { name: 'PlaybackStopped', value: 'PlaybackStopped' },
                    { name: 'PlaybackContinuing', value: 'PlaybackContinuing' },

                    // Recording Events
                    { name: 'RecordingStarted', value: 'RecordingStarted' },
                    { name: 'RecordingStopped', value: 'RecordingStopped' },
                    { name: 'RecordingFinished', value: 'RecordingFinished' },
                    { name: 'RecordingFailed', value: 'RecordingFailed' },

                    // Stasis Events
                    { name: 'StasisStart', value: 'StasisStart' },
                    { name: 'StasisEnd', value: 'StasisEnd' },

                    // Device and Endpoint Events
                    { name: 'DeviceStateChanged', value: 'DeviceStateChanged' },
                    { name: 'EndpointStateChange', value: 'EndpointStateChange' },
                    { name: 'ExtensionStatusChanged', value: 'ExtensionStatusChanged' },

                    // Contact and Peer Events
                    { name: 'ContactInfo', value: 'ContactInfo' },
                    { name: 'ContactStatusChange', value: 'ContactStatusChange' },
                    { name: 'Peer', value: 'Peer' },
                    { name: 'PeerStatusChange', value: 'PeerStatusChange' },

                    // Application Events
                    { name: 'ApplicationReplaced', value: 'ApplicationReplaced' },
                    { name: 'ApplicationMove', value: 'ApplicationMove' },
                    { name: 'ApplicationMoveFailed', value: 'ApplicationMoveFailed' },

                    // Message Events
                    { name: 'MessageReceived', value: 'MessageReceived' },
                    { name: 'TextMessageReceived', value: 'TextMessageReceived' },

                    // Other Events
                    { name: 'HangupRequest', value: 'HangupRequest' },
                    { name: 'Hold', value: 'Hold' },
                    { name: 'Unhold', value: 'Unhold' },
                    { name: 'MissingParams', value: 'MissingParams' },
                ],
                default: [],
                description: 'Select specific event types to process. Leave empty to process all events.',
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
            {
                displayName: 'Debug Mode',
                name: 'debugMode',
                type: 'boolean',
                default: true,
                description: 'Enable debug logging to help with testing',
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
        const eventTypeFiltering = this.getNodeParameter('eventTypeFiltering', 0) as boolean;
        const eventTypes = this.getNodeParameter('eventTypes', 0) as string[];
        const extraQuery = (this.getNodeParameter('extraQuery', 0) as string || '').trim();
        const heartbeatMs = this.getNodeParameter('heartbeatMs', 0) as number;
        const emitConnectionEvents = this.getNodeParameter('emitConnectionEvents', 0) as boolean;
        const debugMode = this.getNodeParameter('debugMode', 0) as boolean;

        const qs = new URLSearchParams();
        qs.set('api_key', `${username}:${password}`);
        qs.set('app', application);
        if (subscribeAll) qs.set('subscribeAll', 'true');
        if (extraQuery) qs.append('', extraQuery);

        const url = `${protocol}://${host}:${port}/ari/events?${qs.toString().replace('=&', '&')}`;

        let ws: WebSocket | undefined;
        let heartbeatTimer: NodeJS.Timeout | undefined;
        let backoff = 1000;
        let messageCount = 0;
        let isConnected = false;

        const log = (message: string, data?: any) => {
            if (debugMode) {
                console.log(`[ARI WebSocket Trigger] ${message}`, data || '');
            }
        };

        const connect = () => {
            log(`Connecting to ${url}`);
            ws = new WebSocket(url);

            ws.on('open', () => {
                isConnected = true;
                backoff = 1000;
                log('WebSocket connection opened successfully');

                if (heartbeatTimer) clearInterval(heartbeatTimer);
                heartbeatTimer = setInterval(() => {
                    if (ws && ws.readyState === WebSocket.OPEN) {
                        try {
                            ws.ping();
                            log('Heartbeat ping sent');
                        } catch (error) {
                            log('Heartbeat ping failed', error);
                        }
                    }
                }, heartbeatMs);

                if (emitConnectionEvents) {
                    this.emit([this.helpers.returnJsonArray([{
                        event: 'open',
                        ws: true,
                        timestamp: new Date().toISOString(),
                        messageCount
                    }])]);
                }
            });

            ws.on('message', (buf: WebSocket.RawData) => {
                messageCount++;
                const text = buf.toString();
                log(`Received message #${messageCount}`, { length: text.length, preview: text.substring(0, 100) });

                let payload: unknown = text;
                try {
                    payload = JSON.parse(text);
                    log(`Message #${messageCount} parsed as JSON successfully`);
                } catch (error) {
                    log(`Message #${messageCount} is not valid JSON, treating as raw text`);
                }

                let normalized: Record<string, unknown> = {};
                if (typeof payload === 'object' && payload !== null) {
                    const p = payload as Record<string, unknown>;
                    normalized = {
                        messageNumber: messageCount,
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
                        receivedAt: new Date().toISOString(),
                    };
                } else {
                    normalized = {
                        messageNumber: messageCount,
                        raw: payload,
                        receivedAt: new Date().toISOString(),
                    } as any;
                }

                // Event type filtering logic
                if (eventTypeFiltering && eventTypes.length > 0) {
                    const eventType = normalized.type as string;
                    if (!eventType || !eventTypes.includes(eventType)) {
                        log(`Skipping message #${messageCount} - event type '${eventType}' not in selected types: [${eventTypes.join(', ')}]`);
                        return;
                    }
                    log(`Processing message #${messageCount} - event type '${eventType}' matches filter`);
                }

                log(`Emitting message #${messageCount}`, { type: normalized.type, channelId: normalized.channelId });
                this.emit([this.helpers.returnJsonArray([normalized as IDataObject])]);
            });

            ws.on('close', (code: number, reason: Buffer) => {
                isConnected = false;
                log(`WebSocket connection closed`, { code, reason: reason.toString() });

                if (heartbeatTimer) clearInterval(heartbeatTimer);
                if (emitConnectionEvents) {
                    this.emit([this.helpers.returnJsonArray([{
                        event: 'close',
                        code,
                        reason: reason.toString(),
                        messageCount,
                        timestamp: new Date().toISOString()
                    }])]);
                }

                // Reconnect with exponential backoff
                const reconnectDelay = Math.min(backoff, 30000);
                log(`Reconnecting in ${reconnectDelay}ms`);
                setTimeout(connect, reconnectDelay);
                backoff = Math.min(backoff * 2, 30000);
            });

            ws.on('error', (err: Error) => {
                log('WebSocket error occurred', err.message);
                if (emitConnectionEvents) {
                    this.emit([this.helpers.returnJsonArray([{
                        event: 'error',
                        message: err.message,
                        messageCount,
                        timestamp: new Date().toISOString()
                    }])]);
                }
            });

            ws.on('ping', () => {
                log('Received ping from server');
            });

            ws.on('pong', () => {
                log('Received pong from server');
            });
        };

        connect();

        return {
            closeFunction: async () => {
                log('Trigger node is being closed');
                isConnected = false;
                if (heartbeatTimer) clearInterval(heartbeatTimer);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.close();
                    log('WebSocket connection closed by trigger shutdown');
                }
            },
        };
    }
}
