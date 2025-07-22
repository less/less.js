package less_go

import (
	"fmt"
	"testing"
)

func TestSimpleJoinDebug(t *testing.T) {
	// Create a simple test case to debug the issue
	
	// Create parent selector: .parent
	parentElement := NewElement("", ".parent", false, 0, map[string]any{}, nil)
	parentSelector, _ := NewSelector([]*Element{parentElement}, nil, nil, 0, map[string]any{}, nil)
	
	// Create child selector: &.modifier
	andElement := NewElement("", "&", false, 0, map[string]any{}, nil)
	modifierElement := NewElement("", ".modifier", false, 0, map[string]any{}, nil)
	childSelector, _ := NewSelector([]*Element{andElement, modifierElement}, nil, nil, 0, map[string]any{}, nil)
	
	// Create parent ruleset
	parentRuleset := NewRuleset([]any{parentSelector}, nil, false, nil)
	
	// Create child ruleset  
	childRuleset := NewRuleset([]any{childSelector}, nil, false, nil)
	parentRuleset.Rules = []any{childRuleset}
	
	// Run JoinSelectorVisitor
	jsv := NewJoinSelectorVisitor()
	
	fmt.Println("=== Before JoinSelectorVisitor ===")
	fmt.Printf("Initial contexts: %v\n", jsv.contexts)
	fmt.Printf("Parent selector: %v\n", parentSelector)
	fmt.Printf("Child selector: %v\n", childSelector)
	
	// Manually walk through what should happen:
	// 1. Visit parent ruleset
	//    - context is [] (empty)
	//    - creates paths = []
	//    - pushes paths to contexts -> contexts = [[], []]
	//    - calls JoinSelectors with empty context
	//    - JoinSelectors should add parent selector to paths
	
	// 2. Visit child ruleset
	//    - context should be the parent's paths
	//    - creates new paths = []
	//    - pushes paths to contexts
	//    - calls JoinSelectors with parent context
	//    - JoinSelectors should combine parent and child selectors
	
	result := jsv.Run(parentRuleset)
	
	fmt.Println("\n=== After JoinSelectorVisitor ===")
	if resultRuleset, ok := result.(*Ruleset); ok {
		fmt.Printf("Parent paths: %v\n", resultRuleset.Paths)
		if len(resultRuleset.Rules) > 0 {
			if childRs, ok := resultRuleset.Rules[0].(*Ruleset); ok {
				fmt.Printf("Child paths: %v\n", childRs.Paths)
				fmt.Printf("Child selectors: %v\n", childRs.Selectors)
			}
		}
	}
	
	// Test the actual JoinSelector method directly
	fmt.Println("\n=== Testing JoinSelector directly ===")
	testRuleset := NewRuleset(nil, nil, false, nil)
	var paths [][]any
	
	// Test with empty context
	emptyContext := [][]any{}
	testRuleset.JoinSelector(&paths, emptyContext, parentSelector)
	fmt.Printf("With empty context, paths: %v\n", paths)
	
	// Test with parent context
	paths = [][]any{} // reset
	parentContext := [][]any{{parentSelector}}
	testRuleset.JoinSelector(&paths, parentContext, childSelector)
	fmt.Printf("With parent context, paths: %v\n", paths)
}