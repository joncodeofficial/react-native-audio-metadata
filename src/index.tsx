import AudioMetadataModule, {
  type AudioMetadata,
  type AspectRatio,
} from './NativeAudioMetadata';

export type { AudioMetadata, AspectRatio };

export function getMetadata(filePath: string): Promise<AudioMetadata> {
  return AudioMetadataModule.getMetadata(filePath);
}

export function getArtwork(
  filePath: string,
  aspectRatio: AspectRatio = '1:1'
): Promise<string | null> {
  return AudioMetadataModule.getArtwork(filePath, aspectRatio);
}
