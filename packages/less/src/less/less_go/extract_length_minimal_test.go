package less_go

import (
	"io/ioutil"
	"testing"
)

func TestExtractLengthMinimal(t *testing.T) {
	// Minimal reproduction of the issue
	input := `.mixin-arguments {
    .mixin-args(a b c d);
}

.mixin-args(@value) {
    &-1 {
        length: length(@value);
    }
}`

	// Test 1: With a fresh factory
	t.Run("Fresh Factory", func(t *testing.T) {
		factory := Factory(nil, nil)
		options := map[string]any{
			"filename": "test.less",
		}
		_, err := compileLessForTest(factory, input, options)
		if err != nil {
			t.Logf("Error with fresh factory: %v", err)
		} else {
			t.Log("Success with fresh factory")
		}
	})

	// Test with exact integration test options
	t.Run("With Integration Options", func(t *testing.T) {
		factory := Factory(nil, nil)
		options := map[string]any{
			"filename": "test.less",
			"relativeUrls": true,
			"silent": true,
			"javascriptEnabled": true,
		}
		_, err := compileLessForTest(factory, input, options)
		if err != nil {
			t.Logf("Error with integration options: %v", err)
		} else {
			t.Log("Success with integration options")
		}
	})

	// Test 2: After compiling something else first
	t.Run("After Other Compilation", func(t *testing.T) {
		factory := Factory(nil, nil)
		
		// First compile something else
		other := `.other { color: red; }`
		options1 := map[string]any{"filename": "other.less"}
		_, err1 := compileLessForTest(factory, other, options1)
		if err1 != nil {
			t.Fatalf("Other compilation failed: %v", err1)
		}

		// Now compile our test
		options2 := map[string]any{"filename": "test.less"}
		_, err2 := compileLessForTest(factory, input, options2)
		if err2 != nil {
			t.Logf("Error after other compilation: %v", err2)
		} else {
			t.Log("Success after other compilation")
		}
	})

	// Test 3: Compile twice with same factory
	t.Run("Compile Twice", func(t *testing.T) {
		factory := Factory(nil, nil)
		options := map[string]any{"filename": "test.less"}
		
		// First compilation
		_, err1 := compileLessForTest(factory, input, options)
		if err1 != nil {
			t.Logf("First compilation error: %v", err1)
		} else {
			t.Log("First compilation success")
		}

		// Second compilation
		_, err2 := compileLessForTest(factory, input, options)
		if err2 != nil {
			t.Logf("Second compilation error: %v", err2)
		} else {
			t.Log("Second compilation success")
		}
	})
}

func TestExtractLengthActualFile(t *testing.T) {
	// Test with the actual file content
	lessFile := "/Users/tyler/dev/less.go/packages/test-data/less/_main/extract-and-length.less"
	lessContent, err := ioutil.ReadFile(lessFile)
	if err != nil {
		t.Skipf("Skipping test - file not found: %v", err)
	}

	factory := Factory(nil, nil)
	options := map[string]any{
		"filename": lessFile,
		"paths": []string{"/Users/tyler/dev/less.go/packages/test-data/less/_main"},
		"relativeUrls": true,
		"silent": true,
		"javascriptEnabled": true,
	}
	
	result, err := compileLessForTest(factory, string(lessContent), options)
	if err != nil {
		t.Errorf("Error with actual file: %v", err)
	} else {
		t.Logf("Success with actual file:\n%s", result)
	}
}

func TestExtractLengthOrder(t *testing.T) {
	// Test with mixin definitions in different order
	input1 := `.mixin-args(...) {
    &-2 {
        length: length(@arguments);
    }
}

.mixin-args(@value) {
    &-1 {
        length: length(@value);
    }
}

.mixin-arguments {
    .mixin-args(a b c d);
}`

	factory := Factory(nil, nil)
	options := map[string]any{"filename": "test.less"}
	
	result, err := compileLessForTest(factory, input1, options)
	if err != nil {
		t.Errorf("Error with reversed order: %v", err)
	} else {
		t.Logf("Success with reversed order:\n%s", result)
	}
}