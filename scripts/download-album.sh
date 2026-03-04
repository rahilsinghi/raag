#!/usr/bin/env bash
set -euo pipefail

# Quick CLI wrapper for downloading album audio from YouTube.
# Usage: ./scripts/download-album.sh <youtube-url> <artist-slug> <album-slug>
#
# Example:
#   ./scripts/download-album.sh "https://youtube.com/playlist?list=PLxxx" seedhe-maut nayaab

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ $# -lt 3 ]; then
    echo "Usage: $0 <youtube-url> <artist-slug> <album-slug>"
    echo ""
    echo "Example:"
    echo "  $0 'https://youtube.com/playlist?list=PLxxx' seedhe-maut nayaab"
    exit 1
fi

URL="$1"
ARTIST_SLUG="$2"
ALBUM_SLUG="$3"

source .venv/bin/activate

python -c "
import sys
sys.path.insert(0, 'backend')
from app.ingestion.youtube_downloader import download_album_audio

result = download_album_audio('$URL', '$ARTIST_SLUG', '$ALBUM_SLUG')

print()
print(f'Downloaded {result[\"download_count\"]}/{result[\"total_expected\"]} tracks')
print(f'Output: {result[\"output_dir\"]}')
print()
for t in result['tracks']:
    status = '✓' if t.get('path') else '✗'
    print(f'  {status} {t[\"track_number\"]:02d} - {t[\"title\"]}')
"
