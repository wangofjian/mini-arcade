/** 弹射工坊 2D 物理：重力抛物线、圆/盒碰撞、冲量破坏与失去支撑后坍塌。 */

export const SP_G = 1700;
export const SP_DT = 1 / 120;
export const SP_WIDTH = 960;
export const SP_HEIGHT = 540;
export const SP_GROUND = 500;
export const SP_SLING = { x: 150, y: 430 };
export const SP_MAX_PULL = 130;
export const SP_MAX_SPEED = 1180;

export type SpMaterial = 'wood' | 'glass' | 'stone' | 'ceramic' | 'cork' | 'iron' | 'rubber' | 'ground';
export type SpShape = 'circle' | 'box';

export type SpBody = {
  id: number;
  shape: SpShape;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  omega: number;
  radius: number;
  hw: number;
  hh: number;
  mass: number;
  invMass: number;
  inertia: number;
  invInertia: number;
  restitution: number;
  friction: number;
  hp: number;
  maxHp: number;
  breakImpulse: number;
  material: SpMaterial;
  frozen: boolean;
  static: boolean;
  isTarget: boolean;
  isProjectile: boolean;
  asleep: boolean;
  sleepT: number;
  destroyed: boolean;
};

export type SpWorld = {
  bodies: SpBody[];
  nextId: number;
  width: number;
  height: number;
  groundY: number;
};

export type SpImpact = { a: number; b: number; impulse: number; x: number; y: number };

const MAT: Record<
  SpMaterial,
  { rest: number; friction: number; density: number; hp: number; breakImpulse: number; target?: boolean }
> = {
  wood: { rest: 0.18, friction: 0.45, density: 0.85, hp: 38, breakImpulse: 95 },
  glass: { rest: 0.12, friction: 0.25, density: 0.6, hp: 16, breakImpulse: 42 },
  stone: { rest: 0.1, friction: 0.55, density: 1.7, hp: 110, breakImpulse: 230 },
  ceramic: { rest: 0.12, friction: 0.35, density: 0.95, hp: 15, breakImpulse: 38, target: true },
  cork: { rest: 0.34, friction: 0.35, density: 1.05, hp: 400, breakImpulse: 9999 },
  iron: { rest: 0.16, friction: 0.4, density: 2.9, hp: 800, breakImpulse: 9999 },
  rubber: { rest: 0.74, friction: 0.4, density: 0.85, hp: 400, breakImpulse: 9999 },
  ground: { rest: 0.22, friction: 0.55, density: 0, hp: 1e9, breakImpulse: 1e9 },
};

function inertiaCircle(mass: number, r: number): number {
  return 0.5 * mass * r * r;
}
function inertiaBox(mass: number, hw: number, hh: number): number {
  return (mass * (hw * hw + hh * hh)) / 3;
}

export function makeWorld(): SpWorld {
  const world: SpWorld = { bodies: [], nextId: 1, width: SP_WIDTH, height: SP_HEIGHT, groundY: SP_GROUND };
  const ground = makeBox(0, SP_WIDTH / 2, SP_GROUND + 40, SP_WIDTH / 2 + 40, 40, 'ground', true);
  ground.static = true;
  ground.frozen = true;
  ground.invMass = 0;
  ground.invInertia = 0;
  ground.mass = 0;
  addBody(world, ground);
  return world;
}

export function makeCircle(id: number, x: number, y: number, r: number, material: SpMaterial, projectile = false): SpBody {
  const m = MAT[material];
  const mass = Math.max(0.2, m.density * Math.PI * r * r * 0.0012);
  const I = inertiaCircle(mass, r);
  return {
    id,
    shape: 'circle',
    x,
    y,
    vx: 0,
    vy: 0,
    angle: 0,
    omega: 0,
    radius: r,
    hw: r,
    hh: r,
    mass,
    invMass: 1 / mass,
    inertia: I,
    invInertia: 1 / I,
    restitution: m.rest,
    friction: m.friction,
    hp: m.hp,
    maxHp: m.hp,
    breakImpulse: m.breakImpulse,
    material,
    frozen: !projectile,
    static: false,
    isTarget: !!m.target,
    isProjectile: projectile,
    asleep: !projectile,
    sleepT: projectile ? 0 : 1,
    destroyed: false,
  };
}

