pub mod ast;
pub mod codegen;
pub mod ir;
pub mod lexer;
pub mod optimizer;
pub mod parser;
pub mod runtime;
pub mod semantic;

use serde::Serialize;
use crate::{ast::Program, codegen::MachineProgram, ir::IrModule, lexer::{lex, Token}, optimizer::optimize, parser::parse, semantic::{analyze, Diagnostic, SemanticArtifacts}};

#[derive(Debug, Clone, Serialize)]
pub struct CompileArtifacts {
    pub tokens: Vec<Token>, pub ast: Option<Program>, pub semantic: Option<SemanticArtifacts>,
    pub ir_before: Option<IrModule>, pub ir_after: Option<IrModule>, pub machine: Option<MachineProgram>, pub diagnostics: Vec<Diagnostic>,
}

pub struct Compiler;
impl Compiler {
    pub fn compile(source: &str) -> CompileArtifacts {
        let tokens = lex(source);
        let program = match parse(tokens.clone()) {
            Ok(program) => program,
            Err(diagnostics) => return CompileArtifacts { tokens, ast: None, semantic: None, ir_before: None, ir_after: None, machine: None, diagnostics },
        };
        let semantic = analyze(&program);
        if semantic.diagnostics.iter().any(|diagnostic| diagnostic.is_error()) {
            return CompileArtifacts { tokens, ast: Some(program), semantic: Some(semantic.clone()), ir_before: None, ir_after: None, machine: None, diagnostics: semantic.diagnostics };
        }
        let ir_before = ir::lower(&program);
        let ir_after = optimize(ir_before.clone());
        let machine = codegen::emit(&ir_after);
        CompileArtifacts { tokens, ast: Some(program), semantic: Some(semantic.clone()), ir_before: Some(ir_before), ir_after: Some(ir_after), machine: Some(machine), diagnostics: semantic.diagnostics }
    }
}
