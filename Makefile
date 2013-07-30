UNAME_S := $(shell uname -s)
UNAME_P := $(shell uname -p)

# defaults to build/linux-x64
BUILD_TARGET = build/linux-x64

ifeq ($(UNAME_S),CYGWIN_NT-6.1-WOW64)
BUILD_TARGET = build/win-ia32
else ifeq ($(UNAME_S),CYGWIN_NT-6.2-WOW64)
BUILD_TARGET = build/win-ia32
else ifeq ($(UNAME_S),Linux)
BUILD_TARGET = build/linux-x64
else ifeq ($(UNAME_S),Darwin)
BUILD_TARGET = build/osx-ia32
endif

.PHONY: standalone prepare-bamboo bamboo build-common
.DEFAULT: standalone

prepare-standalone:
	./create_artifacts

standalone: clean prepare-standalone $(BUILD_TARGET)

prepare-bamboo:
	modules/nodejs/node prepare_bamboo_build.js

bamboo: clean prepare-bamboo $(BUILD_TARGET)


build-common:
	mkdir -p $(BUILD_TARGET) || true
	mkdir -p $(BUILD_TARGET)/spellCore || true

	# copy demo projects
	rsync -avC modules/demo_projects $(BUILD_TARGET)
	cp -aR build-artifacts/* $(BUILD_TARGET)

build/spellCloud: build/linux-x64
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

build/linux-x64: build-common

build/osx-ia32: build-common

build/win-ia32: build-common

.PHONY: clean
clean:
	rm -Rf build/*

