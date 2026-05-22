# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting a Vulnerability

**Não abra uma Issue pública do GitHub para vulnerabilidades de segurança.**

Relate problemas de segurança por e-mail ao mantenedor ou use o sistema de
relatório privado do GitHub:
https://github.com/skarL007/sound_voice/security/advisories/new

Inclua:
- Descrição da vulnerabilidade
- Passos para reproduzir
- Impacto potencial
- Correção sugerida (opcional)

Você pode esperar uma confirmação em até 72 horas e um plano de correção ou
mitigação em até 14 dias para problemas críticos.

---

## Security Design

VoiceLaunch TTS foi projetado com as seguintes propriedades de segurança:

- **Sandbox habilitado**: o renderer do Electron executa com `sandbox: true` e
  `contextIsolation: true`. Sem acesso ao Node.js pelo renderer.
- **CSP aplicado**: Content Security Policy em `index.html` restringe fontes
  de script, fontes de mídia e alvos de conexão.
- **Proteção contra SSRF**: o download manager bloqueia URLs `http://` externas
  e limita cadeias de redirecionamento a 5 saltos.
- **Validação de entrada**: IDs de modelos, caminhos de arquivo e extensões de
  áudio são validados antes do uso. Verificação baseada em allowlist rejeita
  `.exe`, `.bat`, `.cmd`, `.ps1`, `.js`, `.sh`.
- **Local-first**: sem telemetria, sem analytics, nenhum dado sai da máquina
  durante a síntese TTS local.
- **Backend Python**: executa apenas em `127.0.0.1`. CORS restrito à origem
  do Electron.
- **Tokens efêmeros**: o token Sec-MS-GEC para Edge TTS é gerado localmente via
  SHA-256 e não é uma credencial persistente.
