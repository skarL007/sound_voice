"""Manages TTS model loading, unloading, download, extraction, and engine selection.

Supports both NVIDIA (CUDA) and AMD (DirectML/ROCm) GPUs on Windows.
"""

import json
import os
import subprocess
import sys
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Optional, Dict, Any, List

import requests

def get_user_data_dir() -> Path:
    """Return the shared runtime user-data directory."""
    configured = os.environ.get("VOICELAUNCH_USER_DATA")
    if configured:
        return Path(configured)
    appdata = os.environ.get("APPDATA")
    if appdata:
        return Path(appdata) / "voicelaunch-tts"
    return Path.home() / "AppData" / "Roaming" / "voicelaunch-tts"


USER_DATA = get_user_data_dir()
MODELS_DIR = USER_DATA / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

PYTHON_EXE = sys.executable


# ============== Base Engine ==============

class BaseTTSEngine:
    """Abstract base for TTS engines."""

    def synthesize(self, text: str, voice_id: Optional[str] = None, speed: float = 1.0, language: str = "pt"):
        """Returns (audio_array: np.ndarray, sample_rate: int)"""
        raise NotImplementedError

    def is_available(self) -> bool:
        return False

    def get_voices(self) -> list:
        return []


# ============== Piper Engine ==============

class PiperEngine(BaseTTSEngine):
    def __init__(self, model_dir: Path):
        self.model_dir = model_dir
        self._voice = None
        self._model_path: Optional[Path] = None
        self._config_path: Optional[Path] = None
        self._find_model_files()

    def _find_model_files(self):
        onnx_files = list(self.model_dir.glob("*.onnx"))
        if onnx_files:
            self._model_path = onnx_files[0]
            candidate_json = self._model_path.with_suffix(".onnx.json")
            if candidate_json.exists():
                self._config_path = candidate_json
            else:
                # Try without .onnx suffix
                candidate_json2 = self.model_dir / (self._model_path.stem + ".json")
                if candidate_json2.exists():
                    self._config_path = candidate_json2

    def is_available(self) -> bool:
        try:
            from piper import PiperVoice
            return self._model_path is not None and self._model_path.exists()
        except ImportError:
            return False

    def synthesize(self, text, voice_id=None, speed=1.0, language="pt"):
        from piper import PiperVoice
        import numpy as np

        if self._voice is None:
            config = str(self._config_path) if self._config_path and self._config_path.exists() else None
            self._voice = PiperVoice.load(str(self._model_path), config_path=config)

        # Build synthesis config
        from piper.config import SynthesisConfig
        syn_config = SynthesisConfig(
            length_scale=1.0 / speed,
            speaker_id=int(voice_id) if voice_id else None,
        )

        chunks = list(self._voice.synthesize(text, syn_config=syn_config))
        audio_bytes = b"".join(chunk.audio_int16_bytes for chunk in chunks)
        audio_array = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32) / 32767.0
        return audio_array, self._voice.config.sample_rate


# ============== Kokoro Engine ==============

class KokoroEngine(BaseTTSEngine):
    """Kokoro TTS.

    Prefere kokoro-onnx (ONNX Runtime, compatível com Python 3.13, sem PyTorch),
    usando o modelo `*.onnx` + as vozes `voices-*.bin` baixados em model_dir.
    Cai para o pacote `kokoro` (PyTorch/KPipeline) quando disponível (Python <3.13).
    """

    def __init__(self, model_dir: Path):
        self.model_dir = model_dir
        self._pipeline = None   # KPipeline (fallback torch)
        self._onnx = None       # kokoro_onnx.Kokoro
        self._model_path: Optional[Path] = None
        self._voices_path: Optional[Path] = None
        self._find_model_files()

    def _find_model_files(self):
        onnx_files = list(self.model_dir.glob("*.onnx"))
        if onnx_files:
            self._model_path = onnx_files[0]
        bin_files = list(self.model_dir.glob("*.bin"))
        voices = [p for p in bin_files if "voice" in p.name.lower()]
        if voices:
            self._voices_path = voices[0]
        elif bin_files:
            self._voices_path = bin_files[0]

    @staticmethod
    def _module_available(name: str) -> bool:
        try:
            import importlib.util
            return importlib.util.find_spec(name) is not None
        except Exception:
            return False

    def _onnx_ready(self) -> bool:
        return (
            self._module_available("kokoro_onnx")
            and self._model_path is not None and self._model_path.exists()
            and self._voices_path is not None and self._voices_path.exists()
        )

    def is_available(self) -> bool:
        # Caminho ONNX (Python 3.13+): precisa do pacote + modelo + vozes baixados.
        if self._onnx_ready():
            return True
        # Fallback PyTorch: KPipeline baixa o próprio modelo sob demanda.
        return self._module_available("kokoro")

    def synthesize(self, text, voice_id=None, speed=1.0, language="pt"):
        import numpy as np

        voice = voice_id or "pf_dora"

        if self._onnx_ready():
            from kokoro_onnx import Kokoro
            if self._onnx is None:
                self._onnx = Kokoro(str(self._model_path), str(self._voices_path))
            lang = "pt-br" if str(language).lower().startswith("pt") else (language or "en-us")
            samples, sample_rate = self._onnx.create(text, voice=voice, speed=speed, lang=lang)
            return np.asarray(samples, dtype=np.float32), int(sample_rate)

        # Fallback: kokoro (PyTorch) KPipeline
        from kokoro import KPipeline
        if self._pipeline is None:
            self._pipeline = KPipeline(lang_code="p")
        samples = list(self._pipeline(text, voice=voice, speed=speed))
        if not samples:
            return np.zeros(0, dtype=np.float32), 24000
        audio_arrays = [audio for (_, _, audio) in samples]
        full_audio = np.concatenate(audio_arrays)
        return full_audio, 24000


