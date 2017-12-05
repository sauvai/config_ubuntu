# vscode-head-file-guard
This is a [Visual Studio Code](https://code.visualstudio.com/) extension,help us insert the head-file guard,
like 
```
#ifndef ……
#define ……
#endif
```

## How do I use this? (In 10 easy steps)
**Note**: This section makes the assumption that you have a working installation of Visual Studio Code, and are mildly familiar with it. If you aren't, perhaps you should start [here](https://code.visualstudio.com/Docs).

### Step 0: Open a project in Visual Studio Code
### Step 1: Launch the "Quick Open" Interface (`Ctrl/Cmd + P`)
### Step 2: Install the extension using "`ext install head-file-guard`"
### Step 3: Restart VS Code when prompted
### Step 4: Open your user [or workspace] settings file ([reference](https://code.visualstudio.com/Docs/customization/userandworkspace))
### Step 5: Add the "`headFileGuard.type`" property to your settings (see below)
### Step 6: Add per-language file-header-comment templates (see below)
### Step 7: Open a file [from the project you just opened]
### Step 8: Re-Launch the "Quick Open" Interface (`Ctrl/Cmd + P`)
### Step 9: Run the extension using "`> Insert Head-File-Guard`"

#### Example `settings.json` file, with extension configuration:
```json
// Place your settings in this file to overwrite the default settings
{
    "headFileGuard.type" : "guid"
}
```

## License
This extension is released under an MIT License (just like [Visual Studio Code](https://code.visualstudio.com/)).

A copy of the license, can be found [here](https://github.com/bjrxyz/vscode-head-file-guard/blob/master/LICENSE).
