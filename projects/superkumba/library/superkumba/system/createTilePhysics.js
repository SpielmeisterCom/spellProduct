/**
 * @class superkumba.system.createTilePhysics
 * @singleton
 */

define(
	'superkumba/system/createTilePhysics',
	[
		'spell/shared/util/Events',

		'spell/functions'
	],
	function(
		Events,

		_
	) {
		'use strict'


		var createPhysicEntities = function( spell, tilemapComponent ) {
			var tilemapData			= tilemapComponent.asset.tilemapData,
				tilemapDimensions	= tilemapComponent.asset.tilemapDimensions,
				frameDimensions		= tilemapComponent.asset.frameDimensions,
				connectedTiles		= 0,
				maxX				= tilemapDimensions[ 0 ],
				maxY				= tilemapDimensions[ 1 ]

				for ( var y = 0; y < maxY; y++) {
					for (var x = 0; x < maxX; x++) {

						connectedTiles = 0

						//find out how many connected tiles are in this row
						while (
							((x + connectedTiles) < maxX) &&
							tilemapData [ y ] [ x + connectedTiles ] !== null
						) {
							connectedTiles++
						}

						if ( connectedTiles > 0 ) {
							x = x + connectedTiles - 1

							var entityId = spell.entityManager.createEntity({
								entityTemplateId: 'superkumba.level.collision_block',
								config: {
									"spell.component.physics.body": {},
									"spell.component.physics.fixture": {},
									"spell.component.physics.shape.box": {
										"dimensions": [
											connectedTiles * frameDimensions[ 0 ],
											frameDimensions[ 1 ]
										]
									},
									"spell.component.2d.transform": {
										"translation": [
											( x + 1 - connectedTiles / 2 ) * frameDimensions[0],
											-50 + tilemapDimensions[1] * frameDimensions[1] - y * frameDimensions[1]
										]
									}
								}
							})

							this.entitiesCreated.push( entityId )
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
			this.entitiesCreated = []
		}

		createTilePhysics.prototype = {
			/**
		 	 * Gets called when the system is created.
		 	 *
		 	 * @param {Object} [spell] The spell object.
			 */
			init: function( spell ) {
				var me = this

				spell.eventManager.subscribe(
					[ Events.ASSET_UPDATED, '2dTileMap' ],
					function( assetId ) {
						me.prototype.destroy.call(me, spell)
						for (var entityId in me.tilemaps) {
							createPhysicEntities.call(me, spell, me.tilemaps[ entityId ] )
						}
					}
				)
			},

			/**
		 	 * Gets called when the system is destroyed.
		 	 *
		 	 * @param {Object} [spell] The spell object.
			 */
			destroy: function( spell ) {

				//remove all entities which were created by this system
				_.each( this.entitiesCreated, function( entityId ) {
					spell.entityManager.removeEntity( entityId )
				})
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
						createPhysicEntities.call(this, spell, this.tilemaps[ entityId ] )
					}

					this.initialized = true
				}
			}
		}

		return createTilePhysics
	}
)
