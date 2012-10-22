define(
	'superkumba/playerMover',
	[
		'spell/shared/util/input/keyCodes',
		'spell/functions'
	],
	function(
		keyCodes,
		_
	) {
	
		'use strict'

        var process = function( spell ) {
			if( spell.inputEvents.length === 0 ) return

			var entityManager = spell.EntityManager,
				event         = spell.inputEvents[ 0 ],
				impulse		  = null

			if( event.type === 'keydown' &&
				event.keyCode === keyCodes.RIGHT_ARROW ) {

				impulse = [1, 0]
				
			} else if( event.type === 'keydown' &&
				event.keyCode === keyCodes.LEFT_ARROW ) {

				impulse = [-1, 0]
				
			} else if( event.type === 'keydown' &&
				event.keyCode === keyCodes.UP_ARROW ) {
				impulse = [0, 2]

			}
	
		var id = spell.EntityManager.getEntityIdsByName( 'player' )[ 0 ]

		if( id  && impulse ) {
			spell.EntityManager.addComponent(
					id,
						{
							componentId : 'spell.component.box2d.applyImpulse',
							config : {
								impulse : impulse
						}
					}
				)
			}
        }
    

        var playerMover = function( spell ) {

		}

		playerMover.prototype = {
			init : function() {},
			destroy : function() {},
			activate : function() {},
			deactivate : function() {},
			process : process
		}

		return playerMover
	}
)