export function makeBox(
  id: number,
  x: number,
  y: number,
  hw: number,
  hh: number,
  material: SpMaterial,
  asStatic = false,
): SpBody {
  const m = MAT[material];
  const mass = Math.max(0.25, m.density * (hw * 2) * (hh * 2) * 0.0012);
  const I = inertiaBox(mass, hw, hh);
  return {
    id,
    shape: 'box',
    x,
    y,
    vx: 0,
    vy: 0,
    angle: 0,
    omega: 0,
    radius: Math.hypot(hw, hh),
    hw,
    hh,
    mass: asStatic ? 0 : mass,
    invMass: asStatic ? 0 : 1 / mass,
    inertia: I,
    invInertia: asStatic ? 0 : 1 / I,
    restitution: m.rest,
    friction: m.friction,
    hp: m.hp,
    maxHp: m.hp,
    breakImpulse: m.breakImpulse,
    material,
    frozen: true,
    static: asStatic,
    isTarget: !!m.target,
    isProjectile: false,
    asleep: true,
    sleepT: 1,
    destroyed: false,
  };
}

export function addBody(world: SpWorld, body: SpBody): SpBody {
  body.id = world.nextId++;
  world.bodies.push(body);
  return body;
}

export function launchVelocity(pullX: number, pullY: number): { vx: number; vy: number; power: number; angle: number } {
  const dist = Math.hypot(pullX, pullY);
  if (dist < 4) return { vx: 0, vy: 0, power: 0, angle: 0 };
  const clamped = Math.min(dist, SP_MAX_PULL);
  const power = clamped / SP_MAX_PULL;
  const speed = power * SP_MAX_SPEED;
  const ux = pullX / dist;
  const uy = pullY / dist;
  // 拉向后，弹出方向相反
  return { vx: -ux * speed, vy: -uy * speed, power, angle: Math.atan2(-uy, -ux) };
}

export type TrajPoint = { x: number; y: number };

/** 无碰撞解析抛物线，用于瞄准预览。 */
export function previewTrajectory(
  x0: number,
  y0: number,
  vx: number,
  vy: number,
  steps = 28,
  dt = 0.035,
  groundY = SP_GROUND,
): TrajPoint[] {
  const pts: TrajPoint[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i * dt;
    const x = x0 + vx * t;
    const y = y0 + vy * t + 0.5 * SP_G * t * t;
    pts.push({ x, y });
    if (y >= groundY - 2 || x > SP_WIDTH + 40 || x < -40) break;
  }
  return pts;
}

/** 无碰撞积分，用于核对抛物线公式。 */
export function integrateFree(x: number, y: number, vx: number, vy: number, time: number, dt = SP_DT) {
  let t = 0;
  while (t + dt / 2 < time) {
    x += vx * dt;
    y += vy * dt + 0.5 * SP_G * dt * dt;
    vy += SP_G * dt;
    t += dt;
  }
  return { x, y, vx, vy };
}

function effectiveInvMass(b: SpBody): number {
  return b.static || b.frozen || b.asleep && !b.isProjectile ? (b.static || b.frozen ? 0 : b.invMass) : b.invMass;
}

function isImmovable(b: SpBody): boolean {
  return b.static || (b.frozen && !b.isProjectile);
}

function wake(b: SpBody) {
  if (b.static || b.destroyed) return;
  b.frozen = false;
  b.asleep = false;
  b.sleepT = 0;
}

type Manifold = { a: SpBody; b: SpBody; nx: number; ny: number; pen: number; cx: number; cy: number };

function collideCircles(a: SpBody, b: SpBody): Manifold | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const overlap = a.radius + b.radius - dist;
  if (overlap <= 0) return null;
  return { a, b, nx: dx / dist, ny: dy / dist, pen: overlap, cx: a.x + (dx / dist) * a.radius, cy: a.y + (dy / dist) * a.radius };
}

function circleAabb(c: SpBody, box: SpBody): Manifold | null {
  const qx = Math.max(box.x - box.hw, Math.min(c.x, box.x + box.hw));
  const qy = Math.max(box.y - box.hh, Math.min(c.y, box.y + box.hh));
  let dx = c.x - qx;
  let dy = c.y - qy;
  const d2 = dx * dx + dy * dy;
  if (d2 > c.radius * c.radius) return null;
  let dist = Math.sqrt(d2);
  let nx: number;
  let ny: number;
  let pen: number;
  if (dist < 1e-6) {
    const px = c.x - box.x;
    const py = c.y - box.y;
    const ox = box.hw - Math.abs(px);
    const oy = box.hh - Math.abs(py);
    if (ox < oy) {
      // from circle toward box
      nx = px < 0 ? 1 : -1;
      ny = 0;
      pen = c.radius + ox;
    } else {
      nx = 0;
      ny = py < 0 ? 1 : -1;
      pen = c.radius + oy;
    }
  } else {
    nx = -dx / dist;
    ny = -dy / dist;
    pen = c.radius - dist;
  }
  return { a: c, b: box, nx, ny, pen, cx: qx, cy: qy };
}

function collideBoxes(a: SpBody, b: SpBody): Manifold | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const ox = a.hw + b.hw - Math.abs(dx);
  const oy = a.hh + b.hh - Math.abs(dy);
  if (ox <= 0 || oy <= 0) return null;
  if (ox < oy) {
    const nx = dx < 0 ? -1 : 1;
    return { a, b, nx, ny: 0, pen: ox, cx: a.x + nx * a.hw, cy: (Math.max(a.y - a.hh, b.y - b.hh) + Math.min(a.y + a.hh, b.y + b.hh)) / 2 };
  }
  const ny = dy < 0 ? -1 : 1;
  return { a, b, nx: 0, ny, pen: oy, cx: (Math.max(a.x - a.hw, b.x - b.hw) + Math.min(a.x + a.hw, b.x + b.hw)) / 2, cy: a.y + ny * a.hh };
}

function detect(a: SpBody, b: SpBody): Manifold | null {
  if (a.destroyed || b.destroyed) return null;
  if (a.shape === 'circle' && b.shape === 'circle') return collideCircles(a, b);
  if (a.shape === 'circle' && b.shape === 'box') return circleAabb(a, b);
  if (a.shape === 'box' && b.shape === 'circle') {
    const m = circleAabb(b, a);
    if (!m) return null;
    return { a, b, nx: -m.nx, ny: -m.ny, pen: m.pen, cx: m.cx, cy: m.cy };
  }
  return collideBoxes(a, b);
}

function resolve(m: Manifold): number {
  const { a, b, nx, ny, pen } = m;
  const imA = isImmovable(a) ? 0 : a.invMass;
  const imB = isImmovable(b) ? 0 : b.invMass;
  const sum = imA + imB;
  if (sum <= 0) return 0;
  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const vn = rvx * nx + rvy * ny;
  const e = Math.min(a.restitution, b.restitution);
  let impulse = 0;
  if (vn < 0) {
    impulse = (-(1 + e) * vn) / sum;
    const ix = impulse * nx;
    const iy = impulse * ny;
    if (imA > 0) {
      a.vx -= ix * imA;
      a.vy -= iy * imA;
    }
    if (imB > 0) {
      b.vx += ix * imB;
      b.vy += iy * imB;
    }
    const tx = -ny;
    const ty = nx;
    const vt = rvx * tx + rvy * ty;
    const mu = Math.sqrt(a.friction * b.friction);
    let jt = -vt / sum;
    const maxF = impulse * mu;
    if (jt > maxF) jt = maxF;
    if (jt < -maxF) jt = -maxF;
    if (imA > 0) {
      a.vx -= jt * tx * imA;
      a.vy -= jt * ty * imA;
    }
    if (imB > 0) {
      b.vx += jt * tx * imB;
      b.vy += jt * ty * imB;
    }
  }
  const slop = 0.4;
  const corr = (Math.max(pen - slop, 0) * 0.55) / sum;
  if (imA > 0) {
    a.x -= corr * nx * imA;
    a.y -= corr * ny * imA;
  }
  if (imB > 0) {
    b.x += corr * nx * imB;
    b.y += corr * ny * imB;
  }
  return impulse;
}

function resolveGround(world: SpWorld, b: SpBody) {
  const feet = b.shape === 'circle' ? b.radius : b.hh;
  const bottom = b.y + feet;
  if (bottom <= world.groundY) return;
  const pen = bottom - world.groundY;
  b.y -= pen;
  if (b.vy > 0) {
    const e = Math.min(b.restitution, 0.28);
    const incoming = b.vy;
    b.vy = -b.vy * e;
    b.vx *= 0.86;
    if (Math.abs(b.vy) < 35) b.vy = 0;
    if (incoming > 80 && !b.isProjectile && !b.static) {
      applyDamage(b, incoming * b.mass * 0.9);
    }
  }
}

function hasSupport(world: SpWorld, body: SpBody): boolean {
  if (body.static || body.isProjectile || body.destroyed) return true;
  const feet = body.shape === 'circle' ? body.radius : body.hh;
  const y = body.y + feet + 5;
  if (y >= world.groundY - 0.5) return true;
  for (const o of world.bodies) {
    if (o.id === body.id || o.destroyed) continue;
    if (o.isProjectile) continue;
    if (o.shape === 'box') {
      const overlapX = Math.abs(o.x - body.x) < o.hw + body.hw * 0.7;
      const touchingY = body.y + feet <= o.y - o.hh + 8 && body.y + feet >= o.y - o.hh - 8;
      if (overlapX && touchingY) return true;
    } else {
      const dx = o.x - body.x;
      const gap = Math.hypot(dx, o.y - (body.y + feet)) ;
      if (Math.abs(dx) < o.radius + body.hw && body.y + feet >= o.y - o.radius - 8 && body.y + feet <= o.y - o.radius + 8) return true;
      void gap;
    }
  }
  return false;
}

function applyDamage(body: SpBody, impulse: number) {
  if (body.static || body.isProjectile || body.destroyed) return;
  if (impulse < body.breakImpulse * 0.28) return;
  const dmg = (impulse - body.breakImpulse * 0.22) * 0.22;
  body.hp -= dmg;
  if (body.hp <= 0) body.destroyed = true;
}

function maybeSleep(b: SpBody, dt: number) {
  if (b.static || b.destroyed || b.frozen) return;
  const spd = Math.hypot(b.vx, b.vy) + Math.abs(b.omega) * 10;
  if (spd < 22) {
    b.sleepT += dt;
    if (b.sleepT > 0.45) {
      b.asleep = true;
      b.vx = 0;
      b.vy = 0;
      b.omega = 0;
    }
  } else {
    b.sleepT = 0;
    b.asleep = false;
  }
}

export function stepWorld(world: SpWorld, dt: number): { impacts: SpImpact[]; destroyedIds: number[] } {
  const sliced = Math.max(0, Math.min(dt, 0.05));
  const impacts: SpImpact[] = [];
  const destroyedBefore = new Set(world.bodies.filter((b) => b.destroyed).map((b) => b.id));
  let acc = sliced;
  const h = SP_DT;
  while (acc > 0) {
    const step = Math.min(h, acc);
    acc -= step;
    for (const b of world.bodies) {
      if (b.destroyed || b.static || b.frozen || b.asleep) continue;
      // 速度 Verlet：恒定重力下与解析抛物线一致
      b.x += b.vx * step;
      b.y += b.vy * step + 0.5 * SP_G * step * step;
      b.vy += SP_G * step;
      b.vx *= 1 - 0.04 * step;
      b.angle += b.omega * step;
    }
    const list = world.bodies.filter((b) => !b.destroyed);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (isImmovable(a) && isImmovable(b)) continue;
        const m = detect(a, b);
        if (!m) continue;
        const imp = resolve(m);
        if (imp > 8) {
          impacts.push({ a: a.id, b: b.id, impulse: imp, x: m.cx, y: m.cy });
          if (imp > 28) {
            wake(a);
            wake(b);
          }
          applyDamage(a, imp);
          applyDamage(b, imp);
        }
      }
    }
    for (const b of world.bodies) {
      if (b.destroyed || b.static) continue;
      resolveGround(world, b);
      if (!b.isProjectile && !b.frozen && !hasSupport(world, b) && b.asleep) wake(b);
      if (b.frozen && !hasSupport(world, b)) wake(b);
      maybeSleep(b, step);
      if (b.isTarget && b.y - (b.shape === 'circle' ? b.radius : b.hh) > world.groundY + 50) {
        b.destroyed = true;
      }
      if (b.isProjectile && (b.y > world.height + 120 || b.x < -160 || b.x > world.width + 160)) {
        b.destroyed = true;
      }
    }
  }
  const destroyedIds = world.bodies.filter((b) => b.destroyed && !destroyedBefore.has(b.id)).map((b) => b.id);
  world.bodies = world.bodies.filter((b) => !b.destroyed);
  return { impacts, destroyedIds };
}

export function worldSettled(world: SpWorld): boolean {
  for (const b of world.bodies) {
    if (b.destroyed || b.static || b.frozen) continue;
    if (b.isProjectile && !b.asleep) return false;
    if (!b.asleep && Math.hypot(b.vx, b.vy) > 28) return false;
  }
  return true;
}

export function livingTargets(world: SpWorld): SpBody[] {
  return world.bodies.filter((b) => b.isTarget && !b.destroyed);
}

export function projectileKinds(): SpMaterial[] {
  return ['cork', 'iron', 'rubber'];
}
