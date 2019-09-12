import Node from '../node';

class Anonymous extends Node {
  toString() {
    return this.value
  }
}

Anonymous.prototype.type = 'Anonymous'
export default Anonymous
