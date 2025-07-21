package less_go

import (
	"errors"
	"fmt" // For LessError and utils
	"regexp"
	"strings"
)

// SelectorParseFunc is a function type for parsing selector strings
// This allows dependency injection of parser functionality without circular imports
type SelectorParseFunc func(input string, context map[string]any, imports map[string]any, fileInfo map[string]any, index int) ([]*Element, error)

// Selector represents a CSS selector.
type Selector struct {
	*Node
	Elements       []*Element
	ExtendList     []any // Placeholder for actual type e.g., []*Extend
	Condition      any   // Placeholder for actual type e.g., ConditionNode
	EvaldCondition bool
	MixinElements_ []string // Cached result of MixinElements()
	MediaEmpty     bool
	ParseFunc      SelectorParseFunc // Function for parsing selector strings
	ParseContext   map[string]any    // Context for parser
	ParseImports   map[string]any    // Imports for parser
	// _index, _fileInfo are from embedded Node
}

// NewSelector creates a new Selector instance.
// elementsInput can be []*Element, *Element, or string.
// For backward compatibility, parseFunc, parseContext, and parseImports are optional
func NewSelector(elementsInput any, extendList []any, condition any, index int, currentFileInfo map[string]any, visibilityInfo map[string]any, parseFunc ...any) (*Selector, error) {
	s := &Selector{
		Node:           NewNode(),
		ExtendList:     extendList,
		Condition:      condition,
		EvaldCondition: condition == nil,
	}
	
	s.Index = index
	if currentFileInfo != nil {
		s.SetFileInfo(currentFileInfo)
	} else {
		s.SetFileInfo(make(map[string]any))
	}
	s.CopyVisibilityInfo(visibilityInfo)

	// Handle optional parse parameters BEFORE calling getElements
	if len(parseFunc) > 0 {
		if pf, ok := parseFunc[0].(SelectorParseFunc); ok {
			s.ParseFunc = pf
		}
	}
	if len(parseFunc) > 1 {
		if ctx, ok := parseFunc[1].(map[string]any); ok {
			s.ParseContext = ctx
		}
	}
	if len(parseFunc) > 2 {
		if imp, ok := parseFunc[2].(map[string]any); ok {
			s.ParseImports = imp
		}
	}

	// GetElements needs s.Index, s.FileInfo, and s.ParseFunc to be set first.
	parsedElements, err := s.getElements(elementsInput)
	if err != nil {
		// Add context to the error if it's not already a LessError
		if _, ok := err.(*LessError); !ok {
			err = fmt.Errorf("selector parsing failed at index %d in %s: %w", 
				s.Index, s.FileInfo()["filename"], err)
		}
		return nil, err
	}
	s.Elements = parsedElements

	// Set parent for elements
	for _, el := range s.Elements {
		if el != nil && el.Node != nil {
			el.Node.Parent = s.Node
		}
	}

	return s, nil
}

// Type returns the node type.
func (s *Selector) Type() string {
	return "Selector"
}

// GetType returns the type of the node for visitor pattern consistency
func (s *Selector) GetType() string {
	return "Selector"
}

// Accept visits the node with a visitor.
func (s *Selector) Accept(visitor any) {
	// Use the visitor framework if it's a proper Visitor, otherwise fall back to direct calls
	if v, ok := visitor.(*Visitor); ok {
		if s.Elements != nil {
			newElements := make([]*Element, len(s.Elements))
			for i, el := range s.Elements {
				visited := v.Visit(el)
				if elem, ok := visited.(*Element); ok {
					newElements[i] = elem
				} else {
					// If visitor.Visit returns something else, keep original
					newElements[i] = el
				}
			}
			s.Elements = newElements
		}

		if s.ExtendList != nil {
			newExtendList := make([]any, len(s.ExtendList))
			for i, item := range s.ExtendList {
				newExtendList[i] = v.Visit(item)
			}
			s.ExtendList = newExtendList
		}

		if s.Condition != nil {
			s.Condition = v.Visit(s.Condition)
		}
	} else if v, ok := visitor.(interface{ Visit(any) any }); ok {
		// Direct visitor interface
		if s.Elements != nil {
			newElements := make([]*Element, len(s.Elements))
			for i, el := range s.Elements {
				visited := v.Visit(el)
				if elem, ok := visited.(*Element); ok {
					newElements[i] = elem
				} else {
					newElements[i] = el
				}
			}
			s.Elements = newElements
		}

		if s.ExtendList != nil {
			newExtendList := make([]any, len(s.ExtendList))
			for i, item := range s.ExtendList {
				newExtendList[i] = v.Visit(item)
			}
			s.ExtendList = newExtendList
		}

		if s.Condition != nil {
			s.Condition = v.Visit(s.Condition)
		}
	}
}

