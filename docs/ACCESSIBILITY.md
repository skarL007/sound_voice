# Acessibilidade - VoiceLaunch TTS

## Missao

O VoiceLaunch TTS foi projetado para pessoas que usam comunicacao assistiva, pessoas nao falantes e qualquer usuario que precise transformar texto em voz com mais rapidez, autonomia e privacidade. O foco do produto e oferecer uma ferramenta gratuita, local e pratica para comunicacao por voz sintetizada.

## Recursos de Acessibilidade

### Navegacao por Teclado
- **Tab**: Navegar entre elementos
- **Enter/Space**: Ativar botoes e controles
- **Esc**: Fechar modais e janelas flutuantes
- **Shift+Tab**: Navegar para tras

### Atalhos Globais
- **Ctrl+Shift+F**: Focar a janela e o campo principal de fala
- **Ctrl+Shift+S**: Parar o audio imediatamente
- **Ctrl+Shift+V**: Abrir o comunicador compacto e focar a entrada de texto
- **Ctrl+Shift+1 a 9**: Falar as 9 primeiras frases rapidas salvas
- **Ctrl+Shift+M**: Ativar ou desativar o microfone virtual

### Interface
- **Alto contraste**: Cores com contraste WCAG AA
- **Tamanhos de fonte grandes**: Legivel em telas de alta resolucao
- **Foco visivel**: Indicadores de foco claros para navegacao por teclado
- **Modo escuro**: Interface escura para reduzir fadiga visual

### Modo de Uso
- **Janela flutuante**: Sempre no topo para acesso rapido
- **Teclado virtual**: Entrada de texto sem teclado fisico
- **Frases rapidas personalizaveis**: Salve frases frequentes e ajuste ao seu vocabulario
- **Historico persistente**: Reutilize frases anteriores mesmo apos fechar o app
- **Rascunho persistente**: O texto atual pode continuar disponivel entre sessoes
- **Modo compacto com recentes**: Acesso rapido a texto, frases salvas e frases recentes

## Requisitos de Hardware Acessiveis

| Configuracao | Modelos Disponiveis | Desempenho |
|-------------|-------------------|------------|
| PC basico (CPU, 4GB RAM) | Piper | Fluxo principal mais seguro |
| Laptop medio (8GB RAM) | Piper, Kokoro | Boa experiencia no MVP local |
| Desktop com NVIDIA/CUDA validado | Piper, Kokoro, XTTS v2 | Recurso avancado liberado depois da primeira fala |
| AMD no Windows | Piper, Kokoro | Fluxo garantido do MVP atual |

## Uso com Recursos de Comunicacao Assistiva

O VoiceLaunch TTS ja atende melhor estes formatos de uso:
- **Teclado fisico**: Digitacao direta + atalhos globais
- **Teclado virtual na tela**: Entrada assistida sem teclado fisico
- **Janela compacta sempre no topo**: Comunicacao rapida em chamadas, jogos e conversas

Tambem pode ser integrado com:
- **Eye trackers**: Selecao de frases por olhar
- **Switches**: Controle por botao unico
- **Tablets touch**: Interface otimizada para toque

## Cenarios reais priorizados

- **Responder rapido com sim/nao** sem reescrever a frase toda
- **Pedir ajuda** com um atalho global ou frase salva
- **Repetir uma frase frequente** a partir do historico persistente
- **Usar a voz como microfone virtual** em Discord, Zoom, jogos e chamadas
- **Recuperar o texto apos erro ou interrupcao**, sem perder a mensagem

## Privacidade

- **100% offline**: Nenhum dado de voz sai do computador
- **Vozes locais**: Clonagem e sintese acontecem no hardware do usuario
- **Sem conta**: Nao requer cadastro ou conexao com a internet
