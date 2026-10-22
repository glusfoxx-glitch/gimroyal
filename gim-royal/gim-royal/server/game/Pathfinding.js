// =============================================================================
// GIM ROYAL — Grille de collision + A* côté serveur.
// Grille de 0,5 tuile : 36 x 64 cellules en 1V1, 52 x 64 en 2V2.
// - La rivière d'huile est bloquante (sauf ponts) pour les unités au sol.
// - Les "sauteurs" (Adam et sa trottinette) traversent la rivière.
// - Les tours et bâtiments vivants bloquent leur emprise au sol.
// Le chemin brut est lissé par lignes de vue pour des trajectoires naturelles.
// =============================================================================

export const CELL = 0.5;
const SQRT2 = Math.SQRT2;
const MAX_ITER = 8000;

class MinHeap {
  constructor(capacity) {
    this.idx = new Int32Array(capacity);
    this.pri = new Float64Array(capacity);
    this.size = 0;
  }
  clear() {
    this.size = 0;
  }
  push(i, p) {
    if (this.size >= this.idx.length) this.grow();
    let n = this.size++;
    while (n > 0) {
      const parent = (n - 1) >> 1;
      if (this.pri[parent] <= p) break;
      this.idx[n] = this.idx[parent];
      this.pri[n] = this.pri[parent];
      n = parent;
    }
    this.idx[n] = i;
    this.pri[n] = p;
  }
  pop() {
    const top = this.idx[0];
    const lastI = this.idx[--this.size];
    const lastP = this.pri[this.size];
    let n = 0;
    for (;;) {
      let child = 2 * n + 1;
      if (child >= this.size) break;
      if (child + 1 < this.size && this.pri[child + 1] < this.pri[child]) child++;
      if (this.pri[child] >= lastP) break;
      this.idx[n] = this.idx[child];
      this.pri[n] = this.pri[child];
      n = child;
    }
    this.idx[n] = lastI;
    this.pri[n] = lastP;
    return top;
  }
  grow() {
    const idx = new Int32Array(this.idx.length * 2);
    const pri = new Float64Array(this.pri.length * 2);
    idx.set(this.idx);
    pri.set(this.pri);
    this.idx = idx;
    this.pri = pri;
  }
}

export class NavGrid {
  constructor(layout) {
    this.layout = layout;
    this.cols = Math.round(layout.width / CELL);
    this.rows = Math.round(layout.length / CELL);
    const n = this.cols * this.rows;
    this.river = new Uint8Array(n);
    this.obst = new Uint8Array(n);
    this.g = new Float32Array(n);
    this.came = new Int32Array(n);
    this.openStamp = new Uint32Array(n);
    this.closedStamp = new Uint32Array(n);
    this.searchId = 0;
    this.heap = new MinHeap(1024);

    for (let cy = 0; cy < this.rows; cy++) {
      const y = (cy + 0.5) * CELL;
      if (y < layout.riverMin || y >= layout.riverMax) continue;
      for (let cx = 0; cx < this.cols; cx++) {
        const x = (cx + 0.5) * CELL;
        const onBridge = layout.bridges.some((b) => x >= b.xMin && x < b.xMax);
        if (!onBridge) this.river[cy * this.cols + cx] = 1;
      }
    }
  }

