#!/usr/bin/env bash
# The intro's film (app/components/intro): the clip made in Google Flow
# (docs/world/intro-prompts.md) into the files the site serves:
#   public/intro/intro.av1.mp4    AV1, for browsers that play it
#   public/intro/intro.h264.mp4   H.264, for the rest
#   public/intro/intro-poster.webp  its first frame
# Usage: scripts/intro-video.sh <clip.mp4> [slow=1.12]
# The run is slowed a little (frames blended in between, so it stays
# smooth), the sound is dropped, and each file stays within 8 MB
# (tests/intro.test.mjs).
set -euo pipefail
in="$1"
slow="${2:-1.12}"
out=public/intro
mkdir -p "$out"
tmp=$(mktemp -d)
# Slow it down with motion-interpolated frames, at 30 fps
ffmpeg -v error -y -i "$in" -an \
  -vf "setpts=${slow}*PTS,minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:vsbmc=1,scale=1280:720:flags=lanczos,format=yuv420p" \
  -c:v libx264 -crf 10 -preset slow "$tmp/master.mp4"
ffmpeg -v error -y -i "$tmp/master.mp4" -c:v libsvtav1 -crf 25 -preset 4 -g 60 -pix_fmt yuv420p -movflags +faststart "$out/intro.av1.mp4"
ffmpeg -v error -y -i "$tmp/master.mp4" -c:v libx264 -crf 19 -preset slower -profile:v high -pix_fmt yuv420p -movflags +faststart "$out/intro.h264.mp4"
ffmpeg -v error -y -i "$tmp/master.mp4" -frames:v 1 "$tmp/poster.png"
node -e 'require("sharp")(process.argv[1]).webp({ quality: 78 }).toFile(process.argv[2])' "$tmp/poster.png" "$out/intro-poster.webp"
rm -rf "$tmp"
ls -l "$out"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$out/intro.h264.mp4"
