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
	rsync -avC modules/demo_projects $(BUILD_TARGET_DIR)
	cp -aR build-artifacts/spellCore $(BUILD_TARGET_DIR)/spellCore
	cp -aR build-artifacts/spellFlash $(BUILD_TARGET_DIR)/spellFlash
	cp -aR build-artifacts/spellCli/$(BUILD_TARGET) $(BUILD_TARGET_DIR)/spellCli
	cp -aR build-artifacts/spellEd/$(BUILD_TARGET) $(BUILD_TARGET_DIR)/spellEd

	# provide a default config for the spell product
	cp defaultSpellConfig.json $(BUILD_TARGET_DIR)

build/spellCloud: linux-x64
	mkdir -p build/spellCloud

	# copy demo projects
	cp -aR build/linux-x64/demo_projects build/spellCloud

	# copy spellCore and spellFlash
	cp -aR build/linux-x64/spellCore build/spellCloud
	cp -aR build/linux-x64/spellFlash build/spellCloud

	# copy spellcli
	cp -a build/linux-x64/spellcli build/spellCloud

	# copy spellEd
	mkdir build/spellCloud/spellEdServer
	cp -aR modules/spellEd/build/spelledjs/public build/spellCloud/spellEdServer

	# build & copy spellEdServer
	cd modules/spellEd && make build/spelledserver

	cp modules/spellEd/build/spelledserver/spellEdServer.js build/spellCloud/spellEdServer

	# copy node
	cp modules/nodejs/linux-x64/bin/node build/spellCloud/spellEdServer

	# copy node_modules
	rsync -avzC node_modules build/spellCloud

	# create & copy docs
	cd modules/spellCore && make docs
	cp -aR modules/spellCore/docs/generated build/spellCloud/docs

linux-x64: build-common
	chmod +x $(BUILD_TARGET_DIR)/spellCli/spellcli
	chmod +x $(BUILD_TARGET_DIR)/spellEd/spelled
	
	cd $(BUILD_TARGET_DIR) && tar -cvf ../../$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).tar * && gzip --best ../../$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).tar 


osx-ia32: build-common
	cd $(BUILD_TARGET_DIR) && zip -9 -r ../../$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).zip .

win-ia32: build-common
	cd $(BUILD_TARGET_DIR) && zip -9 -r ../../$(BUILD_DIR)/spelljs-desktop-$(VERSION)-$(BUILD_TARGET).zip .

.PHONY: clean
clean:
	rm -Rf $(BUILD_DIR) $(TMP_DIR)

