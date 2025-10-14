const { Vec3 } = require('vec3');

module.exports = function attach(bot) {
    class pupa_utils {
        constructor(bot) {
            this.bot = bot
        }
        /*        
        1.62 block height to head base for target entity.eyeHeight
        */
        /*  START 
            PROJECTILES         
        */
        getPOffset(source, target) {
            const [x1, y1, z1] = [source.x, source.y, source.z];
            const [x2, y2, z2] = [target.x, target.y, target.z];

            const v0 = 10;
            const gravity = 1.6;

            const distance = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
            const dy = y2 - y1;

            if (distance === 0) {
                return dy >= 0 ? [Infinity] : [-Infinity];
            }

            const v0Squared = v0 * v0;
            const discriminant = v0Squared * v0Squared - gravity * (gravity * distance * distance + 2 * dy * v0Squared);

            if (discriminant < 0) {
                return [];
            }

            const discSquared = Math.sqrt(discriminant);
            const denominator = gravity * distance;

            const angle1 = Math.atan2(v0Squared + discSquared, denominator);
            const angle2 = Math.atan2(v0Squared - discSquared, denominator);

            const offset1 = distance * Math.tan(angle1) - dy + 1.62;
            if (discriminant === 0) {
                return [offset1];
            }
            const offset2 = distance * Math.tan(angle2) - dy + 1.62;
            return offset2; // [offset1, offset2]; /* High Arc / Low Arc */
        }
        /*  END 
            PROJECTILES         
        */
        /*  START 
            AREA CALCULATION
        */
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
        /*  END 
            AREA CALCULATION
        */
        /*  START
            MOVEMENT
        */
        recentStrafePoints = [];
        maxRecentPoints = 1;
/* 
  Jump when chasing
  True centre of a block is +0.5 x and z
  if within 0.1 area of point set V to 0
*/
        getStrafePoint(source, target) {
            function distance2D(a, b) {
                return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
            }

            const solids = this.getSolidBlocks(target);
        
            for (const point of solids) {
                const distToTarget = distance2D(point, target); // distance to point -> target 
                if (distToTarget >= 3.5 /*&& distToTarget <= 1*/) continue; 

                const distToSource = distance2D(point, source);
                if (distToSource >= 3.5 /*&& distToSource <= 1*/) continue;

                let tooCloseToRecent = false;
                for (const recentPoint of this.recentStrafePoints) {
                    const distToRecent = distance2D(point, recentPoint);
                    if (distToRecent <= 1) {
                        tooCloseToRecent = true;
                        break;
                    }
                }
                if (tooCloseToRecent) continue;
            
                this.recentStrafePoints.push(point);
                if (this.recentStrafePoints.length > this.maxRecentPoints) {
                    this.recentStrafePoints.shift();
                }

                return point;
            }
            return null;
        }
        getSolidBlocks(source) {
            const solids = [];
            const offsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

            for (const xOffset of offsets) {
                for (const zOffset of offsets) {
                    // Start from the source Y position and search downward
                    let foundSolid = false;
                    for (let y = Math.floor(source.y); y >= source.y - 2 && !foundSolid; y--) {
                        const point = new Vec3(source.x + xOffset, y, source.z + zOffset);
                        const block = this.bot.blockAt(point);

                        if (!block) continue;

                        const [dx, dz] = block.shapes[0] 
                            ? [Math.abs(block.shapes[0][0] - block.shapes[0][3]), Math.abs(block.shapes[0][2] - block.shapes[0][5])] 
                            : [0, 0];

                        if (!['air','web','lava','water'].includes(block.name) && 
                            block.boundingBox != 'empty' && 
                            dx > this.bot.entity.width && 
                            dz > this.bot.entity.width) {
                            const yOffset = Math.abs(block.shapes[0][1] - block.shapes[0][4])
                            solids.push(block.position.offset(0.5,yOffset,0.5));
                            foundSolid = true;
                        }
                    }
                }
            }
            return solids;
        }
getJumpVelocity(source, target, angleDegrees = 0, speed = 0.6548) {
    const dx = target.x - source.x;
    const dz = target.z - source.z;
    const length = Math.hypot(dx, dz);

    if (length === 0) {
        return new Vec3(Math.random() * 20 - 10, 0.42, Math.random() * 20 - 10);
    }

    const angle = angleDegrees * (Math.PI / 180);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const dirX = dx / length;
    const dirZ = dz / length;

    const vx = (dirX * cosA - dirZ * sinA) * speed;
    const vz = (dirX * sinA + dirZ * cosA) * speed;

    return new Vec3(vx, 0.42, vz);
}
// Example usage:
/*
const source = { x: 0, z: 0 };
const target = { x: 2.5, z: 0 };
const result = calculateInitialVelocity(source, target);
console.log(result);
*/
        /*
        getJumpVelocity(source, target, angleDegrees = 0, speed = 0.3274*2) {
            const dx = target.x - source.x;
            const dz = target.z - source.z;

            const length = Math.hypot(dx, dz) || null;
            const angle = angleDegrees * (Math.PI / 180);
            if (length === null) {
                return new Vec3(Math.random() * 20 - 10, 0.42, Math.random() * 20 - 10);
            } 
            const cosA = Math.cos(angle), sinA = Math.sin(angle);
            const vx = ((dx / length) * cosA - (dz / length) * sinA) * speed;
            const vz = ((dx / length) * sinA + (dz / length) * cosA) * speed;
            return new Vec3(vx, 0.42, vz);
        }
        /*  END
            MOVEMENT
        */
        /*getStrafePoint(source, target) { // doo doo dogshit, triangle 3 points cycle better
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
        }*/

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