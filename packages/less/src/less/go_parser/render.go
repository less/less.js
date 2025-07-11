package go_parser

import (
	"github.com/toakleaf/less.go/packages/less/src/less"
)

// CallbackFunc represents a callback function that receives an error and result
type CallbackFunc func(error, any)

// ContextInterface represents the context that the render function operates on
// This matches JavaScript's 'this' object that has parse method and options property
type ContextInterface interface {
	Parse(string, map[string]any, func(error, any, any, map[string]any))
	GetOptions() map[string]any
}

// RenderContext represents the bound context for render function
type RenderContext struct {
	context               ContextInterface
	environment           any
	parseTreeConstructor  func(any, any) any // Matches JavaScript: new ParseTree(root, imports)
}

// CreateRender creates a render function that matches JavaScript's export default function(environment, ParseTree)
func CreateRender(environment any, parseTreeConstructor func(any, any) any) func(string, ...any) any {
	return func(input string, args ...any) any {
		// This function must be bound to a context to work, just like JavaScript
		// We'll detect if it's being called without proper binding
		panic("render function must be bound to a context - use renderFunc.bind(context)")
	}
}

// Bind creates a bound render function that matches JavaScript's render.bind(context) behavior
func Bind(renderFactoryFunc func(string, ...any) any, context ContextInterface, environment any, parseTreeConstructor func(any, any) any) func(string, ...any) any {
	renderCtx := &RenderContext{
		context:              context,
		environment:          environment,
		parseTreeConstructor: parseTreeConstructor,
	}
	
	return func(input string, args ...any) any {
		var options map[string]any
		var callback CallbackFunc
		
		// Match JavaScript's exact parameter handling logic
		if len(args) == 1 {
			// Check if the single argument is a function (callback)
			if cb, ok := args[0].(func(error, any)); ok {
				callback = cb
				// Line 7 in JS: options = utils.copyOptions(this.options, {});
				options = less.CopyOptions(renderCtx.context.GetOptions(), make(map[string]any))
			} else if cb, ok := args[0].(CallbackFunc); ok {
				callback = cb
				options = less.CopyOptions(renderCtx.context.GetOptions(), make(map[string]any))
			} else {
				// It's options parameter
				if opts, ok := args[0].(map[string]any); ok {
					// Line 10 in JS: options = utils.copyOptions(this.options, options || {});
					options = less.CopyOptions(renderCtx.context.GetOptions(), opts)
				} else {
					// Handle null/nil options like JavaScript's options || {}
					options = less.CopyOptions(renderCtx.context.GetOptions(), make(map[string]any))
				}
			}
		} else if len(args) == 2 {
			// Two arguments: options and callback
			var opts map[string]any
			if optsArg, ok := args[0].(map[string]any); ok {
				opts = optsArg
			} else {
				// Handle null options like JavaScript's options || {}
				opts = make(map[string]any)
			}
			options = less.CopyOptions(renderCtx.context.GetOptions(), opts)
			
			if cb, ok := args[1].(func(error, any)); ok {
				callback = cb
			} else if cb, ok := args[1].(CallbackFunc); ok {
				callback = cb
			}
		} else {
			// No arguments provided, use default options
			options = less.CopyOptions(renderCtx.context.GetOptions(), make(map[string]any))
		}
		
		// Line 13 in JS: if (!callback)
		if callback == nil {
			// Line 14-23: Return Promise that recursively calls render with callback
			return &RenderPromise{
				execute: func() (any, error) {
					// Line 16: render.call(self, input, options, function(err, output)...)
					// This is the recursive call that maintains the same logic
					resultChan := make(chan any, 1)
					errorChan := make(chan error, 1)
					
					// Create callback for recursive call
					recursiveCallback := func(err error, output any) {
						if err != nil {
							errorChan <- err
						} else {
							resultChan <- output
						}
					}
					
					// Execute the same logic as the callback branch
					renderCtx.context.Parse(input, options, func(err error, root any, imports any, parsedOptions map[string]any) {
						if err != nil {
							recursiveCallback(err, nil)
							return
						}
						
						// Line 28-33: let result; try { ... } catch
						var result any
						var recursiveCallbackCalled bool
						func() {
							defer func() {
								if r := recover(); r != nil {
									if !recursiveCallbackCalled {
										recursiveCallbackCalled = true
										if e, ok := r.(error); ok {
											recursiveCallback(e, nil)
										} else {
											recursiveCallback(less.NewLessError(less.ErrorDetails{
												Message: "render error",
											}, make(map[string]string), ""), nil)
										}
									}
								}
							}()
							
							// Line 30: const parseTree = new ParseTree(root, imports);
							parseTree := renderCtx.parseTreeConstructor(root, imports)
							
							// Line 31: result = parseTree.toCSS(options);
							// Note: using parsedOptions from callback, not original options (critical!)
							if pt, ok := parseTree.(interface{ ToCSS(map[string]any) (any, error) }); ok {
								var err error
								result, err = pt.ToCSS(parsedOptions)
								if err != nil {
									recursiveCallbackCalled = true
									recursiveCallback(err, nil)
									return
								}
							} else if pt, ok := parseTree.(interface{ ToCSS(map[string]any) any }); ok {
								// Handle parseTree.toCSS that doesn't return error (closer to JS)
								result = pt.ToCSS(parsedOptions)
							} else {
								recursiveCallbackCalled = true
								recursiveCallback(less.NewLessError(less.ErrorDetails{
									Message: "ParseTree does not implement ToCSS method",
								}, make(map[string]string), ""), nil)
								return
							}
						}()
						
						// Line 35: callback(null, result); - only call if no error occurred
						if !recursiveCallbackCalled {
							recursiveCallback(nil, result)
						}
					})
					
					// Wait for result (synchronous promise behavior like JavaScript)
					select {
					case res := <-resultChan:
						return res, nil
					case err := <-errorChan:
						return nil, err
					}
				},
			}
		} else {
			// Line 24-37: Callback branch
			// Line 25: this.parse(input, options, function(err, root, imports, options) {
			renderCtx.context.Parse(input, options, func(err error, root any, imports any, parsedOptions map[string]any) {
				// Line 26: if (err) { return callback(err); }
				if err != nil {
					callback(err, nil)
					return
				}
				
				// Line 28-33: let result; try { ... } catch (err) { return callback(err); }
				var result any
				var callbackCalled bool
				func() {
					defer func() {
						if r := recover(); r != nil {
							if !callbackCalled {
								callbackCalled = true
								if e, ok := r.(error); ok {
									callback(e, nil)
								} else {
									callback(less.NewLessError(less.ErrorDetails{
										Message: "render error",
									}, make(map[string]string), ""), nil)
								}
							}
						}
					}()
					
					// Line 30: const parseTree = new ParseTree(root, imports);
					parseTree := renderCtx.parseTreeConstructor(root, imports)
					
					// Line 31: result = parseTree.toCSS(options);
					// CRITICAL: Use parsedOptions from parse callback, not original options
					if pt, ok := parseTree.(interface{ ToCSS(map[string]any) (any, error) }); ok {
						var err error
						result, err = pt.ToCSS(parsedOptions)
						if err != nil {
							callbackCalled = true
							callback(err, nil)
							return
						}
					} else if pt, ok := parseTree.(interface{ ToCSS(map[string]any) any }); ok {
						// Handle parseTree.toCSS that doesn't return error (closer to JS)
						result = pt.ToCSS(parsedOptions)
					} else {
						callbackCalled = true
						callback(less.NewLessError(less.ErrorDetails{
							Message: "ParseTree does not implement ToCSS method",
						}, make(map[string]string), ""), nil)
						return
					}
				}()
				
				// Line 35: callback(null, result); - only call if no error occurred
				if !callbackCalled {
					callback(nil, result)
				}
			})
			return nil
		}
	}
}

