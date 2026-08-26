use crate::codegen::MachineProgram;
pub struct Runtime;
impl Runtime { pub fn describe(program: &MachineProgram) -> String { format!("{} instruction(s) selected for {}.", program.instructions.len(), program.target) } }