// getElements processes the elements input for a selector.
// It's an unexported helper because it relies on the Selector's state (_index, _fileInfo)
// and is called during construction and by CreateDerived.
func (s *Selector) getElements(elsInput any) ([]*Element, error) {
	if elsInput == nil {
		defaultEl := NewElement("", "&", false, s.GetIndex(), s.FileInfo(), nil)
		return []*Element{defaultEl}, nil
	}

	if el, ok := elsInput.(*Element); ok {
		return []*Element{el}, nil
	}

	if elsSlice, ok := elsInput.([]*Element); ok {
		return elsSlice, nil
	}

	if elsSliceAny, ok := elsInput.([]any); ok {
		elements := make([]*Element, 0, len(elsSliceAny))
		valid := true
		for _, item := range elsSliceAny {
			if el, okEl := item.(*Element); okEl {
				elements = append(elements, el)
			} else {
				valid = false
				break
			}
		}
		if valid {
			return elements, nil
		}
	}

	if elsStr, ok := elsInput.(string); ok {
		// Parse string using ParseFunc (equivalent to JS parseNode call)
		if s.ParseFunc == nil {
			// Fallback to old stubbed behavior for backward compatibility
			return nil, errors.New("Selector.getElements: string parsing via Parser not yet implemented (stubbed for string: '" + elsStr + "')")
		}
		
		elements, err := s.ParseFunc(elsStr, s.ParseContext, s.ParseImports, s.FileInfo(), s.GetIndex())
		if err != nil {
			// Convert to LessError format to match JavaScript behavior
			return nil, fmt.Errorf("selector parsing error: %w", err)
		}
		
		return elements, nil
	}

	return nil, fmt.Errorf("Selector.getElements: unexpected type for elements: %T", elsInput)
}

// CreateDerived creates a new selector derived from the current one.
// evaldCondition is the evaluated condition node (not a boolean).
func (s *Selector) CreateDerived(elementsInput any, extendList []any, evaldCondition any) (*Selector, error) {
	// Use s.getElements to process the input elements correctly.
	parsedElements, err := s.getElements(elementsInput)
	if err != nil {
		return nil, err
	}

	finalExtendList := s.ExtendList
	if extendList != nil { // only override if a new one is provided
		finalExtendList = extendList
	}
	
	// In JS: const newSelector = new Selector(elements, extendList || this.extendList, null, ...);
	// The 'null' for condition means the new selector's .condition is nil, and its .evaldCondition
	// will be based on the evaldConditionFromEval parameter or the original s.evaldCondition.
	
	// Handle potential nil Node
	index := 0
	if s.Node != nil {
		index = s.GetIndex()
	}
	
	fileInfo := make(map[string]any)
	if s.Node != nil {
		fileInfo = s.FileInfo()
	}
	
	visibilityInfo := make(map[string]any)
	if s.Node != nil {
		visibilityInfo = s.VisibilityInfo()
	}
	
	newSel, err := NewSelector(parsedElements, finalExtendList, nil, index, fileInfo, visibilityInfo)
	if err != nil {
		return nil, err
	}

	// Update evaldCondition based on the parameter
	// Match JavaScript: newSelector.evaldCondition = (!utils.isNullOrUndefined(evaldCondition)) ? evaldCondition : this.evaldCondition;
	if evaldCondition != nil {
		// Determine truthiness of the condition node
		if boolVal, ok := evaldCondition.(bool); ok {
			newSel.EvaldCondition = boolVal
		} else if boolPtr, ok := evaldCondition.(*bool); ok {
			// Handle pointer to bool (for test compatibility)
			newSel.EvaldCondition = *boolPtr
		} else if truthyProvider, ok := evaldCondition.(interface{ IsTrue() bool }); ok {
			newSel.EvaldCondition = truthyProvider.IsTrue()
		} else {
			// For any other non-nil value, consider it truthy
			newSel.EvaldCondition = true
		}
	} else {
		newSel.EvaldCondition = s.EvaldCondition // Inherit if no new one is specified
	}
	newSel.MediaEmpty = s.MediaEmpty
	return newSel, nil
}

// CreateEmptySelectors creates a default empty selector.
func (s *Selector) CreateEmptySelectors() ([]*Selector, error) {
	el := NewElement("", "&", false, s.GetIndex(), s.FileInfo(), nil)
	// Pass 'el' as is, NewSelector's getElements will handle it.
	sel, err := NewSelector(el, nil, nil, s.GetIndex(), s.FileInfo(), nil)
	if err != nil {
		return nil, fmt.Errorf("CreateEmptySelectors: failed to create selector: %w", err)
	}
	sel.MediaEmpty = true
	return []*Selector{sel}, nil
}

