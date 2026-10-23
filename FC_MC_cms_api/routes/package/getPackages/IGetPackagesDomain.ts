import Package from '../shared/Package';

export interface IGetPackagesDomain {
  getPackages(): Promise<Package[]>
}
