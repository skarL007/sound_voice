"""Virtual microphone control using VB-Audio Virtual Cable."""

import sounddevice as sd
import numpy as np


class VirtualMicController:
    def __init__(self):
        self.enabled = False
        self._cable_input = None
        self._find_cable_device()

    def _find_cable_device(self):
        """Find VB-Audio Virtual Cable input device."""
        try:
            devices = sd.query_devices()
            for i, dev in enumerate(devices):
                name = dev.get("name", "").lower()
                if "cable input" in name or "vb-audio" in name:
                    self._cable_input = i
                    print(f"Found VB-Cable Input at index {i}: {dev['name']}")
                    break
        except Exception as e:
            print(f"Could not find virtual cable: {e}")

    def play_to_virtual_mic(self, audio_array: np.ndarray, sample_rate: int):
        """Play audio through the virtual cable input device."""
        if not self.enabled or self._cable_input is None:
            # Fallback to default output
            sd.play(audio_array, sample_rate)
            return

        try:
            sd.play(audio_array, sample_rate, device=self._cable_input)
        except Exception as e:
            print(f"Error playing to virtual mic: {e}")
            sd.play(audio_array, sample_rate)

    def is_available(self) -> bool:
        return self._cable_input is not None
