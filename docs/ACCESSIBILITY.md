# Acessibilidade — VoiceLaunch TTS

## Missão

O VoiceLaunch TTS foi projetado primariamente para **pessoas com deficiência na fala e mudas**, oferecendo uma ferramenta gratuita, offline e de alta qualidade para comunicação por voz sintetizada.

## Recursos de Acessibilidade

### Navegação por Teclado
- **Tab**: Navegar entre elementos
- **Enter/Space**: Ativar botões e controles
- **Esc**: Fechar modais e janelas flutuantes
- **Shift+Tab**: Navegar para trás

### Atalhos Globais
- **Ctrl+Shift+F**: Focar a janela e o campo principal de fala
- **Ctrl+Shift+S**: Parar o áudio imediatamente
- **Ctrl+Shift+V**: Abrir o comunicador compacto e focar a entrada de texto
- **Ctrl+Shift+1 a 9**: Falar as 9 primeiras frases rápidas salvas
- **Ctrl+Shift+M**: Ativar ou desativar o microfone virtual

### Interface
- **Alto contraste**: Cores com contraste WCAG AA
- **Tamanhos de fonte grandes**: Legível em telas de alta resolução
- **Foco visível**: Indicadores de foco claros para navegação por teclado
- **Modo escuro**: Interface escura para reduzir fadiga visual

### Modo de Uso
- **Janela flutuante**: Sempre no topo para acesso rápido
- **Teclado virtual**: Entrada de texto sem teclado físico
- **Frases rápidas personalizáveis**: Salve frases frequentes e ajuste ao seu vocabulário
- **Histórico persistente**: Reutilize frases anteriores mesmo após fechar o app
- **Rascunho persistente**: O texto atual pode continuar disponível entre sessões
- **Modo compacto com recentes**: Acesso rápido a texto, frases salvas e frases recentes

## Requisitos de Hardware Acessíveis

| Configuração | Modelos Disponíveis | Desempenho |
|-------------|-------------------|------------|
| PC básico (CPU, 4GB RAM) | Piper | Fluxo principal mais seguro |
| Laptop médio (8GB RAM) | Piper, Kokoro | Boa experiência no MVP local |
| Desktop com NVIDIA/CUDA validado | Piper, Kokoro, XTTS v2 | Recurso avançado liberado depois da primeira fala |
| AMD no Windows | Piper, Kokoro | Fluxo garantido do MVP atual |

## Uso com Dispositivos de Comunicação Assistiva

O VoiceLaunch TTS já atende melhor estes formatos de uso:
- **Teclado físico**: Digitação direta + atalhos globais
- **Teclado virtual na tela**: Entrada assistida sem teclado físico
- **Janela compacta sempre no topo**: Comunicação rápida em chamadas, jogos e conversas

Também pode ser integrado com:
- **Eye trackers**: Seleção de frases por olhar
- **Switches**: Controle por botão único
- **Tablets touch**: Interface otimizada para toque

## Cenários reais priorizados

- **Responder rápido com sim/não** sem reescrever a frase toda
- **Pedir ajuda** com um atalho global ou frase salva
- **Repetir uma frase frequente** a partir do histórico persistente
- **Usar a voz como microfone virtual** em Discord, Zoom, jogos e chamadas
- **Recuperar o texto após erro ou interrupção**, sem perder a mensagem

## Privacidade

- **100% offline**: Nenhum dado de voz sai do computador
- **Vozes locais**: Clonagem e síntese acontecem no hardware do usuário
- **Sem conta**: Não requer cadastro ou conexão com a internet
