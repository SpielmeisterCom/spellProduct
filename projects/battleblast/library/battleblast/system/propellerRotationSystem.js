define(
    'battleblast/system/propellerRotationSystem',
	[
		'spell/shared/util/createEntityEach'
	],
	function(
		createEntityEach
	) {
		'use strict'


		/**
		 * private
		 */

		var init = function( spell ) { }

		var cleanUp = function( spell ) {}

		var process = function( spell, timeInMs, deltaTimeInMs ) {
			var deltaTimeInS = deltaTimeInMs / 1000
			this.updatePropellers( deltaTimeInS )
		}

    	var applyActionsToPropellers = function( deltaTimeInS, propellor, transform ) {
            transform.rotation += deltaTimeInS * propellor.radPerS % (Math.PI * 2)
        }

		/**
		 * public
		 */

		var PropellerSystem = function( spell ) {
			this.updatePropellers     = createEntityEach( this.propellers, [ this.transforms ], applyActionsToPropellers )
		}

		PropellerSystem.prototype = {
			cleanUp : cleanUp,
			init : init,
			process : process
		}

		return PropellerSystem
	}
)

