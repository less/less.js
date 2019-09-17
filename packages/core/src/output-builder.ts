import { CstNodeLocation } from 'chevrotain'

export interface IOutputBuilder {
  add(chunk: string, location: CstNodeLocation): void
}