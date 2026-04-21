/* ══════════════════════════════════════════════════════════════
   Map Coloring Game — script.js
   Full JavaScript conversion of the Java project:
     • GameState.java
     • MapGenerator.java
     • DivideAndConquer.java
     • BacktrackingSolver.java
     • GreedyDSATURSolver.java
     • DynamicProgrammingSolver.java
     • DivideAndConquerSolver.java
     • StrategyFactory.java
     • game.java
     • MapUI.java  (+ MapPanel inner class)
     • StartMenu.java
   ══════════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════════════
   § 1 — GameState
   Mirrors: GameState.java
   ══════════════════════════════════════════════════════════════ */
class GameState {
  static EMPTY      = 0;
  static RED        = 1;
  static GREEN      = 2;
  static BROWN      = 3;
  static NUM_COLORS = 3;           // colours 1..3

  /**
   * @param {number} width
   * @param {number} height
   * @param {number} numRegions
   */
  constructor(width, height, numRegions) {
    this.width      = width;
    this.height     = height;
    this.numRegions = numRegions;

    // 2-D grid [y][x] → region id (1-indexed)
    this.regions = Array.from({ length: height }, () => new Array(width).fill(0));

    // region colour assignments (1-indexed slot 0 unused)
    this.regionColors = new Array(numRegions + 1).fill(GameState.EMPTY);

    // adjacency[r1][r2] = boolean (1-indexed)
    this.adjacency = Array.from({ length: numRegions + 1 }, () =>
      new Array(numRegions + 1).fill(false));

    // hint dots between regions
    this.hints = Array.from({ length: numRegions + 1 }, () =>
      new Array(numRegions + 1).fill(false));
  }

  /** Sets the region id for grid cell (x, y). */
  setRegion(x, y, regionId) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.regions[y][x] = regionId;
    }
  }

  /** Gets the region id at grid cell (x, y). */
  getRegion(x, y) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.regions[y][x];
    }
    return 0;
  }

  /** Sets symmetric adjacency between two regions. */
  setAdjacency(region1, region2, adjacent) {
    if (region1 > 0 && region1 <= this.numRegions &&
        region2 > 0 && region2 <= this.numRegions) {
      this.adjacency[region1][region2] = adjacent;
      this.adjacency[region2][region1] = adjacent;
    }
  }

  /** Returns true if region1 and region2 are adjacent. */
  areAdjacent(region1, region2) {
    if (region1 > 0 && region1 <= this.numRegions &&
        region2 > 0 && region2 <= this.numRegions) {
      return this.adjacency[region1][region2];
    }
    return false;
  }

  /**
   * Assigns a colour to a region (no adjacency-constraint check here).
   * Returns true on success, false on invalid args or overwrite attempt.
   */
  setRegionColor(regionId, color) {
    if (regionId < 1 || regionId > this.numRegions) return false;
    if (color < GameState.EMPTY || color > GameState.NUM_COLORS) return false;

    // Don't overwrite an already-coloured region (unless clearing)
    if (this.regionColors[regionId] !== GameState.EMPTY && color !== GameState.EMPTY) {
      return false;
    }

    this.regionColors[regionId] = color;
    return true;
  }

  /** Returns true if placing `color` on `regionId` would be adjacent to the same colour. */
  wouldBeAdjacentToSameColor(regionId, color) {
    if (regionId < 1 || regionId > this.numRegions || color === GameState.EMPTY) return false;

    for (let other = 1; other <= this.numRegions; other++) {
      if (other !== regionId &&
          this.areAdjacent(regionId, other) &&
          this.regionColors[other] === color) {
        return true;   // conflict
      }
    }
    return false;       // safe
  }

  /** Returns the colour assigned to `regionId`, or EMPTY. */
  getRegionColor(regionId) {
    if (regionId < 1 || regionId > this.numRegions) return GameState.EMPTY;
    return this.regionColors[regionId];
  }

  /** Toggles a hint dot between two regions. */
  toggleHint(region1, region2) {
    if (region1 > 0 && region1 <= this.numRegions &&
        region2 > 0 && region2 <= this.numRegions) {
      this.hints[region1][region2] = !this.hints[region1][region2];
      this.hints[region2][region1] =  this.hints[region1][region2];
    }
  }

  /** Returns true if there is a hint between the two regions. */
  hasHint(region1, region2) {
    if (region1 > 0 && region1 <= this.numRegions &&
        region2 > 0 && region2 <= this.numRegions) {
      return this.hints[region1][region2];
    }
    return false;
  }

  /**
   * Returns true if no two adjacent coloured regions share the same colour.
   * (Uncoloured regions are ignored.)
   */
  isValid() {
    for (let r1 = 1; r1 <= this.numRegions; r1++) {
      const c1 = this.regionColors[r1];
      if (c1 === GameState.EMPTY) continue;

      for (let r2 = r1 + 1; r2 <= this.numRegions; r2++) {
        const c2 = this.regionColors[r2];
        if (c2 === GameState.EMPTY) continue;

        if (this.areAdjacent(r1, r2) && c1 === c2) return false;
      }
    }
    return true;
  }

  /** Returns true when every region is coloured AND the colouring is valid. */
  isComplete() {
    for (let r = 1; r <= this.numRegions; r++) {
      if (this.regionColors[r] === GameState.EMPTY) return false;
    }
    return this.isValid();
  }

  /**
   * Returns the list of colour ids (1..NUM_COLORS) that can legally be
   * assigned to `regionId` without causing an adjacency conflict.
   * @returns {number[]}
   */
  getValidColors(regionId) {
    const validColors = [];
    if (regionId < 1 || regionId > this.numRegions) return validColors;

    for (let color = 1; color <= GameState.NUM_COLORS; color++) {
      let valid = true;
      for (let other = 1; other <= this.numRegions; other++) {
        if (this.areAdjacent(regionId, other) && this.regionColors[other] === color) {
          valid = false;
          break;
        }
      }
      if (valid) validColors.push(color);
    }
    return validColors;
  }

  /** Returns all region ids adjacent to `region` as an array. */
  getAdjRegions(region) {
    if (region < 1 || region > this.numRegions) return [];
    const result = [];
    for (let r = 1; r <= this.numRegions; r++) {
      if (r !== region && this.adjacency[region][r]) result.push(r);
    }
    return result;
  }

  /** Deep-copies this GameState. */
  copy() {
    const c = new GameState(this.width, this.height, this.numRegions);

    // Copy 2-D grid
    for (let y = 0; y < this.height; y++) {
      c.regions[y] = [...this.regions[y]];
    }

    // Copy colour assignments
    c.regionColors = [...this.regionColors];

    // Copy adjacency matrix
    c.adjacency = this.adjacency.map(row => [...row]);

    // Copy hints
    c.hints = this.hints.map(row => [...row]);

    return c;
  }

  /** How many regions are currently (validly) coloured. */
  countColored() {
    let count = 0;
    for (let r = 1; r <= this.numRegions; r++) {
      if (this.regionColors[r] !== GameState.EMPTY) count++;
    }
    return count;
  }
}

/* ══════════════════════════════════════════════════════════════
   § 2 — MapGenerator
   Mirrors: MapGenerator.java
   Uses Voronoi-like region growing (BFS from random seed points).
   ══════════════════════════════════════════════════════════════ */
