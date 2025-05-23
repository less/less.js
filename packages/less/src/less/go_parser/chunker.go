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
		cc = input[chunkerCurrentIndex]
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
			fail("unescaped `\\`", chunkerCurrentIndex)
			return nil
		case 34, 39, 96: // ", ' and `
			matched = false
			currentChunkStartIndex = chunkerCurrentIndex
			for chunkerCurrentIndex = chunkerCurrentIndex + 1; chunkerCurrentIndex < inputLen; chunkerCurrentIndex++ {
				cc2 = input[chunkerCurrentIndex]
				if cc2 > 96 {
					continue
				}
				if cc2 == cc {
					matched = true
					break
				}
				if cc2 == 92 { // \
					if chunkerCurrentIndex == inputLen-1 {
						fail("unescaped `\\`", chunkerCurrentIndex)
						return nil
					}
					chunkerCurrentIndex++
				}
			}
			if matched {
				continue
			}
			fail("unmatched `"+string(cc)+"`", currentChunkStartIndex)
			return nil
		case 47: // /, check for comment
			if parenLevel != 0 || chunkerCurrentIndex == inputLen-1 {
				continue
			}
			cc2 = input[chunkerCurrentIndex+1]
			if cc2 == 47 {
				// //, find lnfeed
				for chunkerCurrentIndex = chunkerCurrentIndex + 2; chunkerCurrentIndex < inputLen; chunkerCurrentIndex++ {
					cc2 = input[chunkerCurrentIndex]
					if (cc2 <= 13) && ((cc2 == 10) || (cc2 == 13)) {
						break
					}
				}
			} else if cc2 == 42 {
				// /*, find */
				lastMultiComment = chunkerCurrentIndex
				currentChunkStartIndex = chunkerCurrentIndex
				for chunkerCurrentIndex = chunkerCurrentIndex + 2; chunkerCurrentIndex < inputLen-1; chunkerCurrentIndex++ {
					cc2 = input[chunkerCurrentIndex]
					if cc2 == 125 {
						lastMultiCommentEndBrace = chunkerCurrentIndex
					}
					if cc2 != 42 {
						continue
					}
					if input[chunkerCurrentIndex+1] == 47 {
						break
					}
				}
				if chunkerCurrentIndex == inputLen-1 {
					fail("missing closing `*/`", currentChunkStartIndex)
					return nil
				}
				chunkerCurrentIndex++
			}
			continue
		case 42: // *, check for unmatched */
			if (chunkerCurrentIndex < inputLen-1) && (input[chunkerCurrentIndex+1] == 47) {
				fail("unmatched `/*`", chunkerCurrentIndex)
				return nil
			}
			continue
		}
	}

	if level != 0 {
		if (lastMultiComment > lastOpening) && (lastMultiCommentEndBrace > lastMultiComment) {
			fail("missing closing `}` or `*/`", lastOpening)
		} else {
			fail("missing closing `}`", lastOpening)
		}
		return nil
	} else if parenLevel != 0 {
		fail("missing closing `)`", lastOpeningParen)
		return nil
	}

	emitChunk(true)
	return chunks
} 