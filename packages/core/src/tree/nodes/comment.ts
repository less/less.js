import { Node } from '.'

export class Comment extends Node {
  text: string
  options: {
    isLineComment: boolean
  }
}
Comment.prototype.type = 'Comment'
