const ui = require('./tui')();

const { Vec3 } = require('vec3');

module.exports = function attach(bot) {
    class pupa_pvp {
        allies = [];
        enemies = [];

        mode = 2;

        constructor(bot) {
            this.bot = bot;
        }
        
        setMode(mode) {
            this.mode++;
            if (this.mode > 2) this.mode = 0;
            if (mode) this.mode = mode;
        }
        
        getTargetFilter = () => {
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
                                !this.allies.includes(e.username) &&
                                e.position.distanceTo(this.bot.entity.position) < 128;
                default:
                    return null;
            }
        }

        doDecide = () => {
            //this.doUpdate();
            //if (!this.bot.pvp.target) return;
            //this.doStrafe();
            //this.doAvoid();
            this.doFloat();
        }

        doFloat = () => {
            const liquid = this.bot.pupa_utils.isInLiquid(this.bot.entity.position);
            if (liquid) {
              this.bot.entity.velocity.set(this.bot.entity.velocity.x,0.01,this.bot.entity.velocity.z);
            } 
        }
/*
###
WURST 
MinecraftClient = MC
net.minecraft.client.MinecraftClient is fabric
###
0.04 to float up
CHECK submerged, + touching

submerged = 1.62 height water 
*/


        doAvoid = () => {
            const unwanted = this.bot.pupa_utils.isInUnwanted(this.bot.entity.position);
            if (unwanted) {
                const velocity = this.bot.pupa_utils.getFlatVelocity(this.bot.entity.position, unwanted, 180);
                this.bot.entity.velocity.set(...Object.values(velocity));
            }
        }

        doUpdate = () => {
            const target = this.bot.nearestEntity(this.getTargetFilter(this.mode));
            if (target) this.bot.pvp.attack(target); else this.bot.pvp.forceStop();
        }

        hasJumped = false;
        sourceOld = null;
        strafe = null;

        doStrafe = () => {
            const source = this.bot.entity?.position;
            const target = this.bot.pvp.target.position;

            if (this.bot.entity.onGround && source.distanceTo(target) <= 3.5) {
                this.strafe = this.bot.pupa_utils.getStrafePoint(source, target);
                
                const velocity = this.bot.pupa_utils.getJumpVelocity(source, this.strafe);
                if (velocity) {
                    this.sourceOld = source;
                    this.bot.entity.velocity.set(...Object.values(velocity));
                    this.hasJumped = true;
                }
            }
            if (this.strafe && this.hasJumped) {
                const getDistance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
                
                const strafeToSource = getDistance(this.strafe, source);
                const strafeToSourceOld = getDistance(this.strafe, this.sourceOld);
                const displacement = getDistance(source, this.sourceOld);
                
                if (strafeToSource < 0.8 && strafeToSourceOld - displacement < 0) { // dist source -> point - source -> newsource < 0 and dist < 1 
                    this.hasJumped = false;
                    this.bot.entity.velocity.set(0,this.bot.entity.velocity.y,0);
                }
            }
        }
    } // add worker threads    
    bot.pupa_pvp = new pupa_pvp(bot)
    return bot;
}
/*
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
  }*/