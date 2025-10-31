import AudioMetadataModule, { type AudioMetadata } from './NativeAudioMetadata';

export type { AudioMetadata };

export function getAudioMetadata(filePath: string): Promise<AudioMetadata> {
  return AudioMetadataModule.getAudioMetadata(filePath);
}
