import type { User } from '@/types/auth';
import { getDeviceId } from '@/utils/deviceId';

const CHANNEL_NAME = 'task-manager-sync';
const SYNC_DATA_CHANNEL = 'task-manager-data-sync';

export interface SyncMessage {
  type: 'data_update' | 'login_state' | 'logout_state' | 'session_terminated' | 'force_logout';
  data: any;
  timestamp: number;
  sourceDeviceId: string;
  username?: string;
}

class BroadcastChannelService {
  private dataChannel: BroadcastChannel | null = null;
  private eventChannel: BroadcastChannel | null = null;
  private dataListeners: Set<(data: any, dataType: string) => void> = new Set();
  private eventListeners: Set<(message: SyncMessage) => void> = new Set();
  private deviceId: string;
  private initialized = false;

  constructor() {
    this.deviceId = getDeviceId();
  }

  init(): void {
    if (this.initialized) return;

    try {
      this.dataChannel = new BroadcastChannel(SYNC_DATA_CHANNEL);
      this.eventChannel = new BroadcastChannel(CHANNEL_NAME);

      this.dataChannel.onmessage = (event) => {
        const message = event.data as SyncMessage;
        if (message.type === 'data_update' && message.sourceDeviceId !== this.deviceId) {
          console.log('[BroadcastChannel] 收到数据更新:', message.data);
          this.dataListeners.forEach(listener => {
            listener(message.data, message.data?.dataType);
          });
        }
      };

      this.eventChannel.onmessage = (event) => {
        const message = event.data as SyncMessage;
        if (message.sourceDeviceId !== this.deviceId) {
          console.log('[BroadcastChannel] 收到事件:', message.type);
          this.eventListeners.forEach(listener => {
            listener(message);
          });
        }
      };

      this.initialized = true;
      console.log('[BroadcastChannel] 初始化成功');
    } catch (error) {
      console.error('[BroadcastChannel] 初始化失败:', error);
    }
  }

  broadcastDataUpdate(dataType: string, data: any): void {
    if (!this.dataChannel) {
      console.warn('[BroadcastChannel] 数据通道未初始化');
      return;
    }

    const message: SyncMessage = {
      type: 'data_update',
      data: { dataType, data },
      timestamp: Date.now(),
      sourceDeviceId: this.deviceId
    };

    try {
      this.dataChannel.postMessage(message);
      console.log('[BroadcastChannel] 发送数据更新:', dataType);
    } catch (error) {
      console.error('[BroadcastChannel] 发送数据失败:', error);
    }
  }

  broadcastEvent(type: SyncMessage['type'], data: any, username?: string): void {
    if (!this.eventChannel) {
      console.warn('[BroadcastChannel] 事件通道未初始化');
      return;
    }

    const message: SyncMessage = {
      type,
      data,
      timestamp: Date.now(),
      sourceDeviceId: this.deviceId,
      username
    };

    try {
      this.eventChannel.postMessage(message);
      console.log('[BroadcastChannel] 发送事件:', type);
    } catch (error) {
      console.error('[BroadcastChannel] 发送事件失败:', error);
    }
  }

  onDataUpdate(callback: (data: any, dataType: string) => void): () => void {
    this.dataListeners.add(callback);
    return () => this.dataListeners.delete(callback);
  }

  onEvent(callback: (message: SyncMessage) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  close(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.eventChannel) {
      this.eventChannel.close();
      this.eventChannel = null;
    }
    this.initialized = false;
  }
}

export const broadcastService = new BroadcastChannelService();
export default broadcastService;
