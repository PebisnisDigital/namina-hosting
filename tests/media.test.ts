import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { inspectMedia } from "../server/media.ts";
const limits = {
  image_bytes: 5242880,
  video_bytes: 52428800,
  max_dimension: 3840,
  max_video_seconds: 600,
};
test("media server inspects actual image format and dimensions", async () => {
  const png = await sharp({
    create: { width: 32, height: 48, channels: 3, background: "#806020" },
  })
    .png()
    .toBuffer();
  assert.deepEqual(await inspectMedia(png, "image/png", limits), {
    width: 32,
    height: 48,
  });
  await assert.rejects(
    inspectMedia(png, "image/jpeg", limits),
    /invalid_media/,
  );
  await assert.rejects(
    inspectMedia(png, "image/png", { ...limits, max_dimension: 16 }),
    /invalid_media/,
  );
  await assert.rejects(
    inspectMedia(Buffer.from('<svg onload="alert(1)">'), "image/png", limits),
    /invalid_media/,
  );
  await assert.rejects(
    inspectMedia(png, "image/png", { ...limits, image_bytes: 10 }),
    /invalid_media/,
  );
});
test("media server reads MP4 H264 track, duration, rejects fake and over-limit videos", async () => {
  const video = await readFile("public/videos/hero.mp4");
  const result = await inspectMedia(video, "video/mp4", limits);
  assert.ok(result.width > 0 && result.height > 0 && result.seconds! > 0);
  await assert.rejects(
    inspectMedia(video, "video/mp4", { ...limits, max_video_seconds: 0.01 }),
    /invalid_media/,
  );
  await assert.rejects(
    inspectMedia(Buffer.from("not an mp4"), "video/mp4", limits),
    /invalid_media/,
  );
});
