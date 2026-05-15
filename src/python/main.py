"""
VoiceLaunch TTS - Python Backend
FastAPI server for TTS inference, voice cloning, and virtual microphone control.
"""

import argparse
import asyncio
import os
import sys
import json
import tempfile
import time
from pathlib import Path
from typing import Optional, List

import numpy as np
import sounddevice as sd
import soundfile as sf
from fastapi import FastAPI, WebSocket, UploadFile, File, Form
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

# Add tts_engines to path
sys.path.insert(0, str(Path(__file__).parent))

from hardware_probe import get_hardware_info
from model_manager import ModelManager, get_user_data_dir
from virtual_mic import VirtualMicController
from voice_cloner import VoiceCloner

app = FastAPI(title="VoiceLaunch TTS Backend", version="1.0.0")

# CORS — restrict to Electron origins only
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:*", "http://127.0.0.1:*", "file://"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# Global state
USER_DATA = get_user_data_dir()
VOICES_DIR = USER_DATA / "voices"
VOICES_DIR.mkdir(parents=True, exist_ok=True)
model_manager = ModelManager()
virtual_mic = VirtualMicController()
voice_cloner = VoiceCloner()
current_audio_task = None


# ============== Security helpers ==============

def _sanitize_audio_path(audio_path: str) -> Path:
    """Ensure audio path is within allowed directories."""
    if not audio_path:
        raise ValueError("Empty audio path")
    p = Path(audio_path).resolve()
    allowed_roots = [
        USER_DATA.resolve(),
        Path(tempfile.gettempdir()).resolve(),
    ]
    for root in allowed_roots:
        try:
            p.relative_to(root)
            return p
        except ValueError:
            continue
    raise ValueError(f"Audio path outside allowed directories: {audio_path}")


# ============== Pydantic Models ==============

class TTSRequest(BaseModel):
    text: str
    modelId: str
    voiceId: Optional[str] = None
    speed: float = 1.0
    language: Optional[str] = "pt"
    outputDevice: Optional[str] = None


class PlayRequest(BaseModel):
    audioPath: str

    @field_validator('audioPath')
    @classmethod
    def validate_audio_path(cls, v: str) -> str:
        _sanitize_audio_path(v)
        return v


class CloneRequest(BaseModel):
    audioPath: str
    modelId: str
    name: str
    description: Optional[str] = ""

    @field_validator('audioPath')
    @classmethod
    def validate_audio_path(cls, v: str) -> str:
        _sanitize_audio_path(v)
        return v


class MicRouteRequest(BaseModel):
    enabled: bool


class DeleteVoiceRequest(BaseModel):
    voiceId: str


class InstallDepsRequest(BaseModel):
    modelId: str


# ============== Health & Info ==============

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/hardware")
def hardware():
    return get_hardware_info()


# ============== Models ==============

@app.get("/models")
def list_models():
    return model_manager.list_available()


# ============== Temp file cleanup ==============

_temp_files: List[str] = []

def _register_temp(path: str):
    _temp_files.append(path)
    # Keep only last 50 temp files to prevent unbounded growth
    while len(_temp_files) > 50:
        old = _temp_files.pop(0)
        try:
            os.unlink(old)
        except OSError:
            pass


@app.post("/models/load")
def load_model(modelId: str):
    if not modelId or not modelId.replace("_", "").replace("-", "").isalnum():
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid modelId"})
    success = model_manager.load_model(modelId)
    return {"success": success}


@app.post("/models/unload")
def unload_model(modelId: str):
    if not modelId or not modelId.replace("_", "").replace("-", "").isalnum():
        return JSONResponse(status_code=400, content={"success": False, "error": "Invalid modelId"})
    model_manager.unload_model(modelId)
    return {"success": True}


@app.post("/models/install-deps")
def install_model_dependencies(request: InstallDepsRequest):
    result = model_manager.install_dependencies(request.modelId)
    return result


@app.get("/models/deps-status/{model_id}")
def deps_status(model_id: str):
    return {"installed": model_manager._check_deps_installed(model_id)}


# ============== TTS ==============

