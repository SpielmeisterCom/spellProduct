/**
 * @class superkumba.system.cameraMover
 * @singleton
 */

define(
	'superkumba/system/cameraMover',
	[
		'spell/functions'
	],
	function(
		_
	) {
		'use strict'


		/**
		 * Creates an instance of the system.
		 *
		 * @constructor
		 * @param {Object} [spell] The spell object.
		 */
		var cameraMover = function( spell ) {

		}

		cameraMover.prototype = {
			/**
		 	 * Gets called when the system is created.
		 	 *
		 	 * @param {Object} [spell] The spell object.
			 */
			init: function( spell ) {

			},

			/**
		 	 * Gets called when the system is destroyed.
		 	 *
		 	 * @param {Object} [spell] The spell object.
			 */
			destroy: function( spell ) {

			},

			/**
		 	 * Gets called when the system is activated.
		 	 *
		 	 * @param {Object} [spell] The spell object.
			 */
			activate: function( spell ) {

			},

			/**
		 	 * Gets called when the system is deactivated.
		 	 *
		 	 * @param {Object} [spell] The spell object.
			 */
			deactivate: function( spell ) {

			},

			/**
		 	 * Gets called to trigger the processing of game state.
		 	 *
			 * @param {Object} [spell] The spell object.
			 * @param {Object} [timeInMs] The current time in ms.
			 * @param {Object} [deltaTimeInMs] The elapsed time in ms.
			 */
			process: function( spell, timeInMs, deltaTimeInMs ) {
				var camera = spell.entityManager.getEntityIdsByName( 'camera' )[0],
				    player = spell.entityManager.getEntityIdsByName( 'player' )[0],
				    cameraTranslation = this.transforms[ camera ].translation,
				    playerTranslation = this.transforms[ player ].translation

				    cameraTranslation[ 0 ] = playerTranslation[ 0 ]
				    cameraTranslation[ 1 ] = playerTranslation[ 1 ]
				    
				    if ( cameraTranslation[ 0 ] < 450 ) {
				    	cameraTranslation[ 0 ] = 450
				    }
				    
				    if ( cameraTranslation[ 0 ] > 1850 ) {
				    	cameraTranslation[ 0 ] = 1850
				    }
				    
				    if ( cameraTranslation[ 1 ] < 300 ) {
				    	cameraTranslation[ 1 ] = 300
				    }
				    
				    if ( cameraTranslation[ 1 ] > 700 ) {
				    	cameraTranslation[ 1 ] = 700
				    }				    
			}
		}

		return cameraMover
	}
)
