export interface IEsamGenerator {
  generateScc(data: Array<string>): string;
  generateMcc(data: Array<string>): Promise<string>;
}
