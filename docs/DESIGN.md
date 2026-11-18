# Astralis — identidade visual (bloco g)

Tema **astral / cosmos**: mapa estelar, grimório celeste, constelações como linhas finas e pontos. Sem gradiente roxo-azul genérico, sem emoji como ícone, sem glassmorphism pesado. Elevação por luminosidade e bordas finas.

## Regra 60-30-10 (design tokens, `:root` em `src/astralisTheme.css`)

| Papel | Token | Cor | Uso |
|---|---|---|---|
| 60% base | `--astral-base` | `#0B0F1F` | fundo e superfícies, em variações de luminosidade |
| 30% secundária | `--astral-nebula` | `#3A3F7A` | painéis, navegação, blocos de apoio |
| 10% destaque | `--astral-gold` | `#E8B84A` | ação principal, foco, itens importantes |

Neutros: `--astral-ink` `#EA ECF6` (texto), `--astral-muted` `#9AA0C0`. Estados discretos: sucesso `#3FB98B`, erro `#E06A78`, aviso `#E8B84A`.

Os tokens semânticos existentes (`--paper`, `--sheet`, `--ink`, `--muted`, `--line`, `--sage`, `--gold`) passam a apontar para a paleta astral, então todos os componentes que usam `var(--…)` migram de uma vez. Contraste de texto principal sobre a base ≥ 4.5:1 (AA).

## Tipografia
- Títulos: display com personalidade (mantém "Libre Baskerville" como serifada de exibição).
- Leitura: "DM Sans". Escala em rem; mínimo 12px (corrige os 6–9px do diagnóstico A11).

## Superfície e ritmo
- Espaçamento base 4/8px. Raios coerentes. Elevação por borda fina + leve clareamento, não sombra difusa.
- Fundo: nebulosa/estrelas em CSS/SVG leve (radial-gradients + pontos), com `prefers-reduced-motion` respeitado (sem animação).

## Acessibilidade
- Foco visível (anel dourado), navegação por teclado, `aria-current` na aba ativa, `prefers-reduced-motion`, contraste AA.
