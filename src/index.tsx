import AudioMetadataModule, { type AudioMetadata } from './NativeAudioMetadata';

export type { AudioMetadata };

export function getMetadata(filePath: string): Promise<AudioMetadata> {
  return AudioMetadataModule.getMetadata(filePath);
}

export function getArtwork(filePath: string): Promise<string | null> {
  return AudioMetadataModule.getArtwork(filePath);
}
