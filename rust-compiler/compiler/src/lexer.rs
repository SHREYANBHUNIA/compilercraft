use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub enum TokenKind { Fn, Let, If, Else, For, In, Return, True, False, I32, Bool, StringType, Identifier, Number, String, Plus, Minus, Star, Slash, Equal, EqualEqual, Greater, Less, Arrow, DotDot, LeftParen, RightParen, LeftBrace, RightBrace, LeftBracket, RightBracket, Colon, Comma, Semicolon, Eof }
#[derive(Debug, Clone, Serialize)]
pub struct Token { pub kind: TokenKind, pub lexeme: String, pub line: usize, pub column: usize }

pub fn lex(source: &str) -> Vec<Token> {
    let mut tokens = Vec::new(); let chars: Vec<char> = source.chars().collect(); let (mut index, mut line, mut column) = (0usize, 1usize, 1usize);
    while index < chars.len() {
        let current = chars[index];
        if current.is_whitespace() { if current == '\n' { line += 1; column = 1; } else { column += 1; } index += 1; continue; }
        if current == '/' && chars.get(index + 1) == Some(&'/') { while index < chars.len() && chars[index] != '\n' { index += 1; column += 1; } continue; }
        let start_column = column;
        if current.is_ascii_alphabetic() || current == '_' {
            let start = index; while index < chars.len() && (chars[index].is_ascii_alphanumeric() || chars[index] == '_') { index += 1; column += 1; }
            let lexeme: String = chars[start..index].iter().collect(); let kind = match lexeme.as_str() { "fn" => TokenKind::Fn, "let" => TokenKind::Let, "if" => TokenKind::If, "else" => TokenKind::Else, "for" => TokenKind::For, "in" => TokenKind::In, "return" => TokenKind::Return, "true" => TokenKind::True, "false" => TokenKind::False, "i32" => TokenKind::I32, "bool" => TokenKind::Bool, "string" => TokenKind::StringType, _ => TokenKind::Identifier };
            tokens.push(Token { kind, lexeme, line, column: start_column }); continue;
        }
        if current.is_ascii_digit() { let start = index; while index < chars.len() && chars[index].is_ascii_digit() { index += 1; column += 1; } tokens.push(Token { kind: TokenKind::Number, lexeme: chars[start..index].iter().collect(), line, column: start_column }); continue; }
        if current == '"' { let start = index; index += 1; column += 1; while index < chars.len() && chars[index] != '"' { index += 1; column += 1; } if index < chars.len() { index += 1; column += 1; } tokens.push(Token { kind: TokenKind::String, lexeme: chars[start..index].iter().collect(), line, column: start_column }); continue; }
        let (kind, width) = match (current, chars.get(index + 1)) { ('-', Some('>')) => (TokenKind::Arrow, 2), ('=', Some('=')) => (TokenKind::EqualEqual, 2), ('.', Some('.')) => (TokenKind::DotDot, 2), ('+', _) => (TokenKind::Plus, 1), ('-', _) => (TokenKind::Minus, 1), ('*', _) => (TokenKind::Star, 1), ('/', _) => (TokenKind::Slash, 1), ('=', _) => (TokenKind::Equal, 1), ('>', _) => (TokenKind::Greater, 1), ('<', _) => (TokenKind::Less, 1), ('(', _) => (TokenKind::LeftParen, 1), (')', _) => (TokenKind::RightParen, 1), ('{', _) => (TokenKind::LeftBrace, 1), ('}', _) => (TokenKind::RightBrace, 1), ('[', _) => (TokenKind::LeftBracket, 1), (']', _) => (TokenKind::RightBracket, 1), (':', _) => (TokenKind::Colon, 1), (',', _) => (TokenKind::Comma, 1), (';', _) => (TokenKind::Semicolon, 1), _ => { index += 1; column += 1; continue; } };
        let lexeme: String = chars[index..index + width].iter().collect(); tokens.push(Token { kind, lexeme, line, column: start_column }); index += width; column += width;
    }
    tokens.push(Token { kind: TokenKind::Eof, lexeme: String::new(), line, column }); tokens
}
