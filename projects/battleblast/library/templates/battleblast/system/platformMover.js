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

		var init = function( globals ) { }

		var cleanUp = function( globals ) {}

		var process = function( globals, timeInMs, deltaTimeInMs ) {
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

		var PropellerSystem = function( globals ) {
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

