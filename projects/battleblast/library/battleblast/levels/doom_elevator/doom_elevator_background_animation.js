define(
	'battleblast/levels/doom_elevator/doom_elevator_background_animation',
	[
		'spell/functions'
	],
	function(
		_
	) {
		"use strict"

        /**
		 * private
		 */

        var frameOffset = 0,
	        frameCount = 30,
	        entityId   = undefined,
            frameOffsetInt = 0

		var init = function( spell ) { }

		var cleanUp = function( spell ) {}

		var process = function( spell, timeInMs, deltaTimeInMs ) {

            frameOffsetInt = parseInt( frameOffset, 10 )

            for (entityId in this.background_tiles) {

                this.spell.EntityManager.updateComponent(
                    "spell.component.2d.graphics.appearance",
                    entityId,
                    {
                        "assetId":  "appearance:battleblast.levels.doom_elevator.background.frame_00" +
                                    ( (  frameOffsetInt < 10 ) ? ( "0" + frameOffsetInt ) : frameOffsetInt )
                    }
                )
            }

            //this animations runs with 60fps, so just increase
            //the frame count for every frame processed
			frameOffset = (frameOffset + 0.4) % frameCount
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

