define(
	'superkumba/system/box2D',
	[
		'spell/shared/util/Events',
		'spell/shared/util/platform/PlatformKit',

		'spell/recursiveFunctions',
		'spell/functions'
	],
	function(
		Events,
		PlatformKit,

		_rec,
		_
		) {
		'use strict'


		// private

		var Box2D             = PlatformKit.Box2D,
			b2Vec2            = Box2D.Common.Math.b2Vec2,
			b2World           = Box2D.Dynamics.b2World,
			b2FixtureDef      = Box2D.Dynamics.b2FixtureDef,
			b2Body            = Box2D.Dynamics.b2Body,
			b2BodyDef         = Box2D.Dynamics.b2BodyDef,
			b2PolygonShape    = Box2D.Collision.Shapes.b2PolygonShape,
			b2CircleShape     = Box2D.Collision.Shapes.b2CircleShape,
			b2ContactListener = Box2D.Dynamics.b2ContactListener

		var awakeColor      = [ 0.82, 0.76, 0.07 ],
			notAwakeColor   = [ 0.27, 0.25, 0.02 ],
			maxVelocity     = 20

		var isSphereShape = function( bodyDef ) {
			return !!bodyDef.radius
		}

		var isPlayerShape = function( bodyDef ) {
			return !bodyDef.type
		}

		var getBodyById = function( world, entityId ) {
			for( var body = world.GetBodyList(); body; body = body.m_next ) {
				if( entityId === body.GetUserData() ) {
					return body
				}
			}
		}

		var createBody = function( spell, worldToPhysicsScale, debug, world, entityId, entity ) {
			var simpleBody = entity[ 'spell.component.box2d.simpleBox' ] || entity[ 'spell.component.box2d.simpleSphere' ] || entity[ 'spell.component.box2d.simplePlayer' ],
				transform  = entity[ 'spell.component.2d.transform' ]

			if( !simpleBody || !transform ) return

			createBox2DBody( world, worldToPhysicsScale, entityId, simpleBody, transform )

			if( debug ) {
				var componentId,
					config

				if( isSphereShape( simpleBody ) ) {
					componentId = 'spell.component.2d.graphics.debug.circle'
					config = {
						radius : simpleBody.radius
					}

				} else {
					componentId = 'spell.component.2d.graphics.debug.box'
					config = {
						width : simpleBody.dimensions[ 0 ],
						height : simpleBody.dimensions[ 1 ]
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


		// public

		var addFixtures = function( worldToPhysicsScale, body, entityId, simpleBody ) {
			var fixtureDef = new b2FixtureDef()

			fixtureDef.density     = simpleBody.density
			fixtureDef.friction    = simpleBody.friction
			fixtureDef.restitution = simpleBody.restitution

			if( isPlayerShape( simpleBody ) ) {
				var halfWidth  = simpleBody.dimensions[ 0 ] / 2 * worldToPhysicsScale,
					halfHeight = simpleBody.dimensions[ 1 ] / 2 * worldToPhysicsScale

				// main shape
				fixtureDef.shape = new b2PolygonShape()
				fixtureDef.shape.SetAsBox( halfWidth, halfHeight )
				body.CreateFixture( fixtureDef )

				// foot sensor shape
				var radius         = halfWidth,
					footFixtureDef = new b2FixtureDef()

				footFixtureDef.isSensor = true
				footFixtureDef.userData = { type : 'footSensor', id : entityId }
				footFixtureDef.shape = new b2CircleShape( radius )
				footFixtureDef.shape.SetLocalPosition( new b2Vec2( 0, -1 * halfHeight ) )

				body.CreateFixture( footFixtureDef )

			} else if( isSphereShape( simpleBody ) ) {
				fixtureDef.shape = new b2CircleShape( simpleBody.radius * worldToPhysicsScale )
				body.CreateFixture( fixtureDef )

			} else {
				fixtureDef.shape = new b2PolygonShape()
				fixtureDef.shape.SetAsBox( simpleBody.dimensions[ 0 ] / 2 * worldToPhysicsScale, simpleBody.dimensions[ 1 ] / 2 * worldToPhysicsScale )
				body.CreateFixture( fixtureDef )
			}
		}

		var createBox2DBody = function( world, worldToPhysicsScale, entityId, simpleBody, transform ) {
			// body
			var translation = transform.translation,
				bodyDef     = new b2BodyDef()

			bodyDef.fixedRotation = simpleBody.fixedRotation || true
			bodyDef.type          = simpleBody.type === 'static' ? b2Body.b2_staticBody : b2Body.b2_dynamicBody
			bodyDef.position.x    = translation[ 0 ] * worldToPhysicsScale
			bodyDef.position.y    = translation[ 1 ] * worldToPhysicsScale
			bodyDef.userData      = entityId

			var body = world.CreateBody( bodyDef )

			addFixtures( worldToPhysicsScale, body, entityId, simpleBody )
		}

		var simulate = function( world, deltaTimeInMs ) {
			world.Step( deltaTimeInMs / 1000, 10, 8 )
			world.ClearForces()
		}

		var transferState = function( world, worldToPhysicsScale, simpleBoxes, simpleSpheres, simplePlayers, transforms ) {
			for( var body = world.GetBodyList(); body; body = body.m_next ) {
				var id = body.GetUserData()

				if( !id ) continue

				var position  = body.GetPosition(),
					transform = transforms[ id ]

				transform.translation[ 0 ] = position.x / worldToPhysicsScale
				transform.translation[ 1 ] = position.y / worldToPhysicsScale
				transform.rotation = body.GetAngle() * -1

				var velocityVec2 = body.GetLinearVelocity(),
					simpleBody   = simpleBoxes[ id ] || simpleSpheres [ id ] || simplePlayers[ id ]

				simpleBody.velocity[ 0 ] = velocityVec2.x / worldToPhysicsScale
				simpleBody.velocity[ 1 ] = velocityVec2.y / worldToPhysicsScale
			}
		}

		var updateDebug = function( world, debugBoxes, debugCircles, transforms ) {
			for( var body = world.GetBodyList(); body; body = body.m_next ) {
				var id = body.GetUserData()

				if( !id ) continue

				var debugShape = debugBoxes[ id ] || debugCircles[ id ]

				debugShape.color = body.IsAwake() ? awakeColor : notAwakeColor
			}
		}

		var updateJumpAndRunActors = function( world, jumpAndRunActors, isGroundedQueue, isNotGroundedQueue ) {
			var numIsGrounded    = isGroundedQueue.length,
				numIsNotGrounded = isNotGroundedQueue.length

			for( var i = 0; i < numIsGrounded; i++ ) {
				var id = isGroundedQueue[ i ]

				var jumpAndRunActor = jumpAndRunActors[ id ]

				if( jumpAndRunActor ) {
					jumpAndRunActor.isGrounded = true
				}
			}

			if( numIsGrounded ) {
				isGroundedQueue.length = 0
			}

			for( var i = 0; i < numIsNotGrounded; i++ ) {
				var id = isNotGroundedQueue[ i ]

				var jumpAndRunActor = jumpAndRunActors[ id ]

				if( jumpAndRunActor ) {
					jumpAndRunActor.isGrounded = false
				}
			}

			if( numIsNotGrounded ) {
				isNotGroundedQueue.length = 0
			}
		}

		var applyInfluence = function( entityManager, world, worldToPhysicsScale, applyForces, applyTorques, applyImpulses, applyVelocities ) {
			for( var body = world.GetBodyList(); body; body = body.m_next ) {
				var id = body.GetUserData()

				if( !id ) continue

				// spell.component.box2d.applyForce
				var applyForce = applyForces[ id ]

				if( applyForce ) {
					var force  = applyForce.force,
						forceX = force[ 0 ] * worldToPhysicsScale,
						forceY = force[ 1 ] * worldToPhysicsScale

					if( forceX || forceY ) {
						var point = applyForce.point

						body.ApplyForce(
							new b2Vec2( forceX, forceY ),
							applyForce.usePoint ?
								new b2Vec2( point[ 0 ] * worldToPhysicsScale, point[ 1 ] * worldToPhysicsScale ) :
								body.GetWorldCenter()
						)
					}
				}

				// spell.component.box2d.applyTorque
				var applyTorque = applyTorques[ id ]

				if( applyTorque ) {
					var torque = applyTorque.torque * worldToPhysicsScale

					if( torque ) {
						body.ApplyTorque( torque )
					}
				}

				// spell.component.box2d.applyImpulse
				var applyImpulse = applyImpulses[ id ]

				if( applyImpulse ) {
					var impulse  = applyImpulse.impulse,
						impulseX = impulse[ 0 ] * worldToPhysicsScale,
						impulseY = impulse[ 1 ] * worldToPhysicsScale

					if( impulseX || impulseY ) {
						var point = applyImpulse.point

						body.ApplyImpulse(
							new b2Vec2( impulseX, impulseY ),
							applyImpulse.usePoint ?
								new b2Vec2( point[ 0 ] * worldToPhysicsScale, point[ 1 ] * worldToPhysicsScale ) :
								body.GetWorldCenter()
						)

						entityManager.removeComponent( id, 'spell.component.box2d.applyImpulse' )
					}
				}

				// spell.component.box2d.applyVelocity
				var velocity = applyVelocities[ id ]

				if ( velocity ) {
					body.SetLinearVelocity( new b2Vec2( velocity.velocity[ 0 ] * worldToPhysicsScale, velocity.velocity[ 1 ] * worldToPhysicsScale ) )

					entityManager.removeComponent( id, 'spell.component.box2d.applyVelocity' )
				}

				// check max velocity constraint
				var velocityVec2 = body.GetLinearVelocity(),
					velocity     = velocityVec2.Length()

				if( velocity > 0 && velocity >  maxVelocity ) {
					velocityVec2.x = maxVelocity / velocity * velocityVec2.x
					velocityVec2.y = maxVelocity / velocity * velocityVec2.y
					body.SetLinearVelocity( velocityVec2 )
				}
			}
		}

		var createFootSensorContactListener = function( isGroundedQueue, isNotGroundeQueue ) {
			var contactListener = new b2ContactListener()

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

			contactListener.BeginContact = createFootSensorContactHandler( _.bind( isGroundedQueue.push, isGroundedQueue ) )
			contactListener.EndContact = createFootSensorContactHandler( _.bind( isNotGroundeQueue.push, isNotGroundeQueue ) )

			return contactListener
		}

		var init = function( spell ) {
			var gravity = new b2Vec2( 0, -10 ),
				doSleep = true

			this.world = new b2World( gravity, doSleep )
			this.world.SetContactListener(
				createFootSensorContactListener( this.isGroundedQueue, this.isNotGroundedQueue )
			)
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

			applyInfluence( spell.entityManager, world, worldToPhysicsScale, this.applyForces, this.applyTorques, this.applyImpulses, this.applyVelocities )
			simulate( world, deltaTimeInMs )

			updateJumpAndRunActors( world, this.jumpAndRunActors, this.isGroundedQueue, this.isNotGroundedQueue )
			transferState( world, worldToPhysicsScale, this.simpleBoxes, this.simpleSpheres, this.simplePlayers, transforms )

			if( this.debug ) {
				updateDebug( world, this.debugBoxes, this.debugCircles, transforms )
			}
		}

		var Box2DSystem = function( spell ) {
			this.debug = !!spell.configurationManager.debug
			this.entityCreatedHandler
			this.entityDestroyHandler
			this.world
			this.worldToPhysicsScale = this.config.scale
			this.removedEntitiesQueue = []
			this.isGroundedQueue = []
			this.isNotGroundedQueue = []
		}

		Box2DSystem.prototype = {
			init : init,
			destroy : function() {},
			activate : activate,
			deactivate : deactivate,
			process : process
		}

		return Box2DSystem
	}
)
