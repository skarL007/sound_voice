"""
Analyze PyInstaller bundle size and identify largest contributors.
Run after build: python scripts/analyze-bundle-size.py
"""

import os
from pathlib import Path
from collections import defaultdict

BUNDLE_DIR = Path(__file__).parent.parent / "python_dist" / "voicelaunch-backend"


def human_size(size_bytes):
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


def analyze():
    if not BUNDLE_DIR.exists():
        print(f"Bundle not found at {BUNDLE_DIR}")
        print("Run 'scripts/build-python.bat' first.")
        return

    total_size = 0
    package_sizes = defaultdict(int)
    file_counts = defaultdict(int)

    for root, dirs, files in os.walk(BUNDLE_DIR):
        for file in files:
            path = Path(root) / file
            size = path.stat().st_size
            total_size += size

            # Identify package (top-level directory in bundle)
            rel = path.relative_to(BUNDLE_DIR)
            top = rel.parts[0] if rel.parts else "root"
            package_sizes[top] += size
            file_counts[top] += 1

    print("=" * 60)
    print("VoiceLaunch TTS - Bundle Size Analysis")
    print("=" * 60)
    print(f"Total: {human_size(total_size)}")
    print()

    print("Top packages by size:")
    sorted_pkgs = sorted(package_sizes.items(), key=lambda x: x[1], reverse=True)
    for pkg, size in sorted_pkgs[:20]:
        pct = size / total_size * 100
        print(f"  {pkg:30s} {human_size(size):>10s}  ({pct:5.1f}%)  {file_counts[pkg]} files")

    print()
    print("Recommendations:")
    print("  - Remove unused packages (matplotlib, pygame, tkinter, etc.)")
    print("  - Delete __pycache__, tests/, docs/ from bundled libs")
    print("  - Use UPX compression if available")
    print("  - Consider download-on-demand for large models")


if __name__ == "__main__":
    analyze()
