/**
 * @class superkumba.system.playerMover
 * @singleton
 */

define(
	'superkumba/system/playerMover',
	[
		'spell/math/util',
		'spell/shared/util/Events',
		'spell/shared/util/input/keyCodes',

		'spell/functions'
	],
	function(
		mathUtil,
		Events,
		keyCodes,

		_
	) {
		'use strict'


		var playerAppearanceName = 'playerAppearance',
			sign                 = mathUtil.sign

		var toCamelCase = function( it ) {
			return it.replace(
				/([A-Z]+)/g,
				function( m,l ) {
					return l.substr( 0, 1 ).toUpperCase() + l.toLowerCase().substr( 1, l.length )
				}
			).replace(
				/[\-_\s](.)/g,
				function( m, l ) {
					return l.toUpperCase()
				}
			)
		}

		var startMovingX = function( entityManager, playerEntityId, isGrounded, isRolling, isMovingX, direction ) {
			if( direction === 0 ) return

			var force = ( isGrounded ? ( isRolling ? 180 : 130 ) : 50 )

			entityManager.updateComponent(
				playerEntityId,
				'spell.component.physics.applyForce',
				{
					force : [ force * direction, 0 ]
				}
			)
		}

		var updateDirection = function( transform, direction ) {
			if( direction === 0 ) return

			var scale = transform.scale[ 0 ]

			if( sign( scale ) === sign( direction ) ) return

			transform.scale[ 0 ] *= -1
		}

		var updateAppearance = function( entityManager, entityName, assetId, looped, replaySpeed ) {
			if( !replaySpeed ) replaySpeed = 1
			if( looped === undefined ) looped = true

			entityManager.updateComponent(
				entityManager.getEntityIdsByName( entityName )[ 0 ],
				'spell.component.2d.graphics.animatedAppearance',
				{
					assetId : assetId,
					offset : 0,
					looped : looped,
					replaySpeed : replaySpeed
				}
			)
		}

		var getAppearanceAssetId = function( rolling ) {
			return rolling ?
				'animation:superkumba.actor.kiba.rolling' :
				'animation:superkumba.actor.kiba.running'
		}

        var process = function( spell, timeInMs, deltaTimeInMs ) {
			var entityManager           = spell.entityManager,
				actors                  = this.actors,
				transforms              = this.transforms,
				bodies                  = this.bodies,
				jumpActionStartedQueue  = this.jumpActionStartedQueue,
				rightActionStartedQueue = this.rightActionStartedQueue,
				rightActionStoppedQueue = this.rightActionStoppedQueue,
				leftActionStartedQueue  = this.leftActionStartedQueue,
				leftActionStoppedQueue  = this.leftActionStoppedQueue,
				rollActionStartedQueue  = this.rollActionStartedQueue,
				rollActionStoppedQueue  = this.rollActionStoppedQueue

			var playerEntityId  = entityManager.getEntityIdsByName( 'player' )[ 0 ],
				jumpAndRunActor = this.jumpAndRunActors[ playerEntityId ],
				isGrounded      = jumpAndRunActor.isGrounded,
				isMovingX       = jumpAndRunActor.isMovingX,
				isMovingY       = jumpAndRunActor.isMovingY,
				actor           = actors[ playerEntityId ],
				wantsMoveRight  = actor.actions.right.executing,
				wantsMoveLeft   = actor.actions.left.executing,
				isRolling       = actor.actions.roll.executing,
				direction

			// jumping
			if( jumpActionStartedQueue.length > 0 ) {
				jumpActionStartedQueue.length = 0

				if( isGrounded ) {
					entityManager.addComponent(
						playerEntityId,
						'spell.component.physics.applyImpulse',
						{
							impulse : [ 0, 60 ]
						}
					)

					updateAppearance( entityManager, playerAppearanceName, 'animation:superkumba.actor.kiba.jumping', false, 0.4 )

					isGrounded = false
				}
			}

			// start rolling
			if( isGrounded ) {
				if( rollActionStartedQueue.length > 0 ) {
					rollActionStartedQueue.length = 0

					updateAppearance( entityManager, playerAppearanceName, getAppearanceAssetId( isRolling ) )

					jumpAndRunActor.maxVelocityX = 3.5
				}
			}

			// end rolling
			if( rollActionStoppedQueue.length > 0 ) {
				rollActionStoppedQueue.length = 0

				updateAppearance( entityManager, playerAppearanceName, getAppearanceAssetId( isRolling ) )

				jumpAndRunActor.maxVelocityX = 2.75
			}

			// movement in x direction
			if( rightActionStartedQueue.length > 0 ) {
				direction = 1

				updateDirection( transforms[ playerEntityId ], direction )
				startMovingX( entityManager, playerEntityId, isGrounded, isRolling, isMovingX, direction )

				if( isGrounded ) {
					updateAppearance( entityManager, playerAppearanceName, getAppearanceAssetId( isRolling ) )
				}

				rightActionStartedQueue.length = 0

			} else if( leftActionStartedQueue.length > 0 ) {
				direction = -1

				updateDirection( transforms[ playerEntityId ], direction )
				startMovingX( entityManager, playerEntityId, isGrounded, isRolling, isMovingX, direction )

				if( isGrounded ) {
					updateAppearance( entityManager, playerAppearanceName, getAppearanceAssetId( isRolling ) )
				}

				leftActionStartedQueue.length = 0

			} else if( isGrounded ) {
				if( !wantsMoveRight &&
					!wantsMoveLeft ) {

					// apply dampening
					var dampeningFactor = 0.12,
						body            = bodies[ playerEntityId ],
						velocityX       = body.velocity[ 0 ] * ( 1 - dampeningFactor )

					entityManager.addComponent(
						playerEntityId,
						'spell.component.physics.applyVelocity',
						{
							velocity : [
								velocityX,
								body.velocity[ 1 ]
							]
						}
					)

					if( Math.abs( velocityX ) <= 0.3 ) {
						updateAppearance( entityManager, playerAppearanceName, 'animation:superkumba.actor.kiba.standing' )
					}

				}

				if( jumpAndRunActor.justLanded &&
					( wantsMoveRight || wantsMoveLeft ) ) {

					updateAppearance( entityManager, playerAppearanceName, getAppearanceAssetId( isRolling ) )
				}
			}

			// stop movement force
			if( ( rightActionStoppedQueue.length > 0 || leftActionStoppedQueue.length > 0 ) &&
				!wantsMoveRight &&
				!wantsMoveLeft ) {

				entityManager.updateComponent(
					playerEntityId,
					'spell.component.physics.applyForce',
					{
						force : [ 0, 0 ]
					}
				)

				rightActionStoppedQueue.length = 0
				leftActionStoppedQueue.length = 0
			}
        }


		var registerActionQueues = function( eventManager, scope, actions ) {
			for( var i = 0, numActions = actions.length; i < numActions; i++ ) {
				var action    = actions[ i ],
					actionId  = action.action,
					eventId   = action.event,
					eventName = toCamelCase( Events.getNameById( eventId ) )

				var queueName = actionId + eventName + 'Queue'
				scope[ queueName ] = []

				var queue       = scope[ queueName ],
					handlerName = actionId + eventName + 'Handler'

				scope[ handlerName ] = _.bind( queue.push, queue )

				eventManager.subscribe( [ eventId, actionId ], scope[ handlerName ] )
			}
		}


        var PlayerMover = function( spell ) {
			this.lastJump = 0
		}

		PlayerMover.prototype = {
			init : function( spell ) {
				registerActionQueues(
					spell.eventManager,
					this,
					[
						{ action : 'jump',  event : Events.ACTION_STARTED },
						{ action : 'right', event : Events.ACTION_STARTED },
						{ action : 'right', event : Events.ACTION_STOPPED },
						{ action : 'left',  event : Events.ACTION_STARTED },
						{ action : 'left',  event : Events.ACTION_STOPPED },
						{ action : 'roll',  event : Events.ACTION_STARTED },
						{ action : 'roll',  event : Events.ACTION_STOPPED }
					]
				)
			},
			destroy : function( spell ) {
				// TODO: implement "unregisterActionHandlers"

//				var eventManager = spell.eventManager

//				eventManager.unsubscribe( [ Events.ACTION_STARTED, 'jump' ],  this.jumpActionHandler )
//				eventManager.unsubscribe( [ Events.ACTION_STARTED, 'right' ], this.rightActionHandler )
//				eventManager.unsubscribe( [ Events.ACTION_STARTED, 'left' ],  this.leftActionHandler )
			},
			activate : function() {},
			deactivate : function() {},
			process : process
		}

		return PlayerMover
	}
)
