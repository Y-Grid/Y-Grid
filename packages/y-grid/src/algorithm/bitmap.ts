/*
  v: int value
  digit: bit len of v
  flag: true or false
*/
const bitmap = (v: number, digit: number, flag: boolean): number => {
  const b = 1 << digit;
  return flag ? v | b : v ^ b;
};

export default bitmap;
