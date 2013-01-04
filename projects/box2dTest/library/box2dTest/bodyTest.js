/**
 * @class box2dTest.bodyTest
 * @singleton
 */

define(
	'box2dTest/bodyTest',
	[
		'spell/shared/util/input/keyCodes',
		'spell/math/util',

		'spell/functions'
	],
	function(
		keyCodes,
		mathUtil,

		_
	) {
		'use strict'



		var positions = 5,
			positionIndex = 0

		var createSpawnPosition = function( spell ) {
			var x = ( mathUtil.modulo( positionIndex++, positions ) - Math.floor( positions / 2 ) ) * 7

			return [ x, 30 ]
		}


		/**
		 * Creates an instance of the system.
		 *
		 * @constructor
		 * @param {Object} [spell] The spell object.
		 */
		var BodyTest = function( spell ) {
			this.inputEvents = spell.inputManager.getInputEvents()
		}

		BodyTest.prototype = {
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
				if( this.inputEvents.length === 0 ) return

				var entityManager = spell.entityManager,
					event         = this.inputEvents[ 0 ]

				if( event.type === 'keydown' &&
					event.keyCode === keyCodes.RIGHT_ARROW ) {

					var components = entityManager.getComponentDictionaryById( 'spell.component.physics.body' )

					if( _.size( components ) === 0 ) return

					var id = _.find(
						_.keys( components ),
						function( id ) {
							var name = entityManager.getComponentById( 'spell.component.name', id )

							return name.value === ''
						}
					)

					if( !id ) return

					spell.entityManager.removeEntity( id )

				} else if( event.type === 'mousedown'  ) {

					var worldPosition = spell.renderingContext.transformScreenToWorld( event.position )

					spell.entityManager.createEntity( {
						entityTemplateId : 'box2dTest.smallCrate',
						config : {
							"spell.component.2d.transform" : {
								"translation" : worldPosition
							}
						}
					} )

				} else if( event.type === 'keydown' &&
					event.keyCode === keyCodes.UP_ARROW ) {

					var id = spell.entityManager.getEntityIdsByName( 'mario' )[ 0 ]

					if( id ) {
						spell.box2dWorlds.main.applyImpulse( id, [ 0, 700 ] )
					}
				}
			}
		}

		return BodyTest
	}
)
