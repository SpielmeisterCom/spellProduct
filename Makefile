UNAME_S := $(shell uname -s)
UNAME_P := $(shell uname -p)

BUILDBOT_OSX 	= buildbot4
BUILDBOT_WIN 	= buildbot5
BUILDBOT_LINUX	= buildbot6

SSH = ssh -i id_rsa_buildbot
SCP = scp -i id_rsa_buildbot

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
	mkdir -p build/linux-x64

	#create spelled executable
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


.PHONY: releasebuild
releasebuild:
	#create the osx-ia32 build using buildbot1
	$(SSH) buildbot@$(BUILDBOT_OSX) "cd ~/workspace/spellengine && git pull && git submodule init && git submodule update"
	$(SSH) buildbot@$(BUILDBOT_OSX) "/bin/bash --login -c \"cd ~/workspace/spellengine/modules/spellCore && make build/osx-ia32\""
	
	mkdir -p build/osx-ia32
	$(SCP) -r buildbot@$(BUILDBOT_OSX):"~/workspace/spellengine/build/osx-ia32/*" build/osx-ia32

	#create the linux-x64 build using buildbot2
	$(SSH) buildbot@$(BUILDBOT_LINUX) "cd ~/workspace/spellengine && git pull && git submodule init && git submodule update"
	$(SSH) buildbot@$(BUILDBOT_LINUX) "/bin/bash --login -c \"cd ~/workspace/spellengine/modules/spellCore && make build/linux-x64\""

	mkdir -p build/linux-x64
	$(SCP) -r buildbot@$(BUILDBOT_LINUX):"~/workspace/spellengine/build/linux-x64/*" build/linux-x64
	
	#create the win-ia32 build using buildbot3
	$(SSH) buildbot@$(BUILDBOT_WIN) "cd ~/workspace/spellengine && git pull && git submodule init && git submodule update"
	$(SSH) buildbot@$(BUILDBOT_WIN) "/bin/bash --login -c \"cd ~/workspace/spellengine/modules/spellCore && make build/win-ia32\""
	
	mkdir -p build/win-ia32
	$(SCP) -r buildbot@$(BUILDBOT_WIN):"~/workspace/spellengine/build/win-ia32/*" build/win-ia32

.PHONY: clean
clean:
	rm -Rf build/*

