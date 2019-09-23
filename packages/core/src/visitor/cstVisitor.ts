import { ICstVisitor, CstNode } from 'chevrotain'
import { Node } from '../tree/node'

class CstVisitor implements ICstVisitor<CstNode, Node> {
  visit(cstNode: CstNode | CstNode[]) {

  }

  validateVisitor() {}
}