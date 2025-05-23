package go_parser

type MediaSyntaxOptions struct {
	QueryInParens bool
}

type ContainerSyntaxOptions struct {
	QueryInParens bool
}

var (
	MediaSyntax     = MediaSyntaxOptions{QueryInParens: true}
	ContainerSyntax = ContainerSyntaxOptions{QueryInParens: true}
) 