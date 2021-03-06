# header-source-switch
Header-source switch for VS code

## Usage

* Press 'Alt+O' while a header or source file is open
**OR**
* Press 'Ctrl+Shift+P' ('Cmd+Shift+P' on mac) and select 'Switch Header/Source'

## Source

[github](https://github.com/ryzngard/header-source-switch)

Please contact [me](mailto:ryzngard@live.com) if you have any questions, concerns, or feature requests.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

```
"headerSourceSwitch.mappings": {
          "type": "array",
          "description": "Array of mappings, defaults to C++ mappings",
          "default": [
            {
              "header": [
                ".h",
                ".hpp",
                ".hh",
                ".hxx"
              ],
              "source": [
                ".cpp",
                ".c",
                ".cc",
                ".cxx",
                ".m",
                ".mm"
              ],
              "name": "C++"
            }
          ]
```

## Known Issues

None at the moment

## Release Notes

### 1.1.0

Add mappings configuration

Re-released and rewritten using the latest extension practices for vscode.

