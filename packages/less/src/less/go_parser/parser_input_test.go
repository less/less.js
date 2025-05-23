package go_parser

import (
	"regexp"
	"testing"
)

func TestParserInput(t *testing.T) {
	t.Run("initialization", func(t *testing.T) {
		parserInput := NewParserInput()
		if !parserInput.autoCommentAbsorb {
			t.Error("autoCommentAbsorb should be true by default")
		}
		if len(parserInput.commentStore) != 0 {
			t.Error("commentStore should be empty by default")
		}
		if parserInput.finished {
			t.Error("finished should be false by default")
		}
	})

	t.Run("start method", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("test string", false, nil)
		if parserInput.GetInput() != "test string" {
			t.Error("input should be set correctly")
		}
		if parserInput.i != 0 {
			t.Error("i should be 0")
		}

		parserInput = NewParserInput()
		parserInput.Start("  test string", false, nil)
		if parserInput.i != 2 {
			t.Error("should skip leading whitespace")
		}

		parserInput = NewParserInput()
		parserInput.Start("test string", true, nil)
		if parserInput.GetInput() != "test string" {
			t.Error("should handle chunked input")
		}
	})

	t.Run("$re method", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("test123", false, nil)

		result := parserInput.Re(regexp.MustCompile("test"))
		if result != "test" {
			t.Error("should match regex pattern")
		}
		if parserInput.i != 4 {
			t.Error("should advance position")
		}

		parserInput = NewParserInput()
		parserInput.Start("test123", false, nil)
		result = parserInput.Re(regexp.MustCompile("xyz"))
		if result != nil {
			t.Error("should return nil for no match")
		}
		if parserInput.i != 0 {
			t.Error("should not advance position")
		}
	})

	t.Run("$char method", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("test", false, nil)

		result := parserInput.Char('t')
		if resByte, ok := result.(byte); !ok || resByte != 't' {
			t.Error("should match single character")
		}
		if parserInput.i != 1 {
			t.Error("should advance position")
		}

		parserInput = NewParserInput()
		parserInput.Start("test", false, nil)
		result = parserInput.Char('x')
		if result != nil {
			t.Error("should return nil for no match")
		}
		if parserInput.i != 0 {
			t.Error("should not advance position")
		}
	})

	t.Run("$str method", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("test string", false, nil)

		result := parserInput.Str("test")
		if result != "test" {
			t.Error("should match exact string")
		}
		if parserInput.i != 5 {
			t.Error("should advance position")
		}

		parserInput = NewParserInput()
		parserInput.Start("test string", false, nil)
		result = parserInput.Str("xyz")
		if result != nil {
			t.Error("should return nil for no match")
		}
		if parserInput.i != 0 {
			t.Error("should not advance position")
		}
	})

	t.Run("$quoted method", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("'test'", false, nil)
		result := parserInput.Quoted(-1)
		if result != "'test'" {
			t.Error("should parse single quoted string")
		}
		if parserInput.i != 6 {
			t.Error("should advance position")
		}

		parserInput = NewParserInput()
		parserInput.Start("\"test\"", false, nil)
		result = parserInput.Quoted(-1)
		if result != "\"test\"" {
			t.Error("should parse double quoted string")
		}
		if parserInput.i != 6 {
			t.Error("should advance position")
		}

		parserInput = NewParserInput()
		parserInput.Start("\"test\\\"test\"", false, nil)
		result = parserInput.Quoted(-1)
		if result != "\"test\\\"test\"" {
			t.Error("should handle escaped quotes")
		}
		if parserInput.i != 12 {
			t.Error("should advance position")
		}

		parserInput = NewParserInput()
		parserInput.Start("\"test", false, nil)
		result = parserInput.Quoted(-1)
		if result != nil {
			t.Error("should return nil for unclosed quotes")
		}
		if parserInput.i != 0 {
			t.Error("should not advance position")
		}
	})

	t.Run("$parseUntil method", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("test;end", false, nil)
		result := parserInput.ParseUntil(";")
		if result == nil {
			t.Error("should parse until matching character")
		}
		if parserInput.i != 4 {
			t.Error("should advance position")
		}

		parserInput = NewParserInput()
		parserInput.Start("test { block }", false, nil)
		result = parserInput.ParseUntil(";")
		if result != nil {
			t.Error("should return nil if token not found")
		}
	})

	t.Run("peek methods", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("test", false, nil)

		if !parserInput.Peek("t") {
			t.Error("should peek at next character without consuming")
		}
		if parserInput.i != 0 {
			t.Error("should not advance position")
		}

		if parserInput.CurrentChar() != 't' {
			t.Error("should peek at current character")
		}

		parserInput.i = 1
		if parserInput.PrevChar() != 't' {
			t.Error("should peek at previous character")
		}
	})

	t.Run("save and restore", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("test string", false, nil)

		parserInput.Save()
		parserInput.i = 5
		parserInput.Restore("")
		if parserInput.i != 0 {
			t.Error("should restore parser state")
		}

		parserInput = NewParserInput()
		parserInput.Start("test string", false, nil)
		parserInput.Save()
		parserInput.i = 5
		parserInput.Restore("test error")
		if parserInput.i != 0 {
			t.Error("should restore parser state")
		}
		endState := parserInput.End()
		if endState.Furthest != 5 {
			t.Error("should track furthest position")
		}
		if endState.FurthestPossibleErrorMessage != "test error" {
			t.Error("should track error message")
		}

		parserInput = NewParserInput()
		parserInput.Start("test string", false, nil)
		parserInput.Save()
		parserInput.i = 5
		parserInput.Forget()
		if len(parserInput.saveStack) != 0 {
			t.Error("should forget saved state")
		}
	})

	t.Run("end method", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("test", false, nil)
		parserInput.i = 4
		result := parserInput.End()
		if !result.IsFinished {
			t.Error("should return correct end state when finished")
		}
		if result.Furthest != 4 {
			t.Error("should return correct furthest position")
		}

		parserInput = NewParserInput()
		parserInput.Start("test string", false, nil)
		parserInput.i = 4
		result = parserInput.End()
		if result.IsFinished {
			t.Error("should return correct end state when not finished")
		}
		if result.Furthest != 4 {
			t.Error("should return correct furthest position")
		}

		parserInput = NewParserInput()
		parserInput.Start("test", false, nil)
		parserInput.Save()
		parserInput.i = 2
		parserInput.Restore("test error")
		result = parserInput.End()
		if result.IsFinished {
			t.Error("should return correct end state when error occurred")
		}
		if result.Furthest != 2 {
			t.Error("should return correct furthest position")
		}
		if result.FurthestPossibleErrorMessage != "test error" {
			t.Error("should return correct error message")
		}
	})

	t.Run("isWhitespace method", func(t *testing.T) {
		parserInput := NewParserInput()
		testString := "test \t\n\r"
		parserInput.Start(testString, false, nil)
		if parserInput.i != 0 {
			t.Error("i should be 0")
		}
		if !parserInput.IsWhitespace(4) {
			t.Error("should identify space as whitespace")
		}
		if !parserInput.IsWhitespace(5) {
			t.Error("should identify tab as whitespace")
		}
		if !parserInput.IsWhitespace(6) {
			t.Error("should identify newline as whitespace")
		}
		if !parserInput.IsWhitespace(7) {
			t.Error("should identify carriage return as whitespace")
		}

		parserInput = NewParserInput()
		parserInput.Start("test", false, nil)
		if parserInput.i != 0 {
			t.Error("i should be 0")
		}
		if parserInput.IsWhitespace(0) {
			t.Error("should identify non-whitespace characters")
		}
		if parserInput.IsWhitespace(3) {
			t.Error("should identify non-whitespace characters")
		}
	})

	t.Run("peekNotNumeric method", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("test", false, nil)
		if !parserInput.PeekNotNumeric() {
			t.Error("should identify non-numeric characters")
		}

		parserInput = NewParserInput()
		parserInput.Start("123", false, nil)
		if parserInput.PeekNotNumeric() {
			t.Error("should identify numeric characters")
		}

		parserInput = NewParserInput()
		parserInput.Start("+123", false, nil)
		if parserInput.PeekNotNumeric() {
			t.Error("should identify numeric characters with sign")
		}
		parserInput = NewParserInput()
		parserInput.Start("-123", false, nil)
		if parserInput.PeekNotNumeric() {
			t.Error("should identify numeric characters with sign")
		}

		parserInput = NewParserInput()
		parserInput.Start("/123", false, nil)
		if !parserInput.PeekNotNumeric() {
			t.Error("should identify special characters as non-numeric")
		}
		parserInput = NewParserInput()
		parserInput.Start(",123", false, nil)
		if !parserInput.PeekNotNumeric() {
			t.Error("should identify special characters as non-numeric")
		}
		parserInput = NewParserInput()
		parserInput.Start(".123", false, nil)
		if parserInput.PeekNotNumeric() {
			t.Error("should identify decimal point as numeric")
		}
	})

	t.Run("comment handling", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("test // comment\nend", false, nil)
		result := parserInput.Re(regexp.MustCompile("test"))
		if result != "test" {
			t.Error("should handle line comments")
		}
		if parserInput.i != 16 {
			t.Error("should advance position past comment")
		}
		if len(parserInput.commentStore) != 1 {
			t.Error("should store comment")
		}
		if !parserInput.commentStore[0].isLineComment {
			t.Error("should identify line comment")
		}
		if parserInput.commentStore[0].text != "// comment" {
			t.Error("should store comment text")
		}

		parserInput = NewParserInput()
		parserInput.Start("test /* comment */ end", false, nil)
		result = parserInput.Re(regexp.MustCompile("test"))
		if result != "test" {
			t.Error("should handle block comments")
		}
		if parserInput.i != 19 {
			t.Error("should advance position past comment")
		}
		if len(parserInput.commentStore) != 1 {
			t.Error("should store comment")
		}
		if parserInput.commentStore[0].isLineComment {
			t.Error("should identify block comment")
		}
		if parserInput.commentStore[0].text != "/* comment */" {
			t.Error("should store comment text")
		}

		parserInput = NewParserInput()
		parserInput.autoCommentAbsorb = false
		parserInput.Start("test // comment\nend", false, nil)
		result = parserInput.Re(regexp.MustCompile("test"))
		if result != "test" {
			t.Error("should handle comments with autoCommentAbsorb disabled")
		}
		if parserInput.i != 5 {
			t.Error("should not advance position past comment")
		}
		if len(parserInput.commentStore) != 0 {
			t.Error("should not store comment")
		}
	})

	t.Run("chunking", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("chunk1;chunk2;chunk3", true, nil)
		if parserInput.GetInput() != "chunk1;chunk2;chunk3" {
			t.Error("should handle input with multiple chunks")
		}

		parserInput = NewParserInput()
		parserInput.Start("{chunk1};{chunk2}", true, nil)
		if parserInput.GetInput() != "{chunk1};{chunk2}" {
			t.Error("should handle special characters at chunk boundaries")
		}
	})

	t.Run("error handling", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("\"unmatched quote", false, nil)
		result := parserInput.Quoted(-1)
		if result != nil {
			t.Error("should handle unmatched quotes")
		}

		parserInput = NewParserInput()
		parserInput.Start("{unmatched bracket", false, nil)
		result = parserInput.ParseUntil("}")
		if result != nil {
			t.Error("should handle unmatched brackets")
		}
	})

	t.Run("edge cases", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("", false, nil)
		if parserInput.GetInput() != "" {
			t.Error("should handle empty input string")
		}
		if parserInput.i != 0 {
			t.Error("should not advance position")
		}

		parserInput = NewParserInput()
		parserInput.Start(" \t\n\r", false, nil)
		if parserInput.i != 4 {
			t.Error("should handle input with only whitespace")
		}

		parserInput = NewParserInput()
		parserInput.Start("/* comment */ // comment", false, nil)
		result := parserInput.Re(regexp.MustCompile(".*"))
		if resStr, ok := result.(string); !ok || resStr != "" {
			t.Error("should handle input with only comments")
		}
		t.Logf("Current parser state before final check: i=%d", parserInput.i)
		if parserInput.i != 25 {
			t.Errorf("should advance position past comments, expected 25, got %d", parserInput.i)
		}
		if len(parserInput.commentStore) != 2 {
			t.Error("should store comments")
		}
		if parserInput.commentStore[0].text != "/* comment */" || parserInput.commentStore[0].isLineComment {
			t.Error("should store block comment correctly")
		}
		if parserInput.commentStore[1].text != "// comment" || !parserInput.commentStore[1].isLineComment {
			t.Error("should store line comment correctly")
		}
	})

	t.Run("state management", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("test string", false, nil)
		parserInput.Save()
		parserInput.i = 5
		parserInput.Save()
		parserInput.i = 10
		parserInput.Restore("")
		if parserInput.i != 5 {
			t.Error("should handle multiple save/restore operations")
		}
		parserInput.Restore("")
		if parserInput.i != 0 {
			t.Error("should handle multiple save/restore operations")
		}

		parserInput = NewParserInput()
		parserInput.Start("test string", false, nil)
		parserInput.Save()
		parserInput.i = 5
		parserInput.Restore("error1")
		parserInput.Save()
		parserInput.i = 10
		parserInput.Restore("error2")
		endState := parserInput.End()
		if endState.Furthest != 10 {
			t.Error("should track furthest position")
		}
		if endState.FurthestPossibleErrorMessage != "error2" {
			t.Error("should track latest error message")
		}
	})

	t.Run("$parseUntil method", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("test { nested { block } } end", false, nil)
		result := parserInput.ParseUntil(";")
		if result != nil {
			t.Error("should handle nested blocks")
		}

		parserInput = NewParserInput()
		parserInput.Start("test { \"quoted\" } end", false, nil)
		result = parserInput.ParseUntil(";")
		if result != nil {
			t.Error("should handle quoted strings inside blocks")
		}

		parserInput = NewParserInput()
		parserInput.Start("test { /* comment */ } end", false, nil)
		result = parserInput.ParseUntil(";")
		if result != nil {
			t.Error("should handle comments inside blocks")
		}
	})

	t.Run("whitespace handling", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start(" \t\n\r test", false, nil)
		if parserInput.i != 5 {
			t.Error("should handle different whitespace combinations")
		}

		parserInput = NewParserInput()
		parserInput.Start(" test ", false, nil)
		if parserInput.i != 1 {
			t.Error("should handle whitespace at boundaries")
		}

		parserInput = NewParserInput()
		parserInput.Start("\" test \"", false, nil)
		result := parserInput.Quoted(-1)
		if result != "\" test \"" {
			t.Error("should preserve whitespace inside quoted strings")
		}
	})

	t.Run("character code handling", func(t *testing.T) {
		parserInput := NewParserInput()
		parserInput.Start("\u0000\u007F", false, nil)
		if parserInput.GetInput() != "\u0000\u007F" {
			t.Error("should handle ASCII boundary characters")
		}

		parserInput = NewParserInput()
		parserInput.Start("\\\"'`", false, nil)
		if parserInput.GetInput() != "\\\"'`" {
			t.Error("should handle special characters")
		}

		parserInput = NewParserInput()
		parserInput.Start("\u00A0", false, nil)
		if parserInput.IsWhitespace(0) {
			t.Error("should handle non-breaking space")
		}
	})
} 