class MapGenerator {
  /** @param {number|null} seed */
  constructor(seed = null) {
    // Seeded PRNG (mulberry32) for reproducibility if seed is supplied,
    // otherwise use Math.random.
    if (seed !== null) {
      let s = seed;
      this._rand = () => {
        s |= 0; s = s + 0x6d2b79f5 | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    } else {
      this._rand = () => Math.random();
    }
  }

  /** @returns {number} Random integer in [0, max) */
  _nextInt(max) { return Math.floor(this._rand() * max); }

  /**
   * Generates a complete map puzzle.
   * @param {number} width
   * @param {number} height
   * @param {number} numRegions
   * @returns {GameState}
   */
  generateMap(width, height, numRegions) {
    const state = new GameState(width, height, numRegions);
    this._generateRegions(state);
    this._setupAdjacency(state);
    return state;
  }

  /** Grows irregular regions via Voronoi-like BFS expansion. */
  _generateRegions(state) {
    const { width, height, numRegions } = state;

    // 1. Place seed points (spaced apart)
    const seedPoints = [];
    for (let i = 0; i < numRegions; i++) {
      let seed, attempts = 0;
      do {
        seed = { x: this._nextInt(width), y: this._nextInt(height) };
        attempts++;
      } while (this._isTooClose(seed, seedPoints) && attempts < 100);

      seedPoints.push(seed);
      state.setRegion(seed.x, seed.y, i + 1);  // Region ids are 1-indexed
    }

    // 2. BFS queue initialised with seeds
    const assigned = Array.from({ length: height }, () => new Array(width).fill(false));
    for (const s of seedPoints) assigned[s.y][s.x] = true;

    const queue = [...seedPoints];

    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];

    while (queue.length > 0) {
      const cur = queue.shift();
      const regionId = state.getRegion(cur.x, cur.y);

      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;

        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !assigned[ny][nx]) {
          if (this._shouldAssign(nx, ny, regionId, seedPoints)) {
            state.setRegion(nx, ny, regionId);
            assigned[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    // 3. Assign any leftover unassigned cells to nearest seed
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (state.getRegion(x, y) === 0) {
          const nearest = this._findNearest(x, y, seedPoints);
          if (nearest > 0) state.setRegion(x, y, nearest);
        }
      }
    }
  }

  _isTooClose(newSeed, existing) {
    const MIN_D = 3;
    for (const e of existing) {
      if (Math.abs(newSeed.x - e.x) + Math.abs(newSeed.y - e.y) < MIN_D) return true;
    }
    return false;
  }

  _shouldAssign(x, y, regionId, seedPoints) {
    const seed = seedPoints[regionId - 1];
    const curDist = this._dist(x, y, seed.x, seed.y);

    for (let i = 0; i < seedPoints.size; i++) {
      if (i + 1 === regionId) continue;
      if (this._dist(x, y, seedPoints[i].x, seedPoints[i].y) < curDist) return false;
    }
    return true;
  }

  _findNearest(x, y, seedPoints) {
    let nearest = 0, minDist = Infinity;
    for (let i = 0; i < seedPoints.length; i++) {
      const d = this._dist(x, y, seedPoints[i].x, seedPoints[i].y);
      if (d < minDist) { minDist = d; nearest = i + 1; }
    }
    return nearest;
  }

  _dist(x1, y1, x2, y2) {
    return Math.sqrt((x1-x2)**2 + (y1-y2)**2);
  }

  /** Scans adjacent grid cells to find region boundary pairs. */
  _setupAdjacency(state) {
    const { width, height, numRegions } = state;
    for (let r1 = 1; r1 <= numRegions; r1++) {
      for (let r2 = r1 + 1; r2 <= numRegions; r2++) {
        if (this._regionsAreAdjacent(r1, r2, state, width, height)) {
          state.setAdjacency(r1, r2, true);
        }
      }
    }
  }

  _regionsAreAdjacent(r1, r2, state, width, height) {
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (state.getRegion(x, y) === r1) {
          for (const [dx, dy] of dirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              if (state.getRegion(nx, ny) === r2) return true;
            }
          }
        }
      }
    }
    return false;
  }
}

/* ══════════════════════════════════════════════════════════════
   § 3 — DivideAndConquer utilities
   Mirrors: DivideAndConquer.java
   Provides: mergeSort, quickSort, region-ordering heuristics,
             findBestMove, findBestMoveForColor, solvePuzzleDnC
   ══════════════════════════════════════════════════════════════ */
class DivideAndConquer {

  /* ---- Public sorting routines ---- */

  /** In-place Merge Sort. O(n log n). */
  static mergeSort(arr) {
    if (arr.length <= 1) return;
    DivideAndConquer._mergeSortRange(arr, 0, arr.length - 1);
  }

  static _mergeSortRange(a, l, h) {
    if (l >= h) return;
    const m = Math.floor((l + h) / 2);
    DivideAndConquer._mergeSortRange(a, l, m);
    DivideAndConquer._mergeSortRange(a, m + 1, h);
    DivideAndConquer._merge(a, l, m, h);
  }

  static _merge(a, l, m, h) {
    const left  = a.slice(l, m + 1);
    const right = a.slice(m + 1, h + 1);
    let i = 0, j = 0, k = l;
    while (i < left.length && j < right.length) {
      a[k++] = left[i] <= right[j] ? left[i++] : right[j++];
    }
    while (i < left.length) a[k++] = left[i++];
    while (j < right.length) a[k++] = right[j++];
  }

  /** In-place Quick Sort. Average O(n log n). */
  static quickSort(arr) {
    if (arr.length <= 1) return;
    DivideAndConquer._quickSortRange(arr, 0, arr.length - 1);
  }

  static _quickSortRange(a, l, h) {
    if (l >= h) return;
    const p = DivideAndConquer._partition(a, l, h);
    DivideAndConquer._quickSortRange(a, l, p - 1);
    DivideAndConquer._quickSortRange(a, p + 1, h);
  }

  static _partition(a, l, h) {
    const pivot = a[h];
    let i = l - 1;
    for (let j = l; j < h; j++) {
      if (a[j] <= pivot) {
        i++;
        [a[i], a[j]] = [a[j], a[i]];
      }
    }
    [a[i + 1], a[h]] = [a[h], a[i + 1]];
    return i + 1;
  }

  /* ---- Heuristics ---- */

  /**
   * Saturation = number of distinct colours among coloured neighbours.
   * @param {GameState} s
   * @param {number} r  region id
   */
  static _saturation(s, r) {
    const used = new Set();
    for (const adj of s.getAdjRegions(r)) {
      const c = s.getRegionColor(adj);
      if (c !== GameState.EMPTY) used.add(c);
    }
    return used.size;
  }

  /**
   * Scoring function: combines saturation and degree.
   * Higher is better.
   */
  static _score(s, r, _c) {
    return DivideAndConquer._saturation(s, r) * 100 +
           s.getAdjRegions(r).length * 10;
  }

  /* ---- Core public methods ---- */

  /**
   * Returns sorted array of uncoloured region ids.
   * Sort: Merge Sort (ascending ids). O(n log n).
   * @param {GameState} state
   * @returns {number[]}
   */
  static getUncoloredRegions(state) {
    const list = [];
    for (let r = 1; r <= state.numRegions; r++) {
      if (state.getRegionColor(r) === GameState.EMPTY) list.push(r);
    }
    DivideAndConquer.mergeSort(list);
    return list;
  }

