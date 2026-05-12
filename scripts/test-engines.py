"""
Engine validation script for VoiceLaunch TTS.
Tests each TTS engine to ensure it produces valid audio output.
Run: python scripts/test-engines.py
"""

import sys
import time
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src" / "python"))

from model_manager import ModelManager

USER_DATA = Path.home() / "AppData/Roaming/VoiceLaunch"
MODELS_DIR = USER_DATA / "models"

TEST_TEXT = "Olá, mundo! Este é um teste de síntese de voz."


def test_engine(manager: ModelManager, model_id: str) -> dict:
    """Test a single TTS engine."""
    result = {
        "model": model_id,
        "available": False,
        "load_success": False,
        "synthesize_success": False,
        "duration_seconds": 0,
        "error": None,
    }

    engine = manager.get_engine(model_id)
    if engine is None:
        result["error"] = "Engine not found or model not downloaded"
        return result

    result["available"] = True

    try:
        t0 = time.time()
        audio_array, sample_rate = engine.synthesize(
            text=TEST_TEXT,
            voice_id=None,
            speed=1.0,
            language="pt",
        )
        t1 = time.time()

        result["synthesize_success"] = True
        result["duration_seconds"] = round(t1 - t0, 2)
        result["sample_rate"] = sample_rate
        result["audio_length_samples"] = len(audio_array)
        result["audio_duration"] = round(len(audio_array) / sample_rate, 2)

        # Save a test file for manual verification
        import soundfile as sf
        test_path = USER_DATA / f"test_{model_id}.wav"
        sf.write(test_path, audio_array, sample_rate)
        result["test_file"] = str(test_path)

    except Exception as e:
        result["error"] = str(e)

    return result


def main():
    print("=" * 60)
    print("VoiceLaunch TTS - Engine Validation")
    print("=" * 60)

    manager = ModelManager()
    models_to_test = ["piper", "kokoro", "bark", "xtts_v2", "melotts"]

    # Ensure model directories exist so engines can initialize
    # (some engines auto-download on first use)
    for model_id in models_to_test:
        model_dir = MODELS_DIR / model_id
        model_dir.mkdir(parents=True, exist_ok=True)

    results = []
    for model_id in models_to_test:
        print(f"\nTesting {model_id}...")
        result = test_engine(manager, model_id)
        results.append(result)

        if result["synthesize_success"]:
            print(f"  [OK] SUCCESS in {result['duration_seconds']}s")
            print(f"     Audio: {result['audio_duration']}s @ {result['sample_rate']}Hz")
            print(f"     File: {result.get('test_file', 'N/A')}")
        else:
            print(f"  [FAIL] FAILED: {result['error']}")

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    passed = sum(1 for r in results if r["synthesize_success"])
    print(f"Passed: {passed}/{len(results)}")

    for r in results:
        status = "[OK]" if r["synthesize_success"] else "[FAIL]"
        print(f"  {status} {r['model']}: {r.get('error', 'OK')}")

    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
