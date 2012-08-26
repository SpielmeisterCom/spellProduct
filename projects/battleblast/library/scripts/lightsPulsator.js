define(
	'lightsPulsator',
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

			var opacity = Math.abs( Math.sin(timeInMs/1500) )

			this.updateLights( timeInMs, opacity )
		}

		var applyActionsToLights = function( timeInMs, opacity, light, visualObject ) {
			visualObject.opacity = opacity
		}

		/**
		 * public
		 */

		var LightsPulsatorSystem = function( globals ) {
			this.updateLights     = createEntityEach( this.lights, [ this.visualObjects ], applyActionsToLights )
		}

		LightsPulsatorSystem.prototype = {
			cleanUp : cleanUp,
			init : init,
			process : process
		}

		return LightsPulsatorSystem
	}
)