  /**
   * Sort regions by saturation (desc), then degree (desc) as tiebreaker.
   * @param {GameState} s
   * @param {number[]} arr
   * @returns {number[]}
   */
  static _sortBySaturation(s, arr) {
    return [...arr].sort((a, b) => {
      const satDiff = DivideAndConquer._saturation(s, b) - DivideAndConquer._saturation(s, a);
      if (satDiff !== 0) return satDiff;
      return s.getAdjRegions(b).length - s.getAdjRegions(a).length;
    });
  }

  /**
   * Sort regions by degree (desc).
   * @param {GameState} s
   * @param {number[]} arr
   * @returns {number[]}
   */
  static _sortByDegree(s, arr) {
    return [...arr].sort((a, b) =>
      s.getAdjRegions(b).length - s.getAdjRegions(a).length);
  }

  /**
   * Finds the best (region, color) move.
   * Strategy: sort by saturation, generate valid moves, score each.
   * O(n log n + n·k).
   * @param {GameState} state
   * @returns {{region:number, color:number}|null}
   */
  static findBestMove(state) {
    const regions = DivideAndConquer._sortBySaturation(
      state, DivideAndConquer.getUncoloredRegions(state));
    const moves = [];

    for (const r of regions) {
      for (const c of state.getValidColors(r)) {
        moves.push({ region: r, color: c });
      }
    }

    if (moves.length === 0) return null;

    let best = 0, maxScore = -1;
    for (let i = 0; i < moves.length; i++) {
      const sc = DivideAndConquer._score(state, moves[i].region, moves[i].color);
      if (sc > maxScore) { maxScore = sc; best = i; }
    }

    return moves[best];
  }

  /**
   * Finds the best region for a specific colour.
   * Strategy: filter valid regions, Quick Sort, then sort by degree.
   * O(n log n).
   * @param {GameState} state
   * @param {number} color
   * @returns {{region:number, color:number}|null}
   */
  static findBestMoveForColor(state, color) {
    const regions = DivideAndConquer.getUncoloredRegions(state);
    let valid = regions.filter(r => !state.wouldBeAdjacentToSameColor(r, color));

    if (valid.length === 0) return null;

    DivideAndConquer.quickSort(valid);
    valid = DivideAndConquer._sortByDegree(state, valid);

    return { region: valid[0], color };
  }

  /**
   * DSATUR-based region selection: highest saturation, then highest degree.
   * @param {GameState} state
   * @returns {number} region id, or -1 if none
   */
  static findBestRegionDnC(state) {
    let best = -1, maxSat = -1, maxDeg = -1;

    for (const r of DivideAndConquer.getUncoloredRegions(state)) {
      const sat = DivideAndConquer._saturation(state, r);
      const deg = state.getAdjRegions(r).length;

      if (sat > maxSat || (sat === maxSat && deg > maxDeg)) {
        maxSat = sat; maxDeg = deg; best = r;
      }
    }
    return best;
  }

  /**
   * Full greedy DSATUR auto-solve.
   * At each step: pick best region, pick best-scored colour.
   * Overall O(n² log n).
   * @param {GameState} state
   * @returns {boolean} true if solved
   */
  static solvePuzzleDnC(state) {
    while (!state.isComplete()) {
      const r = DivideAndConquer.findBestRegionDnC(state);
      if (r === -1) return false;

      const colors = state.getValidColors(r);
      if (colors.length === 0) return false;

      let bestColor = -1, maxScore = -1;
      for (const c of colors) {
        const sc = DivideAndConquer._score(state, r, c);
        if (sc > maxScore) { maxScore = sc; bestColor = c; }
      }

      state.setRegionColor(r, bestColor);
    }
    return true;
  }
}

/* ══════════════════════════════════════════════════════════════
   § 4 — Move (inner class equivalent of game.Move)
   Mirrors: game.Move (inner static class)
   ══════════════════════════════════════════════════════════════ */
class Move {
  /**
   * @param {number} region
   * @param {number} color
   */
  constructor(region, color) {
    this.region = region;
    this.color  = color;
  }
  toString() { return `Region ${this.region} → Color ${this.color}`; }
}

/* ══════════════════════════════════════════════════════════════
   § 5 — game (AI coordinator)
   Mirrors: game.java
   ══════════════════════════════════════════════════════════════ */
class Game {
  /** @param {GameState} gameState */
  constructor(gameState) {
    this.gameState = gameState;
  }

  /**
   * Makes the best greedy move (DSatur).
   * @returns {boolean}
   */
  makeMove() {
    const move = DivideAndConquer.findBestMove(this.gameState);
    if (!move) return false;
    return this.gameState.setRegionColor(move.region, move.color);
  }

  /**
   * Makes a move for the given colour, avoiding same-colour adjacency.
   * @param {number} color
   * @returns {boolean}
   */
  makeMoveAvoidingSameColor(color) {
    const move = DivideAndConquer.findBestMoveForColor(this.gameState, color);
    if (!move) return false;
    return this.gameState.setRegionColor(move.region, move.color);
  }

  /**
   * Fully solves the puzzle via Divide & Conquer.
   * @returns {boolean}
   */
  solvePuzzle() {
    return DivideAndConquer.solvePuzzleDnC(this.gameState);
  }

  /**
   * Returns hint move without applying it.
   * @returns {Move|null}
   */
  getHint() {
    return DivideAndConquer.findBestMove(this.gameState);
  }
}

/* ══════════════════════════════════════════════════════════════
   § 6 — Solving algorithm strategies (Strategy Pattern)
   Mirrors: MapColoringStrategy.java interface + implementations
   ══════════════════════════════════════════════════════════════ */

/** Base class for all strategies (mirrors MapColoringStrategy interface). */
class MapColoringStrategy {
  constructor() {
    this.executionTime = 0;
    this._statistics   = '';
  }
  /** @param {GameState} state @returns {boolean} */
  solve(state)      { return false; }
  getAlgorithmName()  { return 'Unknown'; }
  getTimeComplexity() { return '?'; }
  getSpaceComplexity(){ return '?'; }
  getExecutionTime()  { return this.executionTime; }
  getStatistics()    { return this._statistics; }
}

/* ─── 6a. Greedy DSATUR ─── */
class GreedyDSATURSolver extends MapColoringStrategy {

  solve(state) {
    const t0 = performance.now();
    let regionsColored = 0;
    const result = this._solvePuzzleGreedy(state, () => { regionsColored++; });
    this.executionTime = Math.round(performance.now() - t0);
    this._statistics = `Regions colored: ${regionsColored}, Total regions: ${state.numRegions}`;
    return result;
  }

  _solvePuzzleGreedy(state, onColor) {
    const maxIterations = state.numRegions * 10;
    let iterations = 0;

    while (!state.isComplete() && iterations < maxIterations) {
      iterations++;
      const best = this._findBestRegion(state);
      if (best === -1) return false;

      const validColors = state.getValidColors(best);
      if (validColors.length === 0) return false;

      // Greedy: pick first valid colour
      state.setRegionColor(best, validColors[0]);
      if (onColor) onColor();
    }

    return state.isComplete() && state.isValid();
  }

  _findBestRegion(state) {
    let bestRegion = -1, maxSat = -1, maxDeg = -1;
    for (let r = 1; r <= state.numRegions; r++) {
      if (state.getRegionColor(r) !== GameState.EMPTY) continue;

      const sat = this._saturation(state, r);
      const deg = state.getAdjRegions(r).length;

      if (sat > maxSat || (sat === maxSat && deg > maxDeg)) {
        maxSat = sat; maxDeg = deg; bestRegion = r;
      }
    }
    return bestRegion;
  }

