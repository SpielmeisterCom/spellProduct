#!/bin/bash

DIRNAME=$(cd $(dirname $0) && pwd)
BASE_INSTALL_DIR=/opt
INSTALL_DIR=$BASE_INSTALL_DIR/$(basename $DIRNAME)
CONFIG_DIR=$HOME/.config/SpellJS

if [ "$USER" != "root" ]; then
	echo "This script must be run as the user root"
	read -n1 -p "Should i rerun myself with: sudo $0 (y/n) "
	echo
	if [ "$REPLY" == "y" ]; then
		sudo $0
	fi
	exit 1
fi

if [ "$1" == "-y" ]; then
	AUTOYES=1
fi

if [ "$AUTOYES" = "1" ]; then
	REPLY="y"
else 
	read -n1 -p "Move $DIRNAME to $INSTALL_DIR? (y/n) "
	echo
fi


if [ "$REPLY" == "y" ]; then
	if [ -d $INSTALL_DIR ]; then
		rm -Rf $INSTALL_DIR
	fi
	
	mv $DIRNAME $BASE_INSTALL_DIR

	if [ "$AUTOYES" = "1" ]; then
		REPLY="y"
	else 
		read -n1 -p "Install spellcli & spelled commands globally? (y/n) "
		echo
	fi

	if [ "$REPLY" = y ]; then
		update-alternatives --remove-all spellcli
		update-alternatives --install "/usr/bin/spellcli" "spellcli" "$INSTALL_DIR/spellcli" 1

		update-alternatives --remove-all spelled
		update-alternatives --install "/usr/bin/spelled" "spelled" "$INSTALL_DIR/spelled" 1

	fi

	if [ ! -d $CONFIG_DIR ]; then
		mkdir -p $CONFIG_DIR 
	fi

	if [ ! -f $CONFIG_DIR/spellConfig.json ]; then
		echo
		echo "Copying $INSTALL_DIR/defaultSpellConfig.json to $CONFIG_DIR/spellConfig.json"
		echo
		echo "If you want to use spellcli with your normal user account please copy this template config file"
		echo "to your ~/.config/SpellJS/spellConfig.json or start spellEd under your normal  user account"

		cp $INSTALL_DIR/defaultSpellConfig.json $CONFIG_DIR/spellConfig.json
	fi
fi

