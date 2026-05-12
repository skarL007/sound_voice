# Clonagem de Voz — Guia do Usuário

## O que é Clonagem de Voz?

A clonagem de voz permite que o sistema aprenda a característica de uma voz a partir de um pequeno trecho de áudio (6–30 segundos) e depois sintetize novas frases usando essa mesma voz.

## Modelos que Suportam Clonagem

| Modelo | Tempo de Referência | Tempo de Processamento | Licença |
|--------|-------------------|----------------------|---------|
| **XTTS v2** | 6 segundos | 2–4 segundos | CPML (não comercial) |
| **Fish Speech** | 10–30 segundos | 3–5 segundos | Apache 2.0 (comercial OK) |

## Passo a Passo no Launcher

### 1. Gravar ou Importar Áudio
- **Gravar**: Use o microfone do seu computador em um ambiente silencioso
- **Importar**: Arraste um arquivo WAV, MP3 ou OGG (mínimo 6s, máximo 60s)

### 2. Validar o Áudio
O sistema verifica automaticamente:
- Duração (3–60 segundos)
- Nível de ruído (SNR)
- Taxa de amostragem

### 3. Configurar
- Escolha o modelo de clonagem
- Dê um nome à voz (ex: "Minha Voz", "Voz do João")
- Adicione uma descrição opcional

### 4. Processar
Clique em "Iniciar Clonagem". O sistema extrairá as características da voz e salvará o embedding.

### 5. Usar
A voz clonada aparecerá na aba "Falar" como opção de voz disponível.

## Dicas para Melhor Resultado

1. **Ambiente silencioso**: Evite ruído de fundo, ventiladores, etc.
2. **Distância consistente**: Mantenha o microfone a ~15cm da boca
3. **Fala natural**: Leia um texto em tom conversacional
4. **Evite sibilância excessiva**: Não fale muito próximo ao microfone
5. **Duração ideal**: 10–15 segundos é o ponto ideal para XTTS v2

## Exemplo de Texto para Gravação

> "Olá, meu nome é [seu nome]. Estou gravando esta amostra de voz para usar em um assistente de fala. A tecnologia de inteligência artificial pode ajudar muitas pessoas a se comunicarem melhor."

## Limitações

- **XTTS v2**: Uso não comercial sem licença separada
- **Fish Speech**: Qualidade pode variar com sotaques muito fortes
- Ambos requerem GPU com pelo menos 4 GB de VRAM
- Vozes muito sussurradas ou gritadas tendem a clonar com menos fidelidade
