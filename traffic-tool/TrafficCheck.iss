; Inno Setup script for TrafficCheck.
;
; Produces a single self-contained installer (TrafficCheck-Setup.exe) that
; bundles the cx_Freeze build (Python runtime + Tk + MS VC runtime all
; included). The end user only runs this one Setup.exe -- NO Python, NO other
; installers, NO prerequisites are required.
;
; Build the app first (creates build\exe.win-amd64-<pyver>\), then compile:
;   ISCC.exe TrafficCheck.iss
; Override the source folder if your Python version differs, e.g.:
;   ISCC.exe /DSourceDir=build\exe.win-amd64-3.12 TrafficCheck.iss

#define MyAppName "TrafficCheck"
#define MyAppVersion "1.0.0"
#define MyAppExeName "TrafficCheck.exe"

#ifndef SourceDir
  #define SourceDir "build\exe.win-amd64-3.8"
#endif

[Setup]
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=TrafficCheck
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=.
OutputBaseFilename=TrafficCheck-Setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
; Install per-user by default so no admin rights are needed; user may choose.
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog commandline

[Files]
Source: "{#SourceDir}\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppName}"; Flags: nowait postinstall skipifsilent
