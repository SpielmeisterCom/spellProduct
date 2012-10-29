define(
	'spellReferenceProject/system/spacecraftIntegrator',
	function() {
		'use strict'


		/**
		 * private
		 */

		var spacecraftTorque = 1

		var applyActionsToSpacecrafts = function( entityManager, deltaTimeInS, actors, spacecrafts, transforms ) {
			for( var id in actors ) {
				var actions    = actors[ id ].actions,
					transform  = transforms[ id ],
					spacecraft = spacecrafts[ id ]

				var rotationDirection = ( actions.steerLeft.executing ?
					1 :
					( actions.steerRight.executing ?
						-1 :
						0
					)
				)

				// torque
				var torque = ( rotationDirection ?
					spacecraftTorque * rotationDirection :
					0
				)

				entityManager.updateComponent(
					'spell.component.box2d.applyTorque',
					id,
					{
						torque : torque
					}
				)

				// force
				var rotation      = transform.rotation,
					thrusterForce = spacecraft.thrusterForce

				var force = ( actions.accelerate.executing ?
					[ Math.sin( rotation ) * thrusterForce, Math.cos( rotation ) * thrusterForce ] :
					[ 0, 0 ]
				)

				entityManager.updateComponent(
					'spell.component.box2d.applyForce',
					id,
					{
						force : force
					}
				)
			}
		}

		var init = function( spell ) {}

		var process = function( spell, timeInMs, deltaTimeInMs ) {
			var deltaTimeInS = deltaTimeInMs / 1000

			applyActionsToSpacecrafts( spell.EntityManager, deltaTimeInMs, this.actors, this.spacecrafts, this.transforms )
		}


		/**
		 * public
		 */

		var SpacecraftIntegrator = function( spell ) {}

		SpacecraftIntegrator.prototype = {
			init : init,
			destroy : function() {},
			activate : function() {},
			deactivate : function() {},
			process : process
		}

		return SpacecraftIntegrator
	}
)
