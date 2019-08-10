import { parse } from './parser';

const result = parse(`
@import 'foo';

@bird: 1px 2px 3px;

.foo #oops {
  &:extend(.b all);
}
`);

console.log(result);