@app.post("/tts")
def synthesize(request: TTSRequest):
    try:
        # Get appropriate engine
        engine = model_manager.get_engine(request.modelId)
        if not engine:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": f"Model {request.modelId} not available"}
            )

        # Validate text length to prevent DoS
        MAX_TEXT_LENGTH = 5000
        if len(request.text) > MAX_TEXT_LENGTH:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": f"Text too long. Maximum {MAX_TEXT_LENGTH} characters."}
            )

        # Generate audio
        audio_array, sample_rate = engine.synthesize(
            text=request.text,
            voice_id=request.voiceId,
            speed=request.speed,
            language=request.language
        )

        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            temp_path = tmp.name
        sf.write(temp_path, audio_array, sample_rate)
        duration = len(audio_array) / sample_rate
        _register_temp(temp_path)

        return {
            "success": True,
            "audioPath": temp_path,
            "duration": round(duration, 2)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": "Internal server error"}
        )


@app.post("/play")
def play_audio(request: PlayRequest):
    try:
        data, sr = sf.read(request.audioPath)
        if data.ndim > 1:
            data = data.mean(axis=1)
        virtual_mic.play_to_virtual_mic(data, sr)
        return {"success": True}
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.post("/stop")
def stop_audio():
    sd.stop()
    return {"success": True}


# ============== WebSocket Streaming ==============

@app.websocket("/ws/tts-stream")
async def tts_stream(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            message = await websocket.receive_json()
            text = message.get("text", "")
            model_id = message.get("modelId", "piper")

            engine = model_manager.get_engine(model_id)
            if not engine:
                await websocket.send_json({"error": "Model not available"})
                continue

            # For streaming, we generate in chunks or send full audio
            # Simplified: generate full and send as base64 chunks
            audio_array, sample_rate = engine.synthesize(text=text)

            # Normalize and convert to int16
            audio_array = np.clip(audio_array, -1.0, 1.0)
            audio_int16 = (audio_array * 32767).astype(np.int16)

            # Send metadata
            await websocket.send_json({
                "type": "metadata",
                "sampleRate": sample_rate,
                "duration": len(audio_array) / sample_rate
            })

            # Send audio in chunks
            chunk_size = 1024 * 8
            for i in range(0, len(audio_int16), chunk_size):
                chunk = audio_int16[i:i+chunk_size]
                await websocket.send_bytes(chunk.tobytes())

            await websocket.send_json({"type": "end"})
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await websocket.close()


# ============== Voice Cloning ==============

@app.post("/voice/clone")
def clone_voice(request: CloneRequest):
    try:
        result = voice_cloner.clone(
            audio_path=request.audioPath,
            model_id=request.modelId,
            name=request.name,
            description=request.description
        )
        return result
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "error": str(e)})


@app.get("/voice/list")
def list_cloned_voices():
    voices = []
    if VOICES_DIR.exists():
        for voice_file in VOICES_DIR.glob("*.json"):
            with open(voice_file, "r", encoding="utf-8") as f:
                voice = json.load(f)
                voices.append(voice)
    return voices


@app.post("/voice/delete")
def delete_cloned_voice(request: DeleteVoiceRequest):
    voice_file = VOICES_DIR / f"{request.voiceId}.json"
    if voice_file.exists():
        voice_file.unlink()
        # Also remove associated sample if exists
        sample_file = VOICES_DIR / f"{request.voiceId}.wav"
        if sample_file.exists():
            sample_file.unlink()
        return {"success": True}
    return {"success": False, "error": "Voice not found"}


# ============== Virtual Mic ==============

@app.post("/mic/route")
def set_mic_route(request: MicRouteRequest):
    virtual_mic.enabled = request.enabled
    return {"success": True, "enabled": request.enabled}


@app.get("/mic/status")
def get_mic_status():
    return {"enabled": virtual_mic.enabled}


# ============== Audio Devices ==============

@app.get("/audio/devices")
def list_audio_devices():
    devices = []
    try:
        for i, dev in enumerate(sd.query_devices()):
            devices.append({
                "id": str(i),
                "name": dev["name"],
                "isInput": dev["max_input_channels"] > 0,
                "isDefault": dev.get("default_samplerate", 0) > 0
            })
    except Exception as e:
        print(f"Error listing audio devices: {e}")
    return devices


# ============== Main ==============

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=9472)
    parser.add_argument("--host", type=str, default="127.0.0.1")
    args = parser.parse_args()

    import uvicorn
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
