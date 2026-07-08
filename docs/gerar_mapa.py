import math, textwrap

CX, CY = 1600, 1080
R1, R2, R3 = 260, 530, 840
SECTOR = math.radians(84)

BRANCHES = [
    {
        "label": "FONOLOGIA", "color": "#0f3460", "light": "#d6e8ff",
        "angle": math.radians(225),
        "subs": [
            {"label": "Fonética",    "leaves": ["Fonema","Letra","Dígrafo"]},
            {"label": "Sílaba",      "leaves": ["Ditongo","Tritongo","Hiato","Enc. Consonantal"]},
            {"label": "Prosódia",    "leaves": ["Oxítona","Paroxítona","Proparoxítona","Átona"]},
            {"label": "Ortografia",  "leaves": ["Acentuação","Grafia Normativa"]},
        ]
    },
    {
        "label": "MORFOLOGIA", "color": "#4a2c8a", "light": "#e8deff",
        "angle": math.radians(315),
        "subs": [
            {"label": "Estrutura",        "leaves": ["Radical","Prefixo","Sufixo","Desinência","Vog. Temática"]},
            {"label": "Formação",         "leaves": ["Derivação","Composição"]},
            {"label": "Cls. Variáveis",   "leaves": ["Substantivo","Adjetivo","Pronome","Artigo","Numeral","Verbo"]},
            {"label": "Cls. Invariáveis", "leaves": ["Advérbio","Preposição","Conjunção","Interjeição"]},
        ]
    },
    {
        "label": "SINTAXE", "color": "#7b2d8b", "light": "#f2e0ff",
        "angle": math.radians(45),
        "subs": [
            {"label": "Essenciais",  "leaves": ["Sujeito","Predicado"]},
            {"label": "Integrantes", "leaves": ["Obj. Direto","Obj. Indireto","Compl. Nominal","Ag. da Passiva"]},
            {"label": "Acessórios",  "leaves": ["Adj. Adnominal","Adj. Adverbial","Aposto","Vocativo"]},
            {"label": "P. Composto", "leaves": ["Coordenação","Subordinação"]},
        ]
    },
    {
        "label": "SEMÂNTICA", "color": "#9b2335", "light": "#ffdde0",
        "angle": math.radians(135),
        "subs": [
            {"label": "Significado",      "leaves": ["Denotação","Conotação"]},
            {"label": "Relações",         "leaves": ["Sinonímia","Antonímia","Homonímia","Polissemia"]},
            {"label": "Figs. Palavras",   "leaves": ["Metáfora","Metonímia","Catacrese","Sinestesia"]},
            {"label": "Figs. Pensamento", "leaves": ["Antítese","Ironia","Hipérbole","Eufemismo"]},
            {"label": "Figs. Construção", "leaves": ["Anáfora","Elipse","Zeugma","Pleonasmo"]},
        ]
    },
]

def bez(x1,y1,x2,y2,color,w,op=0.75):
    dx=(x2-x1)*0.45; dy=(y2-y1)*0.45
    return (f'<path d="M {x1:.1f} {y1:.1f} C {x1+dx:.1f} {y1+dy:.1f},'
            f'{x2-dx:.1f} {y2-dy:.1f},{x2:.1f} {y2:.1f}" '
            f'fill="none" stroke="{color}" stroke-width="{w}" '
            f'stroke-linecap="round" opacity="{op}"/>')

def rrect(x,y,w,h,rx,fill,stroke,sw):
    return (f'<rect x="{x-w/2:.1f}" y="{y-h/2:.1f}" width="{w}" height="{h}" '
            f'rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')

def txt(x,y,s,size,color,weight="normal",family="Georgia, 'Times New Roman', serif",ls="0"):
    return (f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" '
            f'dominant-baseline="central" font-size="{size}" fill="{color}" '
            f'font-weight="{weight}" font-family="{family}" letter-spacing="{ls}">'
            f'{s}</text>')

links = []
nodes = []

# nó central
nodes.append('<ellipse cx="{}" cy="{}" rx="128" ry="62" fill="#1a1a2e"/>'.format(CX,CY))
nodes.append('<ellipse cx="{}" cy="{}" rx="128" ry="62" fill="none" stroke="#c8a96e" stroke-width="2"/>'.format(CX,CY))
nodes.append(txt(CX, CY-10, "GRAMÁTICA", 28, "white", "bold", "Georgia,serif", "3"))
nodes.append(txt(CX, CY+18, "LÍNGUA PORTUGUESA", 12, "#c8a96e", "300",
                 "'Helvetica Neue',Arial,sans-serif", "2"))

