package com.audiometadata

import android.media.MediaMetadataRetriever
import android.graphics.Bitmap
import android.graphics.Color
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = AudioMetadataModule.NAME)
class AudioMetadataModule(reactContext: ReactApplicationContext) :
  NativeAudioMetadataSpec(reactContext) {

  override fun getName(): String {
    return NAME
  }

  override fun getMetadata(filePath: String, promise: Promise) {
    try {
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

      val metadata = Arguments.createMap()

      val title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE)
      if (title != null) metadata.putString("title", title)

      val artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)
      if (artist != null) metadata.putString("artist", artist)

      val album = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ALBUM)
      if (album != null) metadata.putString("album", album)

      val duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
      if (duration != null) metadata.putDouble("duration", duration.toDouble())

      val year = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_YEAR)
      if (year != null) metadata.putString("year", year)

      val genre = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_GENRE)
      if (genre != null) metadata.putString("genre", genre)

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

  override fun getArtwork(filePath: String, promise: Promise) {
    try {
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

      // Try embedded artwork first (album art for audio, poster for video)
      val embeddedArt = retriever.embeddedPicture
      if (embeddedArt != null) {
        val base64 = android.util.Base64.encodeToString(embeddedArt, android.util.Base64.NO_WRAP)
        retriever.release()
        promise.resolve("data:image/jpeg;base64,$base64")
        return
      }

      // Fallback: extract video thumbnail
      val thumbnail = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
        android.media.ThumbnailUtils.createVideoThumbnail(
          java.io.File(filePath),
          android.util.Size(512, 512),
          null
        )
      } else {
        @Suppress("DEPRECATION")
        android.media.ThumbnailUtils.createVideoThumbnail(
          filePath,
          android.provider.MediaStore.Images.Thumbnails.MINI_KIND
        )
      }

      retriever.release()

      if (thumbnail == null || isBitmapBlack(thumbnail)) {
        thumbnail?.recycle()
        promise.resolve(null)
        return
      }

      // Center crop to 1:1 square (fill and crop excess)
      val square = centerCropToSquare(thumbnail)
      thumbnail.recycle()

      val stream = java.io.ByteArrayOutputStream()
      square.compress(Bitmap.CompressFormat.JPEG, 80, stream)
      square.recycle()

      val base64 = android.util.Base64.encodeToString(stream.toByteArray(), android.util.Base64.NO_WRAP)
      promise.resolve("data:image/jpeg;base64,$base64")
    } catch (e: IllegalArgumentException) {
      promise.reject("INVALID_FILE", "Invalid file or unsupported format: ${e.message}")
    } catch (e: SecurityException) {
      promise.reject("PERMISSION_DENIED", "Permission denied: ${e.message}")
    } catch (e: Exception) {
      promise.reject("ERROR", "Error getting artwork: ${e.message}")
    }
  }

  private fun centerCropToSquare(source: Bitmap): Bitmap {
    val size = minOf(source.width, source.height)
    val x = (source.width - size) / 2
    val y = (source.height - size) / 2
    return Bitmap.createBitmap(source, x, y, size, size)
  }

  private fun isBitmapBlack(bitmap: Bitmap): Boolean {
    val sampleSize = 20
    val stepX = maxOf(1, bitmap.width / sampleSize)
    val stepY = maxOf(1, bitmap.height / sampleSize)
    var totalBrightness = 0L
    var sampleCount = 0

    var y = 0
    while (y < bitmap.height) {
      var x = 0
      while (x < bitmap.width) {
        val pixel = bitmap.getPixel(x, y)
        totalBrightness += (Color.red(pixel) + Color.green(pixel) + Color.blue(pixel))
        sampleCount++
        x += stepX
      }
      y += stepY
    }

    val avgBrightness = if (sampleCount > 0) totalBrightness / (sampleCount * 3) else 0L
    return avgBrightness < 10
  }

  companion object {
    const val NAME = "AudioMetadata"
  }
}
