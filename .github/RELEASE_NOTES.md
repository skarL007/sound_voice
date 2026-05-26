## VoiceLaunch TTS v1.1.0

Atualização de qualidade com novas funcionalidades, auditoria completa de UX/acessibilidade e cobertura de testes ampliada.

### Novidades

- **Exportar histórico como CSV** — botão "Exportar CSV" no painel TTS salva todas as frases com timestamp UTC, voz e texto no padrão RFC 4180
- **Feedback visual de atalhos** — ao disparar um atalho via hotkey, o card pisca com brilho roxo por 2 s na página de Atalhos
- **Onboarding não-bloqueante** — tutorial migrado de modal overlay para painel lateral deslizante; você pode usar o app enquanto lê
- **Escala tipográfica semântica** — 8 novos tokens Tailwind (`text-caption` → `text-hero`) para consistência visual
- **Botão "Rever tutorial"** em Configurações
- **Estado vazio de frases rápidas** com instrução e ícone explicativo
- **Feedback Gerando…/Parar** no botão Falar (3 estados visuais + `aria-busy`)

### Correções

- Race condition (TOCTOU) em operações de sistema de arquivos
- HTML stripped de notificações nativas antes de truncar
- 4 console.log de debug removidos de `cloudAudio.ts`
- Semântica de abas (`role="tablist/tab"`, `aria-selected`) em LogsPage — WCAG 2.1 AA

### Performance

- `useShallow` selector em TTSPage — re-render apenas nos 10 campos usados
- `Set.add()` / `Set.delete()` O(1) no toastStore — sem alocação de array a cada mutação

### Testes

- **110 testes unitários** (eram 95) — alertConfig, toastStore com fake timers, historyExport com TDD

### Instalação

1. Baixe `VoiceLaunch-TTS-Setup-1.1.0.exe`
2. Execute o instalador. Clique em **Mais informações → Executar assim mesmo** no aviso do SmartScreen (build sem assinatura de código).
3. O VB-Audio Virtual Cable está incluído e será instalado automaticamente se necessário.

### Checksum SHA-256

```
29FE2514DC6F55291EE2927A32985FBB2CEF0CA91BE5C32A10E6C3BF59FE8489
```

Verifique com PowerShell antes de instalar:

```powershell
(Get-FileHash VoiceLaunch-TTS-Setup-1.1.0.exe -Algorithm SHA256).Hash
```

### Atualização a partir de v1.0.0

Feche o app, execute o instalador da v1.1.0 sobre a instalação existente.
Configurações, frases rápidas e histórico são preservados automaticamente.

### Limitações conhecidas

- Somente Windows 10/11 x64
- Instalador sem assinatura de código — aviso do SmartScreen é esperado
- Auto-update desabilitado (planejado para v1.2)
- Clonagem de voz com XTTS v2 requer GPU NVIDIA com CUDA

### Changelog completo

Veja [CHANGELOG.md](https://github.com/skarL007/sound_voice/blob/main/CHANGELOG.md)
para o histórico completo.
