package go_parser

type MediaSyntaxOptionsType struct {
	QueryInParens bool
}

var AtRuleSyntaxMediaSyntaxOptions = MediaSyntaxOptionsType{
	QueryInParens: true,
}

type ContainerSyntaxOptionsType struct {
	QueryInParens bool
}

var AtRuleSyntaxContainerSyntaxOptions = ContainerSyntaxOptionsType{
	QueryInParens: true,
} 