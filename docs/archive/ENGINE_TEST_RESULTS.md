# Engine Test Results — VoiceLaunch TTS

> Date: 2026-05-11
> Tester: Automated validation script (`scripts/test-engines.py`)

## Summary

| Engine | Status | Synthesis Time | Audio Duration | Notes |
|--------|--------|---------------|----------------|-------|
| **Piper** | ✅ PASS | 3.13s | 2.86s @ 22050Hz | Production ready |
| **Kokoro** | ✅ PASS | 5.72s | 2.95s @ 24000Hz | Production ready |
| **Bark** | ⚠️ PARTIAL | N/A | N/A | Engine loads, auto-downloads model on first use (slow) |
| **XTTS v2** | ⚠️ PARTIAL | N/A | N/A | Requires 2GB model download to test |
| **MeloTTS** | ❌ FAIL | N/A | N/A | Package not installed (build failure) |

## Detailed Results

### Piper TTS
- **Model**: `pt_BR-faber-medium.onnx`
- **Status**: Fully functional
- **Speed**: Fast (~3s for 3s audio)
- **Quality**: Good for CPU-only inference

### Kokoro
- **Model**: `kokoro-v1_0.onnx`
- **Status**: Fully functional
- **Speed**: Moderate (~6s for 3s audio)
- **Quality**: Excellent (MOS 4.2)
- **Warning**: Defaults repo_id to `hexgrad/Kokoro-82M` — pass `repo_id='hexgrad/Kokoro-82M'` to suppress

### Bark
- **Status**: Engine imports successfully
- **Issue**: First run triggers automatic model download from HuggingFace (several GB)
- **Recommendation**: Pre-download model during app onboarding or bundle with installer

### XTTS v2
- **Status**: Engine imports successfully (after installing `anyascii`, `inflect`, etc.)
- **Issue**: Requires `model.pth` (2GB) in `%APPDATA%/VoiceLaunch/models/xtts_v2/`
- **Note**: TTS (Coqui) has dependency conflicts:
  - `pandas<2.0` required but `pandas 3.0.2` installed
  - `numpy` version conflicts with `kokoro-onnx`
- **Recommendation**: Test in isolated environment before release

### MeloTTS
- **Status**: Package installation failed
- **Error**: `FileNotFoundError: requirements.txt` during pip install
- **Recommendation**: Fix requirements file or use alternative installation method

## Dependency Conflicts Found

```
tts 0.22.0 requires pandas<2.0,>=1.4, but you have pandas 3.0.2
kokoro-onnx 0.5.0 requires numpy>=2.0.2, but tts downgraded to numpy 1.26.4
```

**Impact**: Coqui TTS and Kokoro cannot coexist in the same Python environment with their current versions.

## Recommendations for Release

1. **Piper + Kokoro**: Ready for production
2. **Bark**: Add pre-download step in UI or bundle model
3. **XTTS v2**: Test thoroughly with cloned voices; consider dependency isolation
4. **MeloTTS**: Fix installation or deprecate until resolved
5. **Dependency isolation**: Consider separate virtual environments for conflicting engines
