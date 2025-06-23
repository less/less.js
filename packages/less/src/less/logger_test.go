package less

import (
	"testing"
)

// MockListener implements LogListener interface for testing
type MockListener struct {
	ErrorCalls []any
	WarnCalls  []any
	InfoCalls  []any
	DebugCalls []any
}

func NewMockListener() *MockListener {
	return &MockListener{
		ErrorCalls: make([]any, 0),
		WarnCalls:  make([]any, 0),
		InfoCalls:  make([]any, 0),
		DebugCalls: make([]any, 0),
	}
}

func (m *MockListener) Error(msg any) {
	m.ErrorCalls = append(m.ErrorCalls, msg)
}

func (m *MockListener) Warn(msg any) {
	m.WarnCalls = append(m.WarnCalls, msg)
}

func (m *MockListener) Info(msg any) {
	m.InfoCalls = append(m.InfoCalls, msg)
}

func (m *MockListener) Debug(msg any) {
	m.DebugCalls = append(m.DebugCalls, msg)
}

func (m *MockListener) Reset() {
	m.ErrorCalls = m.ErrorCalls[:0]
	m.WarnCalls = m.WarnCalls[:0]
	m.InfoCalls = m.InfoCalls[:0]
	m.DebugCalls = m.DebugCalls[:0]
}

func setupTest() (*Logger, *MockListener) {
	logger := NewLogger()
	mockListener := NewMockListener()
	return logger, mockListener
}

func TestLogLevelMethods(t *testing.T) {
	t.Run("should call error listener when Error() is called", func(t *testing.T) {
		logger, mockListener := setupTest()
		logger.AddListener(mockListener)
		message := "Test error message"

		logger.Error(message)

		if len(mockListener.ErrorCalls) != 1 {
			t.Errorf("Expected 1 error call, got %d", len(mockListener.ErrorCalls))
		}
		if mockListener.ErrorCalls[0] != message {
			t.Errorf("Expected message %v, got %v", message, mockListener.ErrorCalls[0])
		}
	})

	t.Run("should call warn listener when Warn() is called", func(t *testing.T) {
		logger, mockListener := setupTest()
		logger.AddListener(mockListener)
		message := "Test warning message"

		logger.Warn(message)

		if len(mockListener.WarnCalls) != 1 {
			t.Errorf("Expected 1 warn call, got %d", len(mockListener.WarnCalls))
		}
		if mockListener.WarnCalls[0] != message {
			t.Errorf("Expected message %v, got %v", message, mockListener.WarnCalls[0])
		}
	})

	t.Run("should call info listener when Info() is called", func(t *testing.T) {
		logger, mockListener := setupTest()
		logger.AddListener(mockListener)
		message := "Test info message"

		logger.Info(message)

		if len(mockListener.InfoCalls) != 1 {
			t.Errorf("Expected 1 info call, got %d", len(mockListener.InfoCalls))
		}
		if mockListener.InfoCalls[0] != message {
			t.Errorf("Expected message %v, got %v", message, mockListener.InfoCalls[0])
		}
	})

	t.Run("should call debug listener when Debug() is called", func(t *testing.T) {
		logger, mockListener := setupTest()
		logger.AddListener(mockListener)
		message := "Test debug message"

		logger.Debug(message)

		if len(mockListener.DebugCalls) != 1 {
			t.Errorf("Expected 1 debug call, got %d", len(mockListener.DebugCalls))
		}
		if mockListener.DebugCalls[0] != message {
			t.Errorf("Expected message %v, got %v", message, mockListener.DebugCalls[0])
		}
	})
}