  /** structures : [{x, y, half}] (tours et bâtiments vivants) */
  setObstacles(structures) {
    this.obst.fill(0);
    for (const s of structures) {
      const x0 = Math.max(0, Math.floor((s.x - s.half) / CELL));
      const x1 = Math.min(this.cols - 1, Math.ceil((s.x + s.half) / CELL) - 1);
      const y0 = Math.max(0, Math.floor((s.y - s.half) / CELL));
      const y1 = Math.min(this.rows - 1, Math.ceil((s.y + s.half) / CELL) - 1);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) this.obst[cy * this.cols + cx] = 1;
    }
  }

  cellX(x) {
    return Math.floor(x / CELL);
  }
  cellY(y) {
    return Math.floor(y / CELL);
  }
  inside(cx, cy) {
    return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows;
  }
  blockedCell(i, jumper) {
    return this.obst[i] === 1 || (!jumper && this.river[i] === 1);
  }
  isBlocked(x, y, jumper) {
    const cx = this.cellX(x);
    const cy = this.cellY(y);
    if (!this.inside(cx, cy)) return true;
    return this.blockedCell(cy * this.cols + cx, jumper);
  }
  isRiver(x, y) {
    const cx = this.cellX(x);
    const cy = this.cellY(y);
    if (!this.inside(cx, cy)) return false;
    return this.river[cy * this.cols + cx] === 1;
  }

  /** Cellule libre la plus proche (recherche en anneaux). Renvoie des coordonnées monde. */
  nearestWalkable(x, y, jumper) {
    const cx0 = Math.min(this.cols - 1, Math.max(0, this.cellX(x)));
    const cy0 = Math.min(this.rows - 1, Math.max(0, this.cellY(y)));
    if (!this.blockedCell(cy0 * this.cols + cx0, jumper)) return [x, y];
    for (let r = 1; r < 24; r++) {
      let best = null;
      let bestD = Infinity;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const cx = cx0 + dx;
          const cy = cy0 + dy;
          if (!this.inside(cx, cy) || this.blockedCell(cy * this.cols + cx, jumper)) continue;
          const wx = (cx + 0.5) * CELL;
          const wy = (cy + 0.5) * CELL;
          const d = (wx - x) ** 2 + (wy - y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = [wx, wy];
          }
        }
      }
      if (best) return best;
    }
    return [x, y];
  }

  /** Vrai si le segment ne traverse aucune cellule bloquante (échantillonnage fin). */
  lineWalkable(ax, ay, bx, by, jumper) {
    const d = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(d / (CELL * 0.4)));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (this.isBlocked(ax + (bx - ax) * t, ay + (by - ay) * t, jumper)) return false;
    }
    return true;
  }

  /**
   * A* vers n'importe quelle cellule située à moins de `reach` du point cible.
   * Renvoie une liste de points de passage [[x,y], ...] (sans le départ), [] si déjà arrivé,
   * ou null si aucun chemin n'existe.
   */
  findPath(sx, sy, tx, ty, reach, jumper) {
    const cols = this.cols;
    const [fx, fy] = this.nearestWalkable(sx, sy, jumper);
    const scx = Math.min(cols - 1, Math.max(0, this.cellX(fx)));
    const scy = Math.min(this.rows - 1, Math.max(0, this.cellY(fy)));
    const start = scy * cols + scx;
    const reachSq = reach * reach;

    const isGoal = (i) => {
      const x = ((i % cols) + 0.5) * CELL;
      const y = (Math.floor(i / cols) + 0.5) * CELL;
      return (x - tx) ** 2 + (y - ty) ** 2 <= reachSq;
    };
    const heuristic = (i) => {
      const x = ((i % cols) + 0.5) * CELL;
      const y = (Math.floor(i / cols) + 0.5) * CELL;
      const dx = Math.abs(x - tx);
      const dy = Math.abs(y - ty);
      const oct = Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy);
      return Math.max(0, oct - reach);
    };

    if (isGoal(start)) return [];

    const id = ++this.searchId;
    if (id === 0xffffffff) {
      this.openStamp.fill(0);
      this.closedStamp.fill(0);
      this.searchId = 1;
    }
    const sid = this.searchId;
    const heap = this.heap;
    heap.clear();
    this.g[start] = 0;
    this.came[start] = -1;
    this.openStamp[start] = sid;
    heap.push(start, heuristic(start));

    let found = -1;
    let iter = 0;
    while (heap.size > 0 && iter++ < MAX_ITER) {
      const cur = heap.pop();
      if (this.closedStamp[cur] === sid) continue;
      this.closedStamp[cur] = sid;
      if (isGoal(cur)) {
        found = cur;
        break;
      }
      const cx = cur % cols;
      const cy = Math.floor(cur / cols);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (!this.inside(nx, ny)) continue;
          const ni = ny * cols + nx;
          if (this.closedStamp[ni] === sid || this.blockedCell(ni, jumper)) continue;
          if (dx !== 0 && dy !== 0) {
            // pas de coupe de coin en diagonale
            if (this.blockedCell(cy * cols + nx, jumper) || this.blockedCell(ny * cols + cx, jumper)) continue;
          }
          const cost = this.g[cur] + (dx !== 0 && dy !== 0 ? SQRT2 * CELL : CELL);
          if (this.openStamp[ni] !== sid || cost < this.g[ni]) {
            this.openStamp[ni] = sid;
            this.g[ni] = cost;
            this.came[ni] = cur;
            heap.push(ni, cost + heuristic(ni));
          }
        }
      }
    }
    if (found < 0) return null;

    const cells = [];
    for (let c = found; c !== -1 && c !== start; c = this.came[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => [((c % cols) + 0.5) * CELL, (Math.floor(c / cols) + 0.5) * CELL]);
    return this.smooth(pts, fx, fy, jumper);
  }

  /** Lissage glouton : on saute au point le plus lointain encore visible. */
  smooth(points, sx, sy, jumper) {
    if (points.length <= 1) return points;
    const out = [];
    let cx = sx;
    let cy = sy;
    let i = 0;
    while (i < points.length) {
      let j = i;
      while (j + 1 < points.length && this.lineWalkable(cx, cy, points[j + 1][0], points[j + 1][1], jumper)) j++;
      out.push(points[j]);
      cx = points[j][0];
      cy = points[j][1];
      i = j + 1;
    }
    return out;
  }
}
