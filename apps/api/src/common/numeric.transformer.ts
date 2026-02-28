export const numericTransformer = {
  to: (value: number | null): number | null => value,
  from: (value: string | number | null): number | null => {
    if (value === null) {
      return null;
    }

    return typeof value === 'number' ? value : Number(value);
  },
};
