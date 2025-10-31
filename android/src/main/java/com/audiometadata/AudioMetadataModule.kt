package com.audiometadata

import android.media.MediaMetadataRetriever
import android.graphics.BitmapFactory
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = AudioMetadataModule.NAME)
class AudioMetadataModule(reactContext: ReactApplicationContext) :
  NativeAudioMetadataSpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

  override fun getAudioMetadata(filePath: String, promise: Promise) {
    try {
      // Verify if the file exists
      val file = java.io.File(filePath)
      if (!file.exists()) {
        promise.reject("FILE_NOT_FOUND", "File does not exist: $filePath")
        return
      }

      if (!file.canRead()) {
        promise.reject("PERMISSION_DENIED", "Cannot read the file. Check permissions.")
        return
      }

      val retriever = MediaMetadataRetriever()
      retriever.setDataSource(filePath)

      // Create metadata map
      val metadata: WritableMap = Arguments.createMap()

      // Extract title
      val title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE)
      if (title != null) metadata.putString("title", title)

      // Extract artist
      val artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)
      if (artist != null) metadata.putString("artist", artist)

      // Extract album
      val album = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM)
      if (album != null) metadata.putString("album", album)

      // Extract duration (in milliseconds)
      val duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
      if (duration != null) {
        metadata.putDouble("duration", duration.toDouble())
      }

      // Extract year
      val year = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_YEAR)
      if (year != null) metadata.putString("year", year)

      // Extract genre
      val genre = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_GENRE)
      if (genre != null) metadata.putString("genre", genre)

      // Extract artwork
      val artwork = retriever.embeddedPicture
      if (artwork != null) {
        val base64 = android.util.Base64.encodeToString(
          artwork,
          android.util.Base64.NO_WRAP
        )
        metadata.putString("artwork", "data:image/jpeg;base64,$base64")
      }

      retriever.release()
      promise.resolve(metadata)
    } catch (e: IllegalArgumentException) {
      promise.reject("INVALID_FILE", "Invalid file or unsupported format: ${e.message}")
    } catch (e: SecurityException) {
      promise.reject("PERMISSION_DENIED", "Permission denied: ${e.message}")
    } catch (e: Exception) {
      promise.reject("ERROR", "Error getting metadata: ${e.message}")
    }
  }

  companion object {
    const val NAME = "AudioMetadata"
  }
}