func TestListenerManagement(t *testing.T) {
	t.Run("should add listener to listeners array", func(t *testing.T) {
		logger, mockListener := setupTest()
		
		if len(logger.GetListeners()) != 0 {
			t.Errorf("Expected 0 listeners initially, got %d", len(logger.GetListeners()))
		}

		logger.AddListener(mockListener)

		listeners := logger.GetListeners()
		if len(listeners) != 1 {
			t.Errorf("Expected 1 listener, got %d", len(listeners))
		}
		if listeners[0] != mockListener {
			t.Error("Expected listener to be the mock listener")
		}
	})

	t.Run("should add multiple listeners", func(t *testing.T) {
		logger, mockListener := setupTest()
		listener2 := NewMockListener()

		logger.AddListener(mockListener)
		logger.AddListener(listener2)

		listeners := logger.GetListeners()
		if len(listeners) != 2 {
			t.Errorf("Expected 2 listeners, got %d", len(listeners))
		}
		if listeners[0] != mockListener {
			t.Error("Expected first listener to be mockListener")
		}
		if listeners[1] != listener2 {
			t.Error("Expected second listener to be listener2")
		}
	})

	t.Run("should remove listener from listeners array", func(t *testing.T) {
		logger, mockListener := setupTest()
		logger.AddListener(mockListener)
		
		if len(logger.GetListeners()) != 1 {
			t.Errorf("Expected 1 listener initially, got %d", len(logger.GetListeners()))
		}

		logger.RemoveListener(mockListener)

		if len(logger.GetListeners()) != 0 {
			t.Errorf("Expected 0 listeners after removal, got %d", len(logger.GetListeners()))
		}
	})

	t.Run("should remove only the specified listener when multiple exist", func(t *testing.T) {
		logger, mockListener := setupTest()
		listener2 := NewMockListener()
		logger.AddListener(mockListener)
		logger.AddListener(listener2)

		logger.RemoveListener(mockListener)

		listeners := logger.GetListeners()
		if len(listeners) != 1 {
			t.Errorf("Expected 1 listener after removal, got %d", len(listeners))
		}
		if listeners[0] != listener2 {
			t.Error("Expected remaining listener to be listener2")
		}
	})

	t.Run("should remove first matching listener when duplicates exist", func(t *testing.T) {
		logger, mockListener := setupTest()
		logger.AddListener(mockListener)
		logger.AddListener(mockListener) // Add same listener twice
		
		if len(logger.GetListeners()) != 2 {
			t.Errorf("Expected 2 listeners initially, got %d", len(logger.GetListeners()))
		}

		logger.RemoveListener(mockListener)

		listeners := logger.GetListeners()
		if len(listeners) != 1 {
			t.Errorf("Expected 1 listener after removal, got %d", len(listeners))
		}
		if listeners[0] != mockListener {
			t.Error("Expected remaining listener to be mockListener")
		}
	})

	t.Run("should do nothing when trying to remove non-existent listener", func(t *testing.T) {
		logger, mockListener := setupTest()
		otherListener := NewMockListener()
		logger.AddListener(mockListener)

		logger.RemoveListener(otherListener)

		listeners := logger.GetListeners()
		if len(listeners) != 1 {
			t.Errorf("Expected 1 listener, got %d", len(listeners))
		}
		if listeners[0] != mockListener {
			t.Error("Expected listener to remain mockListener")
		}
	})

	t.Run("should handle removing from empty listeners array", func(t *testing.T) {
		logger, mockListener := setupTest()
		
		if len(logger.GetListeners()) != 0 {
			t.Errorf("Expected 0 listeners initially, got %d", len(logger.GetListeners()))
		}

		logger.RemoveListener(mockListener)

		if len(logger.GetListeners()) != 0 {
			t.Errorf("Expected 0 listeners after removal attempt, got %d", len(logger.GetListeners()))
		}
	})
}

