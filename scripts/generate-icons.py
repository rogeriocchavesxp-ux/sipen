#!/usr/bin/env python3
"""Gera ícones PWA do SIPEN em múltiplos tamanhos usando apenas stdlib Python."""
import struct, zlib, math, os

# ── Paleta ───────────────────────────────────────────────────────────────────
BG    = (24, 27, 30)    # #181b1e  fundo escuro
GREEN = (58, 170, 92)   # #3aaa5c  verde IPPenha
WHITE = (255, 255, 255) # #ffffff  letra S

# ── Bitmap "S" 7×7 ──────────────────────────────────────────────────────────
# Lido linha a linha, da esquerda para a direita
S_BITMAP = [
    [0,1,1,1,1,1,0],   # topo do arco superior
    [1,0,0,0,0,0,1],   # cantos do arco superior
    [1,0,0,0,0,0,0],   # lado esquerdo descendo
    [0,1,1,1,1,1,0],   # barra central
    [0,0,0,0,0,0,1],   # lado direito descendo
    [1,0,0,0,0,0,1],   # cantos do arco inferior
    [0,1,1,1,1,1,0],   # base do arco inferior
]
S_ROWS = S_COLS = 7

# ── Funções auxiliares ────────────────────────────────────────────────────────

def in_rrect(x, y, rx, ry, rw, rh, r):
    """Retorna True se (x,y) está dentro de um retângulo arredondado."""
    if not (rx <= x < rx + rw and ry <= y < ry + rh):
        return False
    cx = max(rx + r, min(x, rx + rw - r))
    cy = max(ry + r, min(y, ry + rh - r))
    return math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= r


def make_pixels(size, maskable=False):
    pixels = [BG] * (size * size)

    if maskable:
        # Fundo verde sólido preenchendo todo o ícone
        pixels = [GREEN] * (size * size)
        # S branco centralizado em 55% do canvas
        cell     = max(1, int(size * 0.55) // S_COLS)
        actual_w = cell * S_COLS
        actual_h = cell * S_ROWS
        ox = (size - actual_w) // 2
        oy = (size - actual_h) // 2
    else:
        # Fundo escuro + retângulo arredondado verde
        pad    = max(2, int(size * 0.14))
        rx, ry = pad, pad
        rw = rh = size - 2 * pad
        radius  = max(2, int(rw * 0.22))
        for y in range(ry, ry + rh):
            for x in range(rx, rx + rw):
                if in_rrect(x, y, rx, ry, rw, rh, radius):
                    pixels[y * size + x] = GREEN
        # S branco em 60% do retângulo verde
        cell     = max(1, int(rw * 0.60) // S_COLS) if size >= 48 else 0
        actual_w = cell * S_COLS
        actual_h = cell * S_ROWS
        ox = rx + (rw - actual_w) // 2
        oy = ry + (rh - actual_h) // 2

    if cell > 0:
        for row in range(S_ROWS):
            for col in range(S_COLS):
                if S_BITMAP[row][col]:
                    for py in range(cell):
                        for px in range(cell):
                            ix = ox + col * cell + px
                            iy = oy + row * cell + py
                            if 0 <= ix < size and 0 <= iy < size:
                                pixels[iy * size + ix] = WHITE
    return pixels


def write_png(path, size, pixels):
    def chunk(tag, data):
        payload = tag + data
        return struct.pack('>I', len(data)) + payload + struct.pack('>I', zlib.crc32(payload) & 0xFFFFFFFF)

    raw = bytearray()
    for y in range(size):
        raw.append(0)   # filtro None por linha
        for x in range(size):
            raw.extend(pixels[y * size + x])

    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', idat))
        f.write(chunk(b'IEND', b''))

    kb = os.path.getsize(path) // 1024
    print(f'  {os.path.basename(path):<30} {size:>4}×{size:<4}  {kb} KB')


# ── Geração ───────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    out_dir = os.path.join(os.path.dirname(__file__), '..', 'icons')
    os.makedirs(out_dir, exist_ok=True)

    print('Gerando ícones SIPEN...')

    for size in [16, 32, 48, 72, 96, 128, 192, 512]:
        write_png(os.path.join(out_dir, f'icon-{size}.png'), size, make_pixels(size))

    write_png(os.path.join(out_dir, 'apple-touch-icon.png'), 180, make_pixels(180))

    for size in [192, 512]:
        write_png(os.path.join(out_dir, f'maskable-{size}.png'), size, make_pixels(size, maskable=True))

    print('\nPronto!')
