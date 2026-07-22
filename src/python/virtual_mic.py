"""Virtual microphone control using VB-Audio Virtual Cable."""

import numpy as np
import sounddevice as sd

# O VB-Cable opera nativamente a 48 kHz. Reamostramos antes de tocar no cabo
# para evitar rejeicao de stream (PortAudioError) ou pitch shift audivel.
CABLE_SAMPLE_RATE = 48000


class VirtualMicController:
    def __init__(self):
        self.enabled = False
        self._cable_input = None
        self._cable_name = None
        self._find_cable_device()

    def _find_cable_device(self) -> bool:
        """Find the VB-Cable playback device (the one we render audio INTO).

        "CABLE Input (VB-Audio Virtual Cable)" is an *output* device from the
        OS point of view: we play into it, and Discord/Zoom capture from
        "CABLE Output". So we only accept devices with output channels.
        """
        self._cable_input = None
        self._cable_name = None
        try:
            devices = sd.query_devices()
            fallback = None
            for i, dev in enumerate(devices):
                name = dev.get("name", "")
                lname = name.lower()
                if "cable" not in lname and "vb-audio" not in lname:
                    continue
                if dev.get("max_output_channels", 0) <= 0:
                    continue
                # Preferencia explicita pelo "CABLE Input" de playback.
                if "cable input" in lname:
                    self._cable_input = i
                    self._cable_name = name
                    break
                # "CABLE Output" e o lado de captura (Discord le dele); nunca
                # serve como destino de playback, mesmo como fallback.
                if "cable output" in lname:
                    continue
                if fallback is None:
                    fallback = (i, name)
            if self._cable_input is None and fallback is not None:
                self._cable_input, self._cable_name = fallback
            if self._cable_input is not None:
                print(f"Found VB-Cable playback device at index {self._cable_input}: {self._cable_name}")
        except Exception as e:
            print(f"Could not find virtual cable: {e}")
        return self._cable_input is not None

    @staticmethod
    def _resample(audio: np.ndarray, src_sr: int, dst_sr: int) -> np.ndarray:
        """Linear resample (mono or multi-channel) without extra dependencies."""
        if src_sr == dst_sr or audio.size == 0:
            return audio
        n_src = audio.shape[0]
        n_dst = int(round(n_src * dst_sr / src_sr))
        if n_dst <= 0:
            return audio
        src_positions = np.linspace(0.0, n_src - 1, num=n_dst)
        base = np.arange(n_src)
        if audio.ndim == 1:
            return np.interp(src_positions, base, audio).astype(np.float32)
        out = np.zeros((n_dst, audio.shape[1]), dtype=np.float32)
        for ch in range(audio.shape[1]):
            out[:, ch] = np.interp(src_positions, base, audio[:, ch])
        return out

    def play_to_virtual_mic(self, audio_array: np.ndarray, sample_rate: int) -> dict:
        """Play audio through the virtual cable. Returns routing diagnostics."""
        if not self.enabled:
            sd.play(audio_array, sample_rate)
            return {"routed_to_virtual_mic": False, "fallback_reason": "disabled", "device_name": None}

        if self._cable_input is None:
            sd.play(audio_array, sample_rate)
            return {"routed_to_virtual_mic": False, "fallback_reason": "device_not_found", "device_name": None}

        try:
            data = self._resample(audio_array, sample_rate, CABLE_SAMPLE_RATE)
            sd.play(data, CABLE_SAMPLE_RATE, device=self._cable_input)
            return {"routed_to_virtual_mic": True, "fallback_reason": None, "device_name": self._cable_name}
        except Exception as e:
            print(f"Error playing to virtual mic, falling back to default output: {e}")
            sd.play(audio_array, sample_rate)
            return {"routed_to_virtual_mic": False, "fallback_reason": str(e), "device_name": None}

    def refresh(self) -> dict:
        """Re-scan audio devices so a freshly installed VB-Cable is picked up
        without restarting the backend."""
        self._find_cable_device()
        return self.status()

    def status(self) -> dict:
        return {
            "enabled": self.enabled,
            "available": self._cable_input is not None,
            "deviceName": self._cable_name,
        }

    def is_available(self) -> bool:
        return self._cable_input is not None
