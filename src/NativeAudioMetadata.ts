import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface AudioMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number; // in milliseconds
  year?: string;
  genre?: string;
}

export interface Spec extends TurboModule {
  getMetadata(filePath: string): Promise<AudioMetadata>;
  getArtwork(filePath: string): Promise<string | null>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AudioMetadata');
