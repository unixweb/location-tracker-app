import { Device } from '@/types/location';

export const DEVICES: Record<string, Device> = {
  '10': { id: '10', name: 'Device A', color: '#e74c3c' },
  '11': { id: '11', name: 'Device B', color: '#3498db' },
};

export const DEFAULT_DEVICE: Device = {
  id: 'unknown',
  name: 'Unknown Device',
  color: '#95a5a6',
};

export function getDevice(id: string): Device {
  return DEVICES[id] || DEFAULT_DEVICE;
}
