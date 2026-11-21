import { CloudSpeechProvider } from './cloudProvider';
import { DeviceSpeechProvider } from './deviceProvider';
import type { UrduSpeechProvider } from './types';

export type EngineId = 'device' | 'cloud';
export function createProvider(engine: EngineId, cloud: () => { baseUrl: string; token: string }): UrduSpeechProvider {
  return engine === 'cloud' ? new CloudSpeechProvider(cloud) : new DeviceSpeechProvider();
}
