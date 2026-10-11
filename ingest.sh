#!/bin/sh
# Usage: sh ingest.sh <voice zip or folder of mp3s>  -> re-encode, merge with the clips already packed, pack, rebuild
# The zip may hold every clip or only the new ones: clips already in dist/voice-pack-*.mp3 are kept.
# A .rar from the user: extract it to a folder first, then pass the folder.
set -e
rm -rf incoming/new && mkdir -p incoming/new
if [ -d "$1" ]; then find "$1" -name '*.mp3' -exec cp {} incoming/new/ \; ; else unzip -q "$1" -d incoming/new; fi
rm -rf dist/voice && node unpack-voice.js
find incoming/new -name '*.mp3' | xargs -P 8 -I{} sh -c 'ffmpeg -loglevel error -y -i "{}" -ac 1 -ar 22050 -b:a 32k -map_metadata -1 -id3v2_version 0 "dist/voice/$(basename "{}")"'
node pack-voice.js && node build.js
