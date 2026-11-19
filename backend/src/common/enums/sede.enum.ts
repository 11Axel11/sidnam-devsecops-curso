export enum SedeEnum {
  HOGAR = 'hogar',
  CECUIDAM = 'cecuidam',
}

export const SedeOpts = [
  { id: 1, value: SedeEnum.HOGAR, nombre: 'Hogar' },
  { id: 2, value: SedeEnum.CECUIDAM, nombre: 'CECUIDAM' },
];

export const getSedeById = (id: number): SedeEnum | null => {
  const option = SedeOpts.find(opt => opt.id === id);
  return option ? option.value : null;
};
