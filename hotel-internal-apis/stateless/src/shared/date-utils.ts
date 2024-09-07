export const getISOString = () => {
  return new Date().toISOString();
};

export const getFormattedDate = () => {
  const date = new Date();
  return date.toISOString().split('T')[0];
};
