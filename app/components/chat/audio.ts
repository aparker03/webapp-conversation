export const MAX_AUDIO_UPLOAD_BYTES = 30 * 1024 * 1024
export const MAX_RECORDING_SECONDS = 60

type AudioContextWithWebkit = typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

export const supportsAudioRecording = () => {
  const audioContext = typeof globalThis.AudioContext === 'undefined'
    ? (globalThis as AudioContextWithWebkit).webkitAudioContext
    : globalThis.AudioContext

  return !!(
    typeof globalThis.navigator !== 'undefined'
    && 'mediaDevices' in globalThis.navigator
    && typeof globalThis.MediaRecorder !== 'undefined'
    && audioContext
  )
}

const writeAscii = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

const encodeMonoPcmWav = (audioBuffer: AudioBuffer) => {
  const frameCount = audioBuffer.length
  const channelCount = audioBuffer.numberOfChannels
  const bytesPerSample = 2
  const wavHeaderBytes = 44
  const output = new ArrayBuffer(wavHeaderBytes + frameCount * bytesPerSample)
  const view = new DataView(output)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, output.byteLength - 8, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, audioBuffer.sampleRate, true)
  view.setUint32(28, audioBuffer.sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, frameCount * bytesPerSample, true)

  const channels = Array.from(
    { length: channelCount },
    (_, index) => audioBuffer.getChannelData(index),
  )
  let outputOffset = wavHeaderBytes

  for (let frame = 0; frame < frameCount; frame += 1) {
    let sample = 0
    for (const channel of channels) {
      sample += channel[frame] || 0
    }
    sample = Math.max(-1, Math.min(1, sample / channelCount))
    view.setInt16(outputOffset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
    outputOffset += bytesPerSample
  }

  return new Blob([output], { type: 'audio/wav' })
}

export const convertRecordingToWav = async (recording: Blob) => {
  const AudioContextClass = typeof globalThis.AudioContext === 'undefined'
    ? (globalThis as AudioContextWithWebkit).webkitAudioContext
    : globalThis.AudioContext

  if (!AudioContextClass) {
    throw new Error('This browser cannot convert microphone recordings.')
  }

  const context = new AudioContextClass()
  try {
    const recordingBuffer = await recording.arrayBuffer()
    const decoded = await context.decodeAudioData(recordingBuffer.slice(0))
    return encodeMonoPcmWav(decoded)
  }
  finally {
    await context.close()
  }
}
