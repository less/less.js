import { parse } from './parser';

const result = parse(`
@import 'foo';

@bird: foo;

.foo #oops {
  &:extend(.b all);
}
`);

console.log(result);