  _saturation(state, region) {
    const used = new Set();
    for (const adj of state.getAdjRegions(region)) {
      const c = state.getRegionColor(adj);
      if (c !== GameState.EMPTY) used.add(c);
    }
    return used.size;
  }

  getAlgorithmName()  { return 'Greedy — DSATUR'; }
  getTimeComplexity() { return 'O(n² × k) where n = regions, k = colors'; }
  getSpaceComplexity(){ return 'O(n) for adjacency and color storage'; }
}

/* ─── 6b. Divide & Conquer Solver ─── */
class DivideAndConquerSolver extends MapColoringStrategy {

  solve(state) {
    const t0 = performance.now();
    const result = DivideAndConquer.solvePuzzleDnC(state);

    let regionsColored = 0;
    for (let r = 1; r <= state.numRegions; r++) {
      if (state.getRegionColor(r) !== GameState.EMPTY) regionsColored++;
    }

    this.executionTime = Math.round(performance.now() - t0);
    this._statistics = `Regions colored: ${regionsColored}, Total regions: ${state.numRegions}, Uses Merge Sort and Quick Sort for region ordering`;
    return result;
  }

  getAlgorithmName()  { return 'Divide & Conquer (Sorting)'; }
  getTimeComplexity() { return 'O(n² log n) where n = number of regions'; }
  getSpaceComplexity(){ return 'O(n) for adjacency matrix and recursion stack'; }
}

/* ─── 6c. Dynamic Programming Solver ─── */
class DynamicProgrammingSolver extends MapColoringStrategy {

  solve(state) {
    const t0 = performance.now();
    this._dpStates = 0;

    // Memoization table: key (string) → boolean
    this._memo = new Map();

    // Cache valid colours per region up-front
    this._validColorsCache = new Map();
    for (let r = 1; r <= state.numRegions; r++) {
      this._validColorsCache.set(r, state.getValidColors(r));
    }

    const result = this._solveDP(state, 0n, 0);

    this.executionTime = Math.round(performance.now() - t0);
    this._statistics = `DP States explored: ${this._dpStates}, Memo table size: ${this._memo.size}, Regions: ${state.numRegions}`;
    return result;
  }

  /**
   * Recursive DP with bitmask memoization.
   * @param {GameState} state
   * @param {BigInt}    coloredMask  bitmask of colored regions
   * @param {number}    lastColored
   * @returns {boolean}
   */
  _solveDP(state, coloredMask, lastColored) {
    const numRegions = state.numRegions;
    const fullMask   = (1n << BigInt(numRegions)) - 1n;

    if (coloredMask === fullMask) return true;

    const key = coloredMask.toString() + ':' + lastColored;
    if (this._memo.has(key)) return this._memo.get(key);

    this._dpStates++;

    for (let region = 1; region <= numRegions; region++) {
      const regionBit = 1n << BigInt(region - 1);
      if ((coloredMask & regionBit) !== 0n) continue;   // already colored

      const validColors = this._validColorsCache.get(region);

      for (const color of validColors) {
        if (!this._isValidPlacement(state, region, color, coloredMask)) continue;

        state.setRegionColor(region, color);
        const ok = this._solveDP(state, coloredMask | regionBit, region);
        state.setRegionColor(region, GameState.EMPTY);  // backtrack

        if (ok) {
          this._memo.set(key, true);
          // Re-apply the final solution (re-run without clearing)
          state.setRegionColor(region, color);
          this._resolveRemaining(state, coloredMask | regionBit, region);
          return true;
        }
      }
    }

    this._memo.set(key, false);
    return false;
  }

  _isValidPlacement(state, region, color, coloredMask) {
    for (const adj of state.getAdjRegions(region)) {
      const adjBit = 1n << BigInt(adj - 1);
      if ((coloredMask & adjBit) !== 0n) {
        if (state.getRegionColor(adj) === color) return false;
      }
    }
    return true;
  }

  /** After finding a solution, fill remaining regions. */
  _resolveRemaining(state, coloredMask, lastColored) {
    const numRegions = state.numRegions;
    for (let region = 1; region <= numRegions; region++) {
      const regionBit = 1n << BigInt(region - 1);
      if ((coloredMask & regionBit) !== 0n) continue;
      const validColors = state.getValidColors(region);
      if (validColors.length > 0) {
        state.setRegionColor(region, validColors[0]);
        coloredMask |= regionBit;
      }
    }
  }

  getAlgorithmName()  { return 'Dynamic Programming'; }
  getTimeComplexity() { return 'O(kⁿ) worst case, reduced by memoization'; }
  getSpaceComplexity(){ return 'O(kⁿ) for memo table in worst case'; }
}

/* ─── 6d. Backtracking Solver ─── */
class BacktrackingSolver extends MapColoringStrategy {

  solve(state) {
    const t0 = performance.now();
    this._calls   = 0;
    this._maxDepth= 0;

    const result = this._backtrack(state, 0);

    this.executionTime = Math.round(performance.now() - t0);
    this._statistics = `Recursive calls: ${this._calls}, Max recursion depth: ${this._maxDepth}, Regions: ${state.numRegions}`;
    return result;
  }

  /**
   * Recursive backtracking.
   * @param {GameState} state
   * @param {number}    depth
   * @returns {boolean}
   */
  _backtrack(state, depth) {
    if (depth > this._maxDepth) this._maxDepth = depth;
    if (state.isComplete()) return true;

    const region = this._findUncolored(state);
    if (region === -1) return false;

    for (const color of state.getValidColors(region)) {
      this._calls++;
      state.setRegionColor(region, color);

      if (this._backtrack(state, depth + 1)) return true;

      state.setRegionColor(region, GameState.EMPTY);  // backtrack
    }

    return false;
  }

  _findUncolored(state) {
    for (let r = 1; r <= state.numRegions; r++) {
      if (state.getRegionColor(r) === GameState.EMPTY) return r;
    }
    return -1;
  }

  getAlgorithmName()  { return 'Backtracking'; }
  getTimeComplexity() { return 'O(kⁿ) where k = colors, n = regions'; }
  getSpaceComplexity(){ return 'O(n) recursion stack depth'; }
}

/* ══════════════════════════════════════════════════════════════
   § 7 — StrategyFactory
   Mirrors: StrategyFactory.java
   ══════════════════════════════════════════════════════════════ */
const StrategyFactory = (() => {
  const ALGO_MAP = {
    'greedy':          { label: 'Greedy — DSATUR',          ctor: GreedyDSATURSolver },
    'divide_conquer':  { label: 'Divide & Conquer (Sorting)', ctor: DivideAndConquerSolver },
    'dp':              { label: 'Dynamic Programming',       ctor: DynamicProgrammingSolver },
    'backtracking':    { label: 'Backtracking',              ctor: BacktrackingSolver },
  };

  return {
    /** @param {string} id @returns {MapColoringStrategy} */
    getStrategy(id) {
      const entry = ALGO_MAP[id] || ALGO_MAP['greedy'];
      return new entry.ctor();
    },
    /** @param {string} id @returns {string} */
    getDisplayName(id) {
      return (ALGO_MAP[id] || ALGO_MAP['greedy']).label;
    },
    getAll() { return Object.entries(ALGO_MAP).map(([id, e]) => ({ id, label: e.label })); }
  };
})();

/* ══════════════════════════════════════════════════════════════
   § 8 — Canvas Renderer
   Mirrors: MapPanel (inner class of MapUI.java)
   Renders the grid map onto an HTML5 <canvas>.
   ══════════════════════════════════════════════════════════════ */
