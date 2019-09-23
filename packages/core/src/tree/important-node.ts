import { Node } from './nodes'

/** Implements the makeImportant class */
export abstract class ImportantNode extends Node {
  abstract makeImportant(): Node
}