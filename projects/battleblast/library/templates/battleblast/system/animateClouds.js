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
        
        var cloudId = 0

        var maxCloudTextureSize = 512
		var scaleFactor = 1.0
		var xSize = 1024
		var ySize = 768
            
		var fromX  = ( -maxCloudTextureSize ) * scaleFactor
		var fromY  = ( -maxCloudTextureSize ) * scaleFactor
		var untilX = ( maxCloudTextureSize + xSize ) * scaleFactor
		var untilY = ( maxCloudTextureSize + ySize ) * scaleFactor

		var distanceCovered = vec2.create()

		/**
		 * private
		 */
        var createClouds = function( spell, numberOfClouds, type ) {
            var baseSpeed = 10

                
				if( type !== "cloud_dark" &&
					type !== "cloud_light" ) {

					throw "Type '" + type + "' is not supported"
				}


				var prng = new XorShift32( 437840 )
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

					var entityId = spell.entityManager.createEntity({
                        "templateId": "battleblast.entity." + type,
                        "config": {
                        "spell.component.2d.transform": {
                                "scale": [ scaleFactor, scaleFactor ],
                                "translation": position
                            },                    
                           "spell.component.2d.graphics.appearance": {
                                "assetId": "appearance:" + type + index
                            }
                        }
					})
					
					/*	[ {
							speed     : tmp,
							position  : position
						} ]*/

		
				}
			}
            
        var applyActionsToClouds = function(deltaTimeInMs, cloud, transform ) {
            var cloudTranslation = transform.translation
            var cloudSpeedVec2 = cloud.speed
            
    		var deltaTimeInS = deltaTimeInMs / 1000


			vec2.scale( cloudSpeedVec2, deltaTimeInS, distanceCovered )
			vec2.add( cloudTranslation, distanceCovered, cloudTranslation )

			if( cloudTranslation[ 0 ] > untilX ||
				cloudTranslation[ 0 ] < fromX ) {

				cloudTranslation[ 0 ] = ( cloudSpeedVec2[ 0 ] > 0 ? fromX : untilX )
			}

			if( cloudTranslation[ 1 ] > untilY ||
				cloudTranslation[ 1 ] < fromY ) {

				cloudTranslation[ 1 ] = ( cloudSpeedVec2[ 1 ] > 0 ? fromY : untilY )
			}
		}
           
        /**
         * Constructor
         */
        var CloudAnimationSystem = function( spell ) {
        	this.updateClouds     = createEntityEach( this.clouds, [ this.transforms ], applyActionsToClouds )
           // this.spell = spell
		}
        
        /**
         * Init function gets called when this system is enabled
         */
		CloudAnimationSystem.prototype.init = function( spell ) {

			// dynamicly create clouds, when this is enabled
			createClouds(spell,
				35,
				"cloud_dark"
			)

			createClouds(spell,
				25,
				"cloud_light"
			)
		}

        /**
         * Cleanup function gets called when this system is disabled
         */
		CloudAnimationSystem.prototype.cleanUp = function( spell ) {
    	    
		}

        /**
         * The process function get called every frame
         */
		CloudAnimationSystem.prototype.process = function( spell, timeInMs, deltaTimeInMs ) {
    		this.updateClouds( deltaTimeInMs )
		}

		return CloudAnimationSystem
	}
)

