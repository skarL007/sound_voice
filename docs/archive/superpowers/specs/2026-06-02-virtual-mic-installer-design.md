# Spec - Instalacao Simples do Microfone Virtual

## Objetivo

Adicionar ao VoiceLaunch TTS um fluxo simples, claro e acessivel para instalar o microfone virtual pelo proprio launcher usando o instalador VB-Cable embutido no pacote.

O resultado deve permitir que uma pessoa sem familiaridade tecnica entenda tres coisas:

- se o microfone virtual ja esta disponivel;
- como iniciar a instalacao quando ele esta ausente;
- o que fazer depois que o instalador externo abrir.

## Direcao Aprovada

Opcao aprovada: o launcher abre o instalador VB-Cable embutido e guia a verificacao depois da instalacao.

O launcher nao tenta prometer instalacao silenciosa nem controlar completamente o driver. O VB-Cable continua sendo instalado pelo instalador oficial, com permissao de administrador e reinicio quando necessario.

## Contexto Atual

O projeto ja tem a base tecnica para esse fluxo:

- `src/main/ipc-handlers.ts` expoe `mic:install-vb-cable`;
- `src/preload/index.ts` expoe `installVBCable()`;
- `src/main/app-config.ts` procura `VBCABLE_Setup.exe` em recursos empacotados;
- `electron-builder.yml` inclui `assets/vbcable/` como `extraResources`;
- `src/renderer/src/pages/SettingsPage.tsx` mostra status basico do VB-Cable;
- `src/renderer/src/pages/TTSPage.tsx` tem o botao de ativar microfone virtual.

A lacuna principal e de experiencia: a instalacao existe, mas fica escondida em Ajustes e nao acompanha claramente o usuario ate o estado "detectado".

## UX Principal

### Estado Ausente

Quando o VB-Cable nao for detectado, a tela Falar deve mostrar uma acao direta no lugar mais natural do fluxo:

- botao principal: `Instalar microfone virtual`;
- texto curto de apoio: `Necessario para Discord, Zoom e jogos ouvirem a voz como microfone.`;
- icone de microfone ou ferramenta, usando `lucide-react`.

O botao deve chamar `window.electronAPI.installVBCable()`.

### Estado Instalador Aberto

Depois que o IPC retornar `success: true` e `launched: true`, a UI deve mostrar um painel de acompanhamento:

- titulo: `Instalador aberto`;
- mensagem: `Siga o instalador do VB-Cable. Se ele pedir, reinicie o Windows e volte aqui.`;
- acao primaria: `Verificar instalacao`;
- acao secundaria: `Abrir Ajustes`.

Esse estado nao deve bloquear o uso do resto do app. A pessoa pode continuar usando voz local/online enquanto decide instalar.

### Estado Sem Instalador Embutido

Se `installVBCable()` retornar `launched: false`, o launcher deve explicar que o instalador nao esta no pacote atual e que o site oficial foi aberto.

Texto recomendado:

`Este pacote nao trouxe o instalador embutido. Baixe o VB-Cable pelo site oficial e volte para verificar.`

Tambem deve haver botao `Verificar instalacao`.

### Estado Detectado

Quando a verificacao encontrar um dispositivo com nome contendo `cable`, a UI deve mostrar:

- status `VB-Cable detectado`;
- orientacao curta: `No Discord, Zoom ou jogo, selecione CABLE Output como microfone.`;
- botao normal `Ativar microfone virtual`.

## Ajustes

A secao `Ajustes > Microfone Virtual` continua sendo o lugar detalhado do recurso, mas deve ficar mais objetiva:

- status no topo: ausente, instalador aberto ou detectado;
- botao `Instalar microfone virtual` quando ausente;
- botao `Verificar instalacao` sempre visivel quando ausente ou apos abrir instalador;
- lista de dispositivos continua em `details`, para diagnostico;
- `AudioOutputPicker` continua abaixo, para escolher `CABLE Input` quando o fluxo de voz online usa saida do navegador.

## Deteccao

A deteccao deve continuar usando `window.electronAPI.listAudioDevices()` para consultar o backend Python.

A regra inicial de deteccao permanece simples:

```ts
devices.some((device) => device.name.toLowerCase().includes('cable'))
```

O fluxo deve expor uma funcao local de refresh na UI, evitando depender de reiniciar o app imediatamente. Se a instalacao exigir reinicio, o texto deve dizer isso explicitamente.

## Empacotamento

O instalador esperado e:

```text
assets/vbcable/VBCABLE_Setup.exe
```

No build final, o `electron-builder.yml` copia essa pasta para:

```text
resources/vbcable/
```

O app deve continuar aceitando os candidatos existentes em `getBundledVBCableInstallerCandidates()`.

Nao faz parte deste escopo baixar automaticamente o instalador pela internet.

## Licenca e Origem

O produto deve identificar claramente que o driver e o VB-Cable da VB-Audio, donationware, e que o instalador vem do pacote oficial.

Textos curtos devem mencionar:

- origem: `VB-Cable da VB-Audio`;
- uso: `donationware`;
- link oficial: `https://vb-audio.com/Cable/`.

Isso e importante porque a distribuicao embutida e permitida quando o modelo donationware permanece visivel para o usuario.

## Erros

Falhas devem ser simples e acionaveis:

- se o backend nao listar dispositivos: `Nao consegui verificar os dispositivos agora. Reinicie o backend ou tente novamente.`;
- se o instalador nao abrir: `Nao foi possivel abrir o instalador. Use o site oficial ou verifique se o arquivo esta no pacote.`;
- se o dispositivo continuar ausente depois da instalacao: `Se o instalador terminou, reinicie o Windows e clique em Verificar instalacao.`;
- se o VB-Cable ja estiver instalado mas nao selecionado no app de destino: `Selecione CABLE Output como microfone no Discord, Zoom ou jogo.`

## Testes

Cobertura esperada:

- teste de helper/estado para detectar VB-Cable por lista de dispositivos;
- teste de UI para estado ausente e chamada de `installVBCable()`;
- teste de UI para retorno `launched: true`;
- teste de UI para retorno `launched: false`;
- teste de UI para refresh que muda de ausente para detectado;
- teste de regressao para manter o botao `Ativar microfone virtual` quando detectado.

## Fora de Escopo

- instalacao silenciosa do driver;
- download automatico do site da VB-Audio;
- suporte a outros cabos virtuais alem do VB-Cable padrao;
- configuracao automatica do Discord, Zoom ou jogos;
- mudar o roteamento Python/local alem do que ja existe.

