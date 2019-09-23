
export default abstract class Logger {
  abstract error(msg: string): void
  abstract warn(msg: string): void
  abstract info(msg: string): void
  abstract debug(msg: string): void

  protected log(msg: string) {
    this.info(msg)
  }
}