func getSimpleStringFromElementValue(val any) string {
	if val == nil {
		return ""
	}
	if s, ok := val.(string); ok {
		return s
	}
	// This is a placeholder. Ideally, we'd check for nodes that have a simple string form.
	// e.g., if val is a QuotedNode { Value string }, return QuotedNode.Value.
	// For now, Sprintf is a general fallback.
	return fmt.Sprintf("%v", val)
}

// Match compares this selector with another.
func (s *Selector) Match(other *Selector) int {
	elements := s.Elements
	lenElements := len(elements)

	otherMixinElements, err := other.MixinElements()
	if err != nil {
		return 0 // JS returns 0 on error/empty
	}
	lenOther := len(otherMixinElements)

	if lenOther == 0 || lenElements < lenOther {
		return 0
	}

	for i := 0; i < lenOther; i++ {
		// elements[i].Value should be compared with otherMixinElements[i] (string)
		// JS: elements[i].value !== other[i]
		// We need the "simple" string value of elements[i].Value
		currentElValue := getSimpleStringFromElementValue(elements[i].Value)

		if currentElValue != otherMixinElements[i] {
			return 0
		}
	}
	return lenOther
}

var mixinElementsRegex *regexp.Regexp

func init() {
	// JS regex: /[,&#*.\w-]([\w-]|(\\.))*/g
	// `\w` is [A-Za-z0-9_]. `.` in `[]` is literal. `-` needs care. `\\.` is escaped char.
	// Go: "[,\&#*\\.\\w\\-]+([\\w\\-]+|(\\\\.))*"
	// `\\\\.` -> backslash followed by any char (except newline unless `s` flag)
	// The JS `(\\.))` implies backslash + one char. Go: `(\\\\(.))` or `(\\\\[\\s\\S])` for any char including newline.
	// Let's try `(\\\\.?)` for robustness (backslash possibly followed by a char).
	// A common tokenizing regex for selector parts.
	// Example "div .class" -> "div", ".class"
	// Example "div.foo" -> "div", ".foo"
	// The regex /[,&#*.\w-]([\w-]|(\\.))*/g is meant to find sequences.
	// `[#.&]?[\w-]+` for basic parts.
	// `[#.&]?\w([\w-]*|(\\.))*` might be closer.
	// The key is that `elements.map(...).join('')` forms a string like "tag.class#id"
	// and the regex splits it back into ["tag", ".class", "#id"].

	// Using the more direct interpretation from JS for now:
	// It tokenizes strings like "foo.bar" into "foo", ".bar"
	// `[,&#*.\w-]([\w-]|(\\.))*`
	// First char class: `[,&#*.\w-]` -> any of ,,&,#,*,.,word char,hyphen
	// Following: `([\w-]|(\\.))*` -> word char or hyphen, OR escaped char, repeated.
	// Go: `[,\x26#*\.\w\-]([\w\-]|(\\\\.))*` -- assuming `.` is any char after `\\`
	var err error
	mixinElementsRegex, err = regexp.Compile(`[,\x26#*\.\w\-]([\w\-]|(\\\\.))*`) // \\\\ matches backslash followed by any character
	if err != nil {
		panic(fmt.Sprintf("Failed to compile MixinElements regex: %v", err))
	}
}


// MixinElements gets the string parts of the selector for mixin matching.
func (s *Selector) MixinElements() ([]string, error) {
	if s.MixinElements_ != nil {
		return s.MixinElements_, nil
	}

	mappedStrings := make([]string, len(s.Elements))
	for i, el := range s.Elements {
		combinatorStr := ""
		if el.Combinator != nil {
			combinatorStr = el.Combinator.Value // This is a string e.g. " ", ">"
		}
		// `(v.value.value || v.value)` logic:
		valueStr := getSimpleStringFromElementValue(el.Value)
		mappedStrings[i] = combinatorStr + valueStr
	}
	joinedString := strings.Join(mappedStrings, "")

	elements := mixinElementsRegex.FindAllString(joinedString, -1)

	if elements != nil {
		if len(elements) > 0 && elements[0] == "&" {
			// Handle cases like "&.class" -> [".class"]
			// If elements was ["&", ".class"], shift to [".class"]
			// If joinedString was just "&", elements[0] is "&", then it becomes empty.
			if joinedString == "&" && elements[0] == "&" { // Special case for only "&"
				elements = []string{}
			} else if elements[0] == "&" {
                 // If elements are like ["&", "foo"], result should be ["foo"]
                 // This needs careful slicing or reconstruction if the first part is just "&"
                 // and not part of a combined token like "&foo"
                 // The JS `elements.shift()` modifies the array in place.
                 // If `joinedString` was `&.foo` and regex gives `["&", ".foo"]` (unlikely, more like `["&.foo"]` or `["&", "foo"]` if split)
                 // The original JS regex is `match(/[,&#*.\w-]([\w-]|(\\.))*/g)`
                 // If map is `["&", ".foo"]`, join is `"&.foo"`. `match` on this is `["&", ".foo"]` or `["&.foo"]`.
                 // If `["&", ".foo"]`, then `elements.shift()` gives `[".foo"]`.
                 // If it's `["&.foo"]` and `elements[0]` is `"&.foo"`, then `elements[0] === '&'` is false.
                 
                 // Re-evaluating: if the first token found by the regex is exactly "&", it's removed.
                 elements = elements[1:]
            }
		}
	} else {
		elements = []string{}
	}

	s.MixinElements_ = elements
	return s.MixinElements_, nil
}

