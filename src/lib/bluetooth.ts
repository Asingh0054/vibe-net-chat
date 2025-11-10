/// <reference types="web-bluetooth" />
import { toast } from "sonner";

export interface BTDevice {
  id: string;
  name: string;
  device: BluetoothDevice;
  connected: boolean;
}

export interface BluetoothFileTransfer {
  file: File;
  progress: number;
  status: 'pending' | 'sending' | 'completed' | 'failed';
}

// Custom Bluetooth service UUID for file transfer
const FILE_TRANSFER_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const FILE_DATA_CHARACTERISTIC_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';
const FILE_CONTROL_CHARACTERISTIC_UUID = '0000fff2-0000-1000-8000-00805f9b34fb';

class BluetoothManager {
  private devices: Map<string, BTDevice> = new Map();
  private currentDevice: BTDevice | null = null;
  private onDeviceFoundCallback?: (device: BTDevice) => void;
  private onFileReceivedCallback?: (file: File) => void;
  private onTransferProgressCallback?: (progress: number) => void;

  constructor() {
    if (!this.isBluetoothSupported()) {
      console.warn('Web Bluetooth API is not supported in this browser');
    }
  }

  isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  async requestDevice(): Promise<BTDevice | null> {
    if (!this.isBluetoothSupported()) {
      toast.error('Bluetooth not supported in this browser');
      return null;
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [FILE_TRANSFER_SERVICE_UUID]
      });

      const btDevice: BTDevice = {
        id: device.id,
        name: device.name || 'Unknown Device',
        device: device,
        connected: false
      };

      this.devices.set(device.id, btDevice);
      this.onDeviceFoundCallback?.(btDevice);
      
      toast.success(`Found device: ${btDevice.name}`);
      return btDevice;
    } catch (error) {
      console.error('Error requesting Bluetooth device:', error);
      toast.error('Failed to find Bluetooth device');
      return null;
    }
  }

  async scanForDevices(): Promise<void> {
    if (!this.isBluetoothSupported()) {
      toast.error('Bluetooth not supported');
      return;
    }

    try {
      await this.requestDevice();
    } catch (error) {
      console.error('Error scanning for devices:', error);
      toast.error('Failed to scan for devices');
    }
  }

  async connectToDevice(deviceId: string): Promise<boolean> {
    const deviceInfo = this.devices.get(deviceId);
    if (!deviceInfo) {
      toast.error('Device not found');
      return false;
    }

    try {
      const server = await deviceInfo.device.gatt?.connect();
      if (!server) {
        toast.error('Failed to connect to GATT server');
        return false;
      }

      deviceInfo.connected = true;
      this.currentDevice = deviceInfo;
      
      toast.success(`Connected to ${deviceInfo.name}`);
      return true;
    } catch (error) {
      console.error('Error connecting to device:', error);
      toast.error('Failed to connect to device');
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.currentDevice?.device.gatt?.connected) {
      this.currentDevice.device.gatt.disconnect();
      this.currentDevice.connected = false;
      toast.info('Bluetooth disconnected');
    }
    this.currentDevice = null;
  }

  async sendFile(file: File): Promise<boolean> {
    if (!this.currentDevice?.connected) {
      toast.error('No device connected');
      return false;
    }

    try {
      const server = this.currentDevice.device.gatt;
      if (!server) return false;

      const service = await server.getPrimaryService(FILE_TRANSFER_SERVICE_UUID);
      const dataCharacteristic = await service.getCharacteristic(FILE_DATA_CHARACTERISTIC_UUID);
      const controlCharacteristic = await service.getCharacteristic(FILE_CONTROL_CHARACTERISTIC_UUID);

      // Send file metadata
      const metadata = JSON.stringify({
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      const encoder = new TextEncoder();
      await controlCharacteristic.writeValue(encoder.encode(metadata));

      // Send file in chunks
      const chunkSize = 512;
      const reader = new FileReader();
      
      return new Promise((resolve, reject) => {
        let offset = 0;
        
        reader.onload = async (e) => {
          try {
            const chunk = new Uint8Array(e.target?.result as ArrayBuffer);
            await dataCharacteristic.writeValue(chunk);
            
            offset += chunk.length;
            const progress = (offset / file.size) * 100;
            this.onTransferProgressCallback?.(progress);

            if (offset < file.size) {
              const blob = file.slice(offset, offset + chunkSize);
              reader.readAsArrayBuffer(blob);
            } else {
              toast.success('File sent successfully');
              resolve(true);
            }
          } catch (error) {
            console.error('Error sending chunk:', error);
            toast.error('Failed to send file');
            reject(error);
          }
        };

        reader.onerror = () => {
          toast.error('Failed to read file');
          reject(reader.error);
        };

        const blob = file.slice(0, chunkSize);
        reader.readAsArrayBuffer(blob);
      });
    } catch (error) {
      console.error('Error sending file:', error);
      toast.error('Failed to send file via Bluetooth');
      return false;
    }
  }

  async receiveFile(): Promise<void> {
    if (!this.currentDevice?.connected) {
      toast.error('No device connected');
      return;
    }

    try {
      const server = this.currentDevice.device.gatt;
      if (!server) return;

      const service = await server.getPrimaryService(FILE_TRANSFER_SERVICE_UUID);
      const dataCharacteristic = await service.getCharacteristic(FILE_DATA_CHARACTERISTIC_UUID);
      const controlCharacteristic = await service.getCharacteristic(FILE_CONTROL_CHARACTERISTIC_UUID);

      await controlCharacteristic.startNotifications();
      controlCharacteristic.addEventListener('characteristicvaluechanged', async (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const decoder = new TextDecoder();
        const metadata = JSON.parse(decoder.decode(target.value));
        
        const chunks: Uint8Array[] = [];
        let receivedSize = 0;

        await dataCharacteristic.startNotifications();
        dataCharacteristic.addEventListener('characteristicvaluechanged', (dataEvent: Event) => {
          const dataTarget = dataEvent.target as BluetoothRemoteGATTCharacteristic;
          const chunk = new Uint8Array(dataTarget.value!.buffer);
          chunks.push(chunk);
          receivedSize += chunk.length;

          const progress = (receivedSize / metadata.size) * 100;
          this.onTransferProgressCallback?.(progress);

          if (receivedSize >= metadata.size) {
            const blob = new Blob(chunks as any[], { type: metadata.type });
            const file = new File([blob], metadata.name, { type: metadata.type });
            this.onFileReceivedCallback?.(file);
            toast.success(`Received file: ${metadata.name}`);
          }
        });
      });
    } catch (error) {
      console.error('Error receiving file:', error);
      toast.error('Failed to receive file via Bluetooth');
    }
  }

  getConnectedDevice(): BTDevice | null {
    return this.currentDevice;
  }

  getDevices(): BTDevice[] {
    return Array.from(this.devices.values());
  }

  onDeviceFound(callback: (device: BTDevice) => void): void {
    this.onDeviceFoundCallback = callback;
  }

  onFileReceived(callback: (file: File) => void): void {
    this.onFileReceivedCallback = callback;
  }

  onTransferProgress(callback: (progress: number) => void): void {
    this.onTransferProgressCallback = callback;
  }
}

export const bluetoothManager = new BluetoothManager();