# ============== MeloTTS Engine ==============

class MeloTTSEngine(BaseTTSEngine):
    def __init__(self, model_dir: Path):
        self.model_dir = model_dir
        self._model = None

    def is_available(self) -> bool:
        try:
            from melo.api import TTS
            return True
        except ImportError:
            return False

    def synthesize(self, text, voice_id=None, speed=1.0, language="pt"):
        from melo.api import TTS
        import numpy as np

        if self._model is None:
            self._model = TTS(language="PT", device="auto")

        speaker_id = int(voice_id) if voice_id else "PT"
        audio_array = self._model.tts_to_floating_point(text, speaker_id, sdp_ratio=0.2, noise_scale=0.6, noise_scale_w=0.8)
        return audio_array, self._model.hps.data.sampling_rate


# ============== XTTS v2 Engine ==============

class XTTSv2Engine(BaseTTSEngine):
    def __init__(self, model_dir: Path):
        self.model_dir = model_dir
        self._tts = None

    def is_available(self) -> bool:
        try:
            from TTS.api import TTS as CoquiTTS
            return True
        except ImportError:
            return False

    def _get_device(self):
        """Auto-select best device: cuda > directml > cpu"""
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
        except Exception:
            pass
        try:
            import torch_directml
            return "privateuseone"
        except Exception:
            pass
        return "cpu"

    def synthesize(self, text, voice_id=None, speed=1.0, language="pt"):
        from TTS.api import TTS as CoquiTTS
        import numpy as np
        import tempfile

        if self._tts is None:
            device = self._get_device()
            gpu = device != "cpu"
            self._tts = CoquiTTS("tts_models/multilingual/multi-dataset/xtts_v2", gpu=gpu)

        speaker_wav = voice_id if voice_id else None

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            out_path = f.name

        self._tts.tts_to_file(
            text=text,
            speaker_wav=speaker_wav,
            language=language,
            file_path=out_path,
        )

        import soundfile as sf
        audio, sr = sf.read(out_path)
        if audio.ndim > 1:
            audio = audio.mean(axis=1)
        os.unlink(out_path)
        return audio, sr


# ============== Fish Speech Engine ==============

class FishSpeechEngine(BaseTTSEngine):
    def __init__(self, model_dir: Path):
        self.model_dir = model_dir
        self._model = None

    def is_available(self) -> bool:
        try:
            import fish_speech
            return True
        except ImportError:
            return False

    def synthesize(self, text, voice_id=None, speed=1.0, language="pt"):
        import numpy as np
        raise RuntimeError(
            "Fish Speech engine is not fully integrated. "
            "Please use XTTS v2 for voice cloning, or install Fish Speech manually."
        )


# ============== Bark Engine ==============

class BarkEngine(BaseTTSEngine):
    def __init__(self, model_dir: Path):
        self.model_dir = model_dir

    def is_available(self) -> bool:
        try:
            from bark import SAMPLE_RATE, generate_audio
            return True
        except ImportError:
            return False

    def synthesize(self, text, voice_id=None, speed=1.0, language="pt"):
        from bark import SAMPLE_RATE, generate_audio
        import numpy as np

        history_prompt = voice_id or "v2/pt_speaker_0"
        audio_array = generate_audio(text, history_prompt=history_prompt)
        return audio_array, SAMPLE_RATE