class MapRenderer {
  static CELL_SIZE = 24;   // pixels per grid cell

  // Colour palette (index matches GameState colour ids)
  static REGION_COLORS = [
    null,              // 0 = EMPTY (handled separately)
    { dark: '#dc2626', light: '#f87171' },   // 1 = RED
    { dark: '#16a34a', light: '#4ade80' },   // 2 = GREEN
    { dark: '#b45309', light: '#d97706' },   // 3 = BROWN
  ];
  static EMPTY_FILL  = '#d0d7e3';
  static EMPTY_DARK  = '#a0aab8';
  static GRID_COLOR  = '#2d3748';

  /** @param {HTMLCanvasElement} canvas @param {GameState} state */
  constructor(canvas, state) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.state  = state;
    this.resize();
  }

  /** Updates `state` reference (called on new game). */
  setState(state) { this.state = state; this.resize(); }

  /** Resizes canvas to fit the grid. */
  resize() {
    const cs = MapRenderer.CELL_SIZE;
    this.canvas.width  = this.state.width  * cs;
    this.canvas.height = this.state.height * cs;
  }

  /** Full repaint — mirrors MapPanel.paintComponent. */
  render() {
    const { ctx, state } = this;
    const cs = MapRenderer.CELL_SIZE;
    const W  = state.width * cs;
    const H  = state.height * cs;

    ctx.clearRect(0, 0, W, H);

    // ── Pass 1: fill region cells ──────────────────────────────
    const visited = Array.from({ length: state.height }, () =>
      new Array(state.width).fill(false));

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const regionId = state.getRegion(x, y);
        if (regionId > 0 && !visited[y][x]) {
          this._drawRegion(regionId, x, y, visited);
        }
      }
    }

    // ── Pass 2: region boundaries ──────────────────────────────
    this._drawBoundaries();

    // ── Pass 3: region labels (numbers in center) ──────────────
    this._drawLabels(visited);
  }

  /** Flood-fills all cells of `regionId` and paints them. */
  _drawRegion(regionId, startX, startY, visited) {
    const { ctx, state } = this;
    const cs = MapRenderer.CELL_SIZE;

    // Collect cells
    const cells = [];
    this._floodFill(regionId, startX, startY, visited, cells);
    if (cells.length === 0) return;

    const colorId = state.getRegionColor(regionId);
    const palette = MapRenderer.REGION_COLORS[colorId];

    // Bounding box for gradient
    let minY = Infinity, maxY = -Infinity;
    for (const { x, y } of cells) {
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const gy0 = minY * cs;
    const gy1 = (maxY + 1) * cs;

    // Build fill: gradient if coloured, flat grey if empty
    let fillStyle;
    if (colorId === GameState.EMPTY || !palette) {
      fillStyle = MapRenderer.EMPTY_FILL;
    } else {
      const grad = ctx.createLinearGradient(0, gy0, 0, gy1);
      grad.addColorStop(0, palette.light);
      grad.addColorStop(1, palette.dark);
      fillStyle = grad;
    }

    ctx.fillStyle = fillStyle;
    for (const { x, y } of cells) {
      ctx.fillRect(x * cs, y * cs, cs, cs);
    }
  }

  /** BFS flood-fill collecting all cells of the given region. */
  _floodFill(regionId, x, y, visited, cells) {
    const stack = [{ x, y }];
    const { state } = this;
    while (stack.length > 0) {
      const { x: cx, y: cy } = stack.pop();
      if (cx < 0 || cx >= state.width || cy < 0 || cy >= state.height) continue;
      if (visited[cy][cx]) continue;
      if (state.getRegion(cx, cy) !== regionId) continue;

      visited[cy][cx] = true;
      cells.push({ x: cx, y: cy });

      stack.push({ x: cx + 1, y: cy });
      stack.push({ x: cx - 1, y: cy });
      stack.push({ x: cx, y: cy + 1 });
      stack.push({ x: cx, y: cy - 1 });
    }
  }

  /** Draws thick borders between different regions. */
  _drawBoundaries() {
    const { ctx, state } = this;
    const cs = MapRenderer.CELL_SIZE;

    ctx.strokeStyle = MapRenderer.GRID_COLOR;
    ctx.lineWidth   = 1.5;

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const region = state.getRegion(x, y);
        if (region === 0) continue;

        // Right border
        if (x + 1 < state.width && state.getRegion(x + 1, y) !== region) {
          ctx.beginPath();
          ctx.moveTo((x + 1) * cs, y * cs);
          ctx.lineTo((x + 1) * cs, (y + 1) * cs);
          ctx.stroke();
        }
        // Bottom border
        if (y + 1 < state.height && state.getRegion(x, y + 1) !== region) {
          ctx.beginPath();
          ctx.moveTo(x * cs, (y + 1) * cs);
          ctx.lineTo((x + 1) * cs, (y + 1) * cs);
          ctx.stroke();
        }
      }
    }

    // Outer border
    ctx.strokeStyle = '#50607e';
    ctx.lineWidth   = 2;
    ctx.strokeRect(0, 0, state.width * cs, state.height * cs);
  }

  /** Draws the region id number at the centroid of each region. */
  _drawLabels(visitedSnapshot) {
    const { ctx, state } = this;
    const cs = MapRenderer.CELL_SIZE;
    const regionCentroids = new Map(); // regionId → {sumX, sumY, count}

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const r = state.getRegion(x, y);
        if (r > 0) {
          if (!regionCentroids.has(r)) regionCentroids.set(r, { sumX: 0, sumY: 0, count: 0 });
          const c = regionCentroids.get(r);
          c.sumX += x; c.sumY += y; c.count++;
        }
      }
    }

    ctx.font      = `bold ${Math.max(8, cs * 0.45)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const [regionId, c] of regionCentroids) {
      const px = (c.sumX / c.count) * cs + cs / 2;
      const py = (c.sumY / c.count) * cs + cs / 2;
      const colorId = state.getRegionColor(regionId);

      // Label contrast: dark on light backgrounds, light on coloured
      ctx.fillStyle = colorId === GameState.EMPTY ? '#475569' : 'rgba(255,255,255,0.85)';
      ctx.shadowColor = colorId === GameState.EMPTY ? 'transparent' : 'rgba(0,0,0,0.5)';
      ctx.shadowBlur  = 2;
      ctx.fillText(regionId.toString(), px, py);
      ctx.shadowBlur = 0;
    }
  }

  /**
   * Translates a canvas pixel click to a region id.
   * @param {number} px  offsetX
   * @param {number} py  offsetY
   * @returns {number} region id (1-indexed) or 0
   */
  regionAt(px, py) {
    const cs = MapRenderer.CELL_SIZE;
    const x  = Math.floor(px / cs);
    const y  = Math.floor(py / cs);
    return this.state.getRegion(x, y);
  }
}

/* ══════════════════════════════════════════════════════════════
   § 9 — Modal helpers (replaces JOptionPane)
   ══════════════════════════════════════════════════════════════ */
function showModal(title, htmlBody) {
  return new Promise(resolve => {
    const overlay  = document.getElementById('modal-overlay');
    const titleEl  = document.getElementById('modal-title');
    const bodyEl   = document.getElementById('modal-body');
    const okBtn    = document.getElementById('modal-ok');
    const closeBtn = document.getElementById('modal-close');

    titleEl.textContent = title;
    bodyEl.innerHTML    = htmlBody;
    overlay.classList.add('open');

    const done = () => { overlay.classList.remove('open'); resolve(); };
    okBtn.onclick    = done;
    closeBtn.onclick = done;
  });
}

function showAlert(title, msg) {
  return new Promise(resolve => {
    const overlay  = document.getElementById('alert-overlay');
    const titleEl  = document.getElementById('alert-title');
    const bodyEl   = document.getElementById('alert-body');
    const okBtn    = document.getElementById('alert-ok');
    const closeBtn = document.getElementById('alert-close');

    titleEl.textContent = title;
    bodyEl.textContent  = msg;
    overlay.classList.add('open');

    const done = () => { overlay.classList.remove('open'); resolve(); };
    okBtn.onclick    = done;
    closeBtn.onclick = done;
  });
}

/* ══════════════════════════════════════════════════════════════
   § 10 — Game Controller
   Mirrors: MapUI.java — all game state, turn management,
   undo/redo history, CPU logic, UI updates.
   ══════════════════════════════════════════════════════════════ */
class GameController {
  /* ── constants ── */
  static CPU_DELAY_MS = 550;

  constructor() {
    /* Game parameters (set by start menu) */
    this.selectedAlgorithm   = 'greedy';
    this.selectedDifficulty  = 'easy';
    this.numRegions          = 10;
    this.difficultyName      = 'Easy';

    /* Runtime state */
    this.gameState       = null;
    this.ai              = null;
    this.currentStrategy = null;
    this.renderer        = null;

    /* Turn / score */
    this.isPlayerTurn       = true;
    this.gameOver           = false;
    this.selectedPlayerColor = GameState.RED;
    this.playerScore        = 0;
    this.cpuScore           = 0;

    /* Undo / redo history (array of GameState copies) */
    this.moveHistory       = [];
    this.historyIndex      = -1;

    /* DOM refs */
    this._canvas      = document.getElementById('map-canvas');
    this._statusText  = document.getElementById('status-text');
    this._hintText    = document.getElementById('hint-text');
    this._scorePlayer = document.getElementById('score-player');
    this._scoreCpu    = document.getElementById('score-cpu');
    this._infoTurn    = document.getElementById('info-turn');
    this._infoColored = document.getElementById('info-colored');
    this._infoAlgo    = document.getElementById('info-algo');
    this._infoDiff    = document.getElementById('info-difficulty');
    this._infoRegs    = document.getElementById('info-regions');
    this._adName      = document.getElementById('ad-name');
    this._adTime      = document.getElementById('ad-time');
    this._adSpace     = document.getElementById('ad-space');
    this._topbarAlgo  = document.getElementById('topbar-algo');

    this._btnUndo    = document.getElementById('btn-undo');
    this._btnRedo    = document.getElementById('btn-redo');
    this._btnSolve   = document.getElementById('btn-solve');
    this._btnNewGame = document.getElementById('btn-new-game');

    /* Wire up control buttons */
    this._btnNewGame.addEventListener('click', () => this.startNewGame());
    this._btnUndo.addEventListener('click',    () => this.undoMove());
    this._btnRedo.addEventListener('click',    () => this.redoMove());
    this._btnSolve.addEventListener('click',   () => this.solveGame());
    document.getElementById('btn-back').addEventListener('click', () => this.goBackToMenu());

    /* Wire up colour picker */
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedPlayerColor = parseInt(btn.dataset.color, 10);
        this._updateColorSelection();
        this._updateStatus();
      });
    });

    /* Canvas click */
    this._canvas.addEventListener('click', e => this._onCanvasClick(e));
  }

  /* ─────────────────────────────────────────
     Initialise / New Game
  ───────────────────────────────────────── */

  /**
   * Called when the player taps "Start Game" on the start menu.
   * @param {string} algo
   * @param {string} difficulty
   */
  init(algo, difficulty) {
    this.selectedAlgorithm  = algo;
    this.selectedDifficulty = difficulty;

    const diffMap = {
      easy:   { regions: 10, name: 'Easy'   },
      medium: { regions: 18, name: 'Medium' },
      hard:   { regions: 28, name: 'Hard'   },
    };
    const d = diffMap[difficulty] || diffMap.easy;
    this.numRegions     = d.regions;
    this.difficultyName = d.name;

    this.currentStrategy = StrategyFactory.getStrategy(algo);

    // Update side panel static info
    this._adName.textContent  = this.currentStrategy.getAlgorithmName();
    this._adTime.textContent  = this.currentStrategy.getTimeComplexity();
    this._adSpace.textContent = this.currentStrategy.getSpaceComplexity();
    this._topbarAlgo.textContent = this.currentStrategy.getAlgorithmName();
    document.getElementById('topbar-title').textContent =
      'Map Puzzle — ' + this.currentStrategy.getAlgorithmName();

    this._infoDiff.textContent = this.difficultyName;
    this._infoRegs.textContent = this.numRegions;
    this._infoAlgo.textContent = this.currentStrategy.getAlgorithmName();

    this._initGame();
  }

  _initGame() {
    const gen = new MapGenerator();

    // Grid size based on difficulty
    let gw = 20, gh = 15;
    if (this.numRegions > 20) { gw = 25; gh = 20; }

    this.gameState = gen.generateMap(gw, gh, this.numRegions);
    this.ai        = new Game(this.gameState);

    /* Create or update renderer */
    if (!this.renderer) {
      this.renderer = new MapRenderer(this._canvas, this.gameState);
    } else {
      this.renderer.setState(this.gameState);
    }

    this.isPlayerTurn       = true;
    this.gameOver           = false;
    this.playerScore        = 0;
    this.cpuScore           = 0;
    this.selectedPlayerColor = GameState.RED;
    this.moveHistory        = [];
    this.historyIndex       = -1;

    this._saveState();
    this._updateColorSelection();
    this._updateScoreDisplay();
    this._updateSideInfo();
    this._updateStatus();
    this._updateButtonStates();
    this.renderer.render();
  }

  startNewGame() {
    this.currentStrategy = StrategyFactory.getStrategy(this.selectedAlgorithm);
    this._adName.textContent  = this.currentStrategy.getAlgorithmName();
    this._adTime.textContent  = this.currentStrategy.getTimeComplexity();
    this._adSpace.textContent = this.currentStrategy.getSpaceComplexity();
    this._initGame();
  }

  /* ─────────────────────────────────────────
     Canvas Click Handler (Player Move)
  ───────────────────────────────────────── */

  async _onCanvasClick(e) {
    if (!this.isPlayerTurn || this.gameOver) return;

    const rect   = this._canvas.getBoundingClientRect();
    const scaleX = this._canvas.width  / rect.width;
    const scaleY = this._canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top)  * scaleY;

    const region = this.renderer.regionAt(px, py);
    if (region <= 0) return;
    if (this.gameState.getRegionColor(region) !== GameState.EMPTY) return;  // already colored

    const color = this.selectedPlayerColor;

    if (this.gameState.wouldBeAdjacentToSameColor(region, color)) {
      /* Invalid move — player breaks the rule */
      this.gameOver = true;
      this.gameState.setRegionColor(region, color);  // show the bad move
      this._saveState();
      this.renderer.render();
      this._updateSideInfo();
      this._updateStatus();
      this._updateButtonStates();
      await showAlert('You Lose 😞',
        `You placed ${this._colorName(color)} adjacent to the same color.\nGame over!`);
      return;
    }

    /* Valid player move */
    this.gameState.setRegionColor(region, color);
    this.playerScore++;
    this._saveState();
    this.renderer.render();

    this.isPlayerTurn = false;
    this._updateScoreDisplay();
    this._updateSideInfo();
    this._updateStatus();
    this._updateButtonStates();

    // Check if puzzle is complete after player move
    if (this.gameState.isComplete()) {
      this.gameOver = true;
      this._updateStatus();
      await showAlert('🎉 Puzzle Complete!', 'All regions are colored correctly. Congratulations!');
      return;
    }

    // Check if CPU has valid moves
    if (!this._hasValidMoves()) {
      this.gameOver = true;
      this._updateStatus();
      await showAlert('You Win! 🏆', 'No valid moves for CPU. You win!');
      return;
    }

    // Schedule CPU move
    setTimeout(() => this._cpuMakeMove(), GameController.CPU_DELAY_MS);
  }

  /* ─────────────────────────────────────────
     CPU Move (mirrors cpuMakeMove in MapUI)
  ───────────────────────────────────────── */

  async _cpuMakeMove() {
    if (this.gameOver) return;

    /* CPU picks a random colour, then finds a valid region for it.
       If no region works for that colour, tries all colours. */
    let cpuColor = GameState.RED + Math.floor(Math.random() * GameState.NUM_COLORS);
    let validRegions = this._validRegionsForColor(cpuColor);

    if (validRegions.length === 0) {
      for (let tryColor = GameState.RED; tryColor <= GameState.BROWN; tryColor++) {
        validRegions = this._validRegionsForColor(tryColor);
        if (validRegions.length > 0) { cpuColor = tryColor; break; }
      }
    }

    if (validRegions.length > 0) {
      const chosen = validRegions[Math.floor(Math.random() * validRegions.length)];
      this.gameState.setRegionColor(chosen, cpuColor);
      this.cpuScore++;
      this.renderer.render();

      this.isPlayerTurn = true;
      this._updateScoreDisplay();
      this._updateSideInfo();
      this._updateStatus();
      this._updateButtonStates();

      // Check if complete after CPU move
      if (this.gameState.isComplete()) {
        this.gameOver = true;
        this._updateStatus();
        await showAlert('🎉 Puzzle Complete!',
          'All regions colored correctly — great teamwork!');
        return;
      }

      // Check player has valid moves
      if (!this._hasValidMoves()) {
        this.gameOver = true;
        await showAlert('CPU Wins 🤖', 'No valid moves for player. CPU wins!');
        this._updateStatus();
        this._updateButtonStates();
      }
    } else {
      this.gameOver = true;
      await showAlert('You Win! 🏆', 'No valid moves for CPU. You win!');
      this._updateStatus();
      this._updateButtonStates();
    }
  }

  _validRegionsForColor(color) {
    const result = [];
    for (let r = 1; r <= this.gameState.numRegions; r++) {
      if (this.gameState.getRegionColor(r) === GameState.EMPTY &&
          !this.gameState.wouldBeAdjacentToSameColor(r, color)) {
        result.push(r);
      }
    }
    return result;
  }

  _hasValidMoves() {
    for (let r = 1; r <= this.gameState.numRegions; r++) {
      if (this.gameState.getRegionColor(r) === GameState.EMPTY) {
        for (let c = GameState.RED; c <= GameState.BROWN; c++) {
          if (!this.gameState.wouldBeAdjacentToSameColor(r, c)) return true;
        }
      }
    }
    return false;
  }

  /* ─────────────────────────────────────────
     Auto-Solve (mirrors solveGame in MapUI)
  ───────────────────────────────────────── */

  async solveGame() {
    if (this.gameOver && this.gameState.isComplete()) return;

    // Reset to initial state (first snapshot)
    if (this.historyIndex >= 0 && this.moveHistory.length > 0) {
      this.gameState = this.moveHistory[0].copy();
      this.moveHistory = [this.gameState.copy()];
      this.historyIndex = 0;
    }

    this.gameOver     = false;
    this.isPlayerTurn = true;
    this.playerScore  = 0;
    this.cpuScore     = 0;

    // Create fresh strategy instance for this solve
    const strategy = StrategyFactory.getStrategy(this.selectedAlgorithm);

    const solved = strategy.solve(this.gameState);

    if (!this.renderer) {
      this.renderer = new MapRenderer(this._canvas, this.gameState);
    } else {
      this.renderer.setState(this.gameState);
    }
    this.renderer.render();
    this._updateSideInfo();
    this._updateStatus();
    this._updateButtonStates();

    if (solved) {
      const rows = [
        { label: 'Algorithm',       val: strategy.getAlgorithmName(),  cls: 'accent' },
        { label: 'Time Complexity',  val: strategy.getTimeComplexity() },
        { label: 'Space Complexity', val: strategy.getSpaceComplexity() },
        { label: 'Execution Time',   val: strategy.getExecutionTime() + ' ms', cls: 'good' },
        { label: 'Statistics',       val: strategy.getStatistics() },
      ];
      const html = rows.map(r =>
        `<div class="analysis-row">
           <span class="analysis-label">${r.label}</span>
           <span class="analysis-val ${r.cls || ''}">${r.val}</span>
         </div>`
      ).join('');

      await showModal('Algorithm Analysis ✅', html);
    } else {
      await showAlert('Solver Failed',
        `Could not solve the puzzle with ${strategy.getAlgorithmName()}.`);
    }
  }

  /* ─────────────────────────────────────────
     Undo / Redo (mirrors undoMove / redoMove)
  ───────────────────────────────────────── */

  undoMove() {
    if (this.gameOver) return;
    if (this.historyIndex <= 0) return;

    this.historyIndex--;
    this.gameState = this.moveHistory[this.historyIndex].copy();
    this.ai = new Game(this.gameState);

    this.isPlayerTurn = true;
    this.gameOver     = false;
    if (this.playerScore > 0) this.playerScore--;
    if (this.cpuScore > 0)    this.cpuScore--;

    this.renderer.setState(this.gameState);
    this.renderer.render();
    this._updateScoreDisplay();
    this._updateSideInfo();
    this._updateStatus();
    this._updateButtonStates();
  }

  redoMove() {
    if (this.gameOver) return;
    if (this.historyIndex >= this.moveHistory.length - 1) return;

    this.historyIndex++;
    this.gameState = this.moveHistory[this.historyIndex].copy();
    this.ai = new Game(this.gameState);

    this.isPlayerTurn = false;
    this.gameOver     = false;
    this.playerScore++;
    this.cpuScore++;

    this.renderer.setState(this.gameState);
    this.renderer.render();
    this._updateScoreDisplay();
    this._updateSideInfo();
    this._updateStatus();
    this._updateButtonStates();
  }

  _saveState() {
    if (!this.isPlayerTurn) return;

    // Trim redo branch
    while (this.moveHistory.length > this.historyIndex + 1) {
      this.moveHistory.pop();
    }

    this.moveHistory.push(this.gameState.copy());
    this.historyIndex++;

    // Cap history at 100 snapshots
    if (this.moveHistory.length > 100) {
      this.moveHistory.shift();
      this.historyIndex--;
    }
  }

  /* ─────────────────────────────────────────
     Navigate back to start menu
  ───────────────────────────────────────── */
  goBackToMenu() {
    document.getElementById('screen-game').classList.remove('active');
    document.getElementById('screen-start').classList.add('active');
  }

  /* ─────────────────────────────────────────
     UI Update helpers
  ───────────────────────────────────────── */

  _updateColorSelection() {
    document.querySelectorAll('.color-btn').forEach(btn => {
      const c = parseInt(btn.dataset.color, 10);
      btn.classList.toggle('active', c === this.selectedPlayerColor);
    });
  }

  _updateScoreDisplay() {
    this._scorePlayer.textContent = `Player: ${this.playerScore}`;
    this._scoreCpu.textContent    = `CPU: ${this.cpuScore}`;
  }

  _updateSideInfo() {
    const colored = this.gameState ? this.gameState.countColored() : 0;
    const total   = this.gameState ? this.gameState.numRegions    : 0;
    this._infoColored.textContent = `${colored} / ${total}`;
    this._infoTurn.textContent    = this.gameOver ? 'Game Over'
                                  : this.isPlayerTurn ? 'Player' : 'CPU';
  }

  _updateStatus() {
    let msg, hint;
    if (this.gameOver) {
      msg  = 'Game Over — click "New Game" to play again.';
      hint = '🏁 The game has ended. Use New Game to start fresh.';
    } else if (this.isPlayerTurn) {
      const cn = this._colorName(this.selectedPlayerColor);
      msg  = `Your turn — selected: ${cn} — click a region to color it.`;
      hint = `💡 Pick a color above, then tap an uncolored region. You cannot place a color adjacent to the same color!`;
    } else {
      msg  = `CPU's turn — using ${this.currentStrategy.getAlgorithmName()} …`;
      hint = `🤖 CPU is thinking. Moves in ${GameController.CPU_DELAY_MS}ms.`;
    }
    this._statusText.textContent = msg;
    this._hintText.textContent   = hint;

    // Update canvas cursor
    const canvas = this._canvas;
    canvas.className = '';
    if (this.gameOver)           canvas.classList.add('game-over');
    else if (!this.isPlayerTurn) canvas.classList.add('not-player-turn');
  }

  _updateButtonStates() {
    const canUndo = !this.gameOver && this.historyIndex > 0;
    const canRedo = !this.gameOver && this.historyIndex < this.moveHistory.length - 1;

    this._btnUndo.disabled  = !canUndo;
    this._btnRedo.disabled  = !canRedo;
    this._btnSolve.disabled = this.gameOver && this.gameState.isComplete();
  }

  _colorName(colorId) {
    return { [GameState.RED]: 'Red', [GameState.GREEN]: 'Green', [GameState.BROWN]: 'Brown' }[colorId] || '?';
  }
}

