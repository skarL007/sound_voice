"""Voice cloning pipeline for XTTS v2 and Fish Speech.

XTTS v2 uses reference audio directly as speaker_wav — no separate embedding extraction needed.
Fish Speech requires a full server setup and is not yet integrated.
"""

import json
import os
import time
import uuid
from pathlib import Path

import numpy as np
import soundfile as sf

USER_DATA = Path(os.environ.get("APPDATA", Path.home() / "AppData/Roaming")) / "VoiceLaunch"
VOICES_DIR = USER_DATA / "voices"
VOICES_DIR.mkdir(parents=True, exist_ok=True)


def _validate_audio(audio_path: str):
    """Validate audio file and return normalized mono audio at 22050Hz."""
    if not Path(audio_path).exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    data, sr = sf.read(audio_path)
    duration = len(data) / sr

    if duration < 3:
        raise ValueError("Audio too short. Minimum 3 seconds required.")
    if duration > 60:
        raise ValueError("Audio too long. Maximum 60 seconds allowed.")

    # Convert to mono
    if data.ndim > 1:
        data = data.mean(axis=1)

    # Resample to 22050Hz (XTTS preference)
    if sr != 22050:
        try:
            import librosa
            data = librosa.resample(data, orig_sr=sr, target_sr=22050)
            sr = 22050
        except ImportError:
            pass  # keep original if librosa not available

    return data, sr, duration


def _generate_preview_xtts(text: str, speaker_wav: str, output_path: str) -> bool:
    """Generate a short preview using XTTS v2 to validate the cloned voice."""
    try:
        from TTS.api import TTS as CoquiTTS
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
        tts = CoquiTTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=(device == "cuda"))
        tts.tts_to_file(
            text=text,
            speaker_wav=speaker_wav,
            language="pt",
            file_path=output_path,
        )
        return True
    except Exception as e:
        print(f"Preview generation failed: {e}")
        return False


class VoiceCloner:
    def clone(self, audio_path: str, model_id: str, name: str, description: str = ""):
        """
        Clone a voice from reference audio.
        Returns dict with success status and voiceId.
        """
        try:
            data, sr, duration = _validate_audio(audio_path)

            # Generate voice ID
            voice_id = f"{model_id}_{uuid.uuid4().hex[:8]}"

            # Save normalized reference audio to voices dir
            ref_path = VOICES_DIR / f"{voice_id}.wav"
            sf.write(ref_path, data, sr)

            # Generate preview for XTTS v2
            preview_path = None
            if model_id == "xtts_v2":
                preview_path = str(VOICES_DIR / f"{voice_id}_preview.wav")
                preview_ok = _generate_preview_xtts(
                    "Olá! Esta é a minha voz clonada. Estou pronto para falar.",
                    str(ref_path),
                    preview_path
                )
                if not preview_ok:
                    preview_path = None

            voice_data = {
                "id": voice_id,
                "name": name,
                "description": description,
                "modelId": model_id,
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
                "samplePath": str(ref_path),
                "previewPath": preview_path,
                "duration": round(duration, 2),
                "sampleRate": sr,
            }

            metadata_path = VOICES_DIR / f"{voice_id}.json"
            with open(metadata_path, "w", encoding="utf-8") as f:
                json.dump(voice_data, f, indent=2, ensure_ascii=False)

            return {
                "success": True,
                "voiceId": voice_id,
                "duration": round(duration, 2),
                "previewPath": preview_path,
            }

        except Exception as e:
            return {"success": False, "error": str(e)}
