/**
 * @class superkumba.system.playerMover
 * @singleton
 */

define(
	'superkumba/system/playerMover',
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

		var startMovingX = function( entityManager, playerEntityId, force, impulse ) {
			entityManager.addComponent(
				playerEntityId,
				'spell.component.box2d.applyImpulse',
				{
					impulse : [ impulse, 0 ]
				}
			)

			entityManager.updateComponent(
				playerEntityId,
				'spell.component.box2d.applyForce',
				{
					force : [ force, 0 ]
				}
			)
		}

		var updateDirection = function( transform, rightward ) {
			transform.scale[ 0 ] = transform.scale[ 0 ] * rightward ? 1 : -1
		}

		var updateAppearance = function( entityManager, entityId, assetId, looped, replaySpeed ) {
			if( !replaySpeed ) replaySpeed = 1
			if( looped === undefined ) looped = true

			entityManager.updateComponent(
				entityId,
				'spell.component.2d.graphics.animatedAppearance',
				{
					assetId : assetId,
					offset : 0,
					looped : looped,
					replaySpeed : replaySpeed
				}
			)
		}

        var process = function( spell, timeInMs, deltaTimeInMs ) {
			var entityManager           = spell.entityManager,
				actors                  = this.actors,
				animatedAppearances     = this.animatedAppearances,
				transforms              = this.transforms,
				simpleBoxes             = this.simpleBoxes,
				simpleSpheres           = this.simpleSpheres,
				simplePlayers           = this.simplePlayers,
				jumpActionStartedQueue  = this.jumpActionStartedQueue,
				rightActionStartedQueue = this.rightActionStartedQueue,
				rightActionStoppedQueue = this.rightActionStoppedQueue,
				leftActionStartedQueue  = this.leftActionStartedQueue,
				leftActionStoppedQueue  = this.leftActionStoppedQueue

			var playerEntityId  = entityManager.getEntityIdsByName( 'player' )[ 0 ],
				jumpAndRunActor = this.jumpAndRunActors[ playerEntityId ],
				actor           = actors[ playerEntityId ]

			if( jumpActionStartedQueue.length > 0 ) {
				jumpActionStartedQueue.length = 0

				if( jumpAndRunActor.isGrounded ) {
					entityManager.addComponent(
						playerEntityId,
						'spell.component.box2d.applyImpulse',
						{
							impulse : [ 0, 130 ]
						}
					)

					updateAppearance( entityManager, playerEntityId, 'animation:superkumba.actor.kiba.jumping', false, 0.4 )

					// only one impulse component at a time is allowed
					return
				}
			}

			if( rightActionStartedQueue.length > 0 ) {
				this.wantsToMove = true

				startMovingX(
					entityManager,
					playerEntityId,
					50,
					jumpAndRunActor.isGrounded ? 75 : 25
				)

				updateDirection( transforms[ playerEntityId ], true )
				updateAppearance( entityManager, playerEntityId, 'animation:superkumba.actor.kiba.running' )

				rightActionStartedQueue.length = 0

			} else if( leftActionStartedQueue.length > 0 ) {
				this.wantsToMove = true

				startMovingX(
					entityManager,
					playerEntityId,
					-50,
					jumpAndRunActor.isGrounded ? -75 : -25
				)

				updateDirection( transforms[ playerEntityId ], false )
				updateAppearance( entityManager, playerEntityId, 'animation:superkumba.actor.kiba.running' )

				leftActionStartedQueue.length = 0
			}

			if( rightActionStoppedQueue.length > 0 ||
				leftActionStoppedQueue.length > 0 ) {

				this.wantsToMove = false

				// stop movement force
				entityManager.updateComponent(
					playerEntityId,
					'spell.component.box2d.applyForce',
					{
						force : [ 0, 0 ]
					}
				)

				rightActionStoppedQueue.length = 0
				leftActionStoppedQueue.length = 0
			}

			if( !this.wantsToMove &&
				jumpAndRunActor.isGrounded ) {

				// apply dampening
				var simplePlayer = simplePlayers[ playerEntityId ]

				entityManager.addComponent(
					playerEntityId,
					'spell.component.box2d.applyVelocity',
					{
						velocity : [ simplePlayer.velocity[ 0 ] * 0.8, simplePlayer.velocity[ 1 ] ]
					}
				)

				updateAppearance( entityManager, playerEntityId, 'animation:superkumba.actor.kiba.standing' )
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
			this.wantsToMove = false
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
						{ action : 'left',  event : Events.ACTION_STOPPED }
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
