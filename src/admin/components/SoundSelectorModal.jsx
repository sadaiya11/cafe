import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  SOUND_TYPES,
  getSavedSoundType,
  saveSoundType,
  playNewOrderAlert,
  speakVoiceAnnouncement,
} from '../services/soundAlert'

export default function SoundSelectorModal({ isOpen, onClose, onSelectSound }) {
  const [selectedType, setSelectedType] = useState(getSavedSoundType)
  const [customVoiceText, setCustomVoiceText] = useState('One more order received!')

  if (!isOpen) return null

  const handleTestSoundOption = (typeId) => {
    playNewOrderAlert(typeId, customVoiceText)
  }

  const handleSave = () => {
    saveSoundType(selectedType)
    if (onSelectSound) onSelectSound(selectedType)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative max-w-lg w-full rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-white my-auto animate-in fade-in zoom-in duration-150 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔊</span>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white">Order Alert Sound Preferences</h3>
              <p className="text-xs text-slate-400">Choose voice speech announcements or kitchen chime sounds for new incoming orders.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Custom Voice Text Configuration */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
          <label className="text-xs font-bold text-amber-400 flex items-center gap-2">
            <span>🗣️</span>
            <span>Custom Voice Alert Text (AI Voice)</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customVoiceText}
              onChange={(e) => setCustomVoiceText(e.target.value)}
              placeholder="e.g. One more order received!"
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={() => speakVoiceAnnouncement(customVoiceText)}
              className="px-3 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition flex items-center gap-1"
              title="Test Voice Speech"
            >
              <span>🗣️</span>
              <span>Test Voice</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500">The browser will speak this out loud whenever a new customer order arrives.</p>
        </div>

        {/* Sound Selection List */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {SOUND_TYPES.map((sound) => {
            const isSelected = selectedType === sound.id

            return (
              <div
                key={sound.id}
                onClick={() => setSelectedType(sound.id)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-inner'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{sound.icon}</span>
                  <div>
                    <div className="text-xs font-bold flex items-center gap-2">
                      <span>{sound.name}</span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{sound.desc}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedType(sound.id)
                    handleTestSoundOption(sound.id)
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1 shrink-0"
                  title="Listen to sound sample"
                >
                  <span>▶️</span>
                  <span>Play</span>
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition shadow-md shadow-amber-500/20"
          >
            ✅ Save & Apply Sound Alert
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
