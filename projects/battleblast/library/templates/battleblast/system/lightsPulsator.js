define(
	'battleblast/system/lightsPulsator',
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

			var opacity = Math.abs( Math.sin(timeInMs/300) )

			this.updateLights( timeInMs, opacity )
		}

		var applyActionsToLights = function( timeInMs, opacity, light, visualObject ) {
			visualObject.opacity = opacity
		}

		/**
		 * public
		 */

		var LightsPulsatorSystem = function( spell ) {
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

