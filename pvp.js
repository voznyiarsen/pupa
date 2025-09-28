
const { Vec3 } = require('vec3');

module.exports = function attach(bot) {
    class pupa_pvp {
        allies = [];
        enemies = [];

        mode = 0;

        constructor(bot) {
            this.bot = bot;
        }
        
        setMode(mode) {
            this.mode++;
            if (this.mode > 4) this.mode = 0;
            if (mode) this.mode = mode;
        }
        /* // Looking handled internaly, rewrite to have lambda/kami blue-like viewlock
        isInRange() { // 3
            if (this.bot.pvp.target.entity.position.distanceTo(this.bot.entity.position) <= this.bot.pvp.attackRange && !this.bot.pathfinder.isMoving()) {
                this.bot.lookAt(this.bot.pvp.target.position.offset(0, 1.6, 0), true);
            }
        }
        */
        isNearWeb() {
            const web = this.bot.findBlocks({
                point: this.bot.pvp.target.entity.position,
                matching: this.bot.registry.blocksByName
            })
        }
        getTargetFilter() {
            switch (this.mode) {
                case 0:
                    return e => e.type === 'mob' &&
                                e.kind === 'Hostile mobs' &&
                                e.position.distanceTo(this.bot.entity.position) <= 128;
                case 1: 
                    return e => e.type === 'player' && 
                                this.bot.players[e.username]?.gamemode === 0 &&
                                !this.allies.includes(e.username) &&
                                e.position.distanceTo(this.bot.entity.position) <= 128;
                case 2: 
                    return e => e.type === 'player' &&
                                this.bot.players[e.username]?.gamemode === 0 && 
                                !this.allies.includes(e.username) &&
                                (isInCylinder([e.position.x, e.position.y, e.position.z], cylinder1) || 
                                 isInCylinder([e.position.x, e.position.y, e.position.z], cylinder2)) &&
                                e.position.distanceTo(this.bot.entity.position) < 128;
                case 3:
                    return e => e.type === 'player' && 
                                e.username === (this.allies[0]) &&
                                e.position.distanceTo(this.bot.entity.position) <= 128;
                case 4:
                    return;
                default:
                    return null;
            }
        }
    } // add worker threads

    
    bot.pupa_pvp = new pupa_pvp(bot)
    return bot;
}
/*
function updateTarget() {
  entity = bot.nearestEntity(filterTarget());

  if (!entity) {
    bot.pvp.forceStop();
  }
}

function combatMovement() {
    if (!this.entity) return;

    if (this.isOverLiquid && !this.bot.pathfinder?.isMoving()) {
      this.bot.setControlState('forward', true);
    }

    if (this.bot.entity.isInWeb) {
      this.bot.setControlState('jump', false);
    }

    this.strafeMovement(this.entity);
  }

function combatTargeting() {
    if (!this.entity) return;

    if (this.entity.position.distanceTo(this.bot.entity.position) <= this.bot.pvp.attackRange && !this.bot.pathfinder?.isMoving()) {
      this.bot.lookAt(this.entity.position.offset(0, this.entity.eyeHeight, 0), true);
    }
  }

function combatLoop() {
    this.updateEntity();
    this.combatMovement();
    this.combatTargeting(); 
    this.combatAttacking(); 
  }

function strafeMovement() {
  if (!this.entity) return;
  // 1.5 strafe speed 0.6 distance max 
   //Get blocks near entities 
  this.entityBlock = blocksNear(this.entity, 'web', 3, 1);
  this.botBlock = blocksNear(this.bot.entity, 'web', 2, 2);
  this.entityPos = [this.entity.position.x, this.entity.position.z];
    
  this.entityCloseToBlock = this.entityBlock[0] && this.entityBlock[0].distanceTo(this.entity.position) <= 1.5;
  this.botCloseToBlock = this.botBlock[0] && this.botBlock[0].distanceTo(this.bot.entity.position) <= 1.2;
  
  this.bot.pvp.followRange = (this.entityCloseToBlock || this.botCloseToBlock || this.preventFall(this.entity)) || this.bot.entity.isInWeb ? 1 : 5;

  if (!this.isOverLiquid && this.bot.entity.onGround && this.bot.entity.position.distanceTo(this.entity.position) <= this.bot.pvp.followRange && this.bot.pvp.followRange === 5) {
    if (!this.entityBlock[0]) {
      strafe(this.entityPos, 30, 0.6);
    } else {
      this.entityDistToBlock = this.entityBlock[0].distanceTo(this.entity.position);
      this.strafeSpeed = this.entityDistToBlock >= 3.5 ? 0.6 : this.entityDistToBlock > 1.5 ? 0.4 : null;
      if (this.strafeSpeed) {
        strafe(this.entityPos, 30, this.strafeSpeed);
      }
    }
  }
}

function preventFall(e) {
  const b = this.bot.findBlocks({
    point: e.position.offset(0, -1.5, 0),
    matching: this.bot.registry.blocksByName.air.id,
    maxDistance: 0,
    count: 2,
  });
  // if blocks lower than bot and block 1 lower than 2 y and bloc 1 x eq bloc 2 x and z
  return (b[0].y < e.position.y && b[1].y < e.position.y && b[0].y < b[1].y && b[0].x === b[1].x && b[0].z === b[1].z);
}*/