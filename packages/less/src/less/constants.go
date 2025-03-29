package less

type MathType int

const (
	MathAlways MathType = iota
	MathParensDivision
	MathParens
)

type RewriteUrlsType int

const (
	RewriteUrlsOff RewriteUrlsType = iota
	RewriteUrlsLocal
	RewriteUrlsAll
)

var (
	Math       = struct{ Always, ParensDivision, Parens MathType }{MathAlways, MathParensDivision, MathParens}
	RewriteUrls = struct{ Off, Local, All RewriteUrlsType }{RewriteUrlsOff, RewriteUrlsLocal, RewriteUrlsAll}
) 