﻿# C/C++ for Visual Studio Code Change Log

## Version 0.14.3: November 28, 2017
* Fix for disappearing parameter hints tooltip. [#1165](https://github.com/Microsoft/vscode-cpptools/issues/1165)
* Fix for parameter hints only showing up after the opening parenthesis. [#902](https://github.com/Microsoft/vscode-cpptools/issues/902), [#819](https://github.com/Microsoft/vscode-cpptools/issues/819)
* Fix for customer reported crashes in the TypeScript extension code. [#1240](https://github.com/Microsoft/vscode-cpptools/issues/1240), [#1245](https://github.com/Microsoft/vscode-cpptools/issues/1245)
* Fix .browse.VC-#.db files being unnecessarily created when an shm file exists. [#1234](https://github.com/Microsoft/vscode-cpptools/issues/1234)
* Fix language service to only activate after a C/C++ file is opened or a C/Cpp command is used (not onDebug).
* Fix database resetting if shutdown got blocked by an IntelliSense operation.
* Fix deadlock that can occur when switching configurations.
* Fix browse.databaseFilename changing not taking effect until a reload.

## Version 0.14.2: November 9, 2017
* Unsupported Linux clients sending excessive telemetry when the language server fails to start. [#1227](https://github.com/Microsoft/vscode-cpptools/issues/1227)

## Version 0.14.1: November 9, 2017
* Add support for multi-root workspaces. [#1070](https://github.com/Microsoft/vscode-cpptools/issues/1070)
* Fix files temporarly being unsavable after Save As and other scenarios on Windows. [Microsoft/vscode#27329](https://github.com/Microsoft/vscode/issues/27329)
* Fix files "permanently" being unsavable if the IntelliSense process launches during tag parsing of the file. [#1040](https://github.com/Microsoft/vscode-cpptools/issues/1040)
* Show pause and resume parsing commands after clicking the database icon. [#1141](https://github.com/Microsoft/vscode-cpptools/issues/1141)
* Don't show the install output unless an error occurs. [#1160](https://github.com/Microsoft/vscode-cpptools/issues/1160)
* Fix bug with `${workspaceRoot}` symbols not getting added if a parent folder is in the `browse.path`. [#1185](https://github.com/Microsoft/vscode-cpptools/issues/1185)
* Fix `Add configuration` C++ launch.json on Insiders. [#1191](https://github.com/Microsoft/vscode-cpptools/issues/1191)
* Fix extension restart logic so that the extension doesn't get stuck on "Initializing..." when it crashes. [#893](https://github.com/Microsoft/vscode-cpptools/issues/893)
* Remove the Reload window prompt after installation (it only appears if launch.json is active).
* Prevent browse database from being reset if shutdown takes > 1 second.
* Remove the `UnloadLanguageServer` command and the `clang_format_formatOnSave` setting.
* Fix bugs with include path suggestions.
* Fix max files to parse status number being too big, due to including non-`${workspaceRoot}` files.
* Update default `launch.json` configurations to use `${workspaceFolder}` instead of `${workspaceRoot}`.
* Update how default initial configurations for `launch.json` are being provided. [Microsoft/vscode#33794](https://github.com/Microsoft/vscode/issues/33794)
* Add support for normalizing source file locations. (Windows [#272](https://github.com/Microsoft/vscode-cpptools/issues/272)), (Mac OS X [#1095](https://github.com/Microsoft/vscode-cpptools/issues/1095))

## Version 0.14.0: October 19, 2017
* Add support for `compile_commands.json`. [#156](https://github.com/Microsoft/vscode-cpptools/issues/156)
* Fix crash with signature help. [#1076](https://github.com/Microsoft/vscode-cpptools/issues/1076)
* Skip parsing redundant browse.path directories. [#1106](https://github.com/Microsoft/vscode-cpptools/issues/1106)
* Fix `limitSymbolsToIncludedHeaders` not working with single files. [#1109](https://github.com/Microsoft/vscode-cpptools/issues/1109)
* Add logging to Output window. Errors will be logged by default. Verbosity is controlled by the `"C_Cpp.loggingLevel"` setting.
* Add new database status bar icon for "Indexing" or "Parsing" with progress numbers, and the previous flame icon is now just for "Updating IntelliSense".
* Stop showing `(Global Scope)` if there's actually an error in identifiying the correct scope.
* Fix crash with the IntelliSense process when parsing certain template code (the most frequently hit crash).
* Fix main thread being blocked while searching for files to remove after changing `files.exclude`.
* Fix incorrect code action include path suggestion when a folder comes after "..".
* Fix a crash on shutdown.

## Version 0.13.1: October 5, 2017
* Delete unused symbol databases when `browse.databaseFilename` in `c_cpp_properties.json` changes. [#558](https://github.com/Microsoft/vscode-cpptools/issues/558)
* Fix infinite loop during IntelliSense parsing. [#981](https://github.com/Microsoft/vscode-cpptools/issues/981)
* Fix database resetting due to the extension process not shutting down fast enough. [#1060](https://github.com/Microsoft/vscode-cpptools/issues/1060)
* Fix crash with document highlighting [#1076](https://github.com/Microsoft/vscode-cpptools/issues/1076)
* Fix bug that could cause symbols to be missing when shutdown occurs during tag parsing.
* Fix bug that could cause included files to not be reparsed if they were modified after the initial parsing.
* Fix potential buffer overrun when logging is enabled.
* Add logging to help diagnose cause of document corruption after formatting.

## Version 0.13.0: September 25, 2017
* Reference highlighting is now provided by the extension for both IntelliSense engines.
* Parameter help is now provided by both IntelliSense engines.
* Light bulbs (code actions) for #include errors now suggest potential paths to add to the `includePath` based on a recursive search of the `browse.path`. [#846](https://github.com/Microsoft/vscode-cpptools/issues/846)
* Browse database now removes old symbols when `browse.path` changes. [#262](https://github.com/Microsoft/vscode-cpptools/issues/262)
* Add `*` on new lines after a multiline comment with `/**` is started. [#579](https://github.com/Microsoft/vscode-cpptools/issues/579)
* Fix Go to Definition, completion, and parameter hints for partially scoped members. [#635](https://github.com/Microsoft/vscode-cpptools/issues/635)
* Fix bug in `macFrameworkPath` not resolving variables.

## Version 0.12.4: September 12, 2017
* Fix a crash in IntelliSense for users with non-ASCII user names (Windows-only). [#910](https://github.com/Microsoft/vscode-cpptools/issues/910)
* Add `macFrameworkPath` to `c_cpp_properties.json`. [#970](https://github.com/Microsoft/vscode-cpptools/issues/970)
* Fix incorrect auto-complete suggestions when using template types with the scope operator `::`. [#988](https://github.com/Microsoft/vscode-cpptools/issues/988)
* Fix potential config file parsing failure. [#989](https://github.com/Microsoft/vscode-cpptools/issues/989)
* Support `${env:VAR}` syntax for environment variables in `c_cpp_properties.json`. [#1000](https://github.com/Microsoft/vscode-cpptools/issues/1000)
* Support semicolon delimiters for include paths in `c_cpp_properties.json` to better support environment variables. [#1001](https://github.com/Microsoft/vscode-cpptools/issues/1001)
* Add `__LITTLE_ENDIAN__=1` to default defines so that "endian.h" is not needed on Mac projects. [#1005](https://github.com/Microsoft/vscode-cpptools/issues/1005)
* Fix for source code files on Windows with incorrect casing. [#984](https://github.com/Microsoft/vscode-cpptools/issues/984)

## Version 0.12.3: August 17, 2017
* Fix regression for paths containing multibyte characters. [#958](https://github.com/Microsoft/vscode-cpptools/issues/958)
* Fix bug with the Tag Parser completion missing results. [#943](https://github.com/Microsoft/vscode-cpptools/issues/943)
* Add /usr/include/machine or i386 to the default Mac `includePath`. [#944](https://github.com/Microsoft/vscode-cpptools/issues/944)
* Add a command to reset the Tag Parser database. [#601](https://github.com/Microsoft/vscode-cpptools/issues/601), [#464](https://github.com/Microsoft/vscode-cpptools/issues/464)
* Fix bug with error-related code actions remaining after the errors are cleared.
* Fix bug with Tag Parser completion not working when :: preceded an identifier.
* Upgrade SQLite (for better reliability and performance).

## Version 0.12.2: August 2, 2017
* Fix bug in our build system causing Windows binaries to build against the wrong version of the Windows SDK. [#325](https://github.com/Microsoft/vscode-cpptools/issues/325)
* Added a gcc problemMatcher. [#854](https://github.com/Microsoft/vscode-cpptools/issues/854)
* Fix bug where .c/.cpp files could get added to `files.associations` as the opposite "cpp"/"c" language after `Go to Definition` on a symbol. [#884](https://github.com/Microsoft/vscode-cpptools/issues/884)
* Remove completion results after `#pragma`. [#886](https://github.com/Microsoft/vscode-cpptools/issues/886)
* Fix a possible infinite loop when viewing Boost sources. [#888](https://github.com/Microsoft/vscode-cpptools/issues/888)
* Fix `Go to Definition` not working for files in `#include_next`. [#906](https://github.com/Microsoft/vscode-cpptools/issues/906)
  * Also fix incorrect preprocessor suggestions at the end of a `#include_next`.
* Skip automatically adding to `files.associations` if they already match global patterns. [Microsoft/vscode#27404](https://github.com/Microsoft/vscode/issues/27404)
* Fix a crash with the IntelliSense process (responsible for ~25% of all crashes).

## Version 0.12.1: July 18, 2017
* Fix Tag Parser features not working with some MinGW library code.
* Fix a symbol search crash.
* Fix an IntelliSense engine compiler crash.
* Fix `Go to Declaration` to return `Go to Definition` results if the declarations have no results.
* Fix formatting with non-ASCII characters in the path. [#870](https://github.com/Microsoft/vscode-cpptools/issues/870)
* Fix handling of symbolic links to files on Linux/Mac. [#872](https://github.com/Microsoft/vscode-cpptools/issues/872)
* Move red flame icon to its own section so the configuration text is always readable. [#875](https://github.com/Microsoft/vscode-cpptools/issues/875)
* Remove `addWorkspaceRootToIncludePath` setting and instead make `${workspaceRoot}` in `browse.path` explicit.
* Add `Show Release Notes` command.
* Add `Edit Configurations...` command to the `Select a Configuration...` dropdown.
* Update Microsoft Visual C++ debugger to Visual Studio 2017 released components.
  * Fix issue with showing wrong thread. [#550](https://github.com/Microsoft/vscode-cpptools/issues/550)
  * Fix issue with binaries compiled with /FASTLINK causing debugger to hang. [#484](https://github.com/Microsoft/vscode-cpptools/issues/484)
* Fix issue in MinGW/Cygwin debugging where stop debugging causes VS Code to hang. [Microsoft/MIEngine#636](https://github.com/Microsoft/MIEngine/pull/636)

## Version 0.12.0: June 26, 2017
* The default IntelliSense engine now provides semantic-aware autocomplete suggestions for `.`, `->`, and `::` operators. [#13](https://github.com/Microsoft/vscode-cpptools/issues/13)
* The default IntelliSense engine now reports the unresolved include files in referenced headers and falls back to the Tag Parser until headers are resolved.
  * This behavior can be overridden by setting `"C_Cpp.intelliSenseEngineFallback": "Disabled"`
* Added `"intelliSenseMode"` property to `c_cpp_properties.json` to allow switching between MSVC and Clang modes. [#710](https://github.com/Microsoft/vscode-cpptools/issues/710), [#757](https://github.com/Microsoft/vscode-cpptools/issues/757)
* A crashed IntelliSense engine no longer gives the popup message, and it automatically restarts after an edit to the translation unit occurs.
* Fix the IntelliSense engine to use "c" mode if a C header is opened before the C file.
* Fix a bug which could cause the IntelliSense engine to not update results if changes are made to multiple files of a translation unit.
* Auto `files.association` registers "c" language headers when `Go to Definition` is used in a C file.
* Downloading extension dependencies will retry up to 5 times in the event of a failure. [#694](https://github.com/Microsoft/vscode-cpptools/issues/694)
* Changes to `c_cpp_properties.json` are detected even if file watchers fail.
* Update default IntelliSense options for MSVC mode to make Boost projects work better. [#775](https://github.com/Microsoft/vscode-cpptools/issues/775)
* Fix `Go to Definition` not working until all `browse.path` files are re-scanned. [#788](https://github.com/Microsoft/vscode-cpptools/issues/788)

## Version 0.11.4: June 2, 2017
* Fix for `System.Xml.Serialization.XmlSerializationReader threw an exception` when debugging on Linux. [#792](https://github.com/Microsoft/vscode-cpptools/issues/792)
* Fix for escaping for `${workspaceRoot}` in `launch.json`.

## Version 0.11.3: May 31, 2017
* Fix `x86_64-pc-linux-gnu` and `x86_64-linux-gnu` paths missing from the default `includePath`.

## Version 0.11.2: May 24, 2017
* Revert the default `C_Cpp.intelliSenseEngine` setting back to "Tag Parser" for non-Insiders while we work on improving the migration experience.

## Version 0.11.1: May 19, 2017
* Add keywords to auto-complete (C, C++, or preprocessor). [#120](https://github.com/Microsoft/vscode-cpptools/issues/120)
* Fix non-recursive `browse.path` on Linux/Mac. [#546](https://github.com/Microsoft/vscode-cpptools/issues/546)
* Fix .clang-format file not being used on Linux/Mac. [#604](https://github.com/Microsoft/vscode-cpptools/issues/604)
* Stop setting the c/cpp `editor.quickSuggestions` to false. [#606](https://github.com/Microsoft/vscode-cpptools/issues/606)
  * We also do a one-time clearing of that user setting, which will also copy any other c/cpp workspace settings to user settings. The workspace setting isn't cleared.
* Fix selection range off by one with `Peek Definition`. [#648](https://github.com/Microsoft/vscode-cpptools/issues/648)
* Upgrade the installed clang-format to 4.0 [#656](https://github.com/Microsoft/vscode-cpptools/issues/656)
* Make keyboard shortcuts only apply to c/cpp files. [#662](https://github.com/Microsoft/vscode-cpptools/issues/662)
* Fix autocomplete with qstring.h. [#666](https://github.com/Microsoft/vscode-cpptools/issues/666)
* Fix C files without a ".c" extension from being treated like C++ for `errorSquiggles`. [#673](https://github.com/Microsoft/vscode-cpptools/issues/673)
* Make the C IntelliSense engine use C11 instead of C89. [#685](https://github.com/Microsoft/vscode-cpptools/issues/685)
* Fix bug with clang-format not working with non-trimmed styles. [#691](https://github.com/Microsoft/vscode-cpptools/issues/691)
* Enable the C++ IntelliSense engine to use six C++17 features. [#699](https://github.com/Microsoft/vscode-cpptools/issues/699)
* Add reload prompt when a settings change requires it.
* Prevent non-existent files from being returned in `Go To Definition` results.

## Version 0.11.0: April 24, 2017
* Enabled first IntelliSense features based on the MSVC engine.
  * Quick info tooltips and compiler errors are provided by the MSVC engine.
  * `C_Cpp.intelliSenseEngine` property controls whether the new engine is used or not.
  * `C_Cpp.errorSquiggles` property controls whether compiler errors are made visible in the editor.
* Add `Go to Declaration` and `Peek Declaration`. [#271](https://github.com/Microsoft/vscode-cpptools/issues/271)
* Fix language-specific workspace settings leaking into user settings. [Microsoft/vscode#23118](https://github.com/Microsoft/vscode/issues/23118)
* Fix `files.exclude` not being used in some cases. [#485](https://github.com/Microsoft/vscode-cpptools/issues/485)
* Fix a couple potential references to an undefined `textEditor`. [#584](https://github.com/Microsoft/vscode-cpptools/issues/584)
* Move changes from `README.md` to `CHANGELOG.md`. [#586](https://github.com/Microsoft/vscode-cpptools/issues/586)
* Fix crash on Mac/Linux when building the browse database and `nftw` fails. [#591](https://github.com/Microsoft/vscode-cpptools/issues/591)
* Add `Alt+N` keyboard shortcut for navigation. [#593](https://github.com/Microsoft/vscode-cpptools/issues/593)
* Fix autocomplete crash when the result has an invalid UTF-8 character. [#608](https://github.com/Microsoft/vscode-cpptools/issues/608)
* Fix symbol search crash with `_` symbol. [#611](https://github.com/Microsoft/vscode-cpptools/issues/611)
* Fix the `Edit Configurations` command when '#' is in the workspace root path. [#625](https://github.com/Microsoft/vscode-cpptools/issues/625)
* Fix clang-format `TabWidth` not being set when formatting with the `Visual Studio` style. [#630](https://github.com/Microsoft/vscode-cpptools/issues/630)
* Enable `clang_format_fallbackStyle` to be a custom style. [#641](https://github.com/Microsoft/vscode-cpptools/issues/641)
* Fix potential `undefined` references when attaching to a process. [#650](https://github.com/Microsoft/vscode-cpptools/issues/650)
* Fix `files.exclude` not working on Mac. [#653](https://github.com/Microsoft/vscode-cpptools/issues/653)
* Fix crashes during edit and hover with unexpected UTF-8 data. [#654](https://github.com/Microsoft/vscode-cpptools/issues/654)

## Version 0.10.5: March 21, 2017
* Fix a crash that randomly occurred when the size of a document increased. [#430](https://github.com/Microsoft/vscode-cpptools/issues/430)
* Fix for browsing not working for Linux/Mac stdlib.h functions. [#578](https://github.com/Microsoft/vscode-cpptools/issues/578)
* Additional fixes for switch header/source not respecting `files.exclude`. [#485](https://github.com/Microsoft/vscode-cpptools/issues/485)
* Made `editor.quickSuggestions` dependent on `C_Cpp.autocomplete`. [#572](https://github.com/Microsoft/vscode-cpptools/issues/572)
  * We recommend you close and reopen your settings.json file anytime you change the `C_Cpp.autocomplete` setting. [More info here](https://github.com/Microsoft/vscode-cpptools/releases).

## Version 0.10.4: March 15, 2017
* Fix a crash in signature help. [#525](https://github.com/microsoft/vscode-cpptools/issues/525)
* Re-enable switch header/source when no workspace folder is open. [#541](https://github.com/microsoft/vscode-cpptools/issues/541)
* Fix inline `clang_format_style`. [#536](https://github.com/microsoft/vscode-cpptools/issues/536)
* Some other minor bug fixes.

## Version 0.10.3: March 7, 2017
* Database stability fixes.
* Added enums to the C_Cpp settings so the possible values are displayed in the dropdown.
* Change from `${command.*}` to `${command:*}`. [#521](https://github.com/Microsoft/vscode-cpptools/issues/521)
* Current execution row was not highlighting in debug mode when using gdb. [#526](https://github.com/microsoft/vscode-cpptools/issues/526)

## Version 0.10.2: March 1, 2017
* New `addWorkspaceRootToIncludePath` setting allows users to disable automatic parsing of all files under the workspace root. [#374](https://github.com/Microsoft/vscode-cpptools/issues/374)
* The cpp.hint file was missing from the vsix package. [#508](https://github.com/Microsoft/vscode-cpptools/issues/508)
* Switch header/source now respects `files.exclude`. [#485](https://github.com/Microsoft/vscode-cpptools/issues/485)
* Switch header/source performance improvements. [#231](https://github.com/Microsoft/vscode-cpptools/issues/231)
* Switch header/source now appears in the right-click menu.
* Improvements to signature help.
* Various other bug fixes.

## Version 0.10.1: February 9, 2017
* Bug fixes.

## Version 0.10.0: January 24, 2017
* Suppressed C++ language auto-completion inside a C++ comment or string literal. TextMate based completion is still available.
* Fixed bugs regarding the filtering of files and symbols, including:
  * Find-symbol now excludes symbols found in `files.exclude` or `search.exclude` files
  * Go-to-definition now excludes symbols found in `files.exclude` files (i.e. `search.exclude` paths are still included).
* Added option to disable `clang-format`-based formatting provided by this extension via `"C_Cpp.formatting" : "disabled"`
* Added new `pipeTransport` functionality within the `launch.json` to support pipe communications with `gdb/lldb` such as using `plink.exe` or `ssh`.
* Added support for `{command.pickRemoteProcess}` to allow picking of processes for remote pipe connections during `attach` scenarios. This is similar to how `{command.pickProcess}` works for local attach.
* Bug fixes.

## Version 0.9.3: December 8, 2016
* [December update](https://aka.ms/cppvscodedec) for C/C++ extension
* Ability to map source files during debugging using `sourceFileMap` property in `launch.json`.
* Enable pretty-printing by default for gdb users in `launch.json`.
* Bug fixes.

## Version 0.9.2: September 22, 2016
* Bug fixes.

## Version 0.9.1: September 7, 2016
* Bug fixes.

## Version 0.9.0: August 29, 2016
* [August update](https://blogs.msdn.microsoft.com/vcblog/2016/08/29/august-update-for-the-visual-studio-code-cc-extension/) for C/C++ extension.
* Debugging for Visual C++ applications on Windows (Program Database files) is now available.
* `clang-format` is now automatically installed as a part of the extension and formats code as you type.
* `clang-format` options have been moved from c_cpp_properties.json file to settings.json (File->Preferences->User settings).
* `clang-format` fall-back style is now set to 'Visual Studio'.
* Attach now requires a request type of `attach` instead of `launch`.
* Support for additional console logging using the keyword `logging` inside `launch.json`.
* Bug fixes.

## Version 0.8.1: July 27, 2016
* Bug fixes.

## Version 0.8.0: July 21, 2016
* [July update](https://blogs.msdn.microsoft.com/vcblog/2016/07/26/july-update-for-the-visual-studio-code-cc-extension/) for C/C++ extension.
* Support for debugging on OS X with LLDB 3.8.0. LLDB is now the default debugging option on OS X.
* Attach to process displays a list of available processes.
* Set variable values through Visual Studio Code's locals window.
* Bug fixes.

## Version 0.7.1: June 27, 2016
* Bug fixes.

## Version 0.7.0: June 20, 2016
* [June Update](https://blogs.msdn.microsoft.com/vcblog/2016/06/01/may-update-for-the-cc-extension-in-visual-studio-code/) for C/C++ extension.
* Bug fixes.
* Switch between header and source.
* Control which files are processed under include path.

## Version 0.6.1: June 03, 2016
* Bug fixes.

## Version 0.6.0: May 24, 2016
* [May update](https://blogs.msdn.microsoft.com/vcblog/2016/07/26/july-update-for-the-visual-studio-code-cc-extension/) for C/C++ extension.
* Support for debugging on OS X with GDB.
* Support for debugging with GDB on MinGW.
* Support for debugging with GDB on Cygwin.
* Debugging on 32-bit Linux now enabled.
* Format code using clang-format.
* Experimental fuzzy autocompletion.
* Bug fixes.

## Version 0.5.0: April 14, 2016
* Usability and correctness bug fixes.
* Simplify installation experience.
* Usability and correctness bug fixes.
