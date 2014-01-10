UNAME_S := $(shell uname -s)
UNAME_P := $(shell uname -p)
VERSION := $(shell cat VERSION)
LOCAL_TMP_DIR := $(shell mktemp -t SpellProductXXX)

ifeq ($(UNAME_S),CYGWIN_NT-6.1-WOW64)
BUILD_TARGET = win-ia32
else ifeq ($(UNAME_S),CYGWIN_NT-6.2-WOW64)
BUILD_TARGET = win-ia32
else ifeq ($(UNAME_S),CYGWIN_NT-6.3-WOW64)
BUILD_TARGET = win-ia32
else ifeq ($(UNAME_S),Linux)
BUILD_TARGET = linux-x64
else ifeq ($(UNAME_S),Darwin)
BUILD_TARGET = osx-ia32
endif

BUILD_DIR    = build
BUILD_ARTIFACTS_DIR = build-artifacts
TMP_DIR	     = tmp

BUILD_TARGET_DIR = $(TMP_DIR)/$(BUILD_TARGET)

.PHONY: all build-common

all: prepare-standalone $(BUILD_TARGET)

upload-prerelease:
	./upload_prelease

prepare-standalone: clean
	./create_build_artifacts

build-common:
	mkdir -p $(BUILD_DIR) || true
	mkdir -p $(TMP_DIR) || true

	rm -rf $(BUILD_TARGET_DIR) || true
	mkdir -p $(BUILD_TARGET_DIR) || true

	# copy demo projects
#	cp -aR modules/demo_projects $(BUILD_TARGET_DIR)
#	rm -rf $(BUILD_TARGET_DIR)/demo_projects/.git || true
	cp -aR build-artifacts/spellCore $(BUILD_TARGET_DIR)/spellCore
	cp -aR build-artifacts/spellFlash $(BUILD_TARGET_DIR)/spellFlash
	cp -aR build-artifacts/spellDocs $(BUILD_TARGET_DIR)/spellDocs
	cp -aR build-artifacts/spellAndroid $(BUILD_TARGET_DIR)/spellAndroid
	cp -aR build-artifacts/spelliOS $(BUILD_TARGET_DIR)/spelliOS
	cp -aR build-artifacts/spellCli $(BUILD_TARGET_DIR)/spellCli

	mkdir $(BUILD_TARGET_DIR)/spellEd
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
	cp /usr/local/bin/node $(TMP_DIR)/spellCloud/spellEdServer

	# create a spellConfig.json
	mv $(TMP_DIR)/spellCloud/defaultSpellConfig.json $(TMP_DIR)/spellCloud/spellConfig.json

	cd $(TMP_DIR)/spellCloud && tar -cvpf ../../$(BUILD_DIR)/spelljs-cloud-$(VERSION).tar * && gzip --best --force ../../$(BUILD_DIR)/spelljs-cloud-$(VERSION).tar

# shortcut to $(TMP_DIR) so we can reuse the build artifact for spellCloud
linux-x64: $(TMP_DIR)/linux-x64

$(TMP_DIR)/linux-x64: build-common
	# provide starter shell scripts
	cp resources/linux/spellcli $(BUILD_TARGET_DIR)
	cp resources/linux/spelled $(BUILD_TARGET_DIR)
	cp resources/linux/install.sh $(BUILD_TARGET_DIR)

	#fix file permissions
	chmod +x $(BUILD_TARGET_DIR)/spellFlash/vendor/flex_sdk/bin/mxmlc
	chmod +x $(BUILD_TARGET_DIR)/spellCli/ant/bin/ant
	chmod +x $(BUILD_TARGET_DIR)/spellCli/spellcli
	chmod +x $(BUILD_TARGET_DIR)/spellcli
	chmod +x $(BUILD_TARGET_DIR)/spellEd/spelled
	chmod +x $(BUILD_TARGET_DIR)/spelled
	chmod +x $(BUILD_TARGET_DIR)/install.sh
	
	#add a root level diretory (needed for the tar generation afterwards)
	mkdir $(BUILD_TARGET_DIR)/SpellJS_$(VERSION)
	mv $(BUILD_TARGET_DIR)/* $(BUILD_TARGET_DIR)/SpellJS_$(VERSION) || true

	#create .tar.gz package
	cd $(BUILD_TARGET_DIR) && tar -cvpf ../../$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).tar * && gzip --best --force ../../$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).tar

	#remove root level directory again (only needed for tar generation)
	mv $(BUILD_TARGET_DIR)/SpellJS_$(VERSION)/* $(BUILD_TARGET_DIR)
	rm -rf $(BUILD_TARGET_DIR)/SpellJS_$(VERSION)

osx-ia32: build-common
	chmod +x $(BUILD_TARGET_DIR)/spellCli/spellcli
	chmod +x $(BUILD_TARGET_DIR)/spellFlash/vendor/flex_sdk/bin/mxmlc
	chmod +x $(BUILD_TARGET_DIR)/spellCli/ant/bin/ant
	chmod +x "$(BUILD_TARGET_DIR)/spellEd/spellEd.app/Contents/MacOS/node-webkit"
	chmod +x "$(BUILD_TARGET_DIR)/spellEd/spellEd.app/Contents/Frameworks/node-webkit Helper.app/Contents/MacOS/node-webkit Helper"
	mv $(BUILD_TARGET_DIR)/spellEd/spellEd.app $(BUILD_TARGET_DIR)/../spellEd.app
	mv $(BUILD_TARGET_DIR)/* "$(BUILD_TARGET_DIR)/../spellEd.app/Contents/Frameworks/node-webkit Helper.app/Contents"
	mv "$(BUILD_TARGET_DIR)/../spellEd.app" $(BUILD_TARGET_DIR)/SpellJS.app

	#exchange Info.plist
	cp resources/osx/Info.plist $(BUILD_TARGET_DIR)/SpellJS.app/Contents/Info.plist

	#change icon
	cp resources/osx/spelljs.icns $(BUILD_TARGET_DIR)/SpellJS.app/Contents/Resources/nw.icns

	# sign the app bundle
	modules/certs/codesign_wrapper \
modules/certs/apple_macapp/Spielmeister_GmbH.p12 VidTotAr7ma \
modules/certs/apple_macapp/Spielmeister_Developer_ID.cer \
-s 2B532D63B91AF0E1FFC1AA6B9AE942DD0A35F881 $(BUILD_TARGET_DIR)/SpellJS.app

	# give some feedback for the build logs if the signing suceeded
	codesign --display --verbose $(BUILD_TARGET_DIR)/SpellJS.app

	rm -rf $(LOCAL_TMP_DIR)
	mkdir $(LOCAL_TMP_DIR)
	cp resources/osx/spelljs_dmg_bg.png $(LOCAL_TMP_DIR)
	cp -aR $(BUILD_TARGET_DIR)/SpellJS.app $(LOCAL_TMP_DIR) 

	# create dmg
	resources/osx/run_in_loginwindow_context "resources/osx/create-dmg/create-dmg \
--volname SpellJS_$(VERSION) \
--window-size 450 320 \
--icon-size 96 \
--icon SpellJS.app 76 158 \
--app-drop-link 355 158 \
--background $(LOCAL_TMP_DIR)/spelljs_dmg_bg.png \
$(LOCAL_TMP_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).dmg \
$(LOCAL_TMP_DIR)/SpellJS.app"

	mv $(LOCAL_TMP_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).dmg $(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).dmg
	rm -rf $(LOCAL_TMP_DIR)

win-ia32: build-common
	# sign xsltproc
	modules/certs/sign_authenticode $(BUILD_TARGET_DIR)/spellCli/xmltools/xsltproc.exe

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
	rm -rf $(BUILD_ARTIFACTS_DIR) || true
