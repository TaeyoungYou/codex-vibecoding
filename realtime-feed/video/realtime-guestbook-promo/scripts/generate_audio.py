"""Original 30-second electric-piano score and gentle UI sounds, no samples."""

from array import array
from pathlib import Path
import json
import math
import random
import wave

RATE = 48000
DURATION = 30
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "public" / "audio"
DEST.mkdir(parents=True, exist_ok=True)
left = array("f", [0.0]) * (RATE * DURATION)
right = array("f", [0.0]) * (RATE * DURATION)


def note(midi, start, length, amplitude, pan=0.0, pad=False):
    frequency = 440 * 2 ** ((midi - 69) / 12)
    begin = round(start * RATE)
    count = min(round(length * RATE), len(left) - begin)
    gain_l = math.sqrt((1 - pan) / 2)
    gain_r = math.sqrt((1 + pan) / 2)
    for i in range(count):
        t = i / RATE
        attack = min(1.0, t / (0.45 if pad else 0.009))
        release = min(1.0, max(0.0, length - t) / 0.45)
        envelope = attack * release * math.exp(-t / (3.4 if pad else 1.35))
        phase = 2 * math.pi * frequency * t
        if pad:
            value = math.sin(phase) + 0.18 * math.sin(phase * 2)
        else:
            value = math.sin(phase)
            value += 0.33 * math.exp(-t * 1.8) * math.sin(phase * 2.002)
            value += 0.14 * math.exp(-t * 3.0) * math.sin(phase * 3.007)
            value += 0.05 * math.exp(-t * 4.5) * math.sin(phase * 4.013)
        value *= amplitude * envelope
        left[begin + i] += value * gain_l
        right[begin + i] += value * gain_r


# 96 BPM, 12 bars: Cmaj9, Am9, Fmaj9, G6. An original sparse arpeggio.
chords = [
    (48, [64, 67, 71, 74]),
    (45, [64, 69, 72, 71]),
    (41, [65, 69, 72, 76]),
    (43, [62, 67, 71, 76]),
]
for bar in range(12):
    bass, tones = chords[bar % 4]
    start = bar * 2.5
    note(bass, start, 3.2, 0.15, -0.1)
    note(bass + 12, start, 3.2, 0.022, 0.12, pad=True)
    for step in range(4):
        midi = tones[step if bar < 8 else (3 - step)]
        note(midi, start + step * 0.625, 2.5, 0.085, (-0.2, 0.18, -0.1, 0.22)[step])
    if bar in (3, 7, 11):
        note(tones[0] + 12, start + 1.875, 2.2, 0.034, 0.12)

# Short, quiet stereo echoes. Keep the result subtle and coherent in mono.
for delay, gain in ((0.16, 0.075), (0.29, 0.045), (0.43, 0.025)):
    offset = round(delay * RATE)
    for i in range(len(left) - 1, offset - 1, -1):
        left[i] += right[i - offset] * gain
        right[i] += left[i - offset] * gain

peak = max(max(abs(v) for v in left), max(abs(v) for v in right))
rms = math.sqrt(sum(v * v for v in left) / len(left))
gain = min(0.68 / peak, 0.145 / rms)
pcm = array("h")
for i in range(len(left)):
    t = i / RATE
    fade = min(1.0, t / 0.8, max(0.0, DURATION - t) / 1.4)
    pcm.append(round(max(-1, min(1, left[i] * gain * fade)) * 32767))
    pcm.append(round(max(-1, min(1, right[i] * gain * fade)) * 32767))
with wave.open(str(DEST / "gentle-connections.wav"), "wb") as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes(pcm.tobytes())


def write_effect(filename, duration, generator):
    samples = array("h")
    for i in range(round(RATE * duration)):
        samples.append(round(generator(i / RATE) * 32767))
    with wave.open(str(DEST / filename), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(RATE)
        output.writeframes(samples.tobytes())


rng = random.Random(140)
write_effect(
    "soft-click.wav", 0.12,
    lambda t: 0.12 * math.exp(-t * 75)
    * (0.65 * math.sin(2 * math.pi * 860 * t) + 0.35 * rng.uniform(-1, 1))
    * min(1, t / 0.002),
)
write_effect(
    "soft-bell.wav", 1.5,
    lambda t: 0.18 * math.exp(-t * 3.8) * min(1, t / 0.008)
    * (math.sin(2 * math.pi * 1046.5 * t)
       + 0.22 * math.sin(2 * math.pi * 2093 * t)) / 1.22,
)

# One continuous timeline avoids offset-related inline-audio writes on Windows.
mix = array('i', pcm)
for filename, start, volume in (
    ('soft-click.wav', 4.6, 0.4),
    ('soft-bell.wav', 16.4, 0.38),
    ('soft-click.wav', 25.7, 0.3),
):
    with wave.open(str(DEST / filename), 'rb') as effect:
        mono = array('h', effect.readframes(effect.getnframes()))
    offset = round(start * RATE)
    for i, value in enumerate(mono):
        index = (offset + i) * 2
        if index + 1 < len(mix):
            addition = round(value * volume * math.sqrt(0.5))
            mix[index] += addition
            mix[index + 1] += addition
master = array('h', (max(-32767, min(32767, value)) for value in mix))
with wave.open(str(DEST / 'promo-soundtrack.wav'), 'wb') as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(RATE)
    output.writeframes(master.tobytes())
print(json.dumps({"duration": DURATION, "sample_rate": RATE,
                  "music_peak": round(peak * gain, 4),
                  "music_rms": round(rms * gain, 4),
                  "files": [p.name for p in DEST.glob("*.wav")]}))
