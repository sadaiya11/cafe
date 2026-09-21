/**
 * Advanced Multi-Sound & AI Voice Alert Synthesizer Engine
 * Supports Voice Announcements ("One more order received!"), Chimes, Alarms, Fanfare & Beeps
 */

const SOUND_STORAGE_KEY = 'bun_admin_sound_type'

export const SOUND_TYPES = [
  {
    id: 'voice_combo',
    name: '🗣️ Voice + Chime (Recommended)',
    desc: 'Plays bell chime and speaks "One more order received!"',
    icon: '🗣️',
  },
  {
    id: 'voice',
    name: '📢 Voice Announcement Only',
    desc: 'Speaks out loud: "One more order received! Please check kitchen order desk."',
    icon: '📢',
  },
  {
    id: 'chime',
    name: '🔔 Classic Double Bell Chime',
    desc: 'High-pitch double kitchen chime sound',
    icon: '🔔',
  },
  {
    id: 'alarm',
    name: '🚨 Loud Kitchen Alarm Ring',
    desc: 'Repeated multi-pulse ringing alert for loud kitchen environments',
    icon: '🚨',
  },
  {
    id: 'fanfare',
    name: '🎺 Trumpet Fanfare Melody',
    desc: 'Celebratory 4-tone victory chime melody',
    icon: '🎺',
  },
  {
    id: 'digital_beep',
    name: '⏱️ Digital Radar Beep',
    desc: 'High frequency electronic triple beep',
    icon: '⏱️',
  },
]

export function getSavedSoundType() {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY) || 'voice_combo'
  } catch {
    return 'voice_combo'
  }
}

export function saveSoundType(typeId) {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, typeId)
  } catch {}
}

/** Speak voice announcement using Web Speech API */
export function speakVoiceAnnouncement(text = 'One more order received!') {
  try {
    if (!('speechSynthesis' in window)) return false
    window.speechSynthesis.cancel() // Cancel previous speaking queue
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.0
    utterance.pitch = 1.1
    utterance.volume = 1.0

    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find(v => (v.lang || '').includes('en') || (v.lang || '').includes('EN'))
    if (englishVoice) {
      utterance.voice = englishVoice
    }

    window.speechSynthesis.speak(utterance)
    return true
  } catch (err) {
    console.warn('Speech synthesis error:', err)
    return false
  }
}

/** Tone 1: Double Bell Chime */
export function playDoubleChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
    gain1.gain.setValueAtTime(0.3, ctx.currentTime)
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)

    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.5)

    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15) // A5
    gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)

    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(ctx.currentTime + 0.15)
    osc2.stop(ctx.currentTime + 0.8)
  } catch (e) {
    console.warn('Audio chime error:', e)
  }
}

/** Tone 2: Loud Kitchen Ringing Alarm */
export function playKitchenAlarm() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const times = [0, 0.2, 0.4]
    times.forEach(delay => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(750, ctx.currentTime + delay)
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.12)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + delay)
      osc.stop(ctx.currentTime + delay + 0.12)
    })
  } catch (e) {
    console.warn('Alarm error:', e)
  }
}

/** Tone 3: Trumpet Fanfare */
export function playTrumpetFanfare() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const notes = [
      { freq: 523.25, delay: 0, duration: 0.15 },    // C5
      { freq: 659.25, delay: 0.12, duration: 0.15 }, // E5
      { freq: 783.99, delay: 0.24, duration: 0.15 }, // G5
      { freq: 1046.50, delay: 0.36, duration: 0.4 },  // C6
    ]

    notes.forEach(note => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.delay)
      gain.gain.setValueAtTime(0.35, ctx.currentTime + note.delay)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.delay + note.duration)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + note.delay)
      osc.stop(ctx.currentTime + note.delay + note.duration)
    })
  } catch (e) {
    console.warn('Fanfare error:', e)
  }
}

/** Tone 4: Digital Radar Beep */
export function playDigitalRadarBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const ctx = new AudioContext()

    const notes = [1200, 1400, 1600]
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1)
      gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.08)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + idx * 0.1)
      osc.stop(ctx.currentTime + idx * 0.1 + 1.08)
    })
  } catch (e) {
    console.warn('Digital beep error:', e)
  }
}

/** Main Master Alert Dispatcher */
export function playNewOrderAlert(soundType = null, voiceText = 'online order received !') {
  const activeType = soundType || getSavedSoundType()

  if (activeType === 'voice') {
    speakVoiceAnnouncement(voiceText)
  } else if (activeType === 'voice_combo') {
    playDoubleChime()
    setTimeout(() => {
      speakVoiceAnnouncement(voiceText)
    }, 600)
  } else if (activeType === 'alarm') {
    playKitchenAlarm()
  } else if (activeType === 'fanfare') {
    playTrumpetFanfare()
  } else if (activeType === 'digital_beep') {
    playDigitalRadarBeep()
  } else {
    // Default 'chime'
    playDoubleChime()
  }
}

/** Legacy export alias */
export function playNewOrderChime() {
  playNewOrderAlert()
}
