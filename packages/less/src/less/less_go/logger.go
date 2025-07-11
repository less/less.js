package less_go

// LogListener represents a listener that can handle log events
type LogListener interface {
	Error(msg any)
	Warn(msg any)
	Info(msg any)
	Debug(msg any)
}

// LogListenerPartial represents a listener that may only implement some log methods
type LogListenerPartial map[string]func(msg any)

// Logger implements a simple event-based logging system
type Logger struct {
	listeners []any
}

// NewLogger creates a new logger instance
func NewLogger() *Logger {
	return &Logger{
		listeners: make([]any, 0),
	}
}

// Error fires an error event to all listeners
func (l *Logger) Error(msg any) {
	l.fireEvent("Error", msg)
}

// Warn fires a warn event to all listeners
func (l *Logger) Warn(msg any) {
	l.fireEvent("Warn", msg)
}

// Info fires an info event to all listeners
func (l *Logger) Info(msg any) {
	l.fireEvent("Info", msg)
}

// Debug fires a debug event to all listeners
func (l *Logger) Debug(msg any) {
	l.fireEvent("Debug", msg)
}

// AddListener adds a listener to the logger
func (l *Logger) AddListener(listener any) {
	l.listeners = append(l.listeners, listener)
}

// RemoveListener removes a listener from the logger
func (l *Logger) RemoveListener(listener any) {
	for i := 0; i < len(l.listeners); i++ {
		if l.listeners[i] == listener {
			l.listeners = append(l.listeners[:i], l.listeners[i+1:]...)
			return
		}
	}
}

// fireEvent fires an event to all registered listeners
func (l *Logger) fireEvent(eventType string, msg any) {
	for i := 0; i < len(l.listeners); i++ {
		listener := l.listeners[i]
		
		// Handle different listener types
		switch v := listener.(type) {
		case LogListener:
			// Full interface implementation
			switch eventType {
			case "Error":
				v.Error(msg)
			case "Warn":
				v.Warn(msg)
			case "Info":
				v.Info(msg)
			case "Debug":
				v.Debug(msg)
			}
		case LogListenerPartial:
			// Map-based partial implementation
			if logFunction, exists := v[eventType]; exists && logFunction != nil {
				logFunction(msg)
			}
		case map[string]func(msg any):
			// Direct map implementation
			if logFunction, exists := v[eventType]; exists && logFunction != nil {
				logFunction(msg)
			}
		}
	}
}

// GetListeners returns a copy of the current listeners (for testing)
func (l *Logger) GetListeners() []any {
	result := make([]any, len(l.listeners))
	copy(result, l.listeners)
	return result
}

// Default logger instance to match JavaScript's default export behavior
var DefaultLogger = NewLogger()

// Package-level functions that delegate to the default logger
func Error(msg any) {
	DefaultLogger.Error(msg)
}

func Warn(msg any) {
	DefaultLogger.Warn(msg)
}

func Info(msg any) {
	DefaultLogger.Info(msg)
}

func Debug(msg any) {
	DefaultLogger.Debug(msg)
}

func AddListener(listener any) {
	DefaultLogger.AddListener(listener)
}

func RemoveListener(listener any) {
	DefaultLogger.RemoveListener(listener)
}