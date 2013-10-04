UNAME_S := $(shell uname -s)
UNAME_P := $(shell uname -p)
VERSION := $(shell cat VERSION)

ifeq ($(UNAME_S),CYGWIN_NT-6.1-WOW64)
BUILD_TARGET = win-ia32
else ifeq ($(UNAME_S),CYGWIN_NT-6.2-WOW64)
BUILD_TARGET = win-ia32
else ifeq ($(UNAME_S),Linux)
BUILD_TARGET = linux-x64
else ifeq ($(UNAME_S),Darwin)
BUILD_TARGET = osx-ia32
endif

BUILD_DIR    = build
TMP_DIR	     = tmp
BUILD_TARGET_DIR = $(TMP_DIR)/$(BUILD_TARGET)

.PHONY: all prepare-bamboo bamboo build-common

all: prepare-standalone $(BUILD_TARGET)

prepare-standalone: clean
	./create_build_artifacts

prepare-bamboo: clean
	modules/nodejs/node prepare_bamboo_build.js

build-common:
	mkdir -p $(BUILD_DIR) || true
	mkdir -p $(TMP_DIR) || true

	rm -rf $(BUILD_TARGET_DIR) || true
	mkdir -p $(BUILD_TARGET_DIR) || true

	# copy demo projects
	cp -aR modules/demo_projects $(BUILD_TARGET_DIR)
	rm -rf $(BUILD_TARGET_DIR)/demo_projects/.git || true
	cp -aR build-artifacts/spellCore $(BUILD_TARGET_DIR)/spellCore
	cp -aR build-artifacts/spellFlash $(BUILD_TARGET_DIR)/spellFlash
	cp -aR build-artifacts/spellDocs $(BUILD_TARGET_DIR)/spellDocs

	mkdir $(BUILD_TARGET_DIR)/spellCli $(BUILD_TARGET_DIR)/spellEd
	cp -aR build-artifacts/spellCli/$(BUILD_TARGET)/* $(BUILD_TARGET_DIR)/spellCli/
	cp -aR build-artifacts/spellEd/$(BUILD_TARGET)/* $(BUILD_TARGET_DIR)/spellEd/

	cp -aR build-artifacts/moduleBuilds.json $(BUILD_TARGET_DIR)/ || true

	# provide a default config for the spell product
	cp defaultSpellConfig.json $(BUILD_TARGET_DIR)

spellCloud: $(TMP_DIR)/linux-x64
	mkdir -p $(TMP_DIR)/spellCloud
	cp -aR $(TMP_DIR)/linux-x64/* $(TMP_DIR)/spellCloud

	# remove spellEd directory because it isn't needed in the spellCloud versin
	rm -rf $(TMP_DIR)/spellCloud/spellEd

	# create and populate spellEdServer directory
	mkdir -p $(TMP_DIR)/spellCloud/spellEdServer
	cp -aR build-artifacts/spellEd/spelledjs/public $(TMP_DIR)/spellCloud/spellEdServer
	cp build-artifacts/spellEd/spelledserver/spellEdServer.js $(TMP_DIR)/spellCloud/spellEdServer
	cp -aR node_modules $(TMP_DIR)/spellCloud/spellEdServer
	cp modules/nodejs/linux-x64/bin/node $(TMP_DIR)/spellCloud/spellEdServer

	# create a spellConfig.json
	mv $(TMP_DIR)/spellCloud/defaultSpellConfig.json $(TMP_DIR)/spellCloud/spellConfig.json

	cd $(TMP_DIR)/spellCloud && tar -cvpf ../../$(BUILD_DIR)/spelljs-cloud-$(VERSION).tar * && gzip --best --force ../../$(BUILD_DIR)/spelljs-cloud-$(VERSION).tar

# shortcut to $(TMP_DIR) so we can reuse the build artifact for spellCloud
linux-x64: $(TMP_DIR)/linux-x64

$(TMP_DIR)/linux-x64: build-common
	chmod +x $(BUILD_TARGET_DIR)/spellCli/spellcli
	chmod +x $(BUILD_TARGET_DIR)/spellEd/spelled

	cd $(BUILD_TARGET_DIR) && tar -cvpf ../../$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).tar * && gzip --best --force ../../$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).tar


osx-ia32: build-common
	chmod +x $(BUILD_TARGET_DIR)/spellCli/spellcli
	chmod +x "$(BUILD_TARGET_DIR)/spellEd/spellEd.app/Contents/MacOS/node-webkit"
	chmod +x "$(BUILD_TARGET_DIR)/spellEd/spellEd.app/Contents/Frameworks/node-webkit Helper.app/Contents/MacOS/node-webkit Helper"
	mv $(BUILD_TARGET_DIR)/spellEd/spellEd.app $(BUILD_TARGET_DIR)/../spellEd.app
	mv $(BUILD_TARGET_DIR)/* "$(BUILD_TARGET_DIR)/../spellEd.app/Contents/Frameworks/node-webkit Helper.app/Contents"
	mv "$(BUILD_TARGET_DIR)/../spellEd.app" $(BUILD_TARGET_DIR)/SpellJS.app
	resources/run_in_loginwindow_context resources/osx/create-dmg/create-dmg \
		--volname "SpellJS $(VERSION)" \
		--window-size 400 180 \
		--icon-size 128 \
		--icon "SpellJS.app" 0 0 \
		--app-drop-link 200 0 \
		$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).dmg \
		$(BUILD_TARGET_DIR)/SpellJS.app

win-ia32: build-common
	#change icons for spellcli.exe and spelled.exe

	resources/win/set_windows_icon $(BUILD_TARGET_DIR)/spellEd/spelled.exe resources/win/icon.ico

	# sign spellcli.exe and spelled.exe
	modules/certs/sign_authenticode $(BUILD_TARGET_DIR)/spellCli/spellcli.exe
	modules/certs/sign_authenticode $(BUILD_TARGET_DIR)/spellEd/spelled.exe

	# create create & sign msi package
	resources/win/create_msi $(BUILD_TARGET_DIR) $(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).msi
	modules/certs/sign_authenticode $(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).msi "SpellJS"

.PHONY: clean
clean:
	rm -rf $(BUILD_DIR) || true
	rm -rf $(TMP_DIR) || true

