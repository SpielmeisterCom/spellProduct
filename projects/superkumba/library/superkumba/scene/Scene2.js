define(
	'superkumba/scene/Scene2',
	[
		'spell/functions'
	],
	function(
		_
	) {
		'use strict'


		return {
			init : function( spell, sceneConfig ) {
				spell.entityManager.createEntities( sceneConfig.entities )
			},
			destroy : function( spell, sceneConfig ) {}
		}
	}
)