// IsJustParentSelector checks if the selector is solely a parent reference (&).
func (s *Selector) IsJustParentSelector() bool {
	if s.MediaEmpty {
		return false
	}
	if len(s.Elements) != 1 {
		return false
	}
	el0 := s.Elements[0]

	el0ValueStr, ok := el0.Value.(string)
	if !ok || el0ValueStr != "&" {
		return false
	}

	// Combinator check
	if el0.Combinator == nil { // Should be "" if not specified
		return true // No combinator is like an empty combinator
	}
	combVal := el0.Combinator.Value
	return combVal == " " || combVal == ""
}

// Eval evaluates the selector.
func (s *Selector) Eval(context any) (any, error) {
	var evaldCondition any // This is the evaluated condition NODE (not boolean)

	if s.Condition != nil {
		conditionNode, ok := s.Condition.(interface{ Eval(any) any })
		if !ok {
			return nil, errors.New("selector condition cannot be evaluated")
		}
		
		evaldCondition = conditionNode.Eval(context) // This is a NODE, not a boolean
	}

	var evaluatedElements []*Element
	if s.Elements != nil {
		evaluatedElements = make([]*Element, len(s.Elements))
		for i, e := range s.Elements {
			evaledE, err := e.Eval(context) // Element.Eval returns (any, error)
			if err != nil {
				return nil, err
			}
			if element, ok := evaledE.(*Element); ok {
				evaluatedElements[i] = element
			} else {
				evaluatedElements[i] = e // fallback to original
			}
		}
	}

	var evaluatedExtendList []any
	if s.ExtendList != nil {
		evaluatedExtendList = make([]any, len(s.ExtendList))
		for i, extendItem := range s.ExtendList {
			if ev, ok := extendItem.(interface{ Eval(any) any }); ok {
				evaluatedExtendList[i] = ev.Eval(context)
			} else {
				evaluatedExtendList[i] = extendItem // Not evaluatable
			}
		}
	}
	// Pass the evaluated condition NODE to CreateDerived
	return s.CreateDerived(evaluatedElements, evaluatedExtendList, evaldCondition)
}

// ToCSS generates CSS string representation (overrides Node ToCSS)
func (s *Selector) ToCSS(context any) string {
	var strs []string
	output := &CSSOutput{
		Add: func(chunk any, fileInfo any, index any) {
			strs = append(strs, fmt.Sprintf("%v", chunk))
		},
		IsEmpty: func() bool {
			return len(strs) == 0
		},
	}
	s.GenCSS(context, output)
	return strings.Join(strs, "")
}

// GenCSS generates the CSS representation of the selector.
func (s *Selector) GenCSS(context any, output *CSSOutput) { // CSSOutput from go_parser
	firstSelector := false
	if ctxMap, ok := context.(map[string]any); ok {
		if fsVal, ok := ctxMap["firstSelector"].(bool); ok {
			firstSelector = fsVal
		}
	}

	if !firstSelector && len(s.Elements) > 0 && s.Elements[0].Combinator != nil && s.Elements[0].Combinator.Value == "" {
		output.Add(" ", s.FileInfo(), s.GetIndex())
	}

	for _, element := range s.Elements {
		element.GenCSS(context, output) // Element must have GenCSS taking CSSOutput
	}
}

// GetIsOutput determines if the selector should be part of the output.
func (s *Selector) GetIsOutput() bool {
	return s.EvaldCondition
}

// IsVisible returns whether the selector is visible (for path filtering)
func (s *Selector) IsVisible() *bool {
	if s.Node != nil {
		return s.Node.IsVisible()
	}
	// Default to true for selectors - they should be visible unless explicitly marked otherwise
	defaultVisible := true
	return &defaultVisible
}

// GetExtendList returns the ExtendList of the selector
func (s *Selector) GetExtendList() []*Extend {
	// Convert []any to []*Extend
	if s.ExtendList == nil {
		return nil
	}
	extends := make([]*Extend, 0, len(s.ExtendList))
	for _, ext := range s.ExtendList {
		if extend, ok := ext.(*Extend); ok {
			extends = append(extends, extend)
		}
	}
	return extends
} 