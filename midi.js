
function createMidiFile(bpm = 120) {
  const events = [];

  // MIDI header
  const header = [
    0x4D,0x54,0x68,0x64,
    0,0,0,6,
    0,0,0,1,
    0,120
  ];

  function vlq(value) {
    let buffer = value & 0x7F;
    const bytes = [];

    while ((value >>= 7)) {
      buffer <<= 8;
      buffer |= ((value & 0x7F) | 0x80);
    }

    while (true) {
      bytes.push(buffer & 255);
      if (buffer & 128) buffer >>= 8;
      else break;
    }

    return bytes;
  }

  const track = [
    0x00,0xFF,0x51,0x03,
    (60000000 / bpm >> 16) & 255,
    (60000000 / bpm >> 8) & 255,
    (60000000 / bpm) & 255
  ];

  // Basic 4/4 percussion pattern
  for (let bar = 0; bar < 4; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      const delta = beat === 0 && bar === 0 ? 0 : 120;
      track.push(...vlq(delta));

      // Kick on beats 1 and 3
      if (beat === 0 || beat === 2) {
        track.push(0x99, 36, 100);
        track.push(0x00, 0x89, 36, 0);
      } else {
        track.push(0x99, 38, 85);
        track.push(0x00, 0x89, 38, 0);
      }
    }
  }

  track.push(0x00,0xFF,0x2F,0x00);

  const size = track.length;
  const sizeBytes = [
    (size >>> 24) & 255,
    (size >>> 16) & 255,
    (size >>> 8) & 255,
    size & 255
  ];

  const bytes = [
    ...header,
    0x4D,0x54,0x72,0x6B,
    ...sizeBytes,
    ...track
  ];

  return new Blob(
    [new Uint8Array(bytes)],
    {type:"audio/midi"}
  );
}

function downloadMidi() {
  const bpm = 120;
  const blob = createMidiFile(bpm);
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "CHOVARAM_OCTAPAD.mid";
  a.click();

  URL.revokeObjectURL(url);
}
