import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from security_validators import validate_voice_id


class ValidateVoiceIdTests(unittest.TestCase):
    def test_accepts_valid_voice_id(self):
        self.assertEqual(validate_voice_id("xtts_v2_ab12cd34"), "xtts_v2_ab12cd34")

    def test_rejects_parent_traversal(self):
        with self.assertRaisesRegex(ValueError, "Invalid voiceId"):
            validate_voice_id("../x")

    def test_rejects_path_separator(self):
        with self.assertRaisesRegex(ValueError, "Invalid voiceId"):
            validate_voice_id("x/y")

    def test_rejects_empty_value(self):
        with self.assertRaisesRegex(ValueError, "Invalid voiceId"):
            validate_voice_id("")


if __name__ == "__main__":
    unittest.main()
