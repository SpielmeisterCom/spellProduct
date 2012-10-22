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

        var process = function( spell, timeInMs, deltaTimeInMs ) {
			if( spell.inputEvents.length === 0 ) return;

			var entityManager = spell.EntityManager,
				event         = spell.inputEvents[ 0 ],
				impulse		  = null,
				id = spell.EntityManager.getEntityIdsByName( 'player' )[ 0 ]


			if( event.type === 'keydown' &&
				event.keyCode === keyCodes.RIGHT_ARROW ) {

				spell.EntityManager.updateComponent(
					'spell.component.box2d.applyForce',
					id,
					{
						force : [ 5, 0 ]
					}
				)	
				
			} else if( event.type === 'keydown' &&
				event.keyCode === keyCodes.LEFT_ARROW ) {

				spell.EntityManager.updateComponent(
					'spell.component.box2d.applyForce',
					id,
					{
						force : [ -5, 0 ]
					}
				)	
				
			} else if( event.keyCode === keyCodes.UP_ARROW ) {
				
				if (event.type === 'keydown' && (timeInMs - this.lastJump) > 1000 ) {
					this.lastJump = timeInMs
					
					spell.EntityManager.addComponent(
						id,
						{
							componentId : 'spell.component.box2d.applyImpulse',
							config : {
								impulse : [ 0, 3 ]
							}
						}
					)			
					
				}
				
			} else {
				//remove force
				spell.EntityManager.updateComponent(
					'spell.component.box2d.applyForce',
					id,
					{
						force : [ 0, 0 ]
					}
				)	
				
				//stop movement
				spell.EntityManager.addComponent(
					id,
					{
						componentId : 'spell.component.box2d.applyVelocity',
						config : {
							velocity : [0,0]
						}
					}
				)				
			}
        }
    

        var playerMover = function( spell ) {
			this.lastJump = 0
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
