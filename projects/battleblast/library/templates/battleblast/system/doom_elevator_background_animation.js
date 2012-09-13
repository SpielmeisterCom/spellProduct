define(
	'battleblast/system/doom_elevator_background_animation',
	[
		'spell/functions'
	],
	function(
		_
	) {
		// all the codes belongs to here
        "use strict"
 
        /**
		 * private
		 */

        var frameOffset = 0,
	        frameCount = 31,
	        entityId   = undefined

		var init = function( spell ) { }

		var cleanUp = function( spell ) {}

		var process = function( spell, timeInMs, deltaTimeInMs ) {
            
            for (entityId in this.background_tiles) {
                          
                this.spell.EntityManager.updateComponent(
                    "spell.component.2d.graphics.appearance",
                    entityId, 
                    {
                        "assetId":  "appearance:battleblast.levels.doom_elevator.background.frame_00" +
                                    ( ( frameOffset < 10 ) ? ( "0" + frameOffset ) : frameOffset )
                    }
                )
            }

            //this animations runs with 60fps, so just increase
            //the frame count for every frame processed
			frameOffset = (frameOffset + 1) % frameCount
		}

		/**
		 * public
		 */

		var BackgroundAnimationSystem = function( spell ) {
            this.spell = spell
		}

		BackgroundAnimationSystem.prototype = {
			cleanUp : cleanUp,
			init : init,
			process : process
		}

		return BackgroundAnimationSystem
	}
)

