# AGENTS.md - Ilha Viva

## 1. Visão Geral do Jogo
- **Título**: Ilha Viva
- **Gênero / Estilo**: Aventura 2D em visão top-down / isométrica estilizada via Canvas.
- **Protagonista**: Lia, uma exploradora representada por um lobo-guará com mochila.
- **Inimigo / Perigo**: Um fantasma na forma de uma onça-pintada espectral patrulhando a névoa do bosque.
- **Cenário**: Praia e bosque ligados por uma ponte larga de madeira sobre o mar.
  - Lia deve permanecer sempre em terra firme (limites intransponíveis de água/obstáculos).
- **Inimigo / Perigo**:
  - Um **Guarda de Névoa** patrulha ativamente o bosque.
  - O contato direto com o guarda de névoa encerra a tentativa de resgate (derrota/recomeço).
- **Progressão**:
  - Coletar as 10 sementes libera a fase/mecânica de plantio para revitalizar a ilha.

---

## 3. Tecnologias e Arquitetura
- **Stack Técnico**: HTML5, CSS3, JavaScript puro (Vanilla JS) e HTML5 Canvas.
- **Restrição Estrita**: Sem uso de bibliotecas ou frameworks externos (zero dependências).
- **Responsividade e Display**: Adaptação responsiva ao tamanho da tela (layout fluido/escalável para desktop e dispositivos móveis).
- **Acessibilidade**:
  - Fornecer sinais visuais e textuais redundantes (não depender exclusivamente de cores ou sons para feedback de eventos, perigos ou sucesso).
  - Indicadores claros de foco e estado de seleção.

---

## 4. Controles e Usabilidade
- **Movimentação da Lia**:
  - Teclas `W`, `A`, `S`, `D`.
  - Setas direcionais do teclado.
  - Botões virtuais na tela para suporte a telas sensíveis ao toque (touch).
- **Ações e Atalhos**:
  - Tecla `P`: Pausa e retoma o jogo.
  - Tecla `Espaço`: Reservada para o escudo opcional.
- **Navegação por Teclado e Foco**:
  - Todos os botões interativos da interface devem ser plenamente operáveis via teclado (foco por `Tab`, ativação por `Enter`/`Espaço`).
  - Indicação visual evidente de qual botão está atualmente selecionado/em foco.

---

## 5. Diretrizes para Próximos Passos
- **Preservação**: Preservar tudo o que já estiver funcionando ao adicionar ou alterar mecânicas.
- **Testes e Verificação**: Testar rigorosamente qualquer mudança implementada antes de concluir o ciclo.
- **Estado Atual**: Decisões de design, escopo e requisitos arquiteturais devidamente registradas. Implementação do código ainda não iniciada.