/* ══════════════════════════════════════════════════════════════
   § 11 — Application Bootstrap
   Mirrors: MapGame.main() → StartMenu → MapUI flow
   ══════════════════════════════════════════════════════════════ */

/** Singleton game controller (created once). */
let controller = null;

/**
 * Called by the "Start Game" button on the start menu.
 * Reads algorithm & difficulty selections, transitions screens.
 */
function startGame() {
  // Read selected algorithm
  const algoInput = document.querySelector('input[name="algorithm"]:checked');
  const diffInput = document.querySelector('input[name="difficulty"]:checked');

  if (!algoInput) {
    showAlert('Select Algorithm', 'Please choose an algorithm before starting!');
    return;
  }

  const algo       = algoInput.value;
  const difficulty = diffInput ? diffInput.value : 'easy';

  // Switch screens
  document.getElementById('screen-start').classList.remove('active');
  document.getElementById('screen-game').classList.add('active');

  // Initialise controller on first use
  if (!controller) {
    controller = new GameController();
  }

  controller.init(algo, difficulty);
}

/* ══════════════════════════════════════════════════════════════
   § 12 — Test Suite
   Mirrors: DivideAndConquerTest.java (10 test cases)
   Run from console: runTests()
   ══════════════════════════════════════════════════════════════ */
