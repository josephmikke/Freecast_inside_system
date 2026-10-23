const filtersSelectStyles = {
  placeholder: (styles: any) => ({
    ...styles,
    color: 'white !important',
  }),
  container: (styles: any) => ({
    ...styles,
    borderRadius: '10px',
    color: 'white !important',
  }),
  valueContainer: (styles: any) => ({
    ...styles,
    color: 'white !important',
  }),
  multiValue: (styles: any) => ({
    ...styles,
    backgroundColor: '#0582FF !important',
    color: 'white !important',
    borderRadius: '10px',
  }),
  menuList: (styles: any) => ({
    ...styles,
    backgroundColor: '#454545 !important',
    color: 'white !important',
  }),
  control: (styles: any) => ({
    ...styles,
    border: 'none',
    backgroundColor: '#949699 !important',
    color: 'white !important',
  }),
  option: (styles: any) => ({
    ...styles,
    backgroundColor: '#454545 !important',
    border: 'none',
    color: 'white !important',
  }),
  singleValue: (styles: any) => ({
    ...styles,
    backgroundColor: '#0582FF !important',
    borderRadius: '10px',
    border: 'white !important',
    fontSize: '14px',
    padding: '3px 10px',
    width: 'min-content',
  }),
  input: (styles: any) => ({
    ...styles,
    color: 'white !important',
  }),
};

export default filtersSelectStyles;
