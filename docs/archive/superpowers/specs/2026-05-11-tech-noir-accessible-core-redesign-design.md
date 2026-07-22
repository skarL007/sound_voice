# Spec Visual - Core Redesign Tech Noir Acessivel

## Objetivo

Redesenhar o nucleo visual do VoiceLaunch TTS para deixa-lo mais elegante, bonito e gamer, sem perder legibilidade, foco operacional e acessibilidade para pessoas que usam comunicacao assistiva.

O redesign cobre apenas o nucleo do launcher:

- app shell
- Home
- TTS
- modo compacto

## Direcao Aprovada

- linguagem visual: `tech noir acessivel`
- tom: `noir acessivel`
- escopo: `shell + Home + TTS + compact mode`
- papel do compacto: `secundario, mas forte o suficiente para uso real`
- motion: `medio`

## Resultado Esperado

O launcher deve parecer um equipamento premium de comunicacao local, e nao um painel generico escuro. A experiencia precisa transmitir:

- confianca operacional
- identidade gamer madura
- foco em fala rapida
- leitura limpa mesmo em sessoes longas

## Sistema Visual

### Paleta

Base escura quente-fria, com contraste alto e acentos energicos controlados.

- `bg-0`: `#06090D`
- `bg-1`: `#0C1219`
- `bg-2`: `#111A24`
- `panel-0`: `#16212D`
- `panel-1`: `#1B2836`
- `line-soft`: `#243446`
- `line-strong`: `#33506B`
- `text-strong`: `#F3F7FB`
- `text-body`: `#C8D3DF`
- `text-soft`: `#8FA1B3`
- `signal-cyan`: `#49E6FF`
- `ember`: `#FF8A5B`
- `success`: `#61E4A3`
- `warning`: `#FFC15A`
- `danger`: `#FF6B7D`

### Uso de Cor

- `signal-cyan` e o acento primario para foco, ativo, speak pronto e realce funcional.
- `ember` e o acento secundario para CTA quentes, destaque de secoes e energia visual.
- `danger` aparece apenas em parada, erro e risco. Nao usar como decoracao.
- Nenhuma informacao critica pode depender apenas de cor.

### Tipografia

- headings: `Oxanium`
- body / inputs / dados operacionais: `Atkinson Hyperlegible Next`
- fallback: `system-ui, sans-serif`

Regras:

- titulos com peso forte e tracking levemente fechado
- corpo com leitura neutra e alta abertura
- numericos e labels operacionais com consistencia visual, sem exagero futurista

### Materiais e Superficies

- superfícies em camadas, com base fosca e reflexo discreto
- cards com leve translucidez controlada, sem glassmorphism pesado
- bordas finas frias, com glow sutil apenas em estados ativos
- fundo geral com gradiente escuro + textura leve de grade/noise muito baixa

### Forma

- raio dominante: `18px`
- raio interno de controles: `14px`
- pílulas de status: `999px`
- bordas retas demais devem ser evitadas; o produto precisa parecer intencional, nao utilitario cru

## Motion

Motion medio, funcional, sem excesso arcade.

- hover/focus: `180ms`
- transicoes de painel e CTA: `220ms`
- entrada de blocos principais: `240ms` com `opacity + translateY`
- brilho pulsante apenas em elementos de fala ativa ou pronto para falar

Guardrails:

- usar `transform` e `opacity`, nunca animar layout pesado
- respeitar `prefers-reduced-motion`
- animacoes nao podem competir com leitura ou com o fluxo de fala

## Guardrails de Acessibilidade

- contraste minimo `4.5:1` para texto normal
- foco visivel forte em todos os controles interativos
- alvos clicaveis com minimo de `44x44px`
- tamanho base de texto de conteudo: `16px`
- textarea e botoes primarios nao podem parecer decorativos; precisam comunicar funcao imediatamente
- high contrast e large font existentes continuam suportados e nao podem regredir
- estados `ready`, `speaking`, `error`, `muted` e `virtual mic` precisam combinar cor + iconografia + label

## Shell

### Estrutura

O shell vira um cockpit limpo.

- sidebar fixa com massa visual forte e acabamento premium
- area principal com fundo em camadas e leitura mais aberta
- title bar mais refinada, com controles menos "default app"

### Sidebar

- fundo mais escuro que o conteudo principal
- highlight ativo por trilho vertical luminoso + bloco de fundo
- icones e labels com hierarquia clara
- itens secundarios menos brilhantes para preservar foco na pagina atual

### Title Bar

- acabamento mais tecnico, com area de status compacta
- toggle de compacto e `always on top` precisam parecer controles de sistema, nao botoes comuns
- hover mais polido, com brilho frio curto

