import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number; // in milliseconds
  year?: string;
  genre?: string;
  artwork?: string; // base64 data URI
}

export interface Spec extends TurboModule {
  getAudioMetadata(filePath: string): Promise<AudioMetadata>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AudioMetadata');
