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
        var createClouds = function( spell, numberOfClouds, type ) {
   			if( type !== "cloud_dark" &&
				type !== "cloud_light" ) {

				throw "Type '" + type + "' is not supported"
			}


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

				var entityId = spell.entityManager.createEntity({
                    "templateId": "battleblast.entity." + type,
                    "config": {
                        "spell.component.2d.transform": {
                            "translation": position
                        },                    
                       "spell.component.2d.graphics.appearance": {
                            "assetId": "appearance:" + type + index
                        }
                    }
				})
			}
		}
            
        var applyActionsToClouds = function(deltaTimeInMs, cloud, transform ) {
            var cloudTranslation = transform.translation
            var cloudMoveVec2 = cloud.movement
            var speedFactor = cloud.speedFactor
            
    		var deltaTimeInS = deltaTimeInMs / 1000

			vec2.scale( cloudMoveVec2, deltaTimeInS, distanceCovered )
            vec2.scale( distanceCovered, speedFactor, distanceCovered )

			vec2.add( cloudTranslation, distanceCovered, cloudTranslation )

			if( cloudTranslation[ 0 ] > untilX ||
				cloudTranslation[ 0 ] < fromX ) {

				cloudTranslation[ 0 ] = ( cloudMoveVec2[ 0 ] > 0 ? fromX : untilX )
			}

			if( cloudTranslation[ 1 ] > untilY ||
				cloudTranslation[ 1 ] < fromY ) {

				cloudTranslation[ 1 ] = ( cloudMoveVec2[ 1 ] > 0 ? fromY : untilY )
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
				55,
				"cloud_dark"
			)

			createClouds(spell,
				35,
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

