
let audioBuffer = null;
let samples = [];

const status = document.getElementById("status");
const songInput = document.getElementById("song");

function setStatus(message) {
  status.innerText = message;
}

async function analyze() {
  const file = songInput.files[0];

  if (!file) {
    alert("पहले MP3 या WAV गाना अपलोड करें।");
    return;
  }

  try {
    setStatus("गाना पढ़ा जा रहा है...");

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    const context = new AudioContextClass();
    const data = await file.arrayBuffer();

    audioBuffer = await context.decodeAudioData(data);

    const channel = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    setStatus("बीट और BPM का विश्लेषण हो रहा है...");

    const frameSize = Math.floor(sampleRate * 0.01);
    const energy = [];

    for (let i = 0; i < channel.length; i += frameSize) {
      let sum = 0;
      const end = Math.min(i + frameSize, channel.length);

      for (let j = i; j < end; j++) {
        sum += channel[j] * channel[j];
      }

      energy.push(Math.sqrt(sum / (end - i)));
    }

    const changes = energy.map((value, i) =>
      i === 0 ? 0 : Math.max(0, value - energy[i - 1])
    );

    let bestBpm = 0;
    let bestScore = -1;

    for (let bpm = 60; bpm <= 180; bpm++) {
      const lag = Math.round(6000 / bpm);
      let score = 0;

      for (let i = lag; i < changes.length; i++) {
        score += changes[i] * changes[i - lag];
      }

      if (score > bestScore) {
        bestScore = score;
        bestBpm = bpm;
      }
    }

    const peaks = [];

    for (let i = 2; i < changes.length - 2; i++) {
      if (
        changes[i] > changes[i - 1] &&
        changes[i] > changes[i + 1] &&
        changes[i] > 0.015
      ) {
        peaks.push(i * 0.01);
      }
    }

    samples = peaks
      .filter((time, i) =>
        i === 0 || time - peaks[i - 1] > 0.25
      )
      .slice(0, 8);

    setStatus(
      "विश्लेषण पूरा!\n" +
      "गाने की अवधि: " +
      audioBuffer.duration.toFixed(2) +
      " सेकंड\nअनुमानित BPM: " + bestBpm +
      "\nपहचाने गए बीट पॉइंट: " + samples.length
    );

    showPads();

  } catch (error) {
    console.error(error);
    setStatus("ऑडियो पढ़ने में समस्या हुई। दूसरी MP3/WAV फाइल आजमाएँ।");
  }
}

function makeWav(buffer, start, duration) {
  const rate = buffer.sampleRate;
  const length = Math.min(
    Math.floor(duration * rate),
    buffer.length - Math.floor(start * rate)
  );

  const offset = Math.floor(start * rate);
  const channel = buffer.getChannelData(0);

  const output = new ArrayBuffer(44 + length * 2);
  const view = new DataView(output);

  function writeText(pos, text) {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(pos + i, text.charCodeAt(i));
    }
  }

  writeText(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, length * 2, true);

  for (let i = 0; i < length; i++) {
    const value = Math.max(-1, Math.min(1, channel[offset + i]));
    view.setInt16(
      44 + i * 2,
      value < 0 ? value * 32768 : value * 32767,
      true
    );
  }

  return new Blob([output], { type: "audio/wav" });
}

function downloadPad(index) {
  const blob = makeWav(audioBuffer, samples[index], 0.8);
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "CHOVARAM_PAD_" + (index + 1) + ".wav";
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function showPads() {
  let area = document.getElementById("generatedPads");

  if (!area) {
    area = document.createElement("div");
    area.id = "generatedPads";
    document.querySelector(".container").appendChild(area);
  }

  area.innerHTML = "<h3>तैयार ऑक्टोपैड सैंपल</h3>";

  samples.forEach((time, index) => {
    const button = document.createElement("button");
    button.textContent = "PAD " + (index + 1) + " - WAV डाउनलोड";
    button.onclick = () => downloadPad(index);
    area.appendChild(button);
  });
}
  
