import {
  CreateIPSetCommand, DeleteIPSetCommand, IPSetSummary, ListIPSetsCommand, WAFV2Client,
} from '@aws-sdk/client-wafv2';

import CIDR from '../../shared/valueObjects/CIDR';

import { IIPSet } from './IIPSet';
import { IPSetError } from './IPSetError';

export default class IPSetAdaptor implements IIPSet {
  constructor(private readonly client: WAFV2Client) {
  }

  private findIpSetByName(name: string, ipSets: IPSetSummary[]) {
    const [item] = ipSets.filter((ipSet) => ipSet.Name === name);
    if (!item) return undefined;
    return {
      lockToken: item.LockToken,
      id: item.Id,
      name: item.Name,
      arn: item.ARN,
      description: item.Description,
    };
  }

  private async listIpSets() {
    const command = new ListIPSetsCommand({
      Scope: 'CLOUDFRONT',
      Limit: 100,
    });
    const { IPSets } = await this.client.send(command) || {};
    return IPSets;
  }

  async create(name: string, cidr: CIDR): Promise<string> {
    try {
      const command = new CreateIPSetCommand({
        Addresses: [cidr.value()],
        IPAddressVersion: 'IPV4',
        Name: name,
        Scope: 'CLOUDFRONT',
      });
      const { Summary } = await this.client.send(command);
      if (!Summary?.ARN) throw new IPSetError.UnableToCreateIpSet('Arn is undefined');
      return Summary.ARN;
    } catch (e) {
      throw new IPSetError.UnableToCreateIpSet(e);
    }
  }

  async delete(name: string): Promise<boolean> {
    const ipSets = await this.listIpSets();
    if (!ipSets) throw new IPSetError.IPSetsNotFound();
    const { lockToken, id } = this.findIpSetByName(name, ipSets) || {};
    if (!lockToken) {
      throw new IPSetError.IPSetNotFound();
    }
    try {
      const command = new DeleteIPSetCommand({
        Name: name,
        Scope: 'CLOUDFRONT',
        Id: id,
        LockToken: lockToken,
      });
      return !!await this.client.send(command);
    } catch (e) {
      throw new IPSetError.UnableToDeleteIpSet(e);
    }
  }

  async exists(name: string): Promise<string | undefined> {
    const ipSets = await this.listIpSets();
    if (!ipSets) return ipSets;
    const { arn } = this.findIpSetByName(name, ipSets) || {};
    return arn;
  }
}
