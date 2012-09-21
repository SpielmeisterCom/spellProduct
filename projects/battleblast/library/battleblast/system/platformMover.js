define(
	'battleblast/system/platformMover',
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
			this.updatePlatform( timeInMs )
		}

        var rescale = function(number, istart, istop, ostart, ostop) {
    		return ostart + (ostop - ostart) * ((number-istart) / (istop-istart));
		}


        var s = 0.3

		var applyActionsToPlatformElements = function( timeInMs, platform, transform ) {

            var sin = Math.sin(timeInMs/500)
            var scaleFactor = rescale(sin, -1, 1, 1, 1.02)
            var moveFactor = rescale(sin, -1, 1, -s, s)

			transform.scale[0] = scaleFactor
    		transform.scale[1] = scaleFactor
            
        	transform.translation[0] += moveFactor
    		transform.translation[1] += moveFactor

		}

		/**
		 * public
		 */

		var PropellerSystem = function( spell ) {
			this.updatePlatform     = createEntityEach( this.platforms, [ this.transforms ], applyActionsToPlatformElements )
		}

		PropellerSystem.prototype = {
			cleanUp : cleanUp,
			init : init,
			process : process
		}

		return PropellerSystem
	}
)

