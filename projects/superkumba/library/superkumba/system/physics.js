define(
	'superkumba/system/physics',
	[
		'spell/Defines',
		'spell/math/util',
		'spell/math/vec2',
		'spell/shared/util/Events',
		'spell/shared/util/platform/PlatformKit',

		'spell/functions'
	],
	function(
		Defines,
		mathUtil,
		vec2,
		Events,
		PlatformKit,

		_
	) {
		'use strict'


		var modulo = mathUtil.modulo

		var VELOCITY_THRESHOLD_X = 0.05,
			VELOCITY_THRESHOLD_Y = 0.05

		var Box2D                   = PlatformKit.Box2D,
			createB2Vec2            = Box2D.Common.Math.createB2Vec2,
			createB2World           = Box2D.Dynamics.createB2World,
			createB2FixtureDef      = Box2D.Dynamics.createB2FixtureDef,
			createB2DebugDraw       = Box2D.Dynamics.createB2DebugDraw,
			createB2Body            = Box2D.Dynamics.createB2Body,
			b2Body                  = Box2D.Dynamics.b2Body,
			createB2BodyDef         = Box2D.Dynamics.createB2BodyDef,
			createB2ContactListener = Box2D.Dynamics.createB2ContactListener,
			createB2PolygonShape    = Box2D.Collision.Shapes.createB2PolygonShape,
			createB2CircleShape     = Box2D.Collision.Shapes.createB2CircleShape

		var awakeColor    = [ 0.82, 0.76, 0.07 ],
			notAwakeColor = [ 0.27, 0.25, 0.02 ],
			tmpVec2       = vec2.create()

		var updateJumpAndRunActors = function( world, worldToPhysicsScale, jumpAndRunActors, isGroundedQueue, isNotGroundedQueue ) {
			var numIsGrounded    = isGroundedQueue.length,
				numIsNotGrounded = isNotGroundedQueue.length,
				id

			// updating isGrounded
			for( var i = 0; i < numIsGrounded; i++ ) {
				id = isGroundedQueue[ i ]

				var jumpAndRunActor = jumpAndRunActors[ id ]

				if( jumpAndRunActor ) {
					jumpAndRunActor.numContacts++
					jumpAndRunActor.isGrounded = jumpAndRunActor.numContacts > 0
				}
			}

			if( numIsGrounded ) {
				isGroundedQueue.length = 0
			}

			for( var i = 0; i < numIsNotGrounded; i++ ) {
				id = isNotGroundedQueue[ i ]

				var jumpAndRunActor = jumpAndRunActors[ id ]

				if( jumpAndRunActor ) {
					jumpAndRunActor.numContacts--
					jumpAndRunActor.isGrounded = jumpAndRunActor.numContacts > 0
				}
			}

			if( numIsNotGrounded ) {
				isNotGroundedQueue.length = 0
			}

			for( id in jumpAndRunActors ) {
				var body = getBodyById( world, id )
				if( !body ) continue

				var jumpAndRunActor = jumpAndRunActors[ id ]
				if( !jumpAndRunActor ) continue

				var velocity = body.GetLinearVelocity()

				// updating isMoving
				jumpAndRunActor.isMovingX = Math.abs( velocity.x ) >= VELOCITY_THRESHOLD_X
				jumpAndRunActor.isMovingY = Math.abs( velocity.y ) >= VELOCITY_THRESHOLD_Y

				// clamping velocity to range
				var maxVelocityX = jumpAndRunActor.maxVelocityX,
					maxVelocityY = jumpAndRunActor.maxVelocityY

				velocity.x = mathUtil.clamp( velocity.x, -maxVelocityX, maxVelocityX )
				velocity.y = mathUtil.clamp( velocity.y, -maxVelocityY, maxVelocityY )

				body.SetLinearVelocity( velocity )
			}
		}

		var createFootSensorContactListener = function( isGroundedQueue, isNotGroundeQueue ) {
			var createFootSensorContactHandler = function( callback ) {
				return function( contact, manifold ) {
					var userDataA = contact.GetFixtureA().GetUserData(),
						userDataB = contact.GetFixtureB().GetUserData()

					var id = ( userDataA && userDataA.type === 'footSensor' ?
						userDataA.id :
						( userDataB && userDataB.type === 'footSensor' ?
							userDataB.id :
							undefined
						)
					)

					if( id ) {
						callback( id )
					}
				}
			}

//			var log = function( next, contact, manifold ) {
//				console.log( 'endContact' )
//				next( contact, manifold )
//			}
//
//			return createB2ContactListener(
//				createFootSensorContactHandler( _.bind( isGroundedQueue.push, isGroundedQueue ) ),
//				_.bind( log, null, createFootSensorContactHandler( _.bind( isNotGroundeQueue.push, isNotGroundeQueue ) ) ),
//				null,
//				null
//			)

			return createB2ContactListener(
				createFootSensorContactHandler( _.bind( isGroundedQueue.push, isGroundedQueue ) ),
				createFootSensorContactHandler( _.bind( isNotGroundeQueue.push, isNotGroundeQueue ) ),
				null,
				null
			)
		}

		var getBodyById = function( world, entityId ) {
			for( var body = world.GetBodyList(); body; body = body.GetNext() ) {
				if( entityId === body.GetUserData() ) {
					return body
				}
			}
		}

		var createBody = function( spell, worldToPhysicsScale, debug, world, entityId, entity ) {
			var body        = entity[ Defines.PHYSICS_BODY_COMPONENT_ID ],
				fixture     = entity[ Defines.PHYSICS_FIXTURE_COMPONENT_ID ],
				boxShape    = entity[ Defines.PHYSICS_BOX_SHAPE_COMPONENT_ID ],
				circleShape = entity[ Defines.PHYSICS_CIRCLE_SHAPE_COMPONENT_ID ],
				playerShape = entity[ Defines.PHYSICS_JNRPLAYER_SHAPE_COMPONENT_ID ],
				transform   = entity[ Defines.TRANSFORM_COMPONENT_ID ]

			if( !body || !fixture || !transform ||
				( !boxShape && !circleShape && !playerShape ) ) {

				return
			}

			createPhysicsObject( world, worldToPhysicsScale, entityId, body, fixture, boxShape, circleShape, playerShape, transform )

			if( debug ) {
				var componentId,
					config

				if( circleShape ) {
					componentId = 'spell.component.2d.graphics.debug.circle'
					config = {
						radius : circleShape.radius
					}

				} else {
					var boxesqueShape = boxShape || playerShape

					componentId = 'spell.component.2d.graphics.debug.box'
					config = {
						width : boxesqueShape.dimensions[ 0 ],
						height : boxesqueShape.dimensions[ 1 ]
					}
				}

				spell.entityManager.addComponent(
					entityId,
					componentId,
					config
				)
			}
		}

		var destroyBodies = function( world, destroyedEntities ) {
			for( var i = 0, numDestroyedEntities = destroyedEntities.length; i < numDestroyedEntities; i++ ) {
				var body = getBodyById( world, destroyedEntities[ i ] )

				if( !body ) continue

				world.DestroyBody( body )
			}
		}

		var getBodyType = function( type ) {
			return type === 'static' ? b2Body.b2_staticBody :
				type === 'dynamic' ? b2Body.b2_dynamicBody :
					type === 'kinematic' ? b2Body.b2_kinematicBody :
						undefined
		}

		var createBodyDef = function( world, worldToPhysicsScale, entityId, body, transform ) {
			var translation = transform.translation,
				bodyDef     = createB2BodyDef(),
				type        = getBodyType( body.type )

			if( type === undefined ) return

			bodyDef.fixedRotation = body.fixedRotation
			bodyDef.type          = type
			bodyDef.position.x    = translation[ 0 ] * worldToPhysicsScale
			bodyDef.position.y    = translation[ 1 ] * worldToPhysicsScale
			bodyDef.userData      = entityId

			return world.CreateBody( bodyDef )
		}

		var addShape = function( world, worldToPhysicsScale, entityId, bodyDef, fixture, boxShape, circleShape, playerShape ) {
			var fixtureDef = createB2FixtureDef()

			fixtureDef.density     = fixture.density
			fixtureDef.friction    = fixture.friction
			fixtureDef.restitution = fixture.restitution

			if( boxShape ) {
				fixtureDef.shape = createB2PolygonShape()
				fixtureDef.shape.SetAsBox(
					boxShape.dimensions[ 0 ] / 2 * worldToPhysicsScale,
					boxShape.dimensions[ 1 ] / 2 * worldToPhysicsScale
				)

				bodyDef.CreateFixture( fixtureDef )

			} else if( circleShape ) {
				fixtureDef.shape = createB2CircleShape( circleShape.radius * worldToPhysicsScale )

				bodyDef.CreateFixture( fixtureDef )

			} else if( playerShape ) {
				var halfWidth  = playerShape.dimensions[ 0 ] / 2 * worldToPhysicsScale,
					footRadius = halfWidth,
					halfHeight = playerShape.dimensions[ 1 ] / 2 * worldToPhysicsScale - footRadius / 2

				// main shape
				fixtureDef.shape = createB2PolygonShape()
				fixtureDef.shape.SetAsOrientedBox( halfWidth * 0.95, halfHeight, createB2Vec2( 0, footRadius / 2 ) )

				bodyDef.CreateFixture( fixtureDef )

				// foot shape
				var footFixtureDef = createB2FixtureDef()

				footFixtureDef.density     = fixture.density / 2
				footFixtureDef.friction    = fixture.friction
				footFixtureDef.restitution = fixture.restitution
				footFixtureDef.shape       = createB2CircleShape( footRadius )
				footFixtureDef.shape.SetLocalPosition( createB2Vec2( 0, halfHeight * -1 + footRadius / 2 ) )

				bodyDef.CreateFixture( footFixtureDef )

				// foot sensor shape
				var footSensorFixtureDef = createB2FixtureDef()

//				footSensorFixtureDef.density     = fixture.density
//				footSensorFixtureDef.friction    = fixture.friction
//				footSensorFixtureDef.restitution = fixture.restitution

				footSensorFixtureDef.isSensor = true
				footSensorFixtureDef.userData = { type : 'footSensor', id : entityId }
				footSensorFixtureDef.shape    = createB2CircleShape( footRadius )
				footSensorFixtureDef.shape.SetLocalPosition( createB2Vec2( 0, halfHeight * -1 + footRadius / 2.5 ) )

				bodyDef.CreateFixture( footSensorFixtureDef )
			}
		}

		var createPhysicsObject = function( world, worldToPhysicsScale, entityId, body, fixture, boxShape, circleShape, playerShape, transform ) {
			var bodyDef = createBodyDef( world, worldToPhysicsScale, entityId, body, transform )

			if( !bodyDef ) return

			addShape( world, worldToPhysicsScale, entityId, bodyDef, fixture, boxShape, circleShape, playerShape )
		}

		var simulate = function( world, deltaTimeInMs ) {
			world.Step( deltaTimeInMs / 1000, 10, 8 )
			world.ClearForces()
			world.DrawDebugData()
		}

		var transferState = function( world, worldToPhysicsScale, bodies, transforms ) {
			for( var body = world.GetBodyList(); body; body = body.GetNext() ) {
				var id = body.GetUserData()

				if( !id ) continue

				var position  = body.GetPosition(),
					transform = transforms[ id ]

				transform.translation[ 0 ] = position.x / worldToPhysicsScale
				transform.translation[ 1 ] = position.y / worldToPhysicsScale
				transform.rotation = body.GetAngle() * -1

				var velocityVec2  = body.GetLinearVelocity(),
					bodyComponent = bodies[ id ]

				bodyComponent.velocity[ 0 ] = velocityVec2.x / worldToPhysicsScale
				bodyComponent.velocity[ 1 ] = velocityVec2.y / worldToPhysicsScale
			}
		}

		var updateDebug = function( world, debugBoxes, debugCircles ) {
			for( var body = world.GetBodyList(); body; body = body.GetNext() ) {
				var id = body.GetUserData()

				if( !id ) continue

				var debugShape = debugBoxes[ id ] || debugCircles[ id ]

				debugShape.color = body.IsAwake() ? awakeColor : notAwakeColor
			}
		}

		var applyInfluence = function( entityManager, world, worldToPhysicsScale, applyForces, applyTorques, applyImpulses, applyVelocities, setPositions ) {
			for( var body = world.GetBodyList(); body; body = body.GetNext() ) {
				var id = body.GetUserData()

				if( !id ) continue

				// spell.component.physics.applyForce
				var applyForce = applyForces[ id ]

				if( applyForce ) {
					var force  = applyForce.force,
						forceX = force[ 0 ] * worldToPhysicsScale,
						forceY = force[ 1 ] * worldToPhysicsScale

					if( forceX || forceY ) {
						var point = applyForce.point

						body.ApplyForce(
							createB2Vec2( forceX, forceY ),
							applyForce.usePoint ?
								createB2Vec2( point[ 0 ] * worldToPhysicsScale, point[ 1 ] * worldToPhysicsScale ) :
								body.GetWorldCenter()
						)
					}
				}

				// spell.component.physics.applyTorque
				var applyTorque = applyTorques[ id ]

				if( applyTorque ) {
					var torque = applyTorque.torque * worldToPhysicsScale

					if( torque ) {
						body.ApplyTorque( torque )
					}
				}

				// spell.component.physics.applyImpulse
				var applyImpulse = applyImpulses[ id ]

				if( applyImpulse ) {
					var impulse  = applyImpulse.impulse,
						impulseX = impulse[ 0 ] * worldToPhysicsScale,
						impulseY = impulse[ 1 ] * worldToPhysicsScale

					if( impulseX || impulseY ) {
						var point = applyImpulse.point

						body.ApplyImpulse(
							createB2Vec2( impulseX, impulseY ),
							applyImpulse.usePoint ?
								createB2Vec2( point[ 0 ] * worldToPhysicsScale, point[ 1 ] * worldToPhysicsScale ) :
								body.GetWorldCenter()
						)

						entityManager.removeComponent( id, 'spell.component.physics.applyImpulse' )
					}
				}

				// spell.component.physics.applyVelocity
				var velocity = applyVelocities[ id ]

				if( velocity ) {
					body.SetLinearVelocity(
						createB2Vec2(
							velocity.velocity[ 0 ] * worldToPhysicsScale,
							velocity.velocity[ 1 ] * worldToPhysicsScale
						)
					)

					entityManager.removeComponent( id, 'spell.component.physics.applyVelocity' )
				}

				// spell.component.physics.setPosition
				var setPosition = setPositions[ id ]

				if( setPosition ) {
					body.SetPosition(
						createB2Vec2(
							setPosition.value[ 0 ] * worldToPhysicsScale,
							setPosition.value[ 1 ] * worldToPhysicsScale
						)
					)

					entityManager.removeComponent( id, 'spell.component.physics.setPosition' )
				}
			}
		}

		var updatePlatforms = function( deltaTimeInMs, world, worldToPhysicsScale, platforms, transforms ) {
			for( var id in platforms ) {
				var platform = platforms[ id ]
				if( !platform.moving ) return

				var transform = transforms[ id ]
				if( !transform ) return

				var duration = platform.duration
				if( !duration ) return

				if( !platform.origin ) {
					platform.origin = vec2.create()
					vec2.set( transform.translation, platform.origin )
				}

				var origin = platform.origin

				var body = getBodyById( world, id )
				if( !body ) return

				var offsetInMs = modulo( Math.round( platform.offset + deltaTimeInMs ), platform.duration ),
					offset     = offsetInMs / duration,
					t          = ( offset <= 0.5 ? offset : 1 - offset ) * 2

				platform.offset = offsetInMs

				vec2.lerp( platform.waypointA, platform.waypointB, t, tmpVec2 )
				vec2.add( origin, tmpVec2 )
				vec2.scale( tmpVec2, worldToPhysicsScale )

				var currentPosition = body.GetPosition(),
					dx              = tmpVec2[ 0 ] - currentPosition.x,
					dy              = tmpVec2[ 1 ] - currentPosition.y

				body.SetLinearVelocity( createB2Vec2( dx, dy ) )
			}
		}

		var init = function( spell ) {
			var doSleep = true

			this.world = createB2World(
				createB2Vec2( this.config.gravity[ 0 ], this.config.gravity[ 1 ] ),
				doSleep
			)

			this.world.SetContactListener(
				createFootSensorContactListener( this.isGroundedQueue, this.isNotGroundedQueue )
			)

//			var debugDraw = createB2DebugDraw(),
//				context   = spell.renderingContext.context
//
//			if( context ) {
//				debugDraw.SetSprite( context )
//				debugDraw.SetDrawScale( 0.01 )
//
//				this.world.SetDebugDraw( debugDraw )
//			}
		}

		var activate = function( spell ) {
			this.entityCreatedHandler = _.bind( createBody, null, spell, this.worldToPhysicsScale, this.debug, this.world )
			this.entityDestroyHandler = _.bind( this.removedEntitiesQueue.push, this.removedEntitiesQueue )

			spell.eventManager.subscribe( Events.ENTITY_CREATED, this.entityCreatedHandler )
			spell.eventManager.subscribe( Events.ENTITY_DESTROYED, this.entityDestroyHandler )
		}

		var deactivate = function( spell ) {
			spell.eventManager.unsubscribe( Events.ENTITY_CREATED, this.entityCreatedHandler )
			spell.eventManager.unsubscribe( Events.ENTITY_DESTROYED, this.entityDestroyHandler )
		}

		var process = function( spell, timeInMs, deltaTimeInMs ) {
			var world                = this.world,
				transforms           = this.transforms,
				removedEntitiesQueue = this.removedEntitiesQueue,
				worldToPhysicsScale  = this.worldToPhysicsScale

			if( removedEntitiesQueue.length ) {
				destroyBodies( world, removedEntitiesQueue )
				removedEntitiesQueue.length = 0
			}

			updatePlatforms( deltaTimeInMs, world, worldToPhysicsScale, this.platforms, this.transforms )
			applyInfluence( spell.entityManager, world, worldToPhysicsScale, this.applyForces, this.applyTorques, this.applyImpulses, this.applyVelocities, this.setPositions )

			simulate( world, deltaTimeInMs )

			updateJumpAndRunActors( world, worldToPhysicsScale, this.jumpAndRunActors, this.isGroundedQueue, this.isNotGroundedQueue )
			transferState( world, worldToPhysicsScale, this.bodies, transforms )

			if( this.debug ) {
				updateDebug( world, this.debugBoxes, this.debugCircles )
			}

//			world.DrawDebugData()
		}

		var Physics = function( spell ) {
			this.debug = !!spell.configurationManager.debug
			this.entityCreatedHandler
			this.entityDestroyHandler
			this.world
			this.worldToPhysicsScale = this.config.scale
			this.removedEntitiesQueue = []
			this.isGroundedQueue = []
			this.isNotGroundedQueue = []
		}

		Physics.prototype = {
			init : init,
			destroy : function() {},
			activate : activate,
			deactivate : deactivate,
			process : process
		}

		return Physics
	}
)
