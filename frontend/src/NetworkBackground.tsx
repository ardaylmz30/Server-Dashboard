import "./NetworkBackground.css";

const W = 1600;
const H = 900;
const COLS = 14;
const ROWS = 9;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Node {
  x: number;
  y: number;
}

function buildMesh() {
  const rand = mulberry32(20261006);
  const cellW = W / COLS;
  const cellH = H / ROWS;
  const nodes: Node[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      nodes.push({
        x: (c + 0.15 + rand() * 0.7) * cellW,
        y: (r + 0.15 + rand() * 0.7) * cellH,
      });
    }
  }

  const edges = new Set<string>();
  nodes.forEach((a, i) => {
    nodes
      .map((b, j) => ({ j, d: Math.hypot(a.x - b.x, a.y - b.y) }))
      .filter(({ j, d }) => j !== i && d < 240)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3)
      .forEach(({ j }) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });

  const lines = [...edges].map((key) => {
    const [i, j] = key.split("-").map(Number);
    return { a: nodes[i], b: nodes[j], key };
  });

  return { nodes, lines };
}

const { nodes, lines } = buildMesh();

const isPulse = (i: number) => i % 9 === 4;
const isPacket = (i: number) => i % 7 === 3;

export default function NetworkBackground() {
  return (
    <div className="network-bg" aria-hidden="true">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <g className="network-bg__edges">
          {lines.map(({ a, b, key }, idx) => (
            <line
              key={key}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={
                isPacket(idx) ? "network-bg__packet" : undefined
              }
              style={
                isPacket(idx)
                  ? { animationDelay: `${(idx % 5) * -1.7}s` }
                  : undefined
              }
            />
          ))}
        </g>
        <g className="network-bg__nodes">
          {nodes.map((n, i) => (
            <circle
              key={i}
              cx={n.x}
              cy={n.y}
              r={isPulse(i) ? 4 : 2.6}
              className={isPulse(i) ? "network-bg__pulse" : undefined}
              style={
                isPulse(i)
                  ? { animationDelay: `${(i % 4) * -1.5}s` }
                  : undefined
              }
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
