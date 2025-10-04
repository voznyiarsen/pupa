const { Vec3 } = require('vec3');

module.exports = function attach(bot) {
    class pupa_utils {
        constructor(bot) {
          this.bot = bot
        }
        /*        
        1.62 block height to head base for target entity.eyeHeight
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

            const offset1 = d * Math.tan(angle1) - h + 1.62;
            if (discriminant === 0) {
                return [offset1];
            }
            const offset2 = d * Math.tan(angle2) - h + 1.62;
            return offset2; // [offset1, offset2]; /* High Arc / Low Arc */
        } 
        isInCylinder(source, point, radius, height) {
            const dy = point.y - source.y;
            if (dy < 0 || dy > height) return false;

            const dx = point.x - source.x;
            const dz = point.z - source.z;
            return dx * dx + dz * dz <= radius * radius;
        }
        isInBox(source, corner1, corner2) {
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
        getSolidBlocks(source) {
            const results = [];
  
            // Define grid offsets for 3x3 pattern (x and z axes)
            const offsets = [-2, -1, 0, 1, 2]; // 5x5

            // Iterate over x and z axes to create flat grid
            for (const xOffset of offsets) {
                for (const zOffset of offsets) {
                    const point = {
                        x: source.x + xOffset,
                        y: source.y - 0.1,
                        z: source.z + zOffset
                    };

                    const block = this.bot.blockAt(new Vec3(point.x, point.y, point.z));

                    if (!block) continue;

                    const [dx, dz] = block.shapes[0] 
                        ? [Math.abs(block.shapes[0][0] - block.shapes[0][3]), Math.abs(block.shapes[0][2] - block.shapes[0][5])] 
                        : [0, 0];

                    if (!['air','web','lava','water'].includes(block.name) && 
                        block.boundingBox != 'empty' && 
                        dx > this.bot.entity.width && 
                        dz > this.bot.entity.width) {
                        results.push(block.position.offset(0,1,0));
                    }
                }
            }

            return results;
        }
        getJumpVelocity(source, target) {
            const Y_FIX = 0.42;
            const MAX_HORIZONTAL_VELOCITY = 60;
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
        getStrafePoint(source, target) { // doo doo dogshit, triangle 3 points cycle better
            const planes = this.getSolidBlocks(target);
            // Function to calculate distance between two points (ignoring y-axis)
            function horizontalDistance(p1, p2) {
                const dx = p1.x - p2.x;
                const dz = p1.z - p2.z;
                return Math.sqrt(dx * dx + dz * dz);
            }
          
            // Function to check if a point is within a plane
            function isPointInPlane(point, planeCenter) {
                return point.x >= planeCenter.x - 0.5 && point.x <= planeCenter.x + 0.5 &&
                       point.z >= planeCenter.z - 0.5 && point.z <= planeCenter.z + 0.5 &&
                       point.y === planeCenter.y;
            }
          
            // Function to check if a point meets distance requirements
            function meetsDistanceRequirements(point, source, target) {
                const distToSource = horizontalDistance(point, source);
                const distToTarget = horizontalDistance(point, target);

                return distToSource > 2 && distToTarget > 1 && 
                       distToSource <= 3 && distToTarget <= 3;
            }
          
            // Try each plane center as a potential solution
            for (const center of planes) {
                // Check the plane center itself first
                if (isPointInPlane(center, center) && 
                    meetsDistanceRequirements(center, source, target)) {
                    return center;
                }
              
                // Search around the plane using grid approach
                const steps = 20; // Increased resolution for better coverage
                const stepSize = 1 / steps; // Step size in units

                // Generate candidate points within the plane bounds
                for (let i = 0; i <= steps; i++) {
                    for (let j = 0; j <= steps; j++) {
                        const candidate = {
                            x: center.x - 0.5 + i * stepSize,
                            y: center.y,
                            z: center.z - 0.5 + j * stepSize
                        };
                      
                        // Use isPointInPlane to verify the candidate is within bounds
                        if (isPointInPlane(candidate, center) && 
                            meetsDistanceRequirements(candidate, source, target)) {
                            return new Vec3(candidate.x, candidate.y, candidate.z);
                        }
                    }
                }
            }
          
            // If no valid point found in any plane
            return null;
        }

        async isInWater(point) { // true height at prop 0: 0.875,  change height flowing water: _properties: { level: 2 },
          // all player bounding box corners  needst to touch water -0.01 inside
            const yPlane = point.y - 0.125;
            const corners = [
                new Vec3(point.x - 0.49, yPlane, point.z - 0.49),
                new Vec3(point.x - 0.49, yPlane, point.z + 0.49),
                new Vec3(point.x + 0.49, yPlane, point.z - 0.49),
                new Vec3(point.x + 0.49, yPlane, point.z + 0.49)
            ];
          
            for (const corner of corners) {
                const block = this.bot.blockAt(corner);
                if (!['water','lava'].includes(block?.name)) {
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

                    const blockTop = this.bot.blockAt(new Vec3(x, yTop, z));
                    const blockBottom = this.bot.blockAt(new Vec3(x, yBottom, z));

                    if (blockTop.boundingBox === 'empty' && blockBottom.boundingBox === 'empty') return true;

                    const shapeTop = blockTop.shapes[0];
                    const shapeBottom = blockBottom.shapes[0];

                    let [dxTop, dzTop] = [0, 0];
                    let [dxBottom, dzBottom] = [0, 0];
                    
                    const getDimensions = (shape) => [Math.abs(shape[0] - shape[3]), Math.abs(shape[2] - shape[5])];
                    if (shapeTop) [dxTop, dzTop] = getDimensions(shapeTop);
                    if (shapeBottom) [dxBottom, dzBottom] = getDimensions(shapeBottom);

                    if ((dxTop < this.bot.entity.width || dzTop < this.bot.entity.width) && (dxBottom < this.bot.entity.width || dzBottom < this.bot.entity.width)) return true;
                }
            }
            return false;
        }
    }
    bot.pupa_utils = new pupa_utils(bot)
    return bot;
}
/*
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