module.exports = function attach(bot) {
    class pupa_utils {
        constructor(bot) {
          this.bot = bot
        }
        /*        
        θ=arctan(gdv02​±v04​−g2d2−2ghv02​)

        1.8 block height base for target
        */
       getPlayerNBT(username) {
        return bot.players[username];
       }
       getOffset(launchPoint, targetPoint) {
          const [x1, y1, z1] = [launchPoint.x, launchPoint.y, launchPoint.z];
          const [x2, y2, z2] = [targetPoint.x, targetPoint.y, targetPoint.z];

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

          const offset1 = d * Math.tan(angle1) - h + 1.8;
          if (discriminant === 0) {
              return [offset1];
          }
          const offset2 = d * Math.tan(angle2) - h + 1.8;
          return [offset1, offset2]; /* High Arc / Low Arc */
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