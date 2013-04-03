.DEFAULT_GOAL := all

.PHONY: linux-ia32
linux-ia32:
	echo build steps for building linux-ia32

.PHONY: linux-x64
linux-x64:
	echo build setps for building linux-x64

.PHONY: osx-ia32
osx-ia32:
	echo build steps for building osx-ia32

.PHONY: win-ia32
win-ia32:
	echo build steps for bui√lding win-ia32

.PHONY: clean
clean:
	echo build steps for cleaning the repo

all: clean linux-ia32 linux-x64 osx-ia32 win-ia32

