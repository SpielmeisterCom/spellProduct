define(
	'spellReferenceProject/system/spacecraftIntegrator',
	[
		'spell/shared/util/createEntityEach',

		'spell/math/vec2'
	],
	function(
		createEntityEach,

		vec2
	) {
		'use strict'


		/**
		 * private
		 */

		var spacecraftRotationSpeed = 1.75,
			tmp = vec2.create()


		var init = function( globals ) { }

		var cleanUp = function( globals ) {}

		var applyActionsToSpacecraftIter = function( deltaTimeInS, spacecraft, actor, inertialObject, transform ) {
			var actions = actor.actions

			var rotationDirection = ( actions.steerLeft.executing ?
				-1 :
				actions.steerRight.executing ?
					1 :
					0
			)

			if( rotationDirection ) {
				transform.rotation += deltaTimeInS * spacecraftRotationSpeed * rotationDirection
			}

			if( actions.accelerate.executing ) {
				var rotation      = transform.rotation,
					thrusterForce = spacecraft.thrusterForce

				// f
				vec2.set(
					[
						Math.sin( rotation ) * thrusterForce,
						Math.cos( rotation ) * thrusterForce
					],
					tmp
				)

				// v = v + dv; dv = da * dt; da = f / m
				vec2.add(
					vec2.scale( tmp, deltaTimeInS / inertialObject.mass ),
					inertialObject.velocity
				)
			}
		}

		var updateInertialObjectIter = function( deltaTimeInS, inertialObject, transform ) {
			// ds, tmp := deltaPosition
			vec2.scale( inertialObject.velocity, deltaTimeInS, tmp )
			vec2.add( tmp, transform.translation )
		}

		var process = function( globals, timeInMs, deltaTimeInMs ) {
			var deltaTimeInS = deltaTimeInMs / 1000

			this.updateSpacecrafts( deltaTimeInS )
			this.updateInertialObjects( deltaTimeInS )
		}


		/**
		 * public
		 */

		var SpacecraftIntegrator = function( globals ) {
			this.updateSpacecrafts     = createEntityEach( this.spacecrafts, [ this.actors, this.inertialObjects, this.transforms ], applyActionsToSpacecraftIter )
			this.updateInertialObjects = createEntityEach( this.inertialObjects, this.transforms, updateInertialObjectIter )
		}

		SpacecraftIntegrator.prototype = {
			cleanUp : cleanUp,
			init : init,
			process : process
		}

		return SpacecraftIntegrator
	}
)
