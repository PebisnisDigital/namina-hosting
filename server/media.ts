import sharp from "sharp";
import { createFile } from "mp4box";

export type MediaLimits = {
  image_bytes: number;
  video_bytes: number;
  max_dimension: number;
  max_video_seconds: number;
};
export type MediaMetadata = { width: number; height: number; seconds?: number };
export async function inspectMedia(
  buffer: Buffer,
  mime: string,
  limits: MediaLimits,
): Promise<MediaMetadata> {
  try {
    if (
      buffer.length === 0 ||
      buffer.length >
        (mime === "video/mp4" ? limits.video_bytes : limits.image_bytes)
    )
      throw Error("size");
    let metadata: MediaMetadata;
    if (mime === "video/mp4") {
      metadata = await new Promise<MediaMetadata>((resolve, reject) => {
        const timer = setTimeout(() => reject(Error("timeout")), 5000);
        const mp4 = createFile();
        mp4.onError = () => {
          clearTimeout(timer);
          reject(Error("format"));
        };
        mp4.onReady = (info) => {
          clearTimeout(timer);
          const track = info.videoTracks[0];
          if (
            !track?.video ||
            !info.timescale ||
            !track.codec.startsWith("avc1")
          ) {
            reject(Error("codec"));
            return;
          }
          resolve({
            width: track.video.width,
            height: track.video.height,
            seconds: info.duration / info.timescale,
          });
        };
        const data = buffer.buffer.slice(
          buffer.byteOffset,
          buffer.byteOffset + buffer.byteLength,
        ) as ArrayBuffer & { fileStart: number };
        data.fileStart = 0;
        mp4.appendBuffer(data);
        mp4.flush();
      });
      if (!metadata.seconds || metadata.seconds > limits.max_video_seconds)
        throw Error("duration");
    } else {
      const parsed = await sharp(buffer, {
        limitInputPixels: limits.max_dimension ** 2,
      }).metadata();
      const actual = {
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      }[parsed.format as "jpeg" | "png" | "webp"];
      if (
        !actual ||
        actual !== mime ||
        !parsed.width ||
        !parsed.height ||
        (parsed.pages || 1) > 1
      )
        throw Error("format");
      metadata = { width: parsed.width, height: parsed.height };
    }
    if (
      !metadata.width ||
      !metadata.height ||
      Math.max(metadata.width, metadata.height) > limits.max_dimension
    )
      throw Error("dimensions");
    return metadata;
  } catch {
    throw Error("invalid_media");
  }
}