// RenderPromise represents a Promise-like interface that matches JavaScript Promise behavior
// Unlike the previous implementation, this is synchronous (deferred) like JavaScript, not async
type RenderPromise struct {
	execute func() (any, error)
	result  any
	err     error
	executed bool
}

// Then simulates JavaScript Promise.then() behavior
func (rp *RenderPromise) Then(onResolve func(any) any, onReject func(error) error) *RenderPromise {
	return &RenderPromise{
		execute: func() (any, error) {
			if !rp.executed {
				rp.result, rp.err = rp.execute()
				rp.executed = true
			}
			
			if rp.err != nil {
				if onReject != nil {
					newErr := onReject(rp.err)
					if newErr != nil {
						return nil, newErr
					}
					return nil, nil
				}
				return nil, rp.err
			} else {
				if onResolve != nil {
					newResult := onResolve(rp.result)
					return newResult, nil
				}
				return rp.result, nil
			}
		},
	}
}

// Catch simulates JavaScript Promise.catch() behavior
func (rp *RenderPromise) Catch(onReject func(error) error) *RenderPromise {
	return rp.Then(nil, onReject)
}

// Await blocks until the promise resolves or rejects (Go-specific helper)
func (rp *RenderPromise) Await() (any, error) {
	if !rp.executed {
		rp.result, rp.err = rp.execute()
		rp.executed = true
	}
	return rp.result, rp.err
}