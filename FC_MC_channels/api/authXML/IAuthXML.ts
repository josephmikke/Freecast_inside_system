export interface UID {
  generate(size: number): string
}

export interface IAuthXML {
  getBase64(): string;
  getXML(): string;
  setGenerationTime(date: string): this;
  setExpirationTime(date: string): this;
  allowFairPlay(): this;
  allowPlayReady(): this;
  allowWidevine(): this;
  setRSAPubKeyId(value: string): this;
}
