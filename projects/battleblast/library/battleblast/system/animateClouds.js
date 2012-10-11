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


        var maxCloudTextureSize = 512
		var xSize = 1024
		var ySize = 768

		var fromX  = ( -maxCloudTextureSize )
		var fromY  = ( -maxCloudTextureSize )
		var untilX = ( maxCloudTextureSize + xSize )
		var untilY = ( maxCloudTextureSize + ySize )

		var distanceCovered = vec2.create()

		/**
		 * private
		 */
        var createClouds = function( spell, numberOfClouds, type, layer ) {
   			if( type !== "cloud_dark" &&
				type !== "cloud_light" ) {

				throw "Type '" + type + "' is not supported"
			}

            layer = layer || 0


			var prng = new XorShift32( 437840 )
			var tmp = vec2.create()

			for( var i = 0; i < numberOfClouds; i++) {
				var position = [
					prng.nextBetween( fromX, untilX ),
					prng.nextBetween( fromY, untilY ),
					0
				]

				vec2.scale( tmp, prng.nextBetween( 0.75, 1.0 ) )

				var index = "_0" + ( 1 + ( i % 6 ) )

				var entityId = spell.EntityManager.createEntity( {
                    "entityTemplateId": "battleblast.entity." + type,
                    "config": {
                        "spell.component.2d.transform": {
                            "translation": position
                        },
                        "spell.component.2d.graphics.appearance": {
                            "assetId": "appearance:battleblast.levels.flying_platform.background." + type + index
                        },
                        "spell.component.visualObject": {
                            "layer": layer
                        }
                    }
				} )
			}
		}

        var animateClouds = function(deltaTimeInMs, cloud, transform ) {
      		var deltaTimeInS = deltaTimeInMs / 1000

			vec2.scale( cloud.movement, deltaTimeInS, distanceCovered )
            vec2.scale( distanceCovered, cloud.speedFactor, distanceCovered )

			vec2.add( transform.translation, distanceCovered, transform.translation )

			if( transform.translation[ 0 ] > untilX ||
				transform.translation[ 0 ] < fromX ) {

				transform.translation[ 0 ] = ( cloud.movement[ 0 ] > 0 ? fromX : untilX )
			}

			if( transform.translation[ 1 ] > untilY ||
				transform.translation[ 1 ] < fromY ) {

				transform.translation[ 1 ] = ( cloud.movement[ 1 ] > 0 ? fromY : untilY )
			}
		}

		var init = function( spell ) {
			this.updateClouds = createEntityEach( this.clouds, [ this.transforms ], animateClouds )

			createClouds( spell, 55, "cloud_dark", -2 )
			createClouds( spell, 35, "cloud_light", -1 )
		}

		var process = function( spell, timeInMs, deltaTimeInMs ) {
			this.updateClouds( deltaTimeInMs )
		}

        /**
         * Constructor
         */
        var CloudAnimationSystem = function( spell ) {
		}

		CloudAnimationSystem.prototype = {
			init : init,
			destroy : function() {},
			activate : function() {},
			deactivate : function() {},
			process : process
		}

		return CloudAnimationSystem
	}
)