func TestEventFiringMechanism(t *testing.T) {
	t.Run("should call all listeners for the same log level", func(t *testing.T) {
		logger, mockListener := setupTest()
		listener2 := NewMockListener()

		logger.AddListener(mockListener)
		logger.AddListener(listener2)

		message := "Test message"
		logger.Error(message)

		if len(mockListener.ErrorCalls) != 1 || mockListener.ErrorCalls[0] != message {
			t.Error("Expected mockListener to receive error call")
		}
		if len(listener2.ErrorCalls) != 1 || listener2.ErrorCalls[0] != message {
			t.Error("Expected listener2 to receive error call")
		}
	})

	t.Run("should not call listeners that do not have the log level method", func(t *testing.T) {
		logger, mockListener := setupTest()
		partialListener := map[string]func(msg any){
			"Error": func(msg any) {
				// Only has Error method
			},
		}

		logger.AddListener(mockListener)
		logger.AddListener(partialListener)

		message := "Test message"
		logger.Warn(message)

		if len(mockListener.WarnCalls) != 1 || mockListener.WarnCalls[0] != message {
			t.Error("Expected mockListener to receive warn call")
		}
		// partialListener should not be called since it doesn't have Warn method
	})

	t.Run("should handle listeners with nil methods gracefully", func(t *testing.T) {
		logger := NewLogger()
		listenerWithNil := map[string]func(msg any){
			"Error": func(msg any) {},
			"Warn":  nil,
			"Info":  nil,
			"Debug": func(msg any) {},
		}

		logger.AddListener(listenerWithNil)

		// These should not panic
		logger.Warn("test")
		logger.Info("test")

		// But error and debug should work
		logger.Error("error test")
		logger.Debug("debug test")
	})

	t.Run("should work with no listeners registered", func(t *testing.T) {
		logger := NewLogger()

		// These should not panic
		logger.Error("test")
		logger.Warn("test")
		logger.Info("test")
		logger.Debug("test")
	})
}

func TestMessageHandling(t *testing.T) {
	t.Run("should pass different message types correctly", func(t *testing.T) {
		logger, mockListener := setupTest()
		logger.AddListener(mockListener)

		// Test string message
		logger.Error("string message")
		if mockListener.ErrorCalls[0] != "string message" {
			t.Error("Expected string message to be passed correctly")
		}

		// Test object message
		objMessage := map[string]any{"type": "error", "details": "test"}
		mockListener.Reset()
		logger.Error(objMessage)
		receivedObj, ok := mockListener.ErrorCalls[0].(map[string]any)
		if !ok || receivedObj["type"] != "error" || receivedObj["details"] != "test" {
			t.Error("Expected object message to be passed correctly")
		}

		// Test number message
		mockListener.Reset()
		logger.Error(42)
		if mockListener.ErrorCalls[0] != 42 {
			t.Error("Expected number message to be passed correctly")
		}

		// Test nil message
		mockListener.Reset()
		logger.Error(nil)
		if mockListener.ErrorCalls[0] != nil {
			t.Error("Expected nil message to be passed correctly")
		}
	})

	t.Run("should preserve message reference for objects", func(t *testing.T) {
		logger, mockListener := setupTest()
		logger.AddListener(mockListener)
		message := map[string]any{"test": "value"}

		logger.Error(message)

		receivedMessage, ok := mockListener.ErrorCalls[0].(map[string]any)
		if !ok || receivedMessage["test"] != "value" {
			t.Error("Expected message reference to be preserved")
		}
		// Verify it's the same reference by modifying and checking
		message["modified"] = true
		if receivedMessage["modified"] != true {
			t.Error("Expected same reference to be passed")
		}
	})
}

