# react-native-audio-metadata

A React Native library to extract audio metadata from audio files on Android. Get information like title, artist, album, duration, year, genre, and embedded artwork from your audio files.

## Features

- 📝 Extract complete audio metadata
- 🎨 Get embedded artwork/album cover as base64
- ⚡ Fast and efficient native implementation
- 🔒 Proper permission handling for Android 13+
- 📱 Android support (iOS coming soon)

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
```

### Request Permissions at Runtime

For Android 13+ (API 33+), you need to request the `READ_MEDIA_AUDIO` permission at runtime:

```typescript
import { PermissionsAndroid, Platform } from 'react-native';

async function requestAudioPermission() {
  if (Platform.OS !== 'android') return true;

  const androidVersion = Platform.Version;

  if (androidVersion >= 33) {
    // Android 13+
    const granted = await PermissionsAndroid.request(
      'android.permission.READ_MEDIA_AUDIO' as any
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } else {
    // Android 12 and below
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
}
```

## Usage

```typescript
import { getAudioMetadata, type AudioMetadata } from 'react-native-audio-metadata';

// Example: Extract metadata from an audio file
async function extractMetadata() {
  try {
    const filePath = '/storage/emulated/0/Download/song.mp3';
    const metadata: AudioMetadata = await getAudioMetadata(filePath);

    console.log('Title:', metadata.title);
    console.log('Artist:', metadata.artist);
    console.log('Album:', metadata.album);
    console.log('Duration:', metadata.duration); // in milliseconds
    console.log('Year:', metadata.year);
    console.log('Genre:', metadata.genre);
    console.log('Artwork:', metadata.artwork); // base64 data URI
  } catch (error) {
    console.error('Error extracting metadata:', error);
  }
}
```

## API

### `getAudioMetadata(filePath: string): Promise<AudioMetadata>`

Extracts metadata from an audio file at the specified path.

#### Parameters

- `filePath` (string): Absolute path to the audio file

#### Returns

Returns a Promise that resolves to an `AudioMetadata` object:

```typescript
interface AudioMetadata {
  title?: string;       // Song title
  artist?: string;      // Artist name
  album?: string;       // Album name
  duration?: number;    // Duration in milliseconds
  year?: string;        // Release year
  genre?: string;       // Music genre
  artwork?: string;     // Album artwork as base64 data URI (data:image/jpeg;base64,...)
}
```

All fields are optional. If a field is not available in the audio file, it will be `undefined`.

#### Errors

The function may reject with the following error codes:

- `FILE_NOT_FOUND`: The specified file does not exist
- `PERMISSION_DENIED`: Missing required permissions to read the file
- `INVALID_FILE`: Invalid file or unsupported audio format
- `ERROR`: General error during metadata extraction

## Example

### Display Song Information with Album Art

```typescript
import React, { useState } from 'react';
import { View, Text, Image, Button } from 'react-native';
import { getAudioMetadata, type AudioMetadata } from 'react-native-audio-metadata';

function MusicPlayer() {
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);

  const loadSong = async () => {
    const data = await getAudioMetadata('/storage/emulated/0/Music/song.mp3');
    setMetadata(data);
  };

  return (
    <View>
      <Button title="Load Song" onPress={loadSong} />

      {metadata && (
        <View>
          <Text>{metadata.title}</Text>
          <Text>{metadata.artist}</Text>
          <Text>{metadata.album}</Text>

          {metadata.artwork && (
            <Image
              source={{ uri: metadata.artwork }}
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

// Usage
const metadata = await getAudioMetadata(filePath);
if (metadata.duration) {
  console.log(formatDuration(metadata.duration)); // "3:45"
}
```

## Supported Audio Formats

The library supports all audio formats supported by Android's MediaMetadataRetriever, including:

- MP3
- MP4/M4A
- WAV
- FLAC
- OGG
- AAC
- 3GP
- And more...

## Performance

- **Single file**: ~50-100ms per file
- **Batch processing**: For processing multiple files, it's recommended to process them in batches to avoid blocking the UI
- **Caching**: Consider caching metadata using libraries like `react-native-mmkv` for better performance

### Example: Process Multiple Files

```typescript
async function processMultipleSongs(filePaths: string[]) {
  const batchSize = 10;
  const results = [];

  for (let i = 0; i < filePaths.length; i += batchSize) {
    const batch = filePaths.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(path => getAudioMetadata(path))
    );
    results.push(...batchResults);

    // Update UI or show progress here
    console.log(`Processed ${Math.min(i + batchSize, filePaths.length)} / ${filePaths.length}`);
  }

  return results;
}
```

## Platform Support

| Platform | Supported |
|----------|-----------|
| Android  | ✅ Yes    |
| iOS      | 🚧 Coming soon |

## Troubleshooting

### "File does not exist" error

Make sure you're using the absolute path to the file:
- ✅ `/storage/emulated/0/Download/song.mp3`
- ❌ `~/Download/song.mp3`

### "Permission denied" error

1. Make sure permissions are declared in `AndroidManifest.xml`
2. Request permissions at runtime (especially for Android 13+)
3. Check that the user granted the permissions

### Artwork not showing

Some audio files may not have embedded artwork. Check if `metadata.artwork` is defined before using it.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