for branch in BRANCHES:
    bAngle = branch["angle"]
    bColor = branch["color"]
    bLight = branch["light"]
    bLabel = branch["label"]
    subs   = branch["subs"]

    bx = CX + R1 * math.cos(bAngle)
    by = CY + R1 * math.sin(bAngle)

    links.append(bez(CX, CY, bx, by, bColor, 5))

    # nó nível-1
    nodes.append(rrect(bx, by, 168, 46, 23, bColor, "none", 0))
    nodes.append(txt(bx, by, bLabel, 19, "white", "bold", "Georgia,serif", "1.5"))

    totalLeaves = sum(len(s["leaves"]) for s in subs)
    subStart = bAngle - SECTOR / 2

    for sub in subs:
        nLeaves  = len(sub["leaves"])
        subSpan  = SECTOR * (nLeaves / totalLeaves)
        subAngle = subStart + subSpan / 2
        subStart += subSpan

        sx = CX + R2 * math.cos(subAngle)
        sy = CY + R2 * math.sin(subAngle)

        links.append(bez(bx, by, sx, sy, bColor, 2.5))

        nodes.append(rrect(sx, sy, 152, 38, 19, bLight, bColor, 1.5))
        nodes.append(txt(sx, sy, sub["label"], 15, bColor, "bold"))

        leaves    = sub["leaves"]
        leafSpan  = subSpan * 0.82
        leafStart = subAngle - leafSpan / 2

        for li, leaf in enumerate(leaves):
            leafAngle = leafStart + (li + 0.5) * (leafSpan / len(leaves))
            lx = CX + R3 * math.cos(leafAngle)
            ly = CY + R3 * math.sin(leafAngle)

            links.append(bez(sx, sy, lx, ly, bColor, 1.2, 0.6))

            lw = max(len(leaf) * 8 + 24, 100)
            nodes.append(rrect(lx, ly, lw, 30, 15, "white", bColor, 1.2))
            nodes.append(txt(lx, ly, leaf, 12.5, "#222", "normal",
                             "'Helvetica Neue',Arial,sans-serif"))

W, H = 3200, 2160
svg_parts = []
svg_parts.append(f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">''')
svg_parts.append(f'<rect width="{W}" height="{H}" fill="#faf8f3"/>')
# bordas
svg_parts.append(f'<rect x="18" y="18" width="{W-36}" height="{H-36}" rx="8" fill="none" stroke="#c8a96e" stroke-width="1.5"/>')
svg_parts.append(f'<rect x="28" y="28" width="{W-56}" height="{H-56}" rx="6" fill="none" stroke="#c8a96e" stroke-width="0.5"/>')
# título
svg_parts.append(txt(W//2, 76, "GRAMÁTICA DA LÍNGUA PORTUGUESA", 46, "#1a1a2e", "bold","Georgia,serif","5"))
svg_parts.append(txt(W//2, 110, "MAPA MENTAL · DO MACRO AO MICRO", 15, "#aaa", "300","'Helvetica Neue',Arial,sans-serif","4"))
svg_parts.append(f'<line x1="{W//2-310}" y1="126" x2="{W//2+310}" y2="126" stroke="#c8a96e" stroke-width="0.8"/>')
# legenda
colors = [b["color"] for b in BRANCHES]
labels = [b["label"] for b in BRANCHES]
lx = 560
for i,(c,lb) in enumerate(zip(colors,labels)):
    svg_parts.append(f'<rect x="{lx}" y="148" width="28" height="10" rx="5" fill="{c}"/>')
    svg_parts.append(f'<text x="{lx+34}" y="158" dominant-baseline="central" font-size="13" fill="#555" font-family="\'Helvetica Neue\',Arial,sans-serif" letter-spacing="1">{lb}</text>')
    lx += 220
# links (abaixo dos nós)
svg_parts.extend(links)
svg_parts.extend(nodes)
# rodapé
svg_parts.append(txt(W//2, H-36,
    "“No princípio era o Verbo” — João 1.1 · Academia Brasileira de Letras",
    15, "#bbb", "normal", "Georgia,'Times New Roman',serif"))
svg_parts.append('</svg>')

html = f'''<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8">
<style>
  * {{margin:0;padding:0;box-sizing:border-box}}
  body {{background:#faf8f3}}
  @page {{size:{W}px {H}px;margin:0}}
</style>
</head>
<body>
{"".join(svg_parts)}
</body>
</html>'''

out_html = "/Users/air/Desktop/desenvolvimento/sipen/docs/gramatica-mapa-mental.html"
with open(out_html, "w", encoding="utf-8") as f:
    f.write(html)

print("SVG gerado:", out_html)
print("Elementos:", len(links)+len(nodes), "nós/links")
