import Node from '../node'

class Comment extends Node {
  text: string
  options: {
    isLineComment: boolean
  }
}
Comment.prototype.type = 'Comment'
export default Comment
