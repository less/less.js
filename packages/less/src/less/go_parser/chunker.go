package go_parser

// Chunker splits the input into chunks.
// It takes an input string and a fail function that will be called with an error message and position if an error occurs.
// Returns a slice of strings containing the chunks, or nil if an error occurred.
func Chunker(input string, fail func(msg string, pos int)) []string {
	inputLen := len(input)
	level := 0
	parenLevel := 0
	lastOpening := 0
	lastOpeningParen := 0
	lastMultiComment := 0
	lastMultiCommentEndBrace := 0
	chunks := make([]string, 0)
	emitFrom := 0
	chunkerCurrentIndex := 0
	currentChunkStartIndex := 0
	var cc, cc2 byte
	matched := false

	emitChunk := func(force bool) {
		length := chunkerCurrentIndex - emitFrom
		
		// Explicitly check conditions separately
		if length == 0 {
			return
		}
		if !force && length < 512 {
			return
		}

		// Calculate slice end index to match JS input.slice(emitFrom, chunkerCurrentIndex + 1)
		sliceEnd := chunkerCurrentIndex + 1
		if sliceEnd > inputLen { // Guard against out-of-bounds access
			sliceEnd = inputLen
		}

		chunks = append(chunks, input[emitFrom:sliceEnd])
		emitFrom = chunkerCurrentIndex + 1 // Next chunk starts after the current character index
	}

	for chunkerCurrentIndex = 0; chunkerCurrentIndex < inputLen; chunkerCurrentIndex++ {
		if char, ok := SafeStringIndex(input, chunkerCurrentIndex); ok {
			cc = char
		} else {
			break // Safety check: if we can't access the character, exit the loop
		}
		if ((cc >= 97) && (cc <= 122)) || (cc < 34) {
			// a-z or whitespace
			continue
		}

		switch cc {
		case 40: // (
			parenLevel++
			lastOpeningParen = chunkerCurrentIndex
			continue
		case 41: // )
			parenLevel--
			if parenLevel < 0 {
				fail("missing opening `(`", chunkerCurrentIndex)
				return nil
			}
			continue
		case 59: // ;
			if parenLevel == 0 {
				emitChunk(false)
			}
			continue
		case 123: // {
			level++
			lastOpening = chunkerCurrentIndex
			continue
		case 125: // }
			level--
			if level < 0 {
				fail("missing opening `{`", chunkerCurrentIndex)
				return nil
			}
			if level == 0 && parenLevel == 0 {
				emitChunk(false)
			}
			continue
		case 92: // \
			if chunkerCurrentIndex < inputLen-1 {
				chunkerCurrentIndex++
				continue
			}
			if fail != nil {
				fail("unescaped `\\`", chunkerCurrentIndex)
			}
			return nil
		case 34, 39, 96: // ", ' and `
			matched = false
			currentChunkStartIndex = chunkerCurrentIndex
			for chunkerCurrentIndex = chunkerCurrentIndex + 1; chunkerCurrentIndex < inputLen; chunkerCurrentIndex++ {
				if char, ok := SafeStringIndex(input, chunkerCurrentIndex); ok {
					cc2 = char
				} else {
					break // Safety check: exit if we can't access the character
				}
				if cc2 > 96 {
					continue
				}
				if cc2 == cc {
					matched = true
					break
				}
				if cc2 == 92 { // \
					if chunkerCurrentIndex == inputLen-1 {
						if fail != nil {
							fail("unescaped `\\`", chunkerCurrentIndex)
						}
						return nil
					}
					chunkerCurrentIndex++
				}
			}
			if matched {
				continue
			}
			if fail != nil {
				fail("unmatched `"+string(cc)+"`", currentChunkStartIndex)
			}
			return nil
		case 47: // /, check for comment
			if parenLevel != 0 || chunkerCurrentIndex == inputLen-1 {
				continue
			}
			if char, ok := SafeStringIndex(input, chunkerCurrentIndex+1); ok {
				cc2 = char
			} else {
				continue // Safety check: skip if we can't access the next character
			}
			if cc2 == 47 {
				// //, find lnfeed
				for chunkerCurrentIndex = chunkerCurrentIndex + 2; chunkerCurrentIndex < inputLen; chunkerCurrentIndex++ {
					if char, ok := SafeStringIndex(input, chunkerCurrentIndex); ok {
						cc2 = char
					} else {
						break
					}
					if (cc2 <= 13) && ((cc2 == 10) || (cc2 == 13)) {
						break
					}
				}
			} else if cc2 == 42 {
				// /*, find */
				lastMultiComment = chunkerCurrentIndex
				currentChunkStartIndex = chunkerCurrentIndex
				for chunkerCurrentIndex = chunkerCurrentIndex + 2; chunkerCurrentIndex < inputLen-1; chunkerCurrentIndex++ {
					if char, ok := SafeStringIndex(input, chunkerCurrentIndex); ok {
						cc2 = char
					} else {
						break
					}
					if cc2 == 125 {
						lastMultiCommentEndBrace = chunkerCurrentIndex
					}
					if cc2 != 42 {
						continue
					}
					if char, ok := SafeStringIndex(input, chunkerCurrentIndex+1); ok && char == 47 {
						break
					}
				}
				if chunkerCurrentIndex == inputLen-1 {
					if fail != nil {
						fail("missing closing `*/`", currentChunkStartIndex)
					}
					return nil
				}
				chunkerCurrentIndex++
			}
			continue
		case 42: // *, check for unmatched */
			if char, ok := SafeStringIndex(input, chunkerCurrentIndex+1); ok && char == 47 {
				if fail != nil {
					fail("unmatched `/*`", chunkerCurrentIndex)
				}
				return nil
			}
			continue
		}
	}

	if level != 0 {
		if fail != nil {
			if (lastMultiComment > lastOpening) && (lastMultiCommentEndBrace > lastMultiComment) {
				fail("missing closing `}` or `*/`", lastOpening)
			} else {
				fail("missing closing `}`", lastOpening)
			}
		}
		return nil
	} else if parenLevel != 0 {
		if fail != nil {
			fail("missing closing `)`", lastOpeningParen)
		}
		return nil
	}

	emitChunk(true)
	return chunks
} 