# react-native-audio-metadata

A React Native library to extract metadata and artwork from audio and video files on Android. Get information like title, artist, album, duration, year, genre, and artwork from your media files.

## Features

- Extract complete metadata from audio and video files
- Get embedded artwork (album art) or video thumbnails as base64
- Video thumbnails are center-cropped to 1:1 for playlist consistency
- Black frame detection (returns null instead of black thumbnails)
- Fast and efficient native implementation
- Proper permission handling for Android 13+
- Android support (iOS coming soon)

## Installation

```sh
npm install react-native-audio-metadata
```

or

```sh
yarn add react-native-audio-metadata
```

## Setup

### Android Permissions

Add the following permissions to your `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
```

### Request Permissions at Runtime

For Android 13+ (API 33+), you need to request permissions at runtime:

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

async function requestMediaPermissions() {
  if (Platform.OS !== 'android') return true;

  const androidVersion = Platform.Version;

  if (androidVersion >= 33) {
    const results = await PermissionsAndroid.requestMultiple([
      'android.permission.READ_MEDIA_AUDIO' as any,
      'android.permission.READ_MEDIA_VIDEO' as any,
    ]);

    return (
      results['android.permission.READ_MEDIA_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED &&
      results['android.permission.READ_MEDIA_VIDEO'] === PermissionsAndroid.RESULTS.GRANTED
    );
  } else {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
}
```

## Usage

```typescript
import { getMetadata, getArtwork, type AudioMetadata } from 'react-native-audio-metadata';

async function extractInfo() {
  try {
    const filePath = '/storage/emulated/0/Download/song.mp3';

    // Get metadata (lightweight, text only)
    const metadata: AudioMetadata = await getMetadata(filePath);
    console.log('Title:', metadata.title);
    console.log('Artist:', metadata.artist);
    console.log('Duration:', metadata.duration);

    // Get artwork separately (heavier, returns base64 image)
    const artwork: string | null = await getArtwork(filePath);
    console.log('Has artwork:', artwork !== null);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## API

### `getMetadata(filePath: string): Promise<AudioMetadata>`

Extracts text metadata from an audio or video file.

#### Returns

```typescript
interface AudioMetadata {
  title?: string;       // Title
  artist?: string;      // Artist name
  album?: string;       // Album name
  duration?: number;    // Duration in milliseconds
  year?: string;        // Release year
  genre?: string;       // Genre
}
```

All fields are optional. If a field is not available, it will be `undefined`.

---

### `getArtwork(filePath: string): Promise<string | null>`

Extracts artwork from an audio or video file.

- **Audio files**: Returns embedded album art (ID3 tags, etc.)
- **Video files**: Returns a center-cropped 1:1 thumbnail from the video
- Returns `null` if no artwork is available or if the extracted frame is black

The returned string is a base64 data URI (`data:image/jpeg;base64,...`).

---

### Errors

Both functions may reject with the following error codes:

- `FILE_NOT_FOUND`: The specified file does not exist
- `PERMISSION_DENIED`: Missing required permissions
- `INVALID_FILE`: Invalid file or unsupported format
- `ERROR`: General error during extraction

## Example

### Display Song Information with Artwork

```typescript
import React, { useState } from 'react';
import { View, Text, Image, Button } from 'react-native';
import { getMetadata, getArtwork, type AudioMetadata } from 'react-native-audio-metadata';

function MusicPlayer() {
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [artwork, setArtwork] = useState<string | null>(null);

  const loadSong = async () => {
    const path = '/storage/emulated/0/Music/song.mp3';
    const [data, art] = await Promise.all([
      getMetadata(path),
      getArtwork(path),
    ]);
    setMetadata(data);
    setArtwork(art);
  };

  return (
    <View>
      <Button title="Load Song" onPress={loadSong} />

      {metadata && (
        <View>
          <Text>{metadata.title}</Text>
          <Text>{metadata.artist}</Text>
          <Text>{metadata.album}</Text>

          {artwork && (
            <Image
              source={{ uri: artwork }}
              style={{ width: 200, height: 200 }}
            />
          )}
        </View>
      )}
    </View>
  );
}
```

### Format Duration

```typescript
function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 1000 / 60);
  const seconds = Math.floor((ms / 1000) % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

### Process Multiple Files

```typescript
async function processMultipleFiles(filePaths: string[]) {
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < filePaths.length; i += batchSize) {
    const batch = filePaths.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (path) => ({
        metadata: await getMetadata(path),
        artwork: await getArtwork(path),
      }))
    );
    results.push(...batchResults);
  }

  return results;
}
```

## Supported Formats

The library supports all formats supported by Android's MediaMetadataRetriever:

**Audio:** MP3, MP4/M4A, WAV, FLAC, OGG, AAC, 3GP, and more.

**Video:** MP4, MKV, MOV, 3GP, and more.

## Platform Support

| Platform | Supported |
|----------|-----------|
| Android  | Yes       |
| iOS      | Coming soon |

## Troubleshooting

### "File does not exist" error

Make sure you're using the absolute path to the file:
- `/storage/emulated/0/Download/song.mp3`
- Not `~/Download/song.mp3`

### "Permission denied" error

1. Make sure permissions are declared in `AndroidManifest.xml`
2. Request permissions at runtime (especially for Android 13+)
3. Check that the user granted the permissions

### Artwork returns null

- **Audio**: The file may not have embedded artwork
- **Video**: The extracted frame may be black (the library detects and returns null in this case)

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
