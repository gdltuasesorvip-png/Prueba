# Scripts de audio

`gen-audio.mjs` genera la música de fondo y los efectos de sonido del reel como
archivos WAV, sin depender de pistas de terceros.

```bash
mkdir -p /tmp/audio
node scripts/gen-audio.mjs /tmp/audio
# Luego se aplicó reverb y normalización con ffmpeg y se guardaron como MP3 en public/audio/
ffmpeg -i /tmp/audio/music.wav -af "aecho=0.8:0.6:60|120:0.25|0.15,lowpass=f=5500,loudnorm=I=-20:TP=-2:LRA=9" -c:a libmp3lame -b:a 160k public/audio/music.mp3
for f in whoosh pop ding boom sparkle riser; do
  ffmpeg -i /tmp/audio/$f.wav -af "aecho=0.7:0.5:40|80:0.2|0.1,alimiter=limit=0.9" -c:a libmp3lame -b:a 128k public/audio/$f.mp3
done
```
