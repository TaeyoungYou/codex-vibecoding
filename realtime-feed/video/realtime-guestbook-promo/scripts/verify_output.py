"""Check the delivered movie and extract actual decoded cut-point frames."""

from array import array
from pathlib import Path
import hashlib
import json
import math
import subprocess
import wave

root = Path(__file__).resolve().parents[1]
project = root.parents[1]
output = project / 'output' / 'video'
movie = output / 'realtime-guestbook-promo.mp4'
binaries = root / 'node_modules' / '@remotion' / 'compositor-win32-x64-msvc'
probe = subprocess.run([
    str(binaries / 'ffprobe.exe'), '-v', 'error', '-count_frames', '-show_entries',
    'format=duration,size:stream=codec_name,width,height,pix_fmt,r_frame_rate,nb_frames,nb_read_frames,duration,sample_rate,channels',
    '-of', 'json', str(movie),
], check=True, capture_output=True, text=True)
metadata = json.loads(probe.stdout)
video = next(stream for stream in metadata['streams'] if stream['codec_name'] == 'h264')
audio = next(stream for stream in metadata['streams'] if stream['codec_name'] == 'aac')
assert (video['width'], video['height'], video['r_frame_rate']) == (1920, 1080, '30/1')
assert video['pix_fmt'] == 'yuv420p'
assert int(video['nb_frames']) == 900
assert int(video['nb_read_frames']) == 900
assert abs(float(video['duration']) - 30) < 0.001
assert 25 <= float(metadata['format']['duration']) <= 35
assert audio['channels'] == 2 and audio['sample_rate'] == '48000'

frames = [0, 60, 119, 120, 210, 299, 300, 375, 449, 450, 525, 599, 600, 675, 749, 750, 810, 899]
checks = output / 'decoded-check'
checks.mkdir(exist_ok=True)
for frame in frames:
    dest = checks / f'frame-{frame:03d}.png'
    subprocess.run([str(binaries / 'ffmpeg.exe'), '-y', '-v', 'error', '-ss', str(frame / 30),
                    '-i', str(movie), '-frames:v', '1', '-c:v', 'png', str(dest)], check=True)
    assert dest.exists(), f'Missing decoded review frame: {dest.name}'
    header = dest.read_bytes()[:24]
    assert int.from_bytes(header[16:20], 'big') == 1920
    assert int.from_bytes(header[20:24], 'big') == 1080

with wave.open(str(root / 'public' / 'audio' / 'promo-soundtrack.wav'), 'rb') as soundtrack:
    assert soundtrack.getnframes() == 30 * 48000
    samples = array('h', soundtrack.readframes(soundtrack.getnframes()))
peak = max(abs(value) for value in samples) / 32768
rms = math.sqrt(sum(value * value for value in samples) / len(samples)) / 32768
assert peak < 0.99 and rms > 0.05

for name in ('hero-background-v2.png', 'leaving-a-note-v2.png', 'portfolio-guestbook.png'):
    source = project / 'output' / 'imagegen' / name
    copied = root / 'public' / 'images' / name
    assert hashlib.sha256(source.read_bytes()).digest() == hashlib.sha256(copied.read_bytes()).digest()

summary = {'metadata': metadata, 'decoded_frames_checked': frames,
           'audio_peak_dbfs': round(20 * math.log10(peak), 2),
           'audio_rms_dbfs': round(20 * math.log10(rms), 2),
           'movie_sha256': hashlib.sha256(movie.read_bytes()).hexdigest(),
           'assets_match': True, 'full_decode': 'passed'}
(output / 'realtime-guestbook-promo-metadata.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
print(json.dumps(summary, indent=2))
