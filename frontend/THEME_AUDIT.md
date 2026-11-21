# Frontend color audit (Phase 1 baseline)

Scanned 54 frontend source/config files, excluding generated Next output and dependencies. Found **759 raw color occurrences** across **575 file/value pairs**. Each row groups one literal in a file; line references identify every source line containing it. Structural color keywords (transparent/currentColor) are included but are not off-theme hues.

| Page / area | File | Line(s) | Value | Usage count | Suggested semantic token | Review |
|---|---|---:|---|---:|---|---|
| Access Policies | `src/styles/futuristic.css` | 261 | `rgba(139,92,246,.55)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 261 | `rgba(91,108,255,.25)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 261 | `rgba(91,108,255,.7)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 458 | `rgba(139,92,246,.08)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 458, 847 | `rgba(91,108,255,.14)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 462 | `rgba(4,8,24,.62)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 464 | `#c7d2fe` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 464 | `rgba(125,139,255,.2)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 464 | `rgba(22,31,68,.75)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 464 | `rgba(4,8,24,.34)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 464 | `rgba(42,49,99,.72)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 464, 868 | `rgba(91,108,255,.1)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 464, 817, 1179 | `rgba(91,108,255,.16)` | 3 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 464, 934 | `rgba(91,108,255,.2)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Access Policies | `src/styles/futuristic.css` | 465 | `rgba(8,12,38,.92)` | 1 | `--color-state-danger-*` | none |
| Access Policies | `src/styles/futuristic.css` | 466 | `#baf7dc` | 1 | `--color-state-success-*` | none |
| Access Policies | `src/styles/futuristic.css` | 466, 1202 | `rgba(52,211,153,.1)` | 2 | `--color-state-success-*` | none |
| Access Policies | `src/styles/futuristic.css` | 466 | `rgba(52,211,153,.24)` | 1 | `--color-state-success-*` | none |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 22 | `#202744` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 22, 38, 50, 92, 94, 106, 169, 189-190, 210, 261-262, 551, 603, 680, 867, 882, 925, 927, 1041, 1083-1084, 1113, 1192 | `#fff` | 25 | `--color-surface-* (off-theme light surface)` | review possible off-theme surface/accent |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 790 | `rgba(91,108,255,.52)` | 1 | `--color-* by component role` | none |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 792 | `rgba(0,0,0,.42)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 814 | `rgba(5,8,22,.2)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 833, 860, 1114 | `rgba(139,92,246,.28)` | 3 | `--color-bg-* / --color-surface-* by role` | none |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 833 | `rgba(91,108,255,.22)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 846 | `rgba(5,8,22,.38)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 925 | `rgba(91,108,255,.18)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 926 | `#090d1b` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 926 | `rgba(0,0,0,.12)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 927 | `#222348` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Ask Memo / AI Diary | `src/styles/futuristic.css` | 927 | `#252d7a` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Beneficiary Portal | `src/styles/beneficiary-portal.css` | 2, 5, 7-8, 12 | `#fff` | 5 | `--color-surface-* (off-theme light surface)` | review possible off-theme surface/accent |
| Beneficiary Portal | `src/styles/beneficiary-portal.css` | 7 | `#8a5d13` | 1 | `--color-state-info-* or --color-link` | none |
| Beneficiary Portal | `src/styles/beneficiary-portal.css` | 7, 12 | `#f7f9fc` | 3 | `--color-state-info-* or --color-link` | none |
| Beneficiary Portal | `src/styles/beneficiary-portal.css` | 7 | `#fff5dc` | 1 | `--color-state-info-* or --color-link` | review possible off-theme surface/accent |
| Beneficiary Portal | `src/styles/beneficiary-portal.css` | 11 | `#9b2d34` | 1 | `--color-state-danger-*` | none |
| Beneficiary Portal | `src/styles/beneficiary-portal.css` | 11 | `#f4d0d0` | 1 | `--color-state-danger-*` | none |
| Beneficiary Portal | `src/styles/beneficiary-portal.css` | 11 | `#fff0f0` | 1 | `--color-state-danger-*` | review possible off-theme surface/accent |
| Beneficiary Portal | `src/styles/beneficiary-portal.css` | 12 | `#17233f12` | 1 | `--color-state-info-* or --color-link` | none |
| Beneficiary Portal | `src/styles/beneficiary-portal.css` | 12 | `#f1f4fa` | 1 | `--color-state-info-* or --color-link` | none |
| Beneficiary Portal | `src/styles/beneficiary-portal.css` | 13 | `#f8f9fc` | 1 | `--color-state-info-* or --color-link` | none |
| Dashboard | `src/styles/futuristic.css` | 115, 826, 895, 1168 | `rgba(91,108,255,.08)` | 4 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 205 | `rgba(139,92,246,.17)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 205 | `rgba(91,108,255,.28)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 214 | `rgba(52,211,153,.08)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 214 | `rgba(52,211,153,.25)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 217, 263, 270 | `rgba(52,211,153,.14)` | 3 | `--color-state-success-*` | none |
| Dashboard | `src/styles/futuristic.css` | 220 | `rgba(140,150,255,.45)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 220, 615 | `rgba(91,108,255,.12)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 996 | `rgba(66,75,255,.13)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1003 | `#080a2a` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1004 | `rgba(157,157,255,.1)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1004 | `rgba(7,9,38,.55)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1006 | `rgba(11,13,49,.72)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1006 | `rgba(154,153,255,.14)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1008 | `rgba(122,70,255,.25)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1008 | `rgba(133,75,255,.26)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1008 | `rgba(169,124,255,.25)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1009 | `#ac6dff` | 1 | `--color-border-subtle/strong` | none |
| Dashboard | `src/styles/futuristic.css` | 1016 | `rgba(155,174,255,.17)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1016 | `rgba(68,98,255,.27)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1018 | `#b6a4ff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1019 | `#f2f3ff` | 1 | `--color-surface-* (off-theme light surface)` | none |
| Dashboard | `src/styles/futuristic.css` | 1020 | `#72bfff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1020 | `#a174ff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1020 | `#e77aff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1020 | `#f8c969` | 1 | `--color-surface-* (off-theme light surface)` | none |
| Dashboard | `src/styles/futuristic.css` | 1021 | `#b8c0e8` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1023 | `#632eea` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1023, 1113 | `#8b48f7` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1023 | `rgba(115,66,255,.35)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1024 | `#64bdff` | 1 | `--color-text-secondary/muted` | none |
| Dashboard | `src/styles/futuristic.css` | 1036 | `rgba(104,73,255,.17)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1036 | `rgba(134,138,255,.14)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1037 | `#bf9dff` | 1 | `--color-text-secondary/muted` | none |
| Dashboard | `src/styles/futuristic.css` | 1037 | `#eef0ff` | 1 | `--color-text-primary/on-accent` | none |
| Dashboard | `src/styles/futuristic.css` | 1038 | `#15e4ad` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1038 | `#d8dfff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1038 | `rgba(169,158,255,.2)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1038 | `rgba(22,25,79,.66)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1039 | `#f1f2ff` | 1 | `--color-surface-* (off-theme light surface)` | none |
| Dashboard | `src/styles/futuristic.css` | 1039 | `rgba(137,148,244,.16)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1039 | `rgba(5,8,36,.74)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1040 | `#9da7d1` | 1 | `--color-text-secondary/muted` | none |
| Dashboard | `src/styles/futuristic.css` | 1041 | `rgba(211,196,255,.75)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1041 | `rgba(255,255,255,.08)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1042 | `#939fc9` | 1 | `--color-border-subtle/strong` | none |
| Dashboard | `src/styles/futuristic.css` | 1042 | `#a4aed6` | 1 | `--color-border-subtle/strong` | none |
| Dashboard | `src/styles/futuristic.css` | 1042 | `#c4c9e7` | 1 | `--color-border-subtle/strong` | none |
| Dashboard | `src/styles/futuristic.css` | 1043 | `#86caff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1043 | `#aeb8df` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1043 | `#e9edff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1043 | `rgba(21,35,73,.72)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1044 | `#aab4dc` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1044 | `#b3a4f0` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1044 | `#e2e7ff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1044 | `#eff1ff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1044 | `rgba(174,184,255,.13)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1045 | `#8acfff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1045 | `#c2c9e8` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1045 | `rgba(143,153,238,.27)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1045 | `rgba(5,8,36,.68)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Dashboard | `src/styles/futuristic.css` | 1046 | `#83d9ff` | 1 | `--color-border-subtle/strong` | none |
| Dashboard | `src/styles/futuristic.css` | 1050 | `#171946` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Design system / tokens | `src/styles/tokens.css` | 2 | `#050816` | 1 | `--color-bg-start` | none |
| Design system / tokens | `src/styles/tokens.css` | 3 | `#0b1030` | 1 | `--color-bg-end` | none |
| Design system / tokens | `src/styles/tokens.css` | 4 | `#5b6cff` | 1 | `--color-primary` | none |
| Design system / tokens | `src/styles/tokens.css` | 5 | `#8b5cf6` | 1 | `--color-secondary` | none |
| Design system / tokens | `src/styles/tokens.css` | 6 | `#7dd3fc` | 1 | `--color-accent` | none |
| Design system / tokens | `src/styles/tokens.css` | 7 | `#eaf0ff` | 1 | `--color-text` | none |
| Design system / tokens | `src/styles/tokens.css` | 8 | `#9aa6d1` | 1 | `--color-muted` | none |
| Design system / tokens | `src/styles/tokens.css` | 9 | `#6b76a8` | 1 | `--color-subtle` | none |
| Design system / tokens | `src/styles/tokens.css` | 10 | `#34d399` | 1 | `--color-success` | none |
| Design system / tokens | `src/styles/tokens.css` | 11 | `#fbbf24` | 1 | `--color-warning` | none |
| Design system / tokens | `src/styles/tokens.css` | 12 | `#f87171` | 1 | `--color-danger` | none |
| Design system / tokens | `src/styles/tokens.css` | 13 | `rgba(255, 255, 255, 0.05)` | 1 | `--surface-glass` | none |
| Design system / tokens | `src/styles/tokens.css` | 14 | `rgba(255, 255, 255, 0.09)` | 1 | `--surface-glass-strong` | none |
| Design system / tokens | `src/styles/tokens.css` | 15 | `rgba(140, 150, 255, 0.25)` | 1 | `--border-glass` | none |
| Design system / tokens | `src/styles/tokens.css` | 16 | `rgba(140, 150, 255, 0.14)` | 1 | `--border-soft` | none |
| Design system / tokens | `src/styles/tokens.css` | 17 | `rgba(0, 0, 0, 0.24)` | 1 | `--shadow-glass` | none |
| Design system / tokens | `src/styles/tokens.css` | 17 | `rgba(255, 255, 255, 0.08)` | 1 | `--shadow-glass` | none |
| Design system / tokens | `src/styles/tokens.css` | 18 | `rgba(91, 108, 255, 0.45)` | 1 | `--shadow-glow` | none |
| Files / playlists / player | `src/styles/files.css` | 8, 21 | `#fff` | 2 | `--color-surface-* (off-theme light surface)` | review possible off-theme surface/accent |
| Files / playlists / player | `src/styles/files.css` | 21 | `rgba(5,8,20,.76)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Files / playlists / player | `src/styles/files.css` | 23 | `rgba(0,0,0,.32)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Files / playlists / player | `src/styles/files.css` | 24 | `#000` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1155 | `rgba(91,108,255,.03)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1155 | `rgba(91,108,255,.04)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1168 | `rgba(15, 19, 41, 0.74)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1168 | `rgba(150, 163, 255, 0.25)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1173 | `rgba(7, 11, 25, 0.62)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1174 | `rgba(170, 182, 219, 0.7)` | 1 | `--color-text-secondary/muted` | none |
| Login / Register | `src/styles/futuristic.css` | 1178 | `rgba(125, 211, 252, 0.45)` | 1 | `--color-border-subtle/strong` | none |
| Login / Register | `src/styles/futuristic.css` | 1178 | `rgba(7, 11, 25, 0.85)` | 1 | `--color-border-subtle/strong` | none |
| Login / Register | `src/styles/futuristic.css` | 1179 | `rgba(125,211,252,.82)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1179 | `rgba(9, 13, 28, 0.9)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1193 | `rgba(125,111,255,.42)` | 1 | `--color-* by component role` | none |
| Login / Register | `src/styles/futuristic.css` | 1196 | `rgba(140, 150, 255, 0.24)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1196 | `rgba(15, 19, 41, 0.72)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1196 | `rgba(255,255,255,.04)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1197 | `rgba(125,211,252,.34)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1197 | `rgba(18, 25, 52, 0.82)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Login / Register | `src/styles/futuristic.css` | 1202 | `rgba(52,211,153,.22)` | 1 | `--color-state-success-*` | none |
| Login / Register | `src/styles/futuristic.css` | 1205 | `rgba(248,113,113,.1)` | 1 | `--color-state-danger-*` | none |
| Login / Register | `src/styles/futuristic.css` | 1205 | `rgba(248,113,113,.22)` | 1 | `--color-state-danger-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 41, 1065 | `#10182a` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 41, 1065 | `#11162c` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 41, 1065 | `#17152d` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 41, 46, 58, 69, 1065, 1106 | `#edf2ff` | 6 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 41 | `rgba(91,72,170,.18)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 44, 72 | `#aaa1dd` | 2 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 45 | `#abb5ca` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 45 | `rgba(181,192,230,.14)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 45, 1076 | `rgba(255,255,255,.055)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 49 | `#aeb8ce` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 49 | `rgba(181,192,230,.13)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 49, 53, 87, 91, 392, 857, 864, 1039, 1095 | `rgba(255,255,255,.035)` | 9 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 50 | `#8e91d8` | 3 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 50 | `rgba(255,255,255,.03)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 53 | `rgba(181,192,230,.09)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 54 | `#9aa6bf` | 1 | `--color-text-secondary/muted` | none |
| Memory Timeline | `src/styles/futuristic.css` | 55 | `#dce4f7` | 1 | `--color-text-secondary/muted` | none |
| Memory Timeline | `src/styles/futuristic.css` | 56 | `rgba(112,92,190,.13)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 56, 67 | `rgba(181,192,230,.08)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 56, 368, 401, 417, 798 | `rgba(255,255,255,.025)` | 5 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 57 | `rgba(128,111,221,.04)` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 57 | `rgba(159,173,220,.14)` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 59 | `#10162a` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 59, 115, 220 | `rgba(0,0,0,.28)` | 3 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 60 | `rgba(20,25,45,.75)` | 1 | `--color-text-secondary/muted` | none |
| Memory Timeline | `src/styles/futuristic.css` | 66-67, 81 | `#9da8be` | 3 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 68 | `rgba(5,8,20,.64)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 69 | `#15182a` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 69 | `#1b2038` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 69 | `rgba(0,0,0,.55)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 69 | `rgba(115,91,198,.2)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 69, 75, 87 | `rgba(181,192,230,.2)` | 3 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 69 | `rgba(96,76,170,.13)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 70 | `rgba(181,192,230,.1)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 70, 100 | `rgba(21,24,42,.97)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 70 | `rgba(27,32,56,.98)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 75 | `#e3e8f4` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 75, 1013 | `rgba(255,255,255,.07)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 76 | `rgba(255,255,255,.14)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 77, 1086, 1116 | `#c4b5fd` | 3 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 78 | `rgba(181,192,230,.24)` | 1 | `--color-text-secondary/muted` | none |
| Memory Timeline | `src/styles/futuristic.css` | 80 | `#e9edfa` | 1 | `--color-text-primary/on-accent` | none |
| Memory Timeline | `src/styles/futuristic.css` | 82, 91, 97 | `#c5cce0` | 3 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 84 | `#11162a` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 84, 91, 1082 | `rgba(181,192,230,.15)` | 3 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 87 | `#aab5ca` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 97, 1082, 1088 | `rgba(255,255,255,.045)` | 3 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 98 | `#ffd0d0` | 1 | `--color-state-danger-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 98 | `rgba(240,94,103,.1)` | 1 | `--color-state-danger-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 98 | `rgba(240,94,103,.2)` | 1 | `--color-state-danger-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 99 | `#c5f2da` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 99 | `rgba(98,185,154,.1)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 99 | `rgba(98,185,154,.2)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 100 | `rgba(181,192,230,.12)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 103 | `rgba(2,4,12,.9)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 106 | `rgba(15,18,32,.76)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 106 | `rgba(255,255,255,.22)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1062 | `#38bdf8` | 1 | `--emotion-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1062 | `#ef4444` | 1 | `--emotion-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1062 | `#facc15` | 1 | `--emotion-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1063 | `#22d3ee` | 1 | `--emotion-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1063 | `#4ade80` | 1 | `--emotion-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1063 | `#8b5cf6` | 1 | `--emotion-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1063 | `#a5aec3` | 1 | `--emotion-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1073 | `#b5a7f0` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1075 | `#bd83ff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1075 | `#e76dff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1076 | `#b1b9dc` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1076 | `rgba(181,192,230,.16)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1077 | `#ad8aff` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1077 | `rgba(153,113,255,.15)` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1078 | `#9ca7cf` | 1 | `--color-text-secondary/muted` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1078, 1113 | `#eff2ff` | 2 | `--color-text-primary/on-accent` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1082 | `#c0c7e5` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1083 | `rgba(174,146,255,.5)` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1084 | `rgba(101,66,213,.82)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1084 | `rgba(130,82,255,.3)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1084 | `rgba(139,92,246,.85)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1084 | `rgba(195,166,255,.7)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1084 | `rgba(255,255,255,.2)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1085 | `#c1c8df` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1088 | `#b9c2e1` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1088 | `rgba(173,174,245,.14)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1088 | `rgba(25,28,65,.72)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1088 | `rgba(39,39,91,.65)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1089 | `#9b7aff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1090 | `#b6bfdf` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1091 | `#e7eaff` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1093 | `#c3a3ff` | 2 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1093 | `#c6a1ff` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1094 | `#b3bee2` | 1 | `--color-text-secondary/muted` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1095 | `rgba(0,0,0,.13)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1095, 1112 | `rgba(167,176,245,.14)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1095 | `rgba(174,148,255,.32)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1095 | `rgba(19,23,57,.54)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1095 | `rgba(22,25,63,.67)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1096 | `#000` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1101 | `rgba(168,125,255,.6)` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1101 | `rgba(98,126,255,.38)` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1104 | `#828eb8` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1104 | `rgba(156,167,228,.1)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1104 | `rgba(35,39,85,.58)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1105 | `rgba(175,183,242,.2)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1107 | `#151632` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1107, 1109 | `rgba(0,0,0,.3)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1108 | `#cbd2ed` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1108 | `rgba(20,23,43,.78)` | 1 | `--color-border-subtle/strong` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1110, 1114 | `#edf1ff` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1110 | `rgba(0,0,0,.35)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1110 | `rgba(112,83,221,.16)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1110 | `rgba(178,164,255,.3)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1110 | `rgba(18,21,55,.96)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1112 | `#bac4e5` | 1 | `--color-state-danger-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1112 | `rgba(24,28,68,.56)` | 1 | `--color-state-danger-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1113 | `#6335e8` | 1 | `--color-state-danger-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1113 | `#aeb9dd` | 1 | `--color-state-danger-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1113 | `#bda4ff` | 1 | `--color-state-danger-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1113 | `#fca5a5` | 1 | `--color-state-danger-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1113 | `rgba(115,66,255,.3)` | 1 | `--color-state-danger-*` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1114 | `rgba(180,148,255,.4)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1115 | `#e8d5ff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1115 | `rgba(111,78,221,.72)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1115 | `rgba(142,111,255,.3)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1115 | `rgba(205,177,255,.8)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1115 | `rgba(29,31,87,.9)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Memory Timeline | `src/styles/futuristic.css` | 1129 | `#aeb9dc` | 1 | `--color-border-subtle/strong` | none |
| My Diary | `src/styles/futuristic.css` | 363, 1006 | `rgba(0,0,0,.16)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| My Diary | `src/styles/futuristic.css` | 396 | `#ff88ae` | 1 | `--color-text-primary/on-accent` | none |
| My Diary | `src/styles/futuristic.css` | 403 | `rgba(0,0,0,.15)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| My Diary | `src/styles/futuristic.css` | 409 | `rgba(255,255,255,.09)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| My Diary | `src/styles/futuristic.css` | 409 | `rgba(8,11,25,.78)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| My Diary | `src/styles/futuristic.css` | 421, 1013 | `rgba(0,0,0,.2)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| My Diary | `src/styles/futuristic.css` | 860 | `rgba(91,108,255,.38)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 158, 1153 | `rgba(139,92,246,.2)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 158, 1153 | `rgba(79,70,229,.25)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 174 | `#11183b` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 176, 457 | `#080c26` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 184, 189, 222-223 | `rgba(91,108,255,.3)` | 4 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 190 | `#7180ff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 190 | `#a172ff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 212, 1045, 1179, 1185 | `rgba(125,211,252,.18)` | 4 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 212 | `rgba(91,108,255,.06)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 213 | `rgba(125,211,252,.35)` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 222-223 | `rgba(139,92,246,.18)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 231, 1156 | `rgba(125,211,252,.12)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 231, 1154, 1194 | `rgba(125,211,252,.2)` | 3 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 232 | `rgba(52,211,153,.12)` | 1 | `--color-state-success-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 233 | `rgba(251,191,36,.12)` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 235 | `rgba(4,8,24,.38)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 254 | `rgba(125,211,252,.45)` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 264 | `rgba(154,166,209,.3)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 266 | `rgba(3,5,18,.72)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 267, 272, 553 | `#101638` | 3 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 267, 553 | `rgba(0,0,0,.5)` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 271 | `rgba(255,255,255,.06)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 294 | `rgba(251,191,36,.24)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 517 | `rgba(5,8,22,.72)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 772 | `rgba(5,8,22,.58)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 866 | `rgba(91,108,255,.15)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 990 | `#70ef8a` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 990 | `#ff526d` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 990 | `#ffd36a` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 991 | `#41c9ff` | 1 | `--color-* by component role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 991 | `#c26bff` | 1 | `--color-* by component role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 992 | `#30ddcf` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 992 | `#3a8dff` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 992 | `#8df56d` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 992 | `#a35bff` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 992 | `#f24cdb` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 992 | `#ff604d` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 992 | `#ffd94f` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 994 | `#070827` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 994 | `#0a0c35` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 994 | `#14124a` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 994, 1074 | `#f1f3ff` | 2 | `--color-surface-* (off-theme light surface)` | none |
| Shared / other pages | `src/styles/futuristic.css` | 994 | `rgba(59,50,180,.32)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 994 | `rgba(60,45,160,.16)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1001 | `#6c3b98` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1001 | `#f28f36` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1001 | `#ffc340` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1001 | `#fff5af` | 1 | `--color-state-warning-*` | review possible off-theme surface/accent |
| Shared / other pages | `src/styles/futuristic.css` | 1001 | `rgba(255,195,64,.42)` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1002 | `#9828a7` | 1 | `--color-state-danger-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1002 | `#ff3569` | 1 | `--color-state-danger-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1002 | `#ff9fac` | 1 | `--color-state-danger-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1002 | `rgba(255,53,105,.4)` | 1 | `--color-state-danger-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1012, 1045 | `#edf0ff` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1012 | `rgba(145,133,255,.27)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1012 | `rgba(18,17,62,.74)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1012 | `rgba(20,23,76,.83)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1013 | `rgba(87,74,217,.1)` | 1 | `--color-* by component role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1017 | `rgba(11,13,49,.48)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1026 | `#137bff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1026 | `#140e63` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1026 | `#24bfff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1026 | `#2bd9ff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1026 | `#4031f3` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1026 | `#b4ffff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1026 | `rgba(11,8,82,.68)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1026 | `rgba(255,255,255,.52)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1026 | `rgba(92,54,255,.8)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1027 | `rgba(129,179,255,.17)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1027 | `rgba(255,255,255,.5)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1028 | `#58cfff` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1028 | `#89faff` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1028 | `#9274ff` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1028 | `#b4faff` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1028 | `#d5a5ff` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1028 | `rgba(178,111,255,.7)` | 1 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1031 | `#ff80ed` | 1 | `--color-surface-* (off-theme light surface)` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1031 | `#ff9cf1` | 1 | `--color-surface-* (off-theme light surface)` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1032 | `#75ffc2` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1032 | `#bc79ff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1033, 1107, 1109 | `rgba(255,255,255,.35)` | 3 | `--color-border-subtle/strong` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1034 | `#1741ad` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1034 | `#26751d` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1034 | `#5123a4` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1034 | `#6c3b18` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1034 | `#972343` | 1 | `--color-state-warning-*` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1065 | `rgba(91,72,170,.2)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1183 | `rgba(140,150,255,.18)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1183 | `rgba(18, 23, 48, 0.72)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1184 | `rgba(125,211,252,.48)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1184 | `rgba(18, 25, 53, 0.9)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared / other pages | `src/styles/futuristic.css` | 1190 | `#b7ebff` | 1 | `--color-border-subtle/strong` | none |
| Shared components | `src/components/aurora-atmosphere.tsx` | 2 | `#2563eb` | 1 | `--color-state-danger-*` | none |
| Shared components | `src/components/aurora-atmosphere.tsx` | 2 | `#4f46e5` | 1 | `--color-state-danger-*` | none |
| Shared components | `src/components/aurora-atmosphere.tsx` | 2 | `#7c3aed` | 1 | `--color-state-danger-*` | none |
| Shared components | `src/components/aurora-atmosphere.tsx` | 2 | `#a855f7` | 1 | `--color-state-danger-*` | none |
| Shared components | `src/components/aurora-atmosphere.tsx` | 2 | `#f97316` | 1 | `--color-state-danger-*` | none |
| Shared components | `src/components/aurora-atmosphere.tsx` | 2 | `#fb7185` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 7 | `#17233f` | 1 | `--color-* by component role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 8 | `#71809c` | 1 | `--color-* by component role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 9 | `#e4e9f2` | 1 | `--color-border-subtle/strong` | none |
| Shared shell / legacy components | `src/app/globals.css` | 10 | `#ffffff` | 1 | `--color-surface-* (off-theme light surface)` | review possible off-theme surface/accent |
| Shared shell / legacy components | `src/app/globals.css` | 11, 60 | `#f7f9fc` | 2 | `--color-surface-* (off-theme light surface)` | none |
| Shared shell / legacy components | `src/app/globals.css` | 12, 87, 93, 114 | `#2f5be8` | 4 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 13 | `#2346bd` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 14, 103, 108 | `#edf2ff` | 3 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 15, 103 | `#eeeaff` | 2 | `--color-* by component role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 16 | `#e4f7ef` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 17 | `#fff3e5` | 1 | `--color-state-warning-*` | review possible off-theme surface/accent |
| Shared shell / legacy components | `src/app/globals.css` | 18 | `rgba(27, 49, 96, 0.06)` | 1 | `--color-* by component role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 31, 36, 52, 55, 64, 69, 78, 81, 87, 93, 104-106, 111-114, 118-119 | `#fff` | 26 | `--color-surface-* (off-theme light surface)` | review possible off-theme surface/accent |
| Shared shell / legacy components | `src/app/globals.css` | 36 | `rgba(47, 91, 232, .2)` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 39 | `#9aa5b9` | 1 | `--color-text-secondary/muted` | none |
| Shared shell / legacy components | `src/app/globals.css` | 41 | `#7d89a2` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 42 | `#f6f8fc` | 1 | `--color-surface-* (off-theme light surface)` | none |
| Shared shell / legacy components | `src/app/globals.css` | 46 | `#6b7891` | 1 | `--color-text-secondary/muted` | none |
| Shared shell / legacy components | `src/app/globals.css` | 47 | `#55aa83` | 1 | `--color-text-secondary/muted` | none |
| Shared shell / legacy components | `src/app/globals.css` | 49, 103 | `#52617d` | 2 | `--color-text-secondary/muted` | none |
| Shared shell / legacy components | `src/app/globals.css` | 52 | `#7e8ba6` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 52 | `rgba(37, 57, 97, .08)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 57 | `#9aa5b8` | 1 | `--color-text-secondary/muted` | none |
| Shared shell / legacy components | `src/app/globals.css` | 58 | `#45516a` | 1 | `--color-text-secondary/muted` | none |
| Shared shell / legacy components | `src/app/globals.css` | 60 | `#9ca8bb` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 60, 103, 105-107, 109-111 | `#eef1f6` | 15 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 63 | `#7d89a3` | 1 | `--color-text-secondary/muted` | none |
| Shared shell / legacy components | `src/app/globals.css` | 64 | `#ee806f` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 65 | `#8995ab` | 1 | `--color-text-secondary/muted` | none |
| Shared shell / legacy components | `src/app/globals.css` | 67 | `#3d4964` | 1 | `--color-text-secondary/muted` | none |
| Shared shell / legacy components | `src/app/globals.css` | 69 | `#8e9be3` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 77 | `#8290aa` | 1 | `--color-text-secondary/muted` | none |
| Shared shell / legacy components | `src/app/globals.css` | 78, 87 | `rgba(47,91,232,.15)` | 2 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 81 | `#53617b` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 81 | `#dfe5ef` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 82, 105 | `#f8faff` | 2 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 84 | `#c95457` | 2 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 85 | `#8390a7` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 89, 117 | `#cbd6ff` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 90 | `#dbe3ff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 91 | `#b7c7ff` | 1 | `--color-text-secondary/muted` | none |
| Shared shell / legacy components | `src/app/globals.css` | 94 | `#e6ebff` | 1 | `--color-border-subtle/strong` | none |
| Shared shell / legacy components | `src/app/globals.css` | 95 | `#cdd8ff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 95 | `rgba(255,255,255,.1)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 96 | `rgba(255,255,255,.28)` | 1 | `--color-border-subtle/strong` | none |
| Shared shell / legacy components | `src/app/globals.css` | 98 | `#d5f1e4` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 98 | `#f0fbf6` | 1 | `--color-surface-* (off-theme light surface)` | none |
| Shared shell / legacy components | `src/app/globals.css` | 99 | `#356c57` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 99 | `#45876c` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 99 | `#4aa77e` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 99 | `#67917f` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 99 | `#d9f4e7` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 102 | `#30405e` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 102 | `#4567d9` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 102 | `#4d9d7b` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 102 | `#76a98f` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 102 | `#8575d4` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 102 | `#8d99ad` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 102 | `#c5874b` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#33415e` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#41506d` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#4d9a77` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#4fa37c` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103, 107 | `#596781` | 2 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#5da07e` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#65b88c` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#6980c6` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#75839b` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#7d87aa` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#8591a7` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#93a0b2` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103, 105, 108 | `#9aa5b6` | 3 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#9ba5b6` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#9ba6b7` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#a0a9ba` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#adb7c7` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#b67a38` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103, 110 | `#e5f7ed` | 2 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103, 121 | `#e8f7ef` | 2 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#edf0f5` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#f0f3f7` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 103 | `#fff2df` | 1 | `--color-state-success-*` | review possible off-theme surface/accent |
| Shared shell / legacy components | `src/app/globals.css` | 104 | `#43516c` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 104 | `#66748d` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 104 | `#7d91d4` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 104 | `#8591a8` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 104 | `#8996aa` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 104 | `#8c98ab` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 104 | `#b2875d` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 105 | `#34425e` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 105 | `#5e6b83` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 105, 108 | `#64718a` | 2 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 105 | `#64728b` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 105 | `#65728a` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 105 | `#8092ca` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 105 | `#95a0b2` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 105 | `#a1aabc` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 105 | `#c8d1e1` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 105 | `#e8edf7` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#44516c` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#46536c` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#518a72` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#59698a` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#61b38a` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#63718a` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#7084c6` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#7182be` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#7a9c8b` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#7e8ba2` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#94a0b0` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#94a0dc` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#9ba6b8` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#a1aaba` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#a3adbc` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#d9f0e5` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#e2e8fb` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#e3e9f7` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#effaf5` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#f6f8ff` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 106 | `#f7f9fd` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 107 | `#536997` | 1 | `--color-state-warning-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 107 | `#536abe` | 1 | `--color-state-warning-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 107 | `#6880c6` | 1 | `--color-state-warning-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 107 | `#929db0` | 1 | `--color-state-warning-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 107 | `#967044` | 1 | `--color-state-warning-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 107, 119 | `#a0a9b8` | 2 | `--color-state-warning-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 107 | `#a17b53` | 1 | `--color-state-warning-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 107 | `#dfe7fc` | 1 | `--color-state-warning-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 107 | `#e5ebff` | 1 | `--color-state-warning-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 107 | `#f1f5ff` | 1 | `--color-state-warning-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 107-108 | `#f6e8d2` | 2 | `--color-state-warning-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 107-108 | `#fff8ed` | 2 | `--color-state-warning-*` | review possible off-theme surface/accent |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#4e9673` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#506079` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#5068a4` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#52689e` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#526bc0` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#54a37d` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#5976c4` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#5976cc` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#5a6780` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#64728a` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#7c8db6` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#8290a6` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108, 110 | `#8995a8` | 2 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108, 118 | `#9aa5b7` | 2 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#9eb4ff` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#ac7c42` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#d8f0e3` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#dce6ff` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#dce7ff` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#e1e6ef` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#e1f5e9` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#eef4ff` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#eefaf4` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108 | `#f7f9ff` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 108, 118, 121 | `#fbfcfe` | 3 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 109 | `#7d8aa2` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 109 | `#a1a9b7` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 109 | `#e3e7ef` | 1 | `--color-state-info-* or --color-link` | none |
| Shared shell / legacy components | `src/app/globals.css` | 110 | `#4fa27b` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 110 | `#5e6c84` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 110 | `#a0aabb` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 110 | `#f8f9fc` | 1 | `--color-surface-* (off-theme light surface)` | none |
| Shared shell / legacy components | `src/app/globals.css` | 111 | `#53617a` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 111 | `#5d6b83` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 111 | `#6ba989` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 111 | `#7e5d63` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 111 | `#8290a4` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 111 | `#99a4b5` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 111 | `#9ba5b5` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 111 | `#a38b90` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 111 | `#ba8587` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 111 | `#d9e0eb` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 111 | `#f0dfdf` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 111 | `rgba(0,0,0,.15)` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 112 | `#3b4965` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 112, 121 | `#7180a3` | 2 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 112 | `#8793a7` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 112 | `#ba6166` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 112 | `#fff0f0` | 1 | `--color-surface-* (off-theme light surface)` | review possible off-theme surface/accent |
| Shared shell / legacy components | `src/app/globals.css` | 112 | `rgba(24, 37, 66, .35)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 112 | `rgba(26,42,82,.18)` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 115 | `rgba(255,255,255,.04)` | 2 | `--color-border-subtle/strong` | none |
| Shared shell / legacy components | `src/app/globals.css` | 115 | `rgba(255,255,255,.2)` | 1 | `--color-border-subtle/strong` | none |
| Shared shell / legacy components | `src/app/globals.css` | 117 | `#dce5ff` | 1 | `--color-border-subtle/strong` | none |
| Shared shell / legacy components | `src/app/globals.css` | 118 | `#293858` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 118 | `#5e6d87` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 118 | `#8190a8` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 118 | `#cfdaff` | 1 | `--color-bg-* / --color-surface-* by role` | none |
| Shared shell / legacy components | `src/app/globals.css` | 119 | `#7b879c` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 119 | `#929daf` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 119 | `#a4adbb` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 119 | `#c65e68` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 119 | `rgba(47,91,232,.18)` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 121 | `#317b5a` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 121 | `#c9ecd9` | 1 | `--color-state-success-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 124 | `rgba(24,37,66,.28)` | 1 | `--color-state-danger-*` | none |
| Shared shell / legacy components | `src/app/globals.css` | 124 | `rgba(26,43,82,.12)` | 1 | `--color-state-danger-*` | none |

## High-level findings

- `src/app/globals.css` contains the former light palette and white shell/card/input surfaces; these are the most visible off-theme items.
- `src/styles/futuristic.css` contains literal colors for banners, page grays, gradients, borders, modal backdrops, glows, and dashboard/timeline accents.
- `src/styles/files.css` includes white document/iframe and black video surfaces; the white viewer fallback may need a documented exception or themed wrapper.
- `src/styles/beneficiary-portal.css` defines a separate palette that should migrate to shared state and surface tokens.
- Emotion accents and the countdown rainbow are scoped to their UI but should be sourced from the shared token file.
- No color-bearing Tailwind utilities/arbitrary values, CSS modules, chart color constants, or frontend email templates were found. Tailwind currently has no semantic token extension.

## Phase boundary

Inventory only. Shared components and page declarations remain for their assigned phases.
