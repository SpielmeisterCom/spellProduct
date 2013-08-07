#define _OLEAUT32_

#include <stdio.h>
#include <unknwn.h>

GUID guid;
WORD* wstrGUID[100];
char strGUID[100];
int count, i;

int main (int argc, char* argv[]) {
	CoCreateGuid (&guid);
	StringFromCLSID (&guid, wstrGUID);
	WideCharToMultiByte (CP_ACP, 0, *wstrGUID, -1, strGUID, MAX_PATH, NULL, NULL);
	printf ("%s\n", strGUID);
	return 0;
}
