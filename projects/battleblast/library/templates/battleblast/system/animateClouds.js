define(
	'battleblast/system/animateClouds',
	[
		'spell/shared/util/createEntityEach',
		'spell/math/vec2',
		'spell/math/random/XorShift32'
	],
	function(
		createEntityEach,
		vec2,
	    XorShift32
		) {
		'use strict'


		/**
		 * private
		 */

		var init = function( spell ) {

			var maxCloudTextureSize = 512
			var xSize = 1024
			var ySize = 768

			var createClouds = function( numberOfClouds, baseSpeed, type ) {
				if( type !== "dark_cloud" &&
					type !== "light_cloud" ) {

					throw "Type '" + type + "' is not supported"
				}


				var prng = new XorShift32( 437840 )
				var scaleFactor = 1.0
				var tmp = vec2.create()


				var fromX  = ( -maxCloudTextureSize ) * scaleFactor
				var fromY  = ( -maxCloudTextureSize ) * scaleFactor
				var untilX = ( maxCloudTextureSize + xSize ) * scaleFactor
				var untilY = ( maxCloudTextureSize + ySize ) * scaleFactor


				for( var i = 0; i < numberOfClouds; i++) {
					var position = [
						prng.nextBetween( fromX, untilX ),
						prng.nextBetween( fromY, untilY ),
						0
					]

					vec2.set( baseSpeed, tmp )
					vec2.scale( tmp, prng.nextBetween( 0.75, 1.0 ) * scaleFactor )

					var index = "_0" + ( 1 + ( i % 6 ) )

					spell.entityManager.createEntity(type)

					/*
						[ {
							scale     : [ scaleFactor, scaleFactor, 0 ],
							textureId : "environment/" + type + index + ".png",
							speed     : tmp,
							position  : position
						} ]

					*/
				}
			}

			// add clouds
			createClouds(
				35,
				"dark_cloud"
			)

			createClouds(
				25,
				"light_cloud"
			)


		}

		var cleanUp = function( spell ) {}

		var process = function( spell, timeInMs, deltaTimeInMs ) {
		}

		/**
		 * public
		 */
		var CloudAnimationSystem = function( spell ) {
		}

		CloudAnimationSystem.prototype = {
			cleanUp : cleanUp,
			init : init,
			process : process
		}

		return CloudAnimationSystem
	}
)



/*
define(
	"",
	[
		"funkysnakes/shared/config/constants",

		"spell/shared/util/math",

		"glmatrix/vec3",
		"underscore"
	],
	function(
		constants,

		math,

		vec3,
		_
		) {
		"use strict"


		var scaleFactor = 1.0
		var fromX  = ( -constants.maxCloudTextureSize ) * scaleFactor
		var fromY  = ( -constants.maxCloudTextureSize ) * scaleFactor
		var untilX = ( constants.maxCloudTextureSize + constants.xSize ) * scaleFactor
		var untilY = ( constants.maxCloudTextureSize + constants.ySize ) * scaleFactor

		var distanceCovered = vec3.create( [ 0, 0, 0 ] )


		var animateClouds = function(
			timeInMs,
			deltaTimeInMs,
			cloudEntities
			) {
			var deltaTimeInS = deltaTimeInMs / 1000

			_.each(
				cloudEntities,
				function( cloud ) {
					vec3.scale( cloud.cloud.speed, deltaTimeInS, distanceCovered )
					vec3.add( cloud.position, distanceCovered )

					if( cloud.position[ 0 ] > untilX ||
						cloud.position[ 0 ] < fromX ) {

						cloud.position[ 0 ] = ( cloud.cloud.speed[ 0 ] > 0 ? fromX : untilX )
					}

					if( cloud.position[ 1 ] > untilY ||
						cloud.position[ 1 ] < fromY ) {

						cloud.position[ 1 ] = ( cloud.cloud.speed[ 1 ] > 0 ? fromY : untilY )
					}
				}
			)
		}


		return animateClouds
	}
)
*/
