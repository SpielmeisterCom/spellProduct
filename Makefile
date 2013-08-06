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

	cd $(TMP_DIR)/spellCloud && tar -cvf ../../$(BUILD_DIR)/spelljs-cloud-$(VERSION).tar * && gzip --best --force ../../$(BUILD_DIR)/spelljs-cloud-$(VERSION).tar 

# shortcut to $(TMP_DIR) so we can reuse the build artifact for spellCloud
linux-x64: $(TMP_DIR)/linux-x64

$(TMP_DIR)/linux-x64: build-common
	chmod +x $(BUILD_TARGET_DIR)/spellCli/spellcli
	chmod +x $(BUILD_TARGET_DIR)/spellEd/spelled
	
	cd $(BUILD_TARGET_DIR) && tar -cvf ../../$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).tar * && gzip --best --force ../../$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).tar 


osx-ia32: build-common
	cd $(BUILD_TARGET_DIR) && zip -9 -r ../../$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).zip .

win-ia32: build-common
	#change icons for spellcli.exe and spelled.exe
	#Resourcer -op:upd -src:%EXE_PATH% -type:14 -name:IDR_MAINFRAME -file:%ICO_PATH%

	cd $(BUILD_TARGET_DIR) && zip -9 -r ../../$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).zip .

.PHONY: clean
clean:
	rm -Rf $(BUILD_DIR) $(TMP_DIR) || true

