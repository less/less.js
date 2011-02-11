" Vim syntax file
" Language:	Carto
" Maintainer:	Tom MacWright <macwright@gmail.com>
" Original Author:	Leaf Corcoran <leafot@gmail.com>
" Modifier:	Bryan J Swift <bryan@bryanjswift.com>
" Last Change:	2011 January 27
" Carto by Tom MacWright
" LESS by Leaf Corcoran
" CSS2 by Nikolai Weibull
" Full CSS2, HTML4 support by Yeti

" For version 5.x: Clear all syntax items
" For version 6.x: Quit when a syntax file was already loaded
if !exists("main_syntax")
  if version < 600
    syntax clear
  elseif exists("b:current_syntax")
  finish
endif
  let main_syntax = 'carto'
endif

syn case ignore

syn keyword cartoTagName Map

syn match cartoSelectorOp "[+>.]"
syn match cartoSelectorOp2 "[~|><]\?=" contained
syn region cartoAttributeSelector matchgroup=cartoSelectorOp start="\[" end="]" transparent contains=cartoUnicodeEscape,cartoSelectorOp2,cartoStringQ,cartoStringQQ

try
syn match cartoIdentifier "#[A-Za-zÀ-ÿ_@][A-Za-zÀ-ÿ0-9_@-]*"
catch /^.*/
syn match cartoIdentifier "#[A-Za-z_@][A-Za-z0-9_@-]*"
endtry

syn match cartoValueInteger "[-+]\=\d\+"
syn match cartoValueNumber "[-+]\=\d\+\(\.\d*\)\="
syn match cartoValueLength "[-+]\=\d\+\(\.\d*\)\=\(%\|mm\|cm\|in\|pt\|pc\|em\|ex\|px\)"

syn match cartoFontDescriptor "@font-face\>" nextgroup=cartoFontDescriptorBlock skipwhite skipnl
syn region cartoFontDescriptorBlock contained transparent matchgroup=cartoBraces start="{" end="}" contains=cartoComment,cartoError,cartoUnicodeEscape,cartoFontProp,cartoFontAttr,cartoStringQ,cartoStringQQ,cartoFontDescriptorProp,cartoValue.*,cartoFontDescriptorFunction,cartoUnicodeRange,cartoFontDescriptorAttr
syn match cartoFontDescriptorProp contained "\<\(unicode-range\|unit-per-em\|panose-1\|cap-height\|x-height\|definition-src\)\>"
syn keyword cartoFontDescriptorProp contained src stemv stemh slope ascent descent widths bbox baseline centerline mathline topline
syn keyword cartoFontDescriptorAttr contained all
syn region cartoFontDescriptorFunction contained matchgroup=cartoFunctionName start="\<\(uri\|url\|local\|format\)\s*(" end=")" contains=cartoStringQ,cartoStringQQ oneline keepend
syn match cartoUnicodeRange contained "U+[0-9A-Fa-f?]\+"
syn match cartoUnicodeRange contained "U+\x\+-\x\+"

syn match cartoKeywordAttr "/\|<%= keyword_names %>\|/"

" syn keyword cartoColor contained {{#colors}}{{.}} {{/colors}}
syn match cartoColor "/\|<%= color_names %>\|/"

" FIXME: These are actually case-insentivie too, but (a) specs recommend using
" mixed-case (b) it's hard to highlight the word `Background' correctly in
" all situations
syn case match
syn keyword cartoColor contained ActiveBorder ActiveCaption AppWorkspace ButtonFace ButtonHighlight ButtonShadow ButtonText CaptionText GrayText Highlight HighlightText InactiveBorder InactiveCaption InactiveCaptionText InfoBackground InfoText Menu MenuText Scrollbar ThreeDDarkShadow ThreeDFace ThreeDHighlight ThreeDLightShadow ThreeDShadow Window WindowFrame WindowText Background
syn case ignore
syn match cartoColor contained "\<transparent\>"
syn match cartoColor contained "\<white\>"
syn match cartoColor contained "#[0-9A-Fa-f]\{3\}\>"
syn match cartoColor contained "#[0-9A-Fa-f]\{6\}\>"
"syn match cartoColor contained "\<rgb\s*(\s*\d\+\(\.\d*\)\=%\=\s*,\s*\d\+\(\.\d*\)\=%\=\s*,\s*\d\+\(\.\d*\)\=%\=\s*)"
syn region cartoURL contained matchgroup=cartoFunctionName start="\<url\s*(" end=")" oneline keepend
syn region cartoFunction contained matchgroup=cartoFunctionName start="\<\(rgb\|lighten\|darken\|saturate\|desaturate\|fadein\|fadeout\|spin\|clip\|attr\|counter\|rect\)\s*(" end=")" oneline keepend

syn match cartoProp "/\|<%= property_names %>\|/"

