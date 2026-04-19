import { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Button,
  Image,
  TextInput,
  PermissionsAndroid,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  getMetadata,
  getArtwork,
  type AudioMetadata,
  type AspectRatio,
} from 'react-native-audio-metadata';

export default function App() {
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [artwork, setArtwork] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string>(
    '/storage/emulated/0/Music/'
  );
  const [error, setError] = useState<string>('');
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');

  useEffect(() => {
    requestStoragePermission();
  }, []);

  const requestStoragePermission = async () => {
    if (Platform.OS !== 'android') {
      setHasPermission(true);
      return;
    }

    try {
      const androidVersion = Platform.Version;

      // Android 13+ (API 33+) usa READ_MEDIA_AUDIO y READ_MEDIA_VIDEO
      if (androidVersion >= 33) {
        const results = await PermissionsAndroid.requestMultiple([
          'android.permission.READ_MEDIA_AUDIO' as any,
          'android.permission.READ_MEDIA_VIDEO' as any,
        ]);

        const audioGranted =
          results['android.permission.READ_MEDIA_AUDIO'] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const videoGranted =
          results['android.permission.READ_MEDIA_VIDEO'] ===
          PermissionsAndroid.RESULTS.GRANTED;

        if (audioGranted && videoGranted) {
          setHasPermission(true);
          setError('');
        } else {
          setHasPermission(false);
          setError('Permisos de almacenamiento denegados');
        }
      } else {
        // Android 12 y anteriores usa READ_EXTERNAL_STORAGE
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Permiso de almacenamiento',
            message: 'La app necesita acceso para leer archivos de audio',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          setError('');
        } else {
          setHasPermission(false);
          setError('Permiso de almacenamiento denegado');
        }
      }
    } catch (err) {
      console.warn(err);
      setError('Error al solicitar permisos');
    }
  };

  const handleGetMetadata = async () => {
    if (!hasPermission) {
      setError(
        'No hay permisos de almacenamiento. Presiona el botón de permisos.'
      );
      return;
    }

    try {
      setError('');
      setMetadata(null);
      setArtwork(null);

      const [data, art] = await Promise.all([
        getMetadata(filePath),
        getArtwork(filePath, aspectRatio),
      ]);

      console.log('Metadata:', JSON.stringify(data, null, 2));
      console.log('Artwork:', art ? 'received' : 'null');
      setMetadata(data);
      setArtwork(art);
    } catch (err: any) {
      setError(`Error: ${err.message || err}`);
      setMetadata(null);
      setArtwork(null);
    }
  };

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text style={styles.title}>Audio Metadata Extractor</Text>
        <Text style={styles.permissionStatus}>
          Permisos: {hasPermission ? '✓ Concedidos' : '✗ No concedidos'}
        </Text>

        {!hasPermission && (
          <Button
            title="Solicitar Permisos"
            onPress={requestStoragePermission}
          />
        )}

        <View style={styles.section}>
          <TextInput
            style={styles.input}
            placeholder="Ej: /storage/emulated/0/Download/Beele.mp4"
            value={filePath}
            onChangeText={setFilePath}
          />

          <Text style={styles.aspectLabel}>Aspect ratio del artwork:</Text>
          <View style={styles.aspectRow}>
            {(['1:1', '16:9'] as AspectRatio[]).map((ratio) => (
              <TouchableOpacity
                key={ratio}
                style={[
                  styles.aspectButton,
                  aspectRatio === ratio && styles.aspectButtonActive,
                ]}
                onPress={() => setAspectRatio(ratio)}
              >
                <Text
                  style={[
                    styles.aspectButtonText,
                    aspectRatio === ratio && styles.aspectButtonTextActive,
                  ]}
                >
                  {ratio}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button title="Obtener Metadatos" onPress={handleGetMetadata} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {metadata && (
          <View style={styles.metadataContainer}>
            <Text style={styles.sectionTitle}>Metadatos:</Text>

            {metadata.title && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Título:</Text>
                <Text style={styles.metadataValue}>{metadata.title}</Text>
              </View>
            )}

            {metadata.artist && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Artista:</Text>
                <Text style={styles.metadataValue}>{metadata.artist}</Text>
              </View>
            )}

            {metadata.album && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Álbum:</Text>
                <Text style={styles.metadataValue}>{metadata.album}</Text>
              </View>
            )}

            {metadata.duration != null && metadata.duration > 0 && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Duración:</Text>
                <Text style={styles.metadataValue}>
                  {Math.floor(metadata.duration / 1000 / 60)}:
                  {String(Math.floor((metadata.duration / 1000) % 60)).padStart(
                    2,
                    '0'
                  )}
                </Text>
              </View>
            )}

            {metadata.year && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Año:</Text>
                <Text style={styles.metadataValue}>{metadata.year}</Text>
              </View>
            )}

            {metadata.genre && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Género:</Text>
                <Text style={styles.metadataValue}>{metadata.genre}</Text>
              </View>
            )}

            {artwork && (
              <View style={styles.imageContainer}>
                <Text style={styles.metadataLabel}>Artwork:</Text>
                <Image
                  source={{ uri: artwork }}
                  style={
                    aspectRatio === '16:9'
                      ? styles.artwork16x9
                      : styles.artwork1x1
                  }
                />
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f0f4ff',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 10,
    color: '#3a5a9b',
  },
  permissionStatus: {
    fontSize: 14,
    marginBottom: 10,
    color: '#6a8abf',
  },
  section: {
    marginTop: 20,
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#b0c4e8',
    backgroundColor: '#ffffff',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    fontSize: 12,
    color: '#334e7a',
  },
  error: {
    color: '#e05c5c',
    marginTop: 10,
    textAlign: 'center',
  },
  metadataContainer: {
    marginTop: 20,
    width: '100%',
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0e0f8',
    shadowColor: '#a0b8e0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#3a5a9b',
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  metadataLabel: {
    fontWeight: 'bold',
    width: 80,
    fontSize: 14,
    color: '#5578b0',
  },
  metadataValue: {
    flex: 1,
    fontSize: 14,
    color: '#334e7a',
  },
  aspectLabel: {
    fontSize: 13,
    color: '#5578b0',
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 12,
  },
  aspectRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  aspectButton: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#b0c4e8',
    backgroundColor: '#ffffff',
  },
  aspectButtonActive: {
    backgroundColor: '#3a5a9b',
    borderColor: '#3a5a9b',
  },
  aspectButtonText: {
    fontSize: 13,
    color: '#3a5a9b',
    fontWeight: 'bold',
  },
  aspectButtonTextActive: {
    color: '#ffffff',
  },
  imageContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  artwork1x1: {
    width: 160,
    height: 160,
    marginTop: 10,
    borderRadius: 10,
  },
  artwork16x9: {
    width: 280,
    height: 158,
    marginTop: 10,
    borderRadius: 10,
  },
});