## Home

### Papel da Tela

A Home deve apresentar o launcher como uma estacao de voz local pronta para operacao.

### Layout

Desktop:

- coluna esquerda dominante para mensagem principal e acoes
- coluna direita para estado operacional e checklist

Narrow:

- empilhamento vertical
- hero primeiro
- checklist depois

### Hero

O bloco principal deve comunicar:

- voz local
- rapidez
- acessibilidade
- estado de prontidao

Conteudo visual:

- heading forte
- subtitulo curto e claro
- CTA principal para falar agora
- CTA secundario para modelos ou setup

### Operational Card

O painel lateral da Home deve parecer um painel de sistema:

- backend
- modelo pronto
- microfone virtual
- modo compacto

Cada item com label curta, estado e iconografia consistente.

### LocalSetupCard

O `LocalSetupCard` vira um "Launch Checklist":

- mais elegante
- mais compacto
- com progresso visual mais claro
- sem parecer card genérico de dashboard

## TTS

### Papel da Tela

TTS e o coracao do produto. A tela precisa otimizar composicao, repeticao e disparo rapido de fala.

### Estrutura

Desktop:

- faixa superior de estado
- area principal de composicao no centro
- coluna lateral para frases rapidas e recentes

Narrow:

- estado no topo
- composicao
- speak CTA
- frases rapidas
- recentes

### Faixa de Estado

Acima da composicao, incluir uma linha de estado premium com:

- modelo ativo
- virtual mic
- status de fala
- opcao de manter texto

Essa faixa precisa ser legivel em um golpe de vista.

### Console de Composicao

O textarea principal vira um console de comunicacao:

- superfice maior
- fundo levemente diferenciado do resto
- borda responsiva ao foco
- placeholder orientado a acao, no espirito de `Digite uma frase e fale imediatamente`
- area de acao integrada com `Falar` / `Parar`

O CTA principal de fala deve ser o ponto visual mais forte da tela.

### Frases Rapidas

As frases rapidas deixam de parecer chips simples e viram pads de comando:

- grid limpo
- area clicavel generosa
- hierarquia boa para labels maiores
- hover discreto
- estado de atalho e favorito visualmente claro

### Historico

O historico precisa parecer util e rapido:

- cards mais compactos
- foco em texto e acoes
- repetir e fixar visiveis sem poluicao
- ordem visual mais limpa entre item, hora e acao

## Modo Compacto

### Papel

O modo compacto continua secundario ao app completo, mas precisa ser forte o suficiente para comunicacao rapida em uso real.

### Estrutura

- faixa superior com estado essencial
- textarea dominante
- 4 frases rapidas visiveis
- 3 recentes visiveis
- CTA principal fixo e evidente

### Aparencia

- mais denso que o app cheio
- mesma linguagem `tech noir acessivel`
- menos ornamento
- legibilidade priorizada

### Comportamento

- pronto para ficar sempre visivel
- leitura clara em janelas pequenas
- botao principal sempre identificavel

## Responsividade

- desktop e a superficie principal
- compact mode e a segunda superficie critica
- layouts narrow do shell completo nao podem quebrar em larguras menores
- nenhum bloco essencial pode depender de largura fixa

## Implementacao Guiada

O redesign deve priorizar mudancas localizadas nos arquivos reais do nucleo:

- `src/renderer/src/index.css`
- `tailwind.config.js`
- `src/renderer/src/App.tsx`
- `src/renderer/src/pages/TTSPage.tsx`
- `src/renderer/src/components/LocalSetupCard.tsx`

Preferencia por:

- reforcar tokens visuais
- refinar composicao existente
- evitar criar um sistema paralelo desnecessario
- carregar fontes por asset local ou pacote, nunca por dependencia visual critica em CDN

## Fora de Escopo

- mudar arquitetura de navegacao
- introduzir novas features de produto
- expandir engines TTS
- redesenhar paginas secundarias fora do nucleo nesta rodada
- mexer no fluxo funcional de acessibilidade alem do necessario para sustentar o visual

## Criterios de Aceitacao Visuais

- o launcher parece um produto proprio e nao um template dark genérico
- o CTA de fala e visualmente dominante na TTS
- Home, TTS e compacto compartilham a mesma linguagem visual
- o modo compacto continua utilizavel em janela pequena
- high contrast e large font permanecem funcionais
- o visual gamer existe, mas sem comprometer leitura, contraste ou fadiga

## Proximo Gate

Depois da aprovacao desta spec, o proximo passo e escrever um plano tecnico de implementacao antes de editar o launcher.
