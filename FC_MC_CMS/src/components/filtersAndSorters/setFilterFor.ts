import { OptionType } from '@components/filtersAndSorters/Sorters';

export default function setFilterFor(
  columnId: string,
  state: OptionType[] | undefined,
  setFilter: any,
) {
  if (state && state.length > 0) {
    setFilter(columnId, state.map((s) => s.value));
  } else {
    setFilter(columnId, null);
  }
}