func TestIntegrationScenarios(t *testing.T) {
	t.Run("should handle complex workflow with multiple listeners and log levels", func(t *testing.T) {
		logger := NewLogger()
		consoleListener := NewMockListener()
		fileListener := map[string]func(msg any){
			"Error": func(msg any) {},
			"Warn":  func(msg any) {},
			// Only handles error and warn
		}

		logger.AddListener(consoleListener)
		logger.AddListener(fileListener)

		logger.Error("Critical error")
		logger.Warn("Warning message")
		logger.Info("Info message")
		logger.Debug("Debug message")

		// Console listener should receive all messages
		if len(consoleListener.ErrorCalls) != 1 || consoleListener.ErrorCalls[0] != "Critical error" {
			t.Error("Expected consoleListener to receive error")
		}
		if len(consoleListener.WarnCalls) != 1 || consoleListener.WarnCalls[0] != "Warning message" {
			t.Error("Expected consoleListener to receive warn")
		}
		if len(consoleListener.InfoCalls) != 1 || consoleListener.InfoCalls[0] != "Info message" {
			t.Error("Expected consoleListener to receive info")
		}
		if len(consoleListener.DebugCalls) != 1 || consoleListener.DebugCalls[0] != "Debug message" {
			t.Error("Expected consoleListener to receive debug")
		}

		// Remove console listener
		logger.RemoveListener(consoleListener)

		logger.Error("Another error")

		// Console listener should not receive this
		if len(consoleListener.ErrorCalls) != 1 {
			t.Error("Expected consoleListener to not receive additional calls")
		}
	})

	t.Run("should maintain state across multiple operations", func(t *testing.T) {
		logger := NewLogger()
		mockListener := NewMockListener()
		
		if len(logger.GetListeners()) != 0 {
			t.Error("Expected empty listeners initially")
		}

		logger.AddListener(mockListener)
		logger.Error("test1")
		if len(mockListener.ErrorCalls) != 1 {
			t.Error("Expected 1 error call")
		}

		listener2 := NewMockListener()
		logger.AddListener(listener2)
		logger.Error("test2")

		if len(mockListener.ErrorCalls) != 2 {
			t.Error("Expected 2 error calls on mockListener")
		}
		if len(listener2.ErrorCalls) != 1 {
			t.Error("Expected 1 error call on listener2")
		}

		logger.RemoveListener(mockListener)
		logger.Error("test3")

		if len(mockListener.ErrorCalls) != 2 {
			t.Error("Expected mockListener to not receive additional calls")
		}
		if len(listener2.ErrorCalls) != 2 {
			t.Error("Expected listener2 to receive additional call")
		}
	})
}

func TestEdgeCases(t *testing.T) {
	t.Run("should handle empty listeners array correctly", func(t *testing.T) {
		logger := NewLogger()

		// These should not panic
		logger.Error("test")
		logger.Warn("test")
		logger.Info("test")
		logger.Debug("test")
	})

	t.Run("should handle listener with no methods", func(t *testing.T) {
		logger := NewLogger()
		emptyListener := map[string]func(msg any){}
		logger.AddListener(emptyListener)

		// These should not panic
		logger.Error("test")
		logger.Warn("test")
		logger.Info("test")
		logger.Debug("test")
	})
}

func TestDefaultLogger(t *testing.T) {
	t.Run("should work with package-level functions", func(t *testing.T) {
		// Reset default logger
		DefaultLogger = NewLogger()
		mockListener := NewMockListener()
		
		AddListener(mockListener)
		
		Error("test error")
		Warn("test warn")
		Info("test info")
		Debug("test debug")
		
		if len(mockListener.ErrorCalls) != 1 || mockListener.ErrorCalls[0] != "test error" {
			t.Error("Expected package-level Error to work")
		}
		if len(mockListener.WarnCalls) != 1 || mockListener.WarnCalls[0] != "test warn" {
			t.Error("Expected package-level Warn to work")
		}
		if len(mockListener.InfoCalls) != 1 || mockListener.InfoCalls[0] != "test info" {
			t.Error("Expected package-level Info to work")
		}
		if len(mockListener.DebugCalls) != 1 || mockListener.DebugCalls[0] != "test debug" {
			t.Error("Expected package-level Debug to work")
		}
		
		RemoveListener(mockListener)
		if len(DefaultLogger.GetListeners()) != 0 {
			t.Error("Expected listener to be removed from default logger")
		}
	})
}