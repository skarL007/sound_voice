# Contribuindo com o VoiceLaunch TTS

Obrigado pelo interesse! VoiceLaunch TTS é uma ferramenta de comunicação
assistiva — contribuições que melhorem acessibilidade, confiabilidade e
sucesso no primeiro uso são especialmente bem-vindas.

## Plataforma

Este projeto é **somente Windows 10/11**. O sistema de build, o backend Python
e o instalador NSIS requerem Windows. Suporte a Mac e Linux está planejado
para uma versão futura.

---

## Formas de contribuir

- **Bug reports** — abra uma Issue usando o template de bug
- **Feature requests** — abra uma Issue usando o template de feature
- **Documentação** — README, docs/, comentários inline
- **Testes** — testes unitários vitest em `src/**/*.test.ts`
- **UI do renderer** — React/TypeScript em `src/renderer/`
- **Processo principal Electron** — `src/main/`
- **Backend Python** — `src/python/` (requer Python 3.10+)

---

## Configuração de desenvolvimento

### Pré-requisitos

- Windows 10 ou 11 (x64)
- Node.js 20 ou superior
- npm 10 ou superior
- Python 3.10 (apenas para trabalhar no backend ou buildar o instalador)
- Git

### Instalar e rodar

```sh
git clone https://github.com/skarL007/sound_voice.git
cd sound_voice
npm install
npm run dev
```

O comando `npm run dev` inicia o app Electron. O backend Python **não** inicia
automaticamente em modo dev a menos que o diretório `python_dist/` esteja
presente. Sem ele, o app usa vozes Edge TTS na nuvem, o que funciona para
a maior parte do desenvolvimento de UI.

### Buildar o backend Python (opcional)

Este passo requer Python 3.10+ e leva 5–15 minutos:

```bat
scripts\build-python.bat
```

Isso cria `python_dist\voicelaunch-backend\voicelaunch-backend.exe`.
O diretório é excluído do git (~200 MB).

### Rodar os testes

```sh
npm test
```

Todos os 95 testes devem passar antes de um PR ser mergeado.

### Buildar o instalador

```sh
npm run dist:win
```

Isso produz `dist/VoiceLaunch-TTS-Setup-1.0.0.exe`. Requer o diretório
`python_dist/` presente.

---

## Checklist do Pull Request

- [ ] `npm test` passa (95/95)
- [ ] `npm run build` sucede sem erros TypeScript
- [ ] Mudanças são limitadas a uma responsabilidade por PR
- [ ] Novo comportamento tem cobertura de teste quando praticável
- [ ] Acessibilidade preservada (navegação por teclado, foco visível,
      contraste WCAG AA)

---

## Estilo de código

- TypeScript strict mode (`tsconfig.json`)
- Tailwind CSS para estilos — sem `style` inline onde possível
- Zustand para estado — subscribe apenas aos fields que o componente usa
  (veja os selectors existentes como referência)
- IPC Electron — valide todas as entradas no handler do processo principal
  antes do uso

---

## Mensagens de commit

Use conventional commits:

```
feat: adicionar seletor de saída de áudio na página de configurações
fix: prevenir SSRF na cadeia de redirecionamentos do download manager
docs: atualizar guia de microfone virtual para PTT do VRChat
test: adicionar cobertura da sequência de playback do cloudAudio
```

---

## Problemas de segurança

**Não** abra Issues públicas para vulnerabilidades de segurança. Veja
[SECURITY.md](SECURITY.md) para o processo de disclosure responsável.
