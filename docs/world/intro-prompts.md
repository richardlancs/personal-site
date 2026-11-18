# The intro's film: how it was made

The home page's intro (`app/components/intro/`) plays a short painted film,
`public/intro/intro.av1.mp4` (with `intro.h264.mp4` for browsers without
AV1, and `intro-poster.webp`, its first frame). It was made in three steps.

## 1. The painted scene (ChatGPT)

Six layers were painted in one ChatGPT conversation so they share a style,
then composed into one 16:9 frame (sky; far coast with an overgrown ruined
town and a rusted pylon; terraced fields with an abandoned kei truck and
the park's clock tower; the hillside path; foreground grass). The style
message sent first:

> a hand-painted gouache animation background in the manner of 1990s
> Japanese hand-drawn animated films, soft cel shading, big summer cumulus
> clouds, lush saturated greens with warm ochre, a deep blue sky, calm,
> quiet and a little lonely, never frightening. The world is gently
> post-apocalyptic: nature has reclaimed everything, no people anywhere.
> No text, no signs, no logos, no watermark, no characters. Wide
> landscape 16:9.

## 2. The kid (ChatGPT, image edit)

The composed frame was uploaded with the style reference for the kid (a
painted child running down a hillside path, seen from behind), and
ChatGPT painted the kid into the scene:

> keep the whole scene exactly as it is ... and add one small child on the
> dirt path in the lower middle of the frame, seen from behind, running
> away from the viewer down the path toward the clock tower, arms
> stretched out to the sides, in the same hand-painted style and with the
> same look as the child in the reference: short dark tousled hair, a
> loose blue-grey short-sleeved shirt, dark shorts, bare legs and feet ...
> about one eighth of the frame's height, feet on the path.

An end frame (the kid far down the path by the park's arches) was made
the same way, for first-and-last-frame takes.

## 3. The film (Google Flow, Veo 3.1 Lite, free credits)

The start frame was uploaded to Flow and animated for 8 s at 16:9 (720p,
the free plan's size; no visible watermark):

> Keep the hand-painted 1990s Japanese animation background style, colours
> and composition exactly; it must stay a painting, not photoreal. The
> child on the dirt path runs slowly and naturally away from the camera
> down the path toward the clock tower, a relaxed, human jog with natural
> strides and a light bounce, arms out to the sides like a plane, always
> staying on the dirt path and following its curve ... The camera drifts
> gently forward along the path. Tall grass and seed heads in the
> foreground sway softly in a breeze, clouds drift slowly. One continuous
> shot: no cuts, no text, no new people or animals, no morphing.

`scripts/intro-video.sh <clip.mp4>` slows it by 12% with
motion-interpolated frames (30 fps), drops the sound and encodes the three
files. The run is then 8.8 s; the grass wipe (`app/assets/intro/wipe.webp`)
rises over its last second and the intro fades to the park.
