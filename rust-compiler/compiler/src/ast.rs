use serde::Serialize;
#[derive(Debug, Clone, Serialize)] pub struct Program { pub functions: Vec<Function> }
#[derive(Debug, Clone, Serialize)] pub struct Function { pub name: String, pub return_type: TypeRef, pub body: Vec<Statement> }
#[derive(Debug, Clone, Serialize)] pub enum Statement { Let { name: String, type_ref: TypeRef, value: Expression }, Return(Expression), If { condition: Expression, then_branch: Vec<Statement>, else_branch: Vec<Statement> }, Loop { name: String, start: Expression, end: Expression, body: Vec<Statement> }, Expression(Expression) }
#[derive(Debug, Clone, Serialize, PartialEq, Eq)] pub enum TypeRef { I32, Bool, String, Array(Box<TypeRef>), Unit }
#[derive(Debug, Clone, Serialize)] pub enum Expression { Integer(i64), Bool(bool), String(String), Identifier(String), Array(Vec<Expression>), Call { callee: Box<Expression>, arguments: Vec<Expression> }, Index { target: Box<Expression>, index: Box<Expression> }, Binary { operator: BinaryOperator, left: Box<Expression>, right: Box<Expression> } }
#[derive(Debug, Clone, Serialize)] pub enum BinaryOperator { Add, Subtract, Multiply, Divide, Greater, Less, Equal }
