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
            PROJECTILE MOTION         
        */
        getProjectileOffset(source, target, velocity = 10) {
            const [x1, y1, z1] = [source.x, source.y, source.z];
            const [x2, y2, z2] = [target.x, target.y, target.z];

            const gravity = 1.6;

            const distance = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
            const dy = y2 - y1;

            if (distance === 0) {
                return dy >= 0 ? [Infinity] : [-Infinity];
            }

            const v0Squared = velocity * velocity;
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
            PROJECTILE MOTION         
        */
        /*  START 
            POINT IN POLYGON
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
        isInUnwanted(source, height = 1.8, offset = 0.3) {
            const offsets = [offset, offset + 0.0625];

            for (let off of offsets) {
                for (let layer = 0; layer < 2; layer++) {
                    const layerY = source.y + (layer * height / 2);
                
                    for (let corner = 0; corner < 4; corner++) {
                        const point = new Vec3(
                            source.x + (corner % 2 ? off : -off), 
                            layerY, 
                            source.z + (corner < 2 ? -off : off)
                        );

                        const block = this.bot.blockAt(point);
                    
                        if (block && ['water', 'lava', 'web', 'cactus'].includes(block.name) || block && block.boundingBox != 'empty' && off === 0.3) {
                            return block.position.offset(0.5, 0, 0.5);
                        }
                    }
                }
            }
            return false;
        }
        // true height at prop 0: 0.875,  change height flowing water: _properties: { level: 2 },
        // PS: no?
        //
        isSubInLiquid(source, height = 1.8, width = 0.6) {
            const liquids = new Set();
            liquids.add(this.bot.registry.blocksByName.water.id);
            liquids.add(this.bot.registry.blocksByName.lava.id);
            for (let x of [-width/2, width/2]) {
                for (let z of [-width/2, width/2]) {
                    const block = this.bot.blockAt(new Vec3(source.x + x, source.y + height, source.z + z));
                    if (block && liquids.has(block.id)) {
                        return true;
                    }
                }
            }
            return false;
        }
        isInLiquid(source, height = 1.8, width = 0.6) {
            const liquids = new Set();
            liquids.add(this.bot.registry.blocksByName.water.id);
            liquids.add(this.bot.registry.blocksByName.lava.id);
            for (let x of [-width/2, width/2]) {
                for (let z of [-width/2, width/2]) {
                    for (let y of [0, height/2, height]) {
                        const block = this.bot.blockAt(new Vec3(source.x + x, source.y + y, source.z + z));
                        if (block && liquids.has(block.id)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }
        /*  END
            POINT IN POLYGON
        */
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
        /*  END 
            AREA CALCULATION
        */
        /*  START
            MOVEMENT
        */
        recentPoints = [];
        recentPointsMax = 1;
/* 
  Jump when chasing? (A* it?)
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

                let isValid = true;
                for (const recentPoint of this.recentPoints) {
                    const distToRecent = distance2D(point, recentPoint);
                    if (distToRecent <= 1) {
                        isValid = false;
                        break;
                    }
                }
                if (!isValid) continue;
            
                this.recentPoints.push(point);
                if (this.recentPoints.length > this.recentPointsMax) {
                    this.recentPoints.shift();
                }

                return point;
            }
            return null;
        }
/*
        getSolidBlocks(source) {
            const solids = new Set();

            //const solids = [];

            const offsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

            const radius = 2;

            const badBlocks = new Set();
            badBlocks.add(this.bot.registry.blocksByName.water.id);
            badBlocks.add(this.bot.registry.blocksByName.lava.id);
            badBlocks.add(this.bot.registry.blocksByName.air.id);
            badBlocks.add(this.bot.registry.blocksByName.web.id);

            for (let xOffset = -radius; xOffset <= radius; xOffset++) {
                for (let zOffset = -radius; zOffset <= radius; zOffset++) {
//            for (const xOffset of offsets) {
//                for (const zOffset of offsets) {
                    // Start from the source Y position and search downward
                    let foundSolid = false;
                    for (let y = Math.floor(source.y); y >= source.y - 2 && !foundSolid; y--) {
                        const point = new Vec3(source.x + xOffset, y, source.z + zOffset);
                        const block = this.bot.blockAt(point);

                        if (!block) continue;

                        const [dx, dz] = block.shapes[0] 
                            ? [Math.abs(block.shapes[0][0] - block.shapes[0][3]), Math.abs(block.shapes[0][2] - block.shapes[0][5])] 
                            : [0, 0];

                        if (!badBlocks.has(block.id) && 
                            block.boundingBox != 'empty' && 
                            dx > this.bot.entity.width && 
                            dz > this.bot.entity.width) {
                            const yOffset = Math.abs(block.shapes[0][1] - block.shapes[0][4])
                            solids.add(block.position.offset(0.5,yOffset,0.5)); //.push(block.position.offset(0.5,yOffset,0.5));
                            foundSolid = true;
                        }
                    }
                }
            }
            return solids;
        }
*/
        getSolidBlocks(source) {
            const badBlocks = new Set();
            badBlocks.add(this.bot.registry.blocksByName.water.id);
            badBlocks.add(this.bot.registry.blocksByName.lava.id);
            badBlocks.add(this.bot.registry.blocksByName.air.id);
            badBlocks.add(this.bot.registry.blocksByName.web.id);
        
            const solids = [];
            const radius = 2; // [-2, -1, 0, 1, 2]
        
            for (let xOffset = -radius; xOffset <= radius; xOffset++) {
                for (let zOffset = -radius; zOffset <= radius; zOffset++) {
                    const startY = Math.floor(source.y);
                    for (let y = startY; y >= startY - 1; y--) {
                        const block = this.bot.blockAt(new Vec3(source.x + xOffset, y, source.z + zOffset));
                        const shape = block.shapes[0];
                    
                        if (!block || !shape || badBlocks.has(block.name) || block.boundingBox === 'empty') {
                            continue;
                        }
                    
                        const dx = Math.abs(shape[0] - shape[3]);
                        const dz = Math.abs(shape[2] - shape[5]);
                        
                        if (dx > this.bot.entity.width && dz > this.bot.entity.width) {
                            const yOffset = Math.abs(shape[1] - shape[4]);
                            solids.push(block.position.offset(0.5, yOffset, 0.5));
                            break;
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
        getFlatVelocity(source, target, angleDegrees = 0, velocityXZ = 0.05, velocityY = this.bot.entity.velocity.y) {
            const dx = target.x - source.x;
            const dz = target.z - source.z;
            
            const angleRad = (Math.atan2(dz, dx) + (angleDegrees * Math.PI / 180));
            const vx = Math.cos(angleRad) * velocityXZ;
            const vz = Math.sin(angleRad) * velocityXZ;

            return new Vec3(vx,velocityY,vz);
        }
        /*  END
            MOVEMENT
        */
        
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