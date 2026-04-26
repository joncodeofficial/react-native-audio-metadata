#import "AudioMetadata.h"
#import <AVFoundation/AVFoundation.h>
#import <UIKit/UIKit.h>

@implementation AudioMetadata

- (void)getMetadata:(NSString *)filePath resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    NSURL *url = [NSURL fileURLWithPath:filePath];

    if (![[NSFileManager defaultManager] fileExistsAtPath:filePath]) {
        reject(@"FILE_NOT_FOUND", [NSString stringWithFormat:@"File does not exist: %@", filePath], nil);
        return;
    }

    if (![[NSFileManager defaultManager] isReadableFileAtPath:filePath]) {
        reject(@"PERMISSION_DENIED", @"Cannot read the file. Check permissions.", nil);
        return;
    }

    AVAsset *asset = [AVAsset assetWithURL:url];
    NSArray<AVMetadataItem *> *metadata = asset.commonMetadata;

    NSMutableDictionary *result = [NSMutableDictionary dictionary];

    for (AVMetadataItem *item in metadata) {
        NSString *key = item.commonKey;
        if (!key) continue;

        if ([key isEqualToString:AVMetadataCommonKeyTitle]) {
            NSString *val = (NSString *)item.stringValue;
            if (val) result[@"title"] = val;
        } else if ([key isEqualToString:AVMetadataCommonKeyArtist]) {
            NSString *val = (NSString *)item.stringValue;
            if (val) result[@"artist"] = val;
        } else if ([key isEqualToString:AVMetadataCommonKeyAlbumName]) {
            NSString *val = (NSString *)item.stringValue;
            if (val) result[@"album"] = val;
        }
    }

    // Duration in milliseconds
    CMTime duration = asset.duration;
    if (CMTIME_IS_VALID(duration) && !CMTIME_IS_INDEFINITE(duration)) {
        double ms = CMTimeGetSeconds(duration) * 1000.0;
        result[@"duration"] = @(ms);
    }

    // Year and genre require format-specific metadata keys
    NSArray<NSString *> *formats = asset.availableMetadataFormats;
    for (NSString *format in formats) {
        NSArray<AVMetadataItem *> *items = [asset metadataForFormat:format];
        for (AVMetadataItem *item in items) {
            NSString *keyStr = item.identifier ?: @"";

            if (!result[@"year"] && ([keyStr containsString:@"com.apple.itunes/©day"] ||
                [keyStr containsString:@"id3/TYER"] ||
                [keyStr containsString:@"id3/TDRC"] ||
                [keyStr containsString:@"ilst/©day"])) {
                NSString *val = item.stringValue;
                if (val) result[@"year"] = val;
            }

            if (!result[@"genre"] && ([keyStr containsString:@"com.apple.itunes/©gen"] ||
                [keyStr containsString:@"id3/TCON"] ||
                [keyStr containsString:@"ilst/©gen"])) {
                NSString *val = item.stringValue;
                if (val) result[@"genre"] = val;
            }
        }
    }

    resolve(result);
}

- (void)getArtwork:(NSString *)filePath aspectRatio:(NSString *)aspectRatio resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
    NSURL *url = [NSURL fileURLWithPath:filePath];

    if (![[NSFileManager defaultManager] fileExistsAtPath:filePath]) {
        reject(@"FILE_NOT_FOUND", [NSString stringWithFormat:@"File does not exist: %@", filePath], nil);
        return;
    }

    if (![[NSFileManager defaultManager] isReadableFileAtPath:filePath]) {
        reject(@"PERMISSION_DENIED", @"Cannot read the file. Check permissions.", nil);
        return;
    }

    AVAsset *asset = [AVAsset assetWithURL:url];

    // Try embedded artwork from metadata
    NSArray<AVMetadataItem *> *artworkItems = [AVMetadataItem metadataItemsFromArray:asset.commonMetadata
                                                                             withKey:AVMetadataCommonKeyArtwork
                                                                           keySpace:AVMetadataKeySpaceCommon];
    for (AVMetadataItem *item in artworkItems) {
        NSData *imageData = nil;

        if ([item.value isKindOfClass:[NSData class]]) {
            imageData = (NSData *)item.value;
        } else if ([item.value isKindOfClass:[NSDictionary class]]) {
            imageData = [(NSDictionary *)item.value objectForKey:@"data"];
        }

        if (imageData) {
            UIImage *image = [UIImage imageWithData:imageData];
            if (image) {
                UIImage *cropped = [self cropImage:image toAspectRatio:aspectRatio];
                NSData *jpegData = UIImageJPEGRepresentation(cropped, 0.8);
                if (jpegData) {
                    NSString *base64 = [jpegData base64EncodedStringWithOptions:0];
                    resolve([NSString stringWithFormat:@"data:image/jpeg;base64,%@", base64]);
                    return;
                }
            }
        }
    }

    // For video files, generate a thumbnail
    AVURLAsset *urlAsset = [AVURLAsset URLAssetWithURL:url options:nil];
    NSArray<AVAssetTrack *> *videoTracks = [urlAsset tracksWithMediaType:AVMediaTypeVideo];

    if (videoTracks.count == 0) {
        resolve([NSNull null]);
        return;
    }

    AVAssetImageGenerator *generator = [[AVAssetImageGenerator alloc] initWithAsset:urlAsset];
    generator.appliesPreferredTrackTransform = YES;
    generator.maximumSize = CGSizeMake(1280, 720);

    CMTime time = CMTimeMake(1, 1);
    NSError *error = nil;
    CGImageRef cgImage = [generator copyCGImageAtTime:time actualTime:nil error:&error];

    if (!cgImage) {
        resolve([NSNull null]);
        return;
    }

    UIImage *thumbnail = [UIImage imageWithCGImage:cgImage];
    CGImageRelease(cgImage);

    if ([self isImageBlack:thumbnail]) {
        resolve([NSNull null]);
        return;
    }

    UIImage *cropped = [self cropImage:thumbnail toAspectRatio:aspectRatio];
    NSData *jpegData = UIImageJPEGRepresentation(cropped, 0.8);
    if (!jpegData) {
        resolve([NSNull null]);
        return;
    }

    NSString *base64 = [jpegData base64EncodedStringWithOptions:0];
    resolve([NSString stringWithFormat:@"data:image/jpeg;base64,%@", base64]);
}

- (UIImage *)cropImage:(UIImage *)image toAspectRatio:(NSString *)aspectRatio {
    CGFloat width = image.size.width;
    CGFloat height = image.size.height;
    CGRect cropRect;

    if ([aspectRatio isEqualToString:@"16:9"]) {
        CGFloat targetAspect = 16.0 / 9.0;
        if (width / height > targetAspect) {
            CGFloat newWidth = height * targetAspect;
            cropRect = CGRectMake((width - newWidth) / 2.0, 0, newWidth, height);
        } else {
            CGFloat newHeight = width / targetAspect;
            cropRect = CGRectMake(0, (height - newHeight) / 2.0, width, newHeight);
        }
    } else {
        // Default 1:1 square crop
        CGFloat size = MIN(width, height);
        cropRect = CGRectMake((width - size) / 2.0, (height - size) / 2.0, size, size);
    }

    CGFloat scale = image.scale;
    CGRect scaledRect = CGRectMake(cropRect.origin.x * scale, cropRect.origin.y * scale,
                                   cropRect.size.width * scale, cropRect.size.height * scale);

    CGImageRef croppedRef = CGImageCreateWithImageInRect(image.CGImage, scaledRect);
    UIImage *result = [UIImage imageWithCGImage:croppedRef scale:scale orientation:image.imageOrientation];
    CGImageRelease(croppedRef);
    return result;
}

- (BOOL)isImageBlack:(UIImage *)image {
    CGImageRef cgImage = image.CGImage;
    size_t width = CGImageGetWidth(cgImage);
    size_t height = CGImageGetHeight(cgImage);

    int sampleSize = 20;
    size_t stepX = MAX(1, width / sampleSize);
    size_t stepY = MAX(1, height / sampleSize);

    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceRGB();
    unsigned char *data = (unsigned char *)calloc(height * width * 4, sizeof(unsigned char));
    CGContextRef context = CGBitmapContextCreate(data, width, height, 8, width * 4, colorSpace, kCGImageAlphaPremultipliedLast | kCGBitmapByteOrder32Big);
    CGContextDrawImage(context, CGRectMake(0, 0, width, height), cgImage);
    CGContextRelease(context);
    CGColorSpaceRelease(colorSpace);

    long long totalBrightness = 0;
    int sampleCount = 0;

    for (size_t y = 0; y < height; y += stepY) {
        for (size_t x = 0; x < width; x += stepX) {
            size_t offset = (y * width + x) * 4;
            totalBrightness += data[offset] + data[offset + 1] + data[offset + 2];
            sampleCount++;
        }
    }

    free(data);

    long long avgBrightness = sampleCount > 0 ? totalBrightness / (sampleCount * 3) : 0;
    return avgBrightness < 10;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeAudioMetadataSpecJSI>(params);
}

+ (NSString *)moduleName
{
  return @"AudioMetadata";
}

@end
