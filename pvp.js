const ui = require('./tui')();

const { Vec3 } = require('vec3');

module.exports = function attach(bot) {
    class pupa_pvp {
        allies = [];
        enemies = [];

        mode = 2;

        strafePoint = null;
        distanceOld = null;

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
            this.updateTarget();
            if (!this.bot.pvp.target) return;
            this.doStrafe();
            this.doAvoid();
            this.doFloat();
            this.bot.pupa_inventory.equipArmor()
            if ()

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

        updateTarget = () => {
            const target = this.bot.nearestEntity(this.getTargetFilter(this.mode));
            if (target) this.bot.pvp.attack(target); else this.bot.pvp.forceStop();
        }
        


        doStrafe = () => {
            const source = this.bot.entity.position;
            const target = this.bot.pvp.target.position;

            function distance2D(a, b) {
                return Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2);
            }

            if (!source || !target) return;

            if (this.bot.entity.onGround && source.distanceTo(target) <= 3.5) {
                this.strafePoint = this.bot.pupa_utils.getStrafePoint(source, target);
                
                const velocity = this.bot.pupa_utils.getJumpVelocity(source, this.strafePoint);
                if (velocity) {
                    this.bot.entity.velocity.set(0,0,0);
                    this.bot.entity.velocity.set(...Object.values(velocity));
                }
            }

                
            if (!this.bot.entity.onGround && this.strafePoint && distance2D(source, this.strafePoint) < 0.5) {
                if (distance2D(source, this.strafePoint) > this.distanceOld) {
                    const velocity = this.bot.pupa_utils.getFlatVelocity(source, this.strafePoint, 0, 0.05);
                    this.bot.entity.velocity.set(...Object.values(velocity));
                }
                this.lastDist = distance2D(source, this.strafePoint);
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