syn match cartoComment "//.*$" contains=@Spell
syn match cartoVariable "@[A-Za-z_-][A-Za-z0-9_-]*" contained
syn region cartoVariableDefinition start="^@" end=";" contains=carto.*Attr,carto.*Prop,cartoComment,cartoValue.*,cartoColor,cartoURL,cartoImportant,cartoStringQ,cartoStringQQ,cartoFunction,cartoUnicodeEscape,cartoDefinition,cartoClassName,cartoTagName,cartoIdentifier,cartoComment,cartoVariable,cartoFunction

" captures both the definition and the call
syn region cartoFunction matchgroup=cartoFuncDef start="@[A-Za-z_-][A-Za-z0-9_-]*(" end=")" contains=carto.*Attr,carto.*Prop,cartoComment,cartoValue.*,cartoColor,cartoURL,cartoImportant,cartoStringQ,cartoStringQQ,cartoFunction,cartoUnicodeEscape,cartoDefinition,cartoClassName,cartoTagName,cartoIdentifier,cartoComment,cartoVariable,cartoFunction

syn match cartoBraces contained "[{}]"
syn match cartoError contained "{@<>"
syn region cartoDefinition transparent matchgroup=cartoBraces start='{' end='}' contains=carto.*Attr,cartoProp,cartoComment,cartoValue.*,cartoColor,cartoColor,cartoURL,cartoImportant,cartoStringQ,cartoStringQQ,cartoFunction,cartoUnicodeEscape,cartoDefinition,cartoClassName,cartoTagName,cartoIdentifier,cartoComment,cartoVariable,cartoFunction
" syn match cartoBraceError "}"

syn match cartoPseudoClass ":\S*" contains=cartoPseudoClassId,cartoUnicodeEscape
syn keyword cartoPseudoClassId contained link visited active hover focus before after left right
syn match cartoPseudoClassId contained "\<first\(-\(line\|letter\|child\)\)\=\>"
syn region cartoPseudoClassLang matchgroup=cartoPseudoClassId start=":lang(" end=")" oneline

syn region cartoComment start="/\*" end="\*/" contains=@Spell

syn match cartoUnicodeEscape "\\\x\{1,6}\s\?"
syn match cartoSpecialCharQQ +\\"+ contained
syn match cartoSpecialCharQ +\\'+ contained
syn region cartoStringQQ start=+"+ skip=+\\\\\|\\"+ end=+"+ contains=cartoUnicodeEscape,cartoSpecialCharQQ
syn region cartoStringQ start=+'+ skip=+\\\\\|\\'+ end=+'+ contains=cartoUnicodeEscape,cartoSpecialCharQ
syn match cartoClassName "\.[A-Za-z][A-Za-z0-9_-]\+"

if main_syntax == "carto"
  syn sync minlines=10
  syntax sync match cartoHighlight grouphere cartoDefinition /{/
endif

" Define the default highlighting.
" For version 5.7 and earlier: only when not done already
" For version 5.8 and later: only when an item doesn't have highlighting yet
if version >= 508 || !exists("did_carto_syn_inits")
  if version < 508
    let did_carto_syn_inits = 1
    command -nargs=+ HiLink hi link <args>
  else
    command -nargs=+ HiLink hi def link <args>
  endif

  HiLink cartoComment Comment
  HiLink cartoVariable Identifier
  HiLink cartoFuncDef Function
  HiLink cartoComment Comment
  HiLink cartoTagName Statement
  HiLink cartoSelectorOp Special
  HiLink cartoSelectorOp2 Special
  HiLink cartoAttributeSelector Conditional
  HiLink cartoProp StorageClass
  HiLink cartoFontAttr Type
  HiLink cartoColorAttr Type
  HiLink cartoKeywordAttr Constant
  HiLink cartoPseudoClassId PreProc
  HiLink cartoPseudoClassLang Constant
  HiLink cartoValueLength Number
  HiLink cartoValueInteger Number
  HiLink cartoValueNumber Number
  HiLink cartoFunction Constant
  HiLink cartoURL String
  HiLink cartoFunctionName Function
  HiLink cartoColor Constant
  HiLink cartoColor Constant
  HiLink cartoIdentifier Function
  HiLink cartoInclude Include
  HiLink cartoBraces SpecialChar
  HiLink cartoBraceError Error
  HiLink cartoError Error
  HiLink cartoInclude Include
  HiLink cartoUnicodeEscape Special
  HiLink cartoStringQQ String
  HiLink cartoStringQ String
  HiLink cartoFontDescriptor Special
  HiLink cartoFontDescriptorFunction Constant
  HiLink cartoFontDescriptorProp StorageClass
  HiLink cartoFontDescriptorAttr Type
  HiLink cartoUnicodeRange Constant
  HiLink cartoClassName Function
  delcommand HiLink
endif

let b:current_syntax = "carto"

if main_syntax == 'carto'
  unlet main_syntax
endif


" vim: ts=8
