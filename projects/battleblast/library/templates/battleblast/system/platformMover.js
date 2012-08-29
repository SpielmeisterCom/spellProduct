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


        var s = 0.4

		var applyActionsToPlatformElements = function( timeInMs, platform, transform ) {

            var moveFactor = rescale(Math.sin(timeInMs/500), -1, 1, -s, s)

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

