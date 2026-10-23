# AGENTS.md - Ilha Viva

## 1. Visão Geral do Jogo
- **Título**: Ilha Viva
- **Gênero / Estilo**: Aventura 2D em visão top-down / isométrica estilizada via Canvas.
- **Protagonista**: Lia, uma exploradora representada por um lobo-guará com mochila.
- **Inimigo / Perigo**: Um fantasma na forma de uma onça-pintada espectral patrulhando a névoa do bosque.
- **Cenário**: **Cerrado** (ao sul) e **Área de Mata Nativa** (ao norte) ligados por uma ponte larga de madeira sobre o rio com vitórias-régias.
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
  - Tecla `M`: Alterna Silenciar / Ativar áudio.
  - Tecla `E`: Realiza ação de plantio nos canteiros.
  - Tecla `Espaço`: Reservada para o escudo opcional.
- **Navegação por Teclado e Foco**:
  - Todos os botões interativos da interface devem ser plenamente operáveis via teclado (foco por `Tab`, ativação por `Enter`/`Espaço`).
  - Indicação visual evidente de qual botão está atualmente selecionado/em foco.

---

## 5. Diretrizes para Próximos Passos
- **Preservação**: Preservar tudo o que já estiver funcionando ao adicionar ou alterar mecânicas.
- **Testes e Verificação**: Testar rigorosamente qualquer mudança implementada antes de concluir o ciclo.
- **Estado Atual**:
  - Fase de Resgate (10 sementes com Lobo-Guará Lia e Onça-Pintada Espectral de guarda) totalmente implementada e preservada.
  - Ilha inicia em estado devastado (vegetação queimada, árvores sem folhas).
  - Vitória libera a etapa pacífica de Plantio com 10 sementes na reserva e 14 canteiros livres.
  - Ação de plantio por tecla `E`, clique ou toque gasta 1 semente por ação e gera um broto.
  - Revitalização gradual do cenário a cada plantio (copas das árvores, cores vivas, borboletas e pássaros).
  - Conclusão ("Sua ilha está voltando à vida") e reinício completo testados com 100% de sucesso.
  - Sistema de Áudio Procedural (Web Audio API) com 3 sons distintos (coleta, derrota, conclusão dos plantios) e loop atmosférico de floresta (vento dinâmico, pássaros e harmonia suave).
  - Botão Silenciar (e tecla `M`) com persistência ao reiniciar, suspensão instantânea na pausa e ausência de acúmulo de sons na retomada.
  - Sinais visuais 100% preservados, garantindo plena jogabilidade e acessibilidade com áudio ativado ou desativado.
  - Sistema de 20 Sementes e Pontuação: 10 sementes comuns (1 pt, fora da patrulha) e 10 sementes raras (3 pts, próximas da patrulha); coletar 10 encerra o resgate. Títulos de vitória: "Guardião da ilha" (≥ 20 pts) e "Recuperação básica" (< 20 pts).
  - Segundo Guardião Celeste: patrulha contínua em ciclo pelas sementes raras na mesma velocidade da Lia (105 px/s).
  - Sistema de Escudo Protetor: 3 unidades por tentativa, ativado por tecla `Espaço` ou botão/toque `Escudo`, duração de 3 segundos com barreira visual e rótulo. Proteção contra repetição ao segurar tecla e contra uso simultâneo ou com reserva zerada. A pausa congela a contagem. Contato com os guardas durante a proteção repele o inimigo de volta à origem com som procedural de desgosto. Escudos ocultos e desativados na fase de plantio.
