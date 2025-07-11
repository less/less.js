package less_go

import (
	"reflect"
	"testing"
)

// Common test utilities used across multiple test files

func assertEqual(t *testing.T, expected, actual any, msg string) {
	t.Helper()
	if !reflect.DeepEqual(expected, actual) {
		t.Errorf("%s: Expected %v (type %T), got %v (type %T)", msg, expected, expected, actual, actual)
	}
}

func assertNotNil(t *testing.T, actual any, msg string) {
	t.Helper()
	if actual == nil || (reflect.ValueOf(actual).Kind() == reflect.Ptr && reflect.ValueOf(actual).IsNil()) {
		t.Errorf("%s: expected non-nil value, got nil", msg)
	}
}

func assertError(t *testing.T, err error, message string) {
	t.Helper()
	if err == nil {
		t.Errorf("%s: expected error, got nil", message)
	}
}