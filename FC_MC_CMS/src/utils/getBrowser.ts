export default function detectBrowser(): 'Firefox' | 'Opera' | 'Internet Explorer' | 'Microsoft Edge' | 'Google Chrome' | 'Safari' | 'unknown' {
  const { userAgent } = navigator;

  if (userAgent.indexOf('Firefox') > -1) {
    return 'Firefox';
  } if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
    return 'Opera';
  } if (userAgent.indexOf('Trident') > -1) {
    return 'Internet Explorer';
  } if (userAgent.indexOf('Edge') > -1) {
    return 'Microsoft Edge';
  } if (userAgent.indexOf('Chrome') > -1) {
    return 'Google Chrome';
  } if (userAgent.indexOf('Safari') > -1) {
    return 'Safari';
  }
  return 'unknown';
}
