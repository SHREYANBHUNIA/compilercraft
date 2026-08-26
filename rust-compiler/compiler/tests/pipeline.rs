use craft_compiler::Compiler;
#[test]
fn folds_integer_constants_before_machine_code_generation() { let artifacts = Compiler::compile("fn main() -> i32 { let x: i32 = 2 * 10; return x; }"); let before = artifacts.ir_before.expect("IR should be generated"); let after = artifacts.ir_after.expect("optimized IR should be generated"); assert!(format!("{before:?}").contains("mul")); assert!(format!("{after:?}").contains("value: 20")); assert!(artifacts.machine.expect("machine code should be selected").instructions.join("\n").contains("#20")); }
#[test]
fn produces_a_clear_diagnostic_for_invalid_static_types() { let artifacts = Compiler::compile("fn main() -> i32 { let x: i32 = \"twenty\"; return 0; }"); assert!(artifacts.diagnostics.iter().any(|diagnostic| diagnostic.message.contains("Type mismatch"))); }
