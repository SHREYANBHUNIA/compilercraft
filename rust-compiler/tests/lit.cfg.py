import lit.formats

config.name = "CompilerCraft"
config.test_format = lit.formats.ShTest(execute_external=True)
config.suffixes = [".craft"]
config.excludes = ["README.md"]
config.substitutions.append(("%craftc", "cargo run --quiet -p craft-api --"))