# ============== Model Manager ==============

class ModelManager:
    def __init__(self):
        self._engines: Dict[str, BaseTTSEngine] = {}
        self._loaded: Dict[str, Any] = {}
        self._registry = self._load_registry()

    def _load_registry(self) -> list:
        """Load model registry from bundled assets."""
        try:
            registry_override = os.environ.get("VOICELAUNCH_MODEL_REGISTRY_PATH")
            if registry_override:
                registry_path = Path(registry_override)
                if registry_path.exists():
                    with open(registry_path, "r", encoding="utf-8") as f:
                        return json.load(f).get("models", [])

            script_dir = Path(__file__).parent
            # Try bundled asset path first (PyInstaller)
            registry_path = script_dir / ".." / ".." / "assets" / "model-registry.json"
            if not registry_path.exists():
                # Development path
                registry_path = script_dir / ".." / ".." / ".." / "assets" / "model-registry.json"
            with open(registry_path, "r", encoding="utf-8") as f:
                return json.load(f).get("models", [])
        except Exception as e:
            print(f"Failed to load registry: {e}")
            return []

    def list_available(self) -> list:
        """List models enriched with installed/available status."""
        registry = self._registry
        installed = set()
        if MODELS_DIR.exists():
            installed = {d.name for d in MODELS_DIR.iterdir() if d.is_dir()}

        result = []
        for item in registry:
            model_id = item["id"]
            model_copy = dict(item)
            model_copy["installed"] = model_id in installed
            model_copy["loaded"] = model_id in self._loaded
            model_copy["depsInstalled"] = self._check_deps_installed(model_id)
            result.append(model_copy)
        return result

    def _check_deps_installed(self, model_id: str) -> bool:
        """Check if Python dependencies for a model are available (lightweight)."""
        import importlib.util

        # Kokoro: ONNX Runtime (kokoro_onnx, Python 3.13+) OU torch (kokoro, legado).
        if model_id == "kokoro":
            for mod in ("kokoro_onnx", "kokoro"):
                try:
                    if importlib.util.find_spec(mod) is not None:
                        return True
                except Exception:
                    pass
            return False

        engine_map = {
            "piper": "piper",
            "melotts": "melo",
            "xtts_v2": "TTS",
            "fish_speech": "fish_speech",
            "bark": "bark",
        }
        module = engine_map.get(model_id)
        if not module:
            return False
        try:
            spec = importlib.util.find_spec(module)
            return spec is not None
        except Exception:
            return False

    def install_dependencies(self, model_id: str) -> dict:
        """Install Python dependencies for a specific model."""
        if getattr(sys, "frozen", False):
            return {
                "success": False,
                "error": (
                    "Runtime dependency installation is disabled in the packaged beta backend. "
                    "This build includes only Piper and Kokoro."
                ),
            }

        req_files = {
            "piper": "requirements-piper.txt",
            "kokoro": "requirements-kokoro.txt",
            "melotts": "requirements-melotts.txt",
            "xtts_v2": "requirements-xtts.txt",
            "bark": "requirements-bark.txt",
        }
        req_file = req_files.get(model_id)
        if not req_file:
            return {"success": False, "error": "No requirements file for this model"}

        script_dir = Path(__file__).parent
        req_path = script_dir / req_file
        if not req_path.exists():
            return {"success": False, "error": f"Requirements file not found: {req_file}"}

        # Detect AMD GPU on Windows and suggest DirectML for XTTS/Bark
        extra_index = []
        if model_id in ("xtts_v2", "bark") and self._is_amd_windows():
            try:
                subprocess.check_output([PYTHON_EXE, "-m", "pip", "show", "torch-directml"], stderr=subprocess.DEVNULL)
            except subprocess.CalledProcessError:
                print("AMD GPU detected on Windows. Installing torch-directml...")
                subprocess.run([PYTHON_EXE, "-m", "pip", "install", "torch-directml", "--quiet"], check=False)

        try:
            result = subprocess.run(
                [PYTHON_EXE, "-m", "pip", "install", "-r", str(req_path), "--quiet"],
                capture_output=True,
                text=True,
                timeout=600,
            )
            if result.returncode == 0:
                return {"success": True}
            return {"success": False, "error": result.stderr or "pip install failed"}
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Installation timed out (10 min)"}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _is_amd_windows(self) -> bool:
        """Check if running on Windows with AMD GPU."""
        if sys.platform != "win32":
            return False
        try:
            import wmi
            c = wmi.WMI()
            for gpu in c.Win32_VideoController():
                if gpu.Name and ("amd" in gpu.Name.lower() or "radeon" in gpu.Name.lower()):
                    return True
        except Exception:
            pass
        try:
            output = subprocess.check_output(
                ["wmic", "path", "win32_VideoController", "get", "Name"],
                text=True,
                stderr=subprocess.DEVNULL,
            )
            if "amd" in output.lower() or "radeon" in output.lower():
                return True
        except Exception:
            pass
        return False

    def download_model(self, model_id: str, progress_callback=None) -> dict:
        """Download and extract a model from the registry."""
        model_info = next((m for m in self._registry if m["id"] == model_id), None)
        if not model_info:
            return {"success": False, "error": "Model not found in registry"}

        model_dir = MODELS_DIR / model_id
        model_dir.mkdir(parents=True, exist_ok=True)

        urls = []
        if "downloadUrl" in model_info:
            urls.append({"url": model_info["downloadUrl"], "filename": model_info.get("filename", "model.bin")})
        if "configUrl" in model_info:
            urls.append({"url": model_info["configUrl"], "filename": model_info.get("configFilename", "config.json")})
        if "variants" in model_info:
            for variant_id, variant in model_info["variants"].items():
                urls.append({"url": variant["url"], "filename": variant.get("filename", f"{variant_id}.bin")})

        for entry in urls:
            url = entry["url"]
            filename = entry["filename"]
            dest = model_dir / filename

            try:
                self._download_file(url, dest, progress_callback)
            except Exception as e:
                return {"success": False, "error": f"Failed to download {filename}: {e}"}

            # Extract if zip
            if filename.endswith(".zip"):
                try:
                    with zipfile.ZipFile(dest, "r") as z:
                        z.extractall(model_dir)
                    dest.unlink()  # Remove zip after extraction
                except Exception as e:
                    return {"success": False, "error": f"Failed to extract {filename}: {e}"}

        return {"success": True, "path": str(model_dir)}

    def _download_file(self, url: str, dest: Path, progress_callback=None):
        """Download a file with optional progress callback."""
        response = requests.get(url, stream=True, timeout=300)
        response.raise_for_status()
        total = int(response.headers.get("content-length", 0))
        downloaded = 0
        chunk_size = 8192

        with open(dest, "wb") as f:
            for chunk in response.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if progress_callback and total > 0:
                        progress_callback({"percent": int(downloaded / total * 100), "downloaded": downloaded, "total": total})

    def get_engine(self, model_id: str) -> Optional[BaseTTSEngine]:
        if model_id in self._engines:
            return self._engines[model_id]

        engine = self._create_engine(model_id)
        if engine and engine.is_available():
            self._engines[model_id] = engine
            self._loaded[model_id] = True
            return engine
        return None

    def load_model(self, model_id: str) -> bool:
        engine = self.get_engine(model_id)
        return engine is not None

    def unload_model(self, model_id: str):
        engine = self._engines.pop(model_id, None)
        if engine is not None:
            # Release model-specific heavy resources
            if model_id == "xtts_v2" and hasattr(engine, "_tts"):
                try:
                    import torch
                    del engine._tts
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except Exception:
                    pass
            elif model_id == "bark" and hasattr(engine, "_model"):
                try:
                    import torch
                    del engine._model
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except Exception:
                    pass
            elif model_id == "melotts" and hasattr(engine, "_model"):
                try:
                    import torch
                    del engine._model
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                except Exception:
                    pass
        if model_id in self._loaded:
            del self._loaded[model_id]

    def _create_engine(self, model_id: str) -> Optional[BaseTTSEngine]:
        model_dir = MODELS_DIR / model_id
        if not model_dir.exists():
            return None

        engines = {
            "piper": PiperEngine,
            "kokoro": KokoroEngine,
            "melotts": MeloTTSEngine,
            "xtts_v2": XTTSv2Engine,
            "fish_speech": FishSpeechEngine,
            "bark": BarkEngine,
        }

        engine_class = engines.get(model_id)
        if engine_class:
            return engine_class(model_dir)
        return None
