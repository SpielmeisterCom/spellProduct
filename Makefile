UNAME_S := $(shell uname -s)
UNAME_P := $(shell uname -p)

#defaults to build/linux-x64
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

.PHONY: all
all: clean $(BUILD_TARGET)

.PHONY: build-common
build-common:
	mkdir -p $(BUILD_TARGET) || true
	mkdir -p $(BUILD_TARGET)/spellCore || true

	# copy demo projects
	rsync -avC modules/demo_projects $(BUILD_TARGET)

	# build spellCore
	cd modules/spellCore && make
	cp -aR modules/spellCore/build/* $(BUILD_TARGET)

	# build spellFlash
	cd modules/spellFlash && make
	cp -aR modules/spellFlash/build/* $(BUILD_TARGET)

	# add spellcli.cfg
	echo '{' > $(BUILD_TARGET)/config.json
	echo '	"spellCorePath": "./spellCore",' >> $(BUILD_TARGET)/config.json
	echo '	"spellFlashPath": "./spellFlash"' >> $(BUILD_TARGET)/config.json
	echo '}' >> $(BUILD_TARGET)/config.json

	#build spellEd
	cd modules/spellEd && make

build/spellCloud: build/linux-x64
	mkdir -p build/spellCloud

	# copy demo projects
	cp -aR build/linux-x64/demo_projects build/spellCloud

	#copy spellCore and spellFlash
	cp -aR build/linux-x64/spellCore build/spellCloud
	cp -aR build/linux-x64/spellFlash build/spellCloud

	#copy spellcli
	cp -a build/linux-x64/spellcli build/spellCloud

	#copy spellEd
	mkdir build/spellCloud/spellEdServer
	cp -aR modules/spellEd/build/spelledjs/public build/spellCloud/spellEdServer

	#build&copy spellEdServer
	cd modules/spellEd && make build/spelledserver

	cp modules/spellEd/build/spelledserver/spellEdServer.js build/spellCloud/spellEdServer

	#copy node
	cp modules/nodejs/linux-x64/bin/node build/spellCloud/spellEdServer

	#copy node_modules
	rsync -avzC node_modules build/spellCloud

	#create & copy docs
	cd modules/spellCore && make docs
	cp -aR modules/spellCore/docs/generated build/spellCloud/docs

build/linux-x64: build-common
	# move spellcli to the right directory

	# create spellEd executable
	cp -aR modules/node-webkit/linux-x64/nw.pak $(BUILD_TARGET)
	cp -aR modules/node-webkit/linux-x64/libffmpegsumo.so $(BUILD_TARGET)
	cat modules/node-webkit/linux-x64/nw modules/spellEd/build/app.nw >$(BUILD_TARGET)/spelled
	chmod +x $(BUILD_TARGET)/spelled

build/osx-ia32: build-common
	# move spellcli to the right directory

	# create spellEd executable
	cp -aR modules/node-webkit/osx-ia32/node-webkit.app/ build/osx-ia32/spellEd.app
	cp modules/spellEd/build/app.nw build/osx-ia32/spellEd.app/Contents/Resources/

build/win-ia32: build-common
	# move spellcli to the right directory

	#create spelled executable

	cp -aR modules/node-webkit/win-ia32/ffmpegsumo.dll $(BUILD_TARGET)
	cp -aR modules/node-webkit/win-ia32/libEGL.dll $(BUILD_TARGET)
	cp -aR modules/node-webkit/win-ia32/icudt.dll $(BUILD_TARGET)
	cp -aR modules/node-webkit/win-ia32/libGLESv2.dll $(BUILD_TARGET)
	cp -aR modules/node-webkit/win-ia32/nw.pak $(BUILD_TARGET)

	cat modules/node-webkit/win-ia32/nw.exe modules/spellEd/build/app.nw >$(BUILD_TARGET)/spelled.exe
	chmod +x $(BUILD_TARGET)/spelled.exe

.PHONY: clean
clean:
	rm -Rf build/*
	cd modules/spellCore && make clean
	cd modules/spellEd && make clean
	cd modules/spellFlash && make clean

