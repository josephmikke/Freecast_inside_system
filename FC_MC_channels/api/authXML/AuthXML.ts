import { Sign, createSign } from 'crypto';
import xml from 'xml';
import { IAuthXML, UID } from './IAuthXML';

export default class AuthXML implements IAuthXML {
  private authXmlJson: any = {
    Data: [],
  };

  private signer: Sign;

  private readonly xmlUtility: typeof xml;

  private signature: any;

  constructor(private readonly privateKey: string, private readonly uid: UID) {
    this.signer = createSign('SHA1');
    this.xmlUtility = xml;
    this.authXmlJson.Data.push({
      UniqueId: uid.generate(16),
    });
  }

  update() {
    this.signer.update(this.xmlUtility(this.authXmlJson));
    this.signature = {
      KeyOSAuthenticationXML: [
        this.authXmlJson,
        { Signature: this.signer.sign(this.privateKey, 'base64') },
      ],
    };
    return this;
  }

  getBase64(): string {
    return Buffer.from(this.xmlUtility(this.signature)).toString('base64');
  }

  getXML(): string {
    return this.xmlUtility(this.signature);
  }

  allowFairPlay(): this {
    this.authXmlJson.Data.push({ FairPlayPolicy: '' });
    return this;
  }

  allowPlayReady(): this {
    this.authXmlJson.Data.push({
      License: [
        { _attr: { type: 'simple' } },
      ],
    });
    return this;
  }

  allowWidevine(): this {
    this.authXmlJson.Data.push(
      { WidevinePolicy: { _attr: { fl_CanPlay: 'true' } } },
      {
        WidevineContentKeySpec: [
          { _attr: { TrackType: 'HD' } },
          { SecurityLevel: 1 },
        ],
      },
    );
    return this;
  }

  setExpirationTime(date: string): this {
    this.authXmlJson.Data.push({ ExpirationTime: date });
    return this;
  }

  setGenerationTime(date: string): this {
    this.authXmlJson.Data.push({ GenerationTime: date });
    return this;
  }

  setRSAPubKeyId(value: string): this {
    this.authXmlJson.Data.push({ RSAPubKeyId: value });
    return this;
  }
}
