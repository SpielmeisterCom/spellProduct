define(
	'spell/system/keyInput',
	[
		'spell/shared/util/Events',
		'spell/shared/util/input/keyCodes',

		'spell/functions'
	],
	function(
		Events,
		keyCodes,

		_
	) {
		'use strict'


		/**
		 * private
		 */

		var updateActors = function( actors, eventManager, actorId, actionId, isExecuting ) {
			for( var id in actors ) {
				var actor  = actors[ id ],
					action = actor.actions[ actionId ]

				if( action &&
					actor.id === actorId &&
					action.executing !== isExecuting ) { // only changes in action state are interesting

					action.executing = isExecuting

					eventManager.publish(
						[ isExecuting ? Events.ACTION_STARTED : Events.ACTION_STOPPED, actionId ],
						[ id ]
					)
				}
			}
		}

		var processEvent = function( eventManager, inputEvent, actors, inputDefinitions ) {
			for( var id in inputDefinitions ) {
				var inputDefinition     = inputDefinitions[ id ],
					keyToActionMapAsset = inputDefinition.asset,
					actionId            = keyToActionMapAsset[ inputEvent.keyCode ]

				if( actionId ) {
					var isExecuting = ( inputEvent.type === 'keydown' )

					updateActors( actors, eventManager, inputDefinition.actorId, actionId, isExecuting )
				}
			}
		}

		/**
		 * Update the actor entities action component with the player input
		 *
		 * @param spell
		 * @param timeInMs
		 * @param deltaTimeInMs
		 */
		var process = function( spell, timeInMs, deltaTimeInMs ) {
			var actors           = this.actors,
				eventManager     = spell.eventManager,
				inputEvents      = spell.inputManager.getInputEvents(),
				inputDefinitions = this.inputDefinitions

			for( var i = 0, numInputEvents = inputEvents.length; i < numInputEvents; i++ ) {
				processEvent( eventManager, inputEvents[ i ], actors, inputDefinitions )
			}
		}


		/**
		 * public
		 */

		var KeyInput = function( spell ) {}

		KeyInput.prototype = {
			init : function( spell ) {},
			destroy : function( spell ) {},
			activate : function( spell ) {},
			deactivate : function( spell ) {},
			process : process
		}

		return KeyInput
	}
)
