"""Hardware detection for Windows with AMD and NVIDIA GPU support."""

import os
import platform
import subprocess
import psutil


def get_hardware_info():
    """Detect PC hardware specs including GPU vendor (NVIDIA/AMD/Intel)."""
    cpu_info = platform.processor() or "Unknown"
    cpu_count = psutil.cpu_count(logical=False) or 1
    cpu_threads = psutil.cpu_count(logical=True) or 1
    ram_bytes = psutil.virtual_memory().total
    ram_gb = round(ram_bytes / (1024**3))

    gpu = "Unknown"
    gpu_vram = 0
    gpu_vendor = "unknown"
    cuda_available = False
    cuda_version = ""
    rocm_available = False
    rocm_version = ""
    directml_available = False

    # Windows GPU detection via PowerShell (wmic /format:csv is broken on modern Windows)
    if platform.system() == "Windows":
        try:
            output = subprocess.check_output(
                ['powershell', '-NoProfile', '-Command',
                 'Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM | ConvertTo-Csv -NoTypeInformation'],
                text=True,
                stderr=subprocess.DEVNULL
            )
            lines = [l.strip() for l in output.split("\n") if l.strip() and not l.startswith('"Name"')]
            if lines:
                parts = lines[0].split(",")
                parts = [p.strip().strip('"') for p in parts]
                if len(parts) >= 2:
                    gpu = parts[0]
                    vram_str = parts[1]
                    try:
                        gpu_vram = int(vram_str)
                    except ValueError:
                        gpu_vram = 0

                # Detect vendor from GPU name
                gpu_lower = gpu.lower()
                if "nvidia" in gpu_lower or "geforce" in gpu_lower or "rtx" in gpu_lower or "gtx" in gpu_lower:
                    gpu_vendor = "nvidia"
                elif "amd" in gpu_lower or "radeon" in gpu_lower:
                    gpu_vendor = "amd"
                elif "intel" in gpu_lower:
                    gpu_vendor = "intel"
        except Exception:
            pass

    # CUDA check (NVIDIA)
    if gpu_vendor == "nvidia" or gpu_vendor == "unknown":
        try:
            nvcc_output = subprocess.check_output(["nvcc", "--version"], text=True, stderr=subprocess.DEVNULL)
            for line in nvcc_output.split("\n"):
                if "release" in line:
                    parts = line.split("release")
                    if len(parts) > 1:
                        cuda_version = parts[1].split(",")[0].strip()
                        cuda_available = True
                        break
        except (subprocess.CalledProcessError, FileNotFoundError):
            try:
                subprocess.check_output(["nvidia-smi"], stderr=subprocess.DEVNULL)
                cuda_available = True
            except (subprocess.CalledProcessError, FileNotFoundError):
                pass

    # ROCm check (AMD on Linux)
    if gpu_vendor == "amd" or gpu_vendor == "unknown":
        try:
            rocm_output = subprocess.check_output(["rocm-smi", "--showproductname"], text=True, stderr=subprocess.DEVNULL)
            if rocm_output:
                rocm_available = True
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass
        try:
            hip_output = subprocess.check_output(["hipcc", "--version"], text=True, stderr=subprocess.DEVNULL)
            if hip_output:
                rocm_available = True
                for line in hip_output.split("\n"):
                    if "HIP version" in line:
                        rocm_version = line.split(":")[-1].strip()
                        break
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass

    # DirectML check (AMD/Intel on Windows)
    if platform.system() == "Windows":
        try:
            import torch_directml
            directml_available = True
            gpu_vendor = gpu_vendor if gpu_vendor != "unknown" else "amd_or_intel"
        except ImportError:
            pass

    # OS info
    os_name = platform.system()
    os_version = platform.version()
    try:
        if os_name == "Windows":
            caption = subprocess.check_output(
                ["wmic", "os", "get", "Caption", "/value"],
                text=True,
                stderr=subprocess.DEVNULL
            )
            for line in caption.split("\n"):
                if line.startswith("Caption="):
                    os_version = line.split("=", 1)[1].strip()
                    break
    except Exception:
        pass

    tier = _compute_tier(ram_gb, gpu_vram, cuda_available, rocm_available, directml_available)

    return {
        "cpu": cpu_info,
        "cpuCores": cpu_count,
        "cpuThreads": cpu_threads,
        "ramGB": ram_gb,
        "gpu": gpu,
        "gpuVRAM": gpu_vram,
        "gpuVendor": gpu_vendor,
        "os": os_name,
        "osVersion": os_version,
        "isCudaAvailable": cuda_available,
        "cudaVersion": cuda_version,
        "isRocmAvailable": rocm_available,
        "rocmVersion": rocm_version,
        "isDirectMLAvailable": directml_available,
        "recommendedTier": tier,
    }


def _compute_tier(ram_gb, gpu_vram_bytes, has_cuda, has_rocm, has_directml):
    has_gpu_accel = has_cuda or has_rocm or has_directml
    if not has_gpu_accel or gpu_vram_bytes == 0:
        if ram_gb < 4:
            return "edge"
        return "cpu"
    # wmic returns VRAM in bytes
    vram_gb = gpu_vram_bytes / (1024**3)
    if vram_gb < 4:
        return "entry"
    if vram_gb < 8:
        return "mid"
    if vram_gb < 16:
        return "high"
    return "enthusiast"
