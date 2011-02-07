{	scopeName = 'source.css.carto';
	comment = 'Carto';
	fileTypes = ( 'mss' );
	foldingStartMarker = '/\*\*(?!\*)|\{\s*($|/\*(?!.*?\*/.*\S))';
	foldingStopMarker = '(?<!\*)\*\*/|^\s*\}';
	patterns = (
		{	name = 'keyword.control.mss.elements';
			match = '\b(Map)\b';
		},
		{	name = 'string.quoted.double.mss';
			begin = '"';
			end = '"';
			patterns = (
				{	name = 'constant.character.escaped.css';
					match = '\\.';
				},
			);
		},
		{	name = 'string.quoted.single.mss';
			begin = "'";
			end = "'";
			patterns = (
				{	name = 'constant.character.escaped.mss';
					match = '\\.';
				},
			);
		},
		{	match = '(\.[a-zA-Z0-9_-]+)[\s,{;]';
			captures = { 1 = { name = 'entity.other.attribute-name.class.mss'; }; };
		},
		{	name = 'support.function.any-method.builtin.css';
			contentName = 'variable.parameter.url';
			begin = 'url\(';
			end = '\)';
		},
		{	name = 'constant.other.rgb-value.css';
			match = '(#)([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b';
		},
		{	name = 'meta.selector.css';
			match = '#[a-zA-Z0-9_-]+';
			captures = { 0 = { name = 'entity.other.attribute-name.id'; }; };
		},
		{	name = 'comment.block.css';
			begin = '/\*';
			end = '\*/';
		},
		{	name = 'constant.numeric.css';
			match = '(-|\+)?\s*[0-9]+(\.[0-9]+)?';
		},
		{	name = 'keyword.unit.css';
			match = '(?<=[\d])(px|pt|cm|mm|in|em|ex|pc)\b|%';
		},
		{	name = 'entity.other.attribute-name.pseudo-element.css';
			match = '(:+)\b(after|before|first-child|first-letter|first-line|selection)\b';
			captures = { 1 = { name = 'punctuation.definition.entity.css'; }; };
		},
		{	name = 'entity.other.attribute-name.pseudo-class.css';
			match = '(:)\b(active|hover|link|visited|focus)\b';
			captures = { 1 = { name = 'punctuation.definition.entity.css'; }; };
		},
		{	name = 'meta.attribute-selector.css';
			match = '(?i)(\[)\s*(-?[_a-z\\[[:^ascii:]]][_a-z0-9\-\\[[:^ascii:]]]*)(?:\s*([~|^$*]?=)\s*(?:(-?[_a-z\\[[:^ascii:]]][_a-z0-9\-\\[[:^ascii:]]]*)|((?>([''"])(?:[^\\]|\\.)*?(\6)))))?\s*(\])';
			captures = {
				1 = { name = 'punctuation.definition.entity.css'; };
				2 = { name = 'entity.other.attribute-name.attribute.css'; };
				3 = { name = 'punctuation.separator.operator.css'; };
				4 = { name = 'string.unquoted.attribute-value.css'; };
				5 = { name = 'string.quoted.double.attribute-value.css'; };
				6 = { name = 'punctuation.definition.string.begin.css'; };
				7 = { name = 'punctuation.definition.string.end.css'; };
			};
		},
		{	name = 'meta.at-rule.import.css';
			match = '^\s*((@)import\b)';
			captures = {
				1 = { name = 'keyword.control.at-rule.import.css'; };
				2 = { name = 'punctuation.definition.keyword.css'; };
			};
		},
		{	match = '\b(<%= property_names %>)\s*:';
			captures = { 1 = { name = 'support.type.property-name.css'; }; };
		},
		{	name = 'support.constant.property-value.css';
			match = '\b(<%= keyword_names %>)\b';
		},
		{	name = 'support.constant.color.w3c-standard-color-name.css';
			comment = 'http://www.w3.org/TR/CSS21/syndata.html#value-def-color';
			match = '\b(<%= color_names %>)\b';
		},
		{	name = 'support.function.any-method.builtin.less';
			match = '\b(saturate|desaturate|lighten|darken|grayscale)\b';
		},
		{	name = 'support.function.any-method.builtin.css';
			match = '\b(rgb|rgba|hsl|hsla|url)\b';
		},
		{	match = '(-(?:webkit|moz|khtml|o|icab)-(?:gradient|linear-gradient))';
			captures = { 1 = { name = 'support.function.any-method.vendor.css'; }; };
		},
		{	name = 'support.function.any-method.webkit.gradient.css';
			match = '\b(color-stop|from|to)\b';
		},
		{	match = '(\.[a-zA-Z0-9_-]+)\s*(;|\()';
			captures = { 1 = { name = 'support.function.less'; }; };
		},
		{	name = 'comment.line.double-slash.less';
			begin = '//';
			end = '$\n?';
		},
		{	name = 'variable.other.less';
			match = '@[a-zA-Z0-9_-][\w-]*';
		},
		{	name = 'keyword.operator.less';
			match = '\$|%|&|\*|\-\-|\-|\+\+|\+|~|===|==|=|!=|!==|<=|>=|<<=|>>=|>>>=|<>|<|>|!|&&|\|\||\?\:|\*=|(?<!\()/=|%=|\+=|\-=|&=|\^=|\/\b';
		},
		{	name = 'meta.brace.curly.js';
			match = '\{|\}';
		},
		{	name = 'meta.brace.round.js';
			match = '\(|\)';
		},
		{	name = 'meta.brace.square.js';
			match = '\[|\]';
		},
	);
}
