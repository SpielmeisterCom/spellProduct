UNAME_S := $(shell uname -s)
UNAME_P := $(shell uname -p)

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

# shortcut for rebuild-nw target of spelled
.PHONY: spellEd-rebuild-nw
spellEd-rebuild-nw:
	#rebuild-nw
	cd modules/spellEd && make rebuild-nw

# rebuild spelled package (useful during development)
.PHONY: rebuild-spelled
rebuild-spelled: clean spellEd-rebuild-nw $(BUILD_TARGET)

.PHONY: build-common
build-common:
	mkdir $(BUILD_TARGET)
	mkdir $(BUILD_TARGET)/spellEd
	mkdir $(BUILD_TARGET)/spellCore

	# build spellCore
	cd modules/spellCore && make deploy
	cp -aR modules/spellCore/build/* $(BUILD_TARGET)/spellCore

	#build spellEd
	cd modules/spellEd && make

build/linux-x64: build-common
	# move spellcli to the right directory
	mv $(BUILD_TARGET)/spellCore/spellcli $(BUILD_TARGET)

	# create spellEd executable	
	cp -aR modules/node-webkit/linux-x64/nw.pak $(BUILD_TARGET) 
	cp -aR modules/node-webkit/linux-x64/libffmpegsumo.so $(BUILD_TARGET)
	cat modules/node-webkit/linux-x64/nw modules/spellEd/build/app.nw >$(BUILD_TARGET)/spelled
	chmod +x $(DEST_DIR)/spelled 
	
build/osx-ia32: build-common
	# move spellcli to the right directory
	mv $(BUILD_TARGET)/spellCore/spellcli $(BUILD_TARGET)
	
	# create spellEd executable
	cp -aR modules/node-webkit/osx-ia32/node-webkit.app/ build/osx-ia32/spellEd.app
	cp modules/spellEd/build/app.nw build/osx-ia32/spellEd.app/Contents/Resources/

build/win-ia32: build-common
	# move spellcli to the right directory
	mv $(BUILD_TARGET)/spellCore/spellcli.exe $(BUILD_TARGET)

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

