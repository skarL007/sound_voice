"""
Security regression tests for the FastAPI backend.

Covers the v1.3.0 hardening: shared-secret token auth, install-deps model-id
validation, generic error bodies, and audio-path sanitization.
"""

import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

TEST_TOKEN = "test-secret-token"

# The token is read at import time, so it must be in the environment before
# `main` is imported (matches how the Electron main process injects it).
os.environ["VOICELAUNCH_BACKEND_TOKEN"] = TEST_TOKEN

from fastapi.testclient import TestClient  # noqa: E402

import main  # noqa: E402

client = TestClient(main.app)
AUTH = {"X-VoiceLaunch-Token": TEST_TOKEN}


class TestTokenAuth:
    def test_health_is_open(self):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    def test_request_without_token_is_rejected(self):
        response = client.get("/models")
        assert response.status_code == 401

    def test_request_with_wrong_token_is_rejected(self):
        response = client.get("/models", headers={"X-VoiceLaunch-Token": "wrong"})
        assert response.status_code == 401

    def test_request_with_token_is_accepted(self):
        response = client.get("/models", headers=AUTH)
        assert response.status_code == 200

    def test_post_endpoints_require_token(self):
        for path in ["/tts", "/play", "/stop", "/mic/route", "/models/install-deps"]:
            response = client.post(path, json={})
            assert response.status_code == 401, f"{path} must require the token"

    def test_websocket_without_token_is_rejected(self):
        from starlette.websockets import WebSocketDisconnect

        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("/ws/tts-stream"):
                pass


class TestInstallDepsValidation:
    def test_invalid_model_id_is_rejected(self):
        response = client.post(
            "/models/install-deps",
            json={"modelId": "piper; rm -rf /"},
            headers=AUTH,
        )
        assert response.status_code == 422

    def test_path_traversal_model_id_is_rejected(self):
        response = client.post(
            "/models/install-deps",
            json={"modelId": "../../etc/passwd"},
            headers=AUTH,
        )
        assert response.status_code == 422


class TestErrorBodies:
    def test_play_error_does_not_leak_exception_text(self):
        # Path passes pydantic validation only if inside allowed roots; use a
        # temp path that does not exist so playback itself fails.
        import tempfile

        missing = os.path.join(tempfile.gettempdir(), "voicelaunch-missing.wav")
        response = client.post("/play", json={"audioPath": missing}, headers=AUTH)
        assert response.status_code == 500
        body = response.json()
        assert body["error"] == "Playback failed"

    def test_play_rejects_path_outside_allowed_roots(self):
        response = client.post(
            "/play",
            json={"audioPath": "C:\\Windows\\System32\\drivers\\etc\\hosts"},
            headers=AUTH,
        )
        assert response.status_code == 422

    def test_tts_unknown_model_is_a_clean_400(self):
        response = client.post(
            "/tts",
            json={"text": "hello", "modelId": "nope"},
            headers=AUTH,
        )
        assert response.status_code == 400


class TestSanitizeAudioPath:
    def test_temp_dir_is_allowed(self):
        import tempfile

        p = os.path.join(tempfile.gettempdir(), "ok.wav")
        assert main._sanitize_audio_path(p)

    def test_user_data_is_allowed(self):
        p = str(main.USER_DATA / "voices" / "ok.wav")
        assert main._sanitize_audio_path(p)

    def test_outside_roots_raises(self):
        with pytest.raises(ValueError):
            main._sanitize_audio_path("C:\\Windows\\System32\\cmd.exe")

    def test_traversal_out_of_temp_raises(self):
        import tempfile

        p = os.path.join(tempfile.gettempdir(), "..", "..", "Windows", "x.wav")
        with pytest.raises(ValueError):
            main._sanitize_audio_path(p)

    def test_empty_path_raises(self):
        with pytest.raises(ValueError):
            main._sanitize_audio_path("")
