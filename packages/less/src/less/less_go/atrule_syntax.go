package less_go

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