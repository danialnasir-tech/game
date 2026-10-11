#!/bin/sh
# Usage: sh ingest.sh path/to/chess-voice-v4.zip  -> re-encode, pack, rebuild
set -e
rm -rf incoming/new && mkdir -p incoming/new && unzip -q "$1" -d incoming/new
rm -rf dist/voice && mkdir dist/voice
ls incoming/new/*.mp3 | xargs -P 8 -I{} sh -c 'ffmpeg -loglevel error -y -i "{}" -ac 1 -ar 22050 -b:a 32k -map_metadata -1 -id3v2_version 0 "dist/voice/$(basename "{}")"'
node pack-voice.js && node build.js
