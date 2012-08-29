define(
	'spellReferenceProject/system/collisionDetector',
	[
		'spell/math/vec2',

		'spell/functions'
	],
	function(
		vec2,

		_
	) {
		'use strict'


		/**
		 * private
		 */

		var distanceSquared    = 0,
			minDistanceSquared = 0,
			tmp                = vec2.create()


		var init = function( globals ) { }

		var cleanUp = function( globals ) {}

		var resolveCollision = function( positionA, collisionSphereA, inertialObjectA, positionB, collisionSphereB, inertialObjectB ) {
			var dn = vec2.create()
			vec2.subtract( positionA, positionB, dn )

			// distance between objects
			var delta = vec2.length( dn )

			if( delta === 0 ) {
				positionB[ 0 ] += 0.01
			}

			// normal of the collision plane
			vec2.normalize( dn )

			// tangential of the collision plane
			var dt = vec2.create( [ dn[ 1 ], -dn[ 0 ] ] )

			// masses
			var m1 = inertialObjectA.mass,
				m2 = inertialObjectB.mass,
				M  = m1 + m2

			// minimum translation distance required to separate objects
			var mt = vec2.create()
			vec2.scale(
				dn,
				collisionSphereA.radius + collisionSphereB.radius - delta,
				mt
			)

			// pushing the objects apart relative to their mass
			vec2.add(
				vec2.scale( mt, m2 / M, tmp ),
				positionA
			)

			vec2.subtract(
				positionB,
				vec2.scale( mt, m1 / M, tmp ),
				positionB
			)

			// current velocities
			var v1 = inertialObjectA.velocity,
				v2 = inertialObjectB.velocity

			// splitting the velocity of the object into normal and tangential component relative to the collision plane
			var v1n = vec2.create(),
				v1t = vec2.create()

			vec2.scale( dn, vec2.dot( v1, dn ), v1n )
			vec2.scale( dt, vec2.dot( v1, dt ), v1t )

			var v2n = vec2.create(),
				v2t = vec2.create()

			vec2.scale( dn, vec2.dot( v2, dn ), v2n )
			vec2.scale( dt, vec2.dot( v2, dt ), v2t )

			// calculate new velocity, the tangential component stays the same, the normal component changes analog to the 1-dimensional case
			var v1nlen = vec2.length( v1n ),
				v2nlen = vec2.length( v2n )

			vec2.scale(
				dn,
				( m1 - m2 ) / M * v1nlen + 2 * m2 / M * v2nlen,
				tmp
			)
			vec2.add( v1t, tmp, v1 )

			vec2.scale(
				dn,
				( m2 - m1 ) / M * v2nlen + 2 * m1 / M * v1nlen,
				tmp
			)
			vec2.subtract( v2t, tmp, v2 )
		}

		var isColliding = function( positionA, collisionSphereA, positionB, collisionSphereB ) {
			distanceSquared = vec2.squaredLength( vec2.subtract( positionA, positionB, tmp ) )

			minDistanceSquared = collisionSphereA.radius + collisionSphereB.radius
			minDistanceSquared *= minDistanceSquared

			return distanceSquared <= minDistanceSquared
		}

		var resolveCollisions = function( transforms, collisionSpheres, inertialObjects ) {
			var entityIds    = _.keys( collisionSpheres ),
				numEntityIds = entityIds.length

			for( var i = 0; i < numEntityIds; i++ ) {
				var idA              = entityIds[ i ],
					collisionSphereA = collisionSpheres[ idA ],
					positionA        = transforms[ idA ].translation

				for( var j = i + 1; j < numEntityIds; j++ ) {
					var idB              = entityIds[ j ],
						collisionSphereB = collisionSpheres[ idB ],
						positionB        = transforms[ idB ].translation

					if( isColliding( positionA, collisionSphereA, positionB, collisionSphereB ) ) {
						resolveCollision( positionA, collisionSphereA, inertialObjects[ idA ], positionB, collisionSphereB, inertialObjects[ idB ] )
					}
				}
			}
		}

		var process = function( globals, timeInMs, deltaTimeInMs ) {
			resolveCollisions( this.transforms, this.collisionSpheres, this.inertialObjects )
		}


		/**
		 * public
		 */

		var CollisionDetector = function( globals ) {}

		CollisionDetector.prototype = {
			cleanUp : cleanUp,
			init : init,
			process : process
		}

		return CollisionDetector
	}
)
