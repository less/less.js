import { parse } from './parser';

const result = parse(`
@import 'foo';

@bird: (media: blah);

.foo #oops {
  &:extend(.b all);
}
`);

console.log(result);