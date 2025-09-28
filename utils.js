const { Vec3 } = require('vec3');

module.exports = function attach(bot) {
    class pupa_utils {
        constructor(bot) {
          this.bot = bot
        }
        /*        
        1.6 block height to head base for target
        */
        getPOffset(source, target) {
            const [x1, y1, z1] = [source.x, source.y, source.z];
            const [x2, y2, z2] = [target.x, target.y, target.z];

            const v0 = 10;
            const g = 1.6;

            const d = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
            const h = y2 - y1;

            if (d === 0) {
                return h >= 0 ? [Infinity] : [-Infinity];
            }

            const v0Sq = v0 * v0;
            const discriminant = v0Sq * v0Sq - g * (g * d * d + 2 * h * v0Sq);

            if (discriminant < 0) {
                return [];
            }

            const sqrtDisc = Math.sqrt(discriminant);
            const denominator = g * d;

            const angle1 = Math.atan2(v0Sq + sqrtDisc, denominator);
            const angle2 = Math.atan2(v0Sq - sqrtDisc, denominator);

            const offset1 = d * Math.tan(angle1) - h + 1.6;
            if (discriminant === 0) {
                return [offset1];
            }
            const offset2 = d * Math.tan(angle2) - h + 1.6;
            return offset2; // [offset1, offset2]; /* High Arc / Low Arc */
        }
        isInArea(source, corner1, corner2) {
            const minX = Math.min(corner1[0], corner2[0]);
            const maxX = Math.max(corner1[0], corner2[0]);
            const minY = Math.min(corner1[1], corner2[1]);
            const maxY = Math.max(corner1[1], corner2[1]);
            const minZ = Math.min(corner1[2], corner2[2]);
            const maxZ = Math.max(corner1[2], corner2[2]);

            return (
                source[0] >= minX && source[0] <= maxX &&
                source[1] >= minY && source[1] <= maxY &&
                source[2] >= minZ && source[2] <= maxZ
            );
        }
        getLandableBlocks(point) {
            // get ID blocks below point in area of 3-4 blocks, any non passable are saved into a DB
        } 
        getJumpVelocity(source, target) {
            const Y_FIX = 0.42;
            const MAX_HORIZONTAL_VELOCITY = 0.6;
            const GRAVITY = 0.08;

            const dx = target.x - source.x;
            const dz = target.z - source.z;
            const dy = target.y - source.y;

            const a = 0.5 * GRAVITY;
            const b = -Y_FIX;
            const c = dy;

            const discriminant = b * b - 4 * a * c;

            if (discriminant < 0) {
                const totalHorizontalDist = Math.sqrt(dx * dx + dz * dz);
                if (totalHorizontalDist === 0) {
                    return [0, Y_FIX, 0];
                }

                const vx = (dx / totalHorizontalDist) * MAX_HORIZONTAL_VELOCITY;
                const vz = (dz / totalHorizontalDist) * MAX_HORIZONTAL_VELOCITY;
                return [vx, Y_FIX, vz];
            }

            const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);

            const time = Math.max(t1, t2) > 0 ? Math.max(t1, t2) : Math.min(t1, t2);

            if (time <= 0) {
                const totalHorizontalDist = Math.sqrt(dx * dx + dz * dz);
                if (totalHorizontalDist === 0) {
                    return [0, Y_FIX, 0];
                }

                const vx = (dx / totalHorizontalDist) * MAX_HORIZONTAL_VELOCITY;
                const vz = (dz / totalHorizontalDist) * MAX_HORIZONTAL_VELOCITY;
                return [vx, Y_FIX, vz];
            }

            let vx = dx / time;
            let vz = dz / time;

            const currentSpeed = Math.sqrt(vx * vx + vz * vz);
            if (currentSpeed > MAX_HORIZONTAL_VELOCITY) {
                const scale = MAX_HORIZONTAL_VELOCITY / currentSpeed;
                vx *= scale;
                vz *= scale;
            }

            return [vx, Y_FIX, vz];
        }
        async isInWater(point) { // true height at prop 0: 0.875,  change height flowing water: _properties: { level: 2 },
          // all player bounding box corners  needst to touch water -0.01 inside
            const yPlane = point.y - 0.125;
            const corners = [
                new Vec3(point.x - 0.5, yPlane, point.z - 0.5),
                new Vec3(point.x - 0.5, yPlane, point.z + 0.5),
                new Vec3(point.x + 0.5, yPlane, point.z - 0.5),
                new Vec3(point.x + 0.5, yPlane, point.z + 0.5)
            ];
          
            for (const corner of corners) {
                const block = bot.blockAt(corner);
                if (block?.name !== 'foo' && block?.name !== 'bar') {
                    return false;
                }
            }
            return true;
        }
        async isNearPassable(point) { //boundingBox: empty
            const yTop = point.y - 0.5;
            const yBottom = yTop - 1;
            // .shapes[0] 
            // [x1, y1, z1, x2, y2, z2]  x0, 3,// z2, 5
            for (let dx = -2; dx <= 2; dx++) {
                for (let dz = -2; dz <= 2; dz++) {
                    const x = point.x + dx;
                    const z = point.z + dz;

                    const blockTop = bot.blockAt(new Vec3(x, yTop, z));
                    const blockBottom = bot.blockAt(new Vec3(x, yBottom, z));

                    if (blockTop.boundingBox === 'empty' && blockBottom.boundingBox === 'empty') return true;

                    const shapeTop = blockTop.shapes[0];
                    const shapeBottom = blockBottom.shapes[0];

                    let [dxTop, dzTop] = [0, 0];
                    let [dxBottom, dzBottom] = [0, 0];

                    if (shapeTop) {
                        [dxTop, dzTop] = [Math.abs(shapeTop[0] - shapeTop[3]), Math.abs(shapeTop[2] - shapeTop[5])];
                    }

                    if (shapeBottom) {
                        [dxBottom, dzBottom] = [Math.abs(shapeBottom[0] - shapeBottom[3]), Math.abs(shapeBottom[2] - shapeBottom[5])];
                    }

                    if ((dxTop < 1 || dzTop < 1) && (dxBottom < 1 || dzBottom < 1)) return true;
                }
            }
            return false;
        }
    }
    bot.pupa_utils = new pupa_utils(bot)
    return bot;
}
/*
function isInCylinder([px, py, pz], { center: [cx, cy, cz], radius, height }) {
  const withinHeight = py >= cy && py <= cy + height;
  const withinRadius = (px - cx) ** 2 + (pz - cz) ** 2 <= radius ** 2;
  return withinHeight && withinRadius;
}
function getDeltaHealth() {
  if (oldHealth === 0) {
    oldHealth = (bot.health+bot.entity?.metadata[11]);
  } else if (oldHealth != 0) {
    newHealth = (bot.health+bot.entity?.metadata[11]);
    if ((oldHealth-newHealth) > 1) deltaHealth = oldHealth - newHealth;
    oldHealth = 0;
    newHealth = 0;
  }
}
/////
function getStrafeVelocity(position, angleDegrees, speed) {
  const [targetX, targetZ] = position;
  const dx = targetX - bot.entity.position.x;
  const dz = targetZ - bot.entity.position.z;
  const length = Math.hypot(dx, dz) || 999;
  const angle = angleDegrees * (Math.PI / 180);
  if (length === 999) return [Math.random() * 20 - 10, Math.random() * 20 - 10];
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const velocityX = ((dx / length) * cosA - (dz / length) * sinA) * speed;
  const velocityZ = ((dx / length) * sinA + (dz / length) * cosA) * speed;
  return [velocityX, velocityZ];
}
function getPearlTrajectory(distance) {
  const g = 1.6, velocity = 10; // m/s
  const sineTheta = (g * distance) / (velocity ** 2);
  if (Math.abs(sineTheta) > 1) throw new Error(`${status.error}Distance too far for initial velocity.`);
  return distance * Math.sin(0.5 * Math.asin(sineTheta));
}
function getFeatherTrajectory(distance) {
  const g = 1.6, velocity = 35; // m/s
  const sineTheta = (g * distance) / (velocity ** 2);
  if (Math.abs(sineTheta) > 1) throw new Error(`${status.error}Distance too far for initial velocity.`);
  return distance * Math.sin(0.5 * Math.asin(sineTheta));
}
function floorVec3(vec3) {
  return {
      x: Math.floor(vec3.x),
      y: Math.floor(vec3.y),
      z: Math.floor(vec3.z)
  };
}
function roundVec3(vec3) {
  return {
      x: Math.round(vec3.x),
      y: Math.round(vec3.y),
      z: Math.round(vec3.z)
  };
}
function getMidpointVec3(point1,point2) {
  return {
    x: (point1.x + point2.x) / 2,
    y: (point1.y + point2.y) / 2,
    z: (point1.z + point2.z) / 2
  };
}


/////////
function isInBlock(entity, block, hitboxHeight = 1.8, hitboxWidth = 0.3) {
  // Convert block to an array if it's not already
  const blocksToCheck = Array.isArray(block) ? block : [block];

  // Define the offsets for the corners of the entity's hitbox
  const cornerOffsets = [
    new Vec3(-hitboxWidth, 0, -hitboxWidth), // Bottom-left-front corner
    new Vec3(-hitboxWidth, 0, hitboxWidth),  // Bottom-left-back corner
    new Vec3(hitboxWidth, 0, -hitboxWidth),  // Bottom-right-front corner
    new Vec3(hitboxWidth, 0, hitboxWidth),   // Bottom-right-back corner
    new Vec3(-hitboxWidth, hitboxHeight, -hitboxWidth), // Top-left-front corner
    new Vec3(-hitboxWidth, hitboxHeight, hitboxWidth),  // Top-left-back corner
    new Vec3(hitboxWidth, hitboxHeight, -hitboxWidth),  // Top-right-front corner
    new Vec3(hitboxWidth, hitboxHeight, hitboxWidth)    // Top-right-back corner
  ];

  // Check the vertical faces (front, back, left, right) and corners
  for (let dy = 0; dy <= hitboxHeight; dy += 0.6) { // Check vertically
    // Front face (positive Z-axis)
    const frontBlock = bot.blockAt(entity.position.offset(0, dy, hitboxWidth));
    if (frontBlock && blocksToCheck.includes(frontBlock.name)) {
      return true; // Collision detected on front face
    }

    // Back face (negative Z-axis)
    const backBlock = bot.blockAt(entity.position.offset(0, dy, -hitboxWidth));
    if (backBlock && blocksToCheck.includes(backBlock.name)) {
      return true; // Collision detected on back face
    }

    // Left face (negative X-axis)
    const leftBlock = bot.blockAt(entity.position.offset(-hitboxWidth, dy, 0));
    if (leftBlock && blocksToCheck.includes(leftBlock.name)) {
      return true; // Collision detected on left face
    }

    // Right face (positive X-axis)
    const rightBlock = bot.blockAt(entity.position.offset(hitboxWidth, dy, 0));
    if (rightBlock && blocksToCheck.includes(rightBlock.name)) {
      return true; // Collision detected on right face
    }

    // Check corners of the entity's hitbox
    for (const offset of cornerOffsets) {
      const cornerPos = entity.position.offset(offset.x, offset.y, offset.z);
      const cornerBlock = bot.blockAt(cornerPos);
      if (cornerBlock && blocksToCheck.includes(cornerBlock.name)) {
        return true; // Collision detected on a corner
      }
    }
  }

  // No collision detected
  return false;
}
/*
2/2 for bot
3/1 for entity 

let lastCallTime = 0; // Timestamp of the last function call
let cachedBlocks = []; // Cached result of the last function call

function blocksNear(entity, block, maxDistance = 2, count = 2) {
  const now = Date.now();

  // If the function was called within the last 500ms, return the cached result
  if (now - lastCallTime < 200) {
    return cachedBlocks;
  }

  // Update the last call time
  lastCallTime = now;

  // Find blocks near the entity
  const blocks = bot.findBlocks({
    point: entity?.position,
    matching: bot.registry.blocksByName[block]?.id,
    maxDistance,
    count,
  });

  // Adjust block positions (center them)
  const adjustBlockPosition = (block) => {
    if (block) {
      block.set(block.x + 0.5, block.y, block.z + 0.5);
    }
  };

  // Adjust positions for blocks
  blocks.forEach(adjustBlockPosition);

  // Cache the result
  cachedBlocks = blocks;

  return blocks;
}*/