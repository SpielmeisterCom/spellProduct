/**
 * @class createTilePhysics
 * @singleton
 */

define(
	'createTilePhysics',
	[
		'spell/functions'
	],
	function(
		_
	) {
		'use strict'
		
		
		var createPhysicEntities = function( spell, tilemapComponent ) {
			var tilemapData			= tilemapComponent.asset.tilemapData,
				tilemapDimensions	= tilemapComponent.asset.tilemapDimensions,
				frameDimensions		= tilemapComponent.asset.frameDimensions
				
				for ( var y = 0; y < tilemapDimensions[1]; y++) {
					for (var x = 0; x < tilemapDimensions[0]; x++) {
						
						if ( tilemapData [ y ] [ x ] !== null ) {

							spell.EntityManager.createEntity({
								entityTemplateId: 'superkumba.level.collision_block',
								config: {
									"spell.component.box2d.simpleBox": {
										"dimensions": frameDimensions
									},
									"spell.component.2d.transform": {
										"translation": [ 
											50 + x * frameDimensions[0], 
											-50 + tilemapDimensions[1] * frameDimensions[1] - y * frameDimensions[1] 
										]
									}
								}
							})
						}
					}
				}
		}
		
		/**
		 * Creates an instance of the system.
		 *
		 * @constructor
		 * @param {Object} [spell] The spell object.
		 */
		var createTilePhysics = function( spell ) {
			this.initialized = false
		}
		
		createTilePhysics.prototype = {
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
				if ( ! this.initialized ) {
					for (var entityId in this.tilemaps) {
						createPhysicEntities( spell, this.tilemaps[ entityId ] )
					}
				
					this.initialized = true
				}
			}
		}
		
		return createTilePhysics
	}
)
