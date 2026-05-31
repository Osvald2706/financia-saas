import { getToken } from './api';

type WSCallback = (event: string, data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, WSCallback[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnect = 5;

  connect() {
    const token = getToken();
    if (!token) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      this.ws = new WebSocket(`${protocol}//${host}/ws?token=${token}`);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        console.log('🔌 WebSocket connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type && msg.type !== 'connected') {
            this.listeners.get(msg.type)?.forEach(cb => cb(msg.type, msg.data));
            this.listeners.get('*')?.forEach(cb => cb(msg.type, msg.data));
          }
        } catch {}
      };

      this.ws.onclose = () => {
        if (this.reconnectAttempts < this.maxReconnect) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
        }
      };

      this.ws.onerror = () => this.ws?.close();
    } catch {}
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  on(event: string, callback: WSCallback) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
    return () => {
      const arr = this.listeners.get(event);
      if (arr) {
        const idx = arr.indexOf(callback);
        if (idx >= 0) arr.splice(idx, 1);
      }
    };
  }
}

export const wsService = new WebSocketService();
