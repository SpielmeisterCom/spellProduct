UNAME_S := $(shell uname -s)
UNAME_P := $(shell uname -p)

ifeq ($(UNAME_S),Cygwin)
DEFAULT_BUILD_TARGET = build/win-ia32
else ifeq ($(UNAME_S),Linux)
DEFAULT_BUILD_TARGET = build/linux-x64
else ifeq ($(UNAME_S),Darwin)
DEFAULT_BUILD_TARGET = build/osx-ia32
endif

.PHONY: all
all: clean $(DEFAULT_BUILD_TARGET)

# shortcut for rebuild-nw target of spelled
.PHONY: spellEd-rebuild-nw
spellEd-rebuild-nw:
	#rebuild-nw
	cd modules/spellEd && make rebuild-nw

# rebuild spelled package (useful during development)
.PHONY: rebuild-spelled
rebuild-spelled: clean spellEd-rebuild-nw $(DEFAULT_BUILD_TARGET)

.PHONY: spellci
spellcli:


build/linux-x64:
	$(eval DEST_DIR := build/linux-x64)
	
	mkdir -p $(DEST_DIR)

	#build spellCore
	cd modules/spellCore && make deploy

	#copy spellCore build artefact to build dir
	mkdir $(DEST_DIR)/spellCore
	cp -aR modules/spellCore/build/* $(DEST_DIR)/spellCore
	mv $(DEST_DIR)/spellCore/spellcli $(DEST_DIR)

	#build spellEd
	cd modules/spellEd && make

	#create spelled executable
	mkdir $(DEST_DIR)/spellEd
	cp -aR modules/node-webkit/linux-x64/nw.pak build/linux-x64/
	cp -aR modules/node-webkit/linux-x64/libffmpegsumo.so build/linux-x64/
	cat modules/node-webkit/linux-x64/nw modules/spellEd/build/app.nw >build/linux-x64/spelled
	chmod +x build/linux-x64/spelled 
	
build/osx-ia32:
	mkdir -p build/osx-ia32
	cp -aR modules/node-webkit/osx-ia32/node-webkit.app/ build/osx-ia32/spellEd.app
	cp modules/spellEd/build/app.nw build/osx-ia32/spellEd.app/Contents/Resources/


build/win-ia32:
	mkdir -p build/win-ia32


.PHONY: clean
clean:
	rm -Rf build/*
	cd modules/spellCore && make clean
	cd modules/spellEd && make clean
