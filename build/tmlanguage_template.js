{	scopeName = 'source.css.carto';
	comment = 'Carto';
	fileTypes = ( 'mss' );
	foldingStartMarker = '/\*\*(?!\*)|\{\s*($|/\*(?!.*?\*/.*\S))';
	foldingStopMarker = '(?<!\*)\*\*/|^\s*\}';
	patterns = (
		{	name = 'keyword.control.carto.elements';
			match = '\b(Map)\b';
		},
		{	name = 'string.quoted.double.carto';
			begin = '"';
			end = '"';
			patterns = (
				{	name = 'constant.character.escaped.carto';
					match = '\\.';
				},
			);
		},
		{	name = 'string.quoted.single.carto';
			begin = "'";
			end = "'";
			patterns = (
				{	name = 'constant.character.escaped.carto';
					match = '\\.';
				},
			);
		},
		{	name = 'meta.selector.class.carto';
			match = '(\.)([a-zA-Z0-9_-]+)';
			captures = {
				1 = { name = 'punctuation.definition.entity.carto'; };
				2 = { name = 'entity.other.class.carto'; };
			};
		},
		{	name = 'meta.selector.id.carto';
			match = '(#)([a-zA-Z0-9_-]+)';
			captures = {
				1 = { name = 'punctuation.definition.entity.carto'; };
				2 = { name = 'keyword.control.id.carto'; };
			};
		},
		{	name = 'meta.selector.attachment.carto';
			match = '(::)([a-zA-Z0-9_/-]+)\b';
			captures = {
				1 = { name = 'punctuation.definition.entity.carto'; };
				2 = { name = 'entity.other.attachment.carto'; };
			};
		},
		{	name = 'meta.attribute-selector.carto';
			match = '(\[)\s*(?:(zoom)|((")(?:[^"\\]|\\.)*(")|('')(?:[^''\\]|\\.)*('')|[a-zA-Z0-9_][a-zA-Z0-9_-]*))\s*(!?=|>=?|<=?)\s*(?:(\d+)|((")(?:[^"\\]|\\.)*(")|('')(?:[^''\\]|\\.)*('')|[a-zA-Z0-9_][a-zA-Z0-9_-]*))\s*(\])';
			captures = {
				1 = { name = 'punctuation.definition.entity.carto'; };
				2 = { name = 'meta.tag.zoomfilter.carto'; };
				3 = { name = 'variable.other.carto'; };
				4 = { name = 'punctuation.definition.string.begin.carto'; };
				5 = { name = 'punctuation.definition.string.end.carto'; };
				6 = { name = 'punctuation.definition.string.begin.carto'; };
				7 = { name = 'punctuation.definition.string.end.carto'; };
				8 = { name = 'punctuation.separator.operator.carto'; };
				9 = { name = 'constant.numeric.carto'; };
				10 = { name = 'string.quoted.attribute-value.carto'; };
				11 = { name = 'punctuation.definition.string.begin.carto'; };
				12 = { name = 'punctuation.definition.string.end.carto'; };
				13 = { name = 'punctuation.definition.string.begin.carto'; };
				14 = { name = 'punctuation.definition.string.end.carto'; };
				15 = { name = 'punctuation.definition.entity.carto'; };
			};
		},
		{	name = 'support.function.any-method.builtin.carto';
			contentName = 'variable.parameter.url';
			begin = 'url\(';
			end = '\)';
		},
		{	name = 'constant.other.rgb-value.carto';
			match = '(#)([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b';
		},
		{	name = 'comment.block.carto';
			begin = '/\*';
			end = '\*/';
		},
		{	name = 'constant.numeric.carto';
			match = '(-|\+)?\s*[0-9]+(\.[0-9]+)?';
		},
		{	name = 'keyword.unit.carto';
			match = '(?<=[\d])(px)\b|%';
		},
		{	name = 'meta.at-rule.import.carto';
			match = '^\s*((@)import\b)';
			captures = {
				1 = { name = 'keyword.control.at-rule.import.carto'; };
				2 = { name = 'punctuation.definition.keyword.carto'; };
			};
		},
		{	match = '\b(<%= property_names %>)\s*:';
			captures = { 1 = { name = 'support.type.property-name.carto'; }; };
		},
		{	name = 'meta.property-value.carto';
			match = '\b(<%= keyword_names %>)\b';
		},
		{	name = 'constant.color.w3c-standard-color-name.carto';
			comment = 'http://www.w3.org/TR/CSS21/syndata.html#value-def-color';
			match = '\b(<%= color_names %>)\b';
		},
		{	name = 'support.function.any-method.builtin.carto';
			match = '\b(saturate|desaturate|lighten|darken|grayscale)\b';
		},
		{	name = 'support.function.any-method.builtin.carto';
			match = '\b(rgb|rgba|hsl|hsla|url)\b';
		},
		{	match = '(\.[a-zA-Z0-9_-]+)\s*(;|\()';
			captures = { 1 = { name = 'support.function.carto'; }; };
		},
		{	name = 'comment.line.double-slash.carto';
			begin = '//';
			end = '$\n?';
		},
		{	name = 'variable.other.carto';
			match = '@[a-zA-Z0-9_-][\w-]*';
		},
		{	name = 'keyword.operator.carto';
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
