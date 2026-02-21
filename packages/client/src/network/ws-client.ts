import { ClientMessage, ServerMessage } from '@meltdown/shared';

type MessageCallback = (message: ServerMessage) => void;

let ws: WebSocket | null = null;
let messageCallbacks: MessageCallback[] = [];
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let onConnectCallback: (() => void) | null = null;
let onDisconnectCallback: (() => void) | null = null;

export function connect(
  onConnect?: () => void,
  onDisconnect?: () => void
): void {
  onConnectCallback = onConnect ?? null;
  onDisconnectCallback = onDisconnect ?? null;
  doConnect();
}

function doConnect(): void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws`;

  ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('[WS] Connected');
    onConnectCallback?.();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as ServerMessage;
      for (const cb of messageCallbacks) {
        cb(message);
      }
    } catch (err) {
      console.error('[WS] Parse error:', err);
    }
  };

  ws.onclose = () => {
    console.log('[WS] Disconnected');
    onDisconnectCallback?.();
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    doConnect();
  }, 2000);
}

export function send(message: ClientMessage): void {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

export function onMessage(callback: MessageCallback): () => void {
  messageCallbacks.push(callback);
  return () => {
    messageCallbacks = messageCallbacks.filter(cb => cb !== callback);
  };
}

export function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  ws?.close();
  ws = null;
}