function runTests() {
  console.log('Running 10 Test Cases...\n');
  let passed = 0, failed = 0;

  function test(name, fn) {
    try {
      const ok = fn();
      console.log(`${name}: ${ok ? '✅ PASS' : '❌ FAIL'}`);
      ok ? passed++ : failed++;
    } catch (e) {
      console.error(`${name}: ❌ ERROR —`, e);
      failed++;
    }
  }

  // Test 1 — Merge Sort
  test('Test 1 - Merge Sort', () => {
    const arr = [5, 3, 8, 1, 9, 2];
    DivideAndConquer.mergeSort(arr);
    return JSON.stringify(arr) === JSON.stringify([1, 2, 3, 5, 8, 9]);
  });

  // Test 2 — Quick Sort
  test('Test 2 - Quick Sort', () => {
    const arr = [5, 3, 8, 1, 9, 2];
    DivideAndConquer.quickSort(arr);
    return JSON.stringify(arr) === JSON.stringify([1, 2, 3, 5, 8, 9]);
  });

  // Test 3 — GameState Init
  test('Test 3 - GameState Init', () => {
    const s = new GameState(4, 4, 5);
    return s.width === 4 && s.height === 4 && s.numRegions === 5;
  });

  // Test 4 — Set/Get Region Color
  test('Test 4 - Set/Get Region Color', () => {
    const s = new GameState(3, 3, 3);
    s.setRegionColor(1, GameState.RED);
    return s.getRegionColor(1) === GameState.RED;
  });

  // Test 5 — Adjacency
  test('Test 5 - Adjacency', () => {
    const s = new GameState(3, 3, 3);
    s.setAdjacency(1, 2, true);
    return s.areAdjacent(1, 2) && s.areAdjacent(2, 1);
  });

  // Test 6 — Get Valid Colors
  test('Test 6 - Get Valid Colors', () => {
    const s = new GameState(3, 3, 3);
    s.setAdjacency(1, 2, true);
    s.setRegionColor(2, GameState.RED);
    const valid = s.getValidColors(1);
    return !valid.includes(GameState.RED);
  });

  // Test 7 — Is Valid Coloring
  test('Test 7 - Is Valid Coloring', () => {
    const s = new GameState(3, 3, 3);
    s.setAdjacency(1, 2, true);
    s.setRegionColor(1, GameState.RED);
    s.setRegionColor(2, GameState.GREEN);
    return s.isValid();
  });

  // Test 8 — Get Uncolored Regions
  test('Test 8 - Get Uncolored Regions', () => {
    const s = new GameState(3, 3, 4);
    s.setRegionColor(1, GameState.RED);
    s.setRegionColor(3, GameState.GREEN);
    const uncolored = DivideAndConquer.getUncoloredRegions(s);
    return uncolored.length === 2;
  });

  // Test 9 — Solve Puzzle (DnC)
  test('Test 9 - Solve Puzzle (DnC)', () => {
    const s = new GameState(3, 3, 4);
    s.setAdjacency(1, 2, true);
    s.setAdjacency(1, 3, true);
    s.setAdjacency(2, 4, true);
    s.setAdjacency(3, 4, true);
    const solved = DivideAndConquer.solvePuzzleDnC(s);
    return solved && s.isComplete() && s.isValid();
  });

  // Test 10 — GameState Copy
  test('Test 10 - GameState Copy', () => {
    const original = new GameState(3, 3, 3);
    original.setAdjacency(1, 2, true);
    original.setRegionColor(1, GameState.RED);
    const copy = original.copy();
    copy.setRegionColor(2, GameState.GREEN);
    return original.getRegionColor(1) === GameState.RED &&
           copy.getRegionColor(2) === GameState.GREEN;
  });

  console.log('\n=======================');
  console.log(`Passed: ${passed}/10`);
  console.log(`Failed: ${failed}/10`);
  console.log('=======================');
}
