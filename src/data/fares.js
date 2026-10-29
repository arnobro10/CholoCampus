export function parseFare(value) {
  const text=String(value ?? '').trim();
  if(!text)return null;
  if(!/^\d+(\.\d{1,2})?$/.test(text) || Number(text)>99999999.99) throw new Error('Enter a valid fare with up to two decimal places.');
  return Number(text);
}
export function fareLabel(value) {
  if(value == null)return 'Discuss with ride owner';
  if(Number(value)===0)return 'Free';
  return `৳${new Intl.NumberFormat('en-BD',{maximumFractionDigits:2}).format(Number(value))} / seat`;
}
