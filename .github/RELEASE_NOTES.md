## VoiceLaunch TTS ${{ github.ref_name }}

Lançamento estável do VoiceLaunch TTS — launcher open-source local de
text-to-speech para comunicação assistiva no Windows 10/11.

### O que está incluído

- **Edge TTS** (nuvem): ~400 vozes Microsoft, funciona imediatamente sem downloads
- **Piper TTS** (local, CPU): rápido e leve, funciona em qualquer PC Windows
- **Kokoro TTS** (local, CPU): voz local de maior qualidade, ~300 MB de download
- **Integração VB-Cable**: roteie a voz sintetizada para Discord, Zoom e jogos
  como microfone virtual
- **Comunicador compacto**: janela sempre no topo com frases rápidas e atalhos
  globais (Ctrl+Shift+1–9)
- **Soundboard de atalhos de voz**: 31 slots de hotkey com voz e velocidade por atalho
- **Onboarding hardware-aware**: passos de configuração adaptados ao seu GPU
  (NVIDIA/AMD/Intel/CPU)
- **Navegação completa por teclado** e design acessível (contraste WCAG AA,
  foco visível, suporte a reduced-motion)
- **95 testes unitários** passando

### Instalação

1. Baixe `VoiceLaunch-TTS-Setup-VERSION.exe`
2. Execute o instalador. O Windows SmartScreen vai avisar "O Windows protegeu
   seu PC" porque este build não está com assinatura de código. Clique em
   **Mais informações → Executar assim mesmo**.
3. O VB-Audio Virtual Cable está incluído e será instalado automaticamente
   se não estiver presente. Um reinício pode ser necessário após a instalação
   do VB-Cable.
4. No primeiro início, o onboarding vai guiá-lo pela escolha de uma voz e
   configuração do microfone virtual.

### Checksum SHA-256

```
PREENCHER_ANTES_DE_PUBLICAR
```

### Limitações conhecidas

- Somente Windows 10/11 x64 (Mac/Linux planejado para v1.1)
- Instalador sem assinatura de código — aviso do SmartScreen é esperado
- Auto-update desabilitado nesta versão (planejado para v1.1)
- Clonagem de voz com XTTS v2 requer GPU NVIDIA com CUDA

### Changelog completo

Veja [CHANGELOG.md](https://github.com/skarL007/sound_voice/blob/main/CHANGELOG.md)
para o histórico completo.
