# Voice Cloning — User Guide

## What Is Voice Cloning?

Voice cloning lets the system learn the characteristics of a voice from a short audio clip (6–30 seconds) and then synthesize new phrases using that same voice.

## Models That Support Cloning

| Model | Reference Length | Processing Time | License |
|--------|-------------------|----------------------|---------|
| **XTTS v2** | 6 seconds | 2–4 seconds | CPML (non-commercial) |
| **Fish Speech** | 10–30 seconds | 3–5 seconds | Apache 2.0 (commercial OK) |

## Step by Step in the Launcher

### 1. Record or Import Audio
- **Record**: Use your computer's microphone in a quiet environment
- **Import**: Drag a WAV, MP3, or OGG file (minimum 6s, maximum 60s)

### 2. Validate the Audio
The system automatically checks:
- Duration (3–60 seconds)
- Noise level (SNR)
- Sample rate

### 3. Configure
- Choose the cloning model
- Give the voice a name (e.g. "My Voice", "John's Voice")
- Add an optional description

### 4. Process
Click "Start Cloning". The system extracts the voice characteristics and saves the embedding.

### 5. Use
The cloned voice appears in the "Speak" tab as an available voice option.

## Tips for Best Results

1. **Quiet environment**: Avoid background noise, fans, etc.
2. **Consistent distance**: Keep the microphone about 15cm from your mouth
3. **Natural speech**: Read a text in a conversational tone
4. **Avoid excessive sibilance**: Don't speak too close to the microphone
5. **Ideal length**: 10–15 seconds is the sweet spot for XTTS v2

## Sample Recording Text

> "Hello, my name is [your name]. I'm recording this voice sample to use in a speech assistant. Artificial intelligence technology can help many people communicate better."

## Limitations

- **XTTS v2**: Non-commercial use without a separate license
- **Fish Speech**: Quality may vary with very strong accents
- Both require a GPU with at least 4 GB of VRAM
- Very whispered or shouted voices tend to clone with less fidelity
