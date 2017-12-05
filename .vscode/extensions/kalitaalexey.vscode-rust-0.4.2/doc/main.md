# Main Page

Welcome the main page of the documentation.

First of all, issues and PRs are welcome.

Each section describes various features supported by the extension and their respective configuration parameters. By [changing configuration parameters](changing_configuration_parameters.md), the extension may be customized.

The extension can function in one of two modes:

* [Legacy Mode](legacy_mode/main.md)
* [Rust Language Server Mode](rls_mode/main.md)

The first mode is called *Legacy* because this mode does its best, but the second one is better.
The second one is recommended and at some point the first one will be removed.

But Legacy Mode should work just fine and if it doesn't, open an issue.

When the extension starts the first time, it asks to choose one of the modes.
The chosen mode is stored in `"rust.mode"` and it can be changed by users.

Each mode is described in detail on its own page.

Some configuration parameters effect both modes. They are described [there](common_configuration_parameters.md).

Furthermore, the extension provides:

* [Linting (the showing of diagnostics in the active text editor)](linting.md)
* [Executing one of built-in cargo command](cargo_command_execution.md)
* [Creating a playground](playground_creation.md)
* [Formatting a document opened in the active text editor](format.md)

Also it provides snippets and keybindings.

They are not described because you can see them on the extension's page in VSCode.

## Additional information

[Install extension from source (always latest version)](install_extension_from_source.md)
