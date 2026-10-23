import AuthXML from './AuthXML';

describe('AuthXML', () => {
  it('should generate an Authentication XML', () => {
    const uid = {
      generate: () => 'mocked-id',
    };
    const autXML = new AuthXML('-----BEGIN PRIVATE KEY-----\n'
        + 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCLa6Y4bVFDDu5t\n'
        + 'LoKI4w1cjJ7YopxaFJ4HscZZgmhexR/blNhh+1XftnggX2HnLOK9rQf0czxCsuiH\n'
        + 'rfN7rg37PCctheSLhPnQ5I1+pGgB0+3Fc7yra3guufpojnsxdEVYY8eRQC9IzCjF\n'
        + 'jVDqdcSjzHHwfZi/tSEmp4VnYsFyQD8rMODSFY7oCjH8LyHu3cypKYSSTMf/wna2\n'
        + '/NuncZhv7oWWKDKG8BWgSAl4EGQ4nGbPdI2ttgLyhaiq2+pTFzd/9X6on04xCNXb\n'
        + 'xcsXW9aAgOiJPUUeO2CD5GeDlXvKeGcUxg9hoq3gsal4TivwmXLR/772INprXPEl\n'
        + 'rvZ6hpNNAgMBAAECggEAL1gj/v9oW/xDDQKBQ1jPHcGG44v8yj48F+LPt2+oX55T\n'
        + 'Hi7ieAtwcuK00lFxnp5IdR7AF8vWB9RXUFPK3hISH2Gi8DuKi7JhXwVt4zaTNyOv\n'
        + 'l6CgzhlVm5B+L2lK/lU8gzKG/5UrOW5S3hsKAkRxvSnc+0y7RUaN9mFm1N/dTx1v\n'
        + 'fhTS3rsX2aKstMNKw03tkH+L0U5i/If2kX7PsoOhYU9Ru9ARwganxwukeIYJwKHI\n'
        + 'o/4Wcj6S1VfQTHCoq8igpjtOlMqxcwiKbcYVvbo244F9WzWy4HYv5po+DC/m15vW\n'
        + 'sXBNvVUBqrzUnBvjuuOReizFKWePNeR0qhULCUWtYQKBgQDJ56oJa/9Kr8xRkIIs\n'
        + 'cad5abNAJCO5nw4VNPT2fakuBDyHEHXZUnQkGjSHQgOlB4kkl1S9VqgwDhkACVZu\n'
        + 'TiLTWaoTHJUlP548Pz1eycb8xlsMIqz1ktyj8zg6hix9dxMqK9QgwJ6ECjVCWOWY\n'
        + '7AVedHLU6DwX9YQKOU9yovijhQKBgQCwxkcvJidOquXc7h66uYmkpmPNIlGLIQwi\n'
        + '6ibkxLOzMIbzCmvCYEthQZIgyj+/hIAkq6cBAWzZdiMudE2xhsBemGHXd6RDZzUj\n'
        + '39HaPVzYvbiSfFC4kLTstS55gMxhG6HmxaRsM0TMiihYnjlDoGIyvIRCl1LTNw5Z\n'
        + 'qO8m6rjHKQKBgQCH1abM3e6MFce1HC6nrfMJOPaScX3jdMGpvM4NQy9duRXrnERc\n'
        + '6B8g5sxuLxh6n55Bkto8458VbXaeUqnmXgUKAentH66rt6hCSh2EtuV7zAsXGAEa\n'
        + '2io81vX+UaR+6GxpU8FMI6rBlIiOUXZuMmPOTzOuT2uWhuPFaRctPb1fbQKBgFto\n'
        + 'K6bVs72Z4QI8nucuyV26LCEGfePTUtM7AKGKlOEzVpSV7uKzqEbCAS2zZwNBIIHV\n'
        + 'wKVkd0R7MfXzbbk+VHqVkQI5e1bfJztFoN2YnUn10FrurU7ChMthZIavcv9DqpQJ\n'
        + '3tuUJx8c0YABUNsHM7/Iextz5AATl/gEwqT8+k8BAoGALrNj9bT+dvpTjgtxG3aT\n'
        + 'w+o414plmmZLmQi4BprePCB1jN30b5UH9hY3rDiiUgc7V/q4UZC2IuQQHoDAs6qS\n'
        + 'VMNcHxwHrxcFuUnkiDfwJLqm3/w0YraFxchIUX72AKtHvbHwSvtL7dftLsr3pFMR\n'
        + '0BjQTah59Wb/h/lvih+VtCE=\n'
        + '-----END PRIVATE KEY-----\n', uid);
    const xml = autXML
      .allowFairPlay()
      .allowPlayReady()
      .allowWidevine()
      .setRSAPubKeyId('pubkeyid')
      .setExpirationTime('2023-02-11 09:00:00.000')
      .setGenerationTime('2023-01-11 09:00:00.000')
      .update();

    expect(xml.getXML()).toEqual('<KeyOSAuthenticationXML><Data><UniqueId>mocked-id</UniqueId><FairPlayPolicy></FairPlayPolicy><License type="simple"></License><WidevinePolicy fl_CanPlay="true"/><WidevineContentKeySpec TrackType="HD"><SecurityLevel>1</SecurityLevel></WidevineContentKeySpec><RSAPubKeyId>pubkeyid</RSAPubKeyId><ExpirationTime>2023-02-11 09:00:00.000</ExpirationTime><GenerationTime>2023-01-11 09:00:00.000</GenerationTime></Data><Signature>CgLhAjvHABx0FK3VjheJwZsRk+IIEmZGLE4Ojnl0MXbvM00KHl4ejsmF7m+6TnnIKCinP+FNpLJVfBdI+LP8Ef82SRK4p2IwbP+I0EUwjxai1Nfqf7rDq4MT/WrlwwlRrXV3YSXXRZqvvZn2xHVEJoVzn38LLcJvQydmB3P00vFVjlhi94XrxBcbQayjUPmh/e7jWrglrqo1lBVLqw+M+7A4+h1SOlrtTwj2ezy7eO6Z132h1RnshvJaEkxD9B3rMD45U2kEQ5uu8Y0+9QkfrVsvr2GEaANO7/Wzxa8r0XVeXF8WKP3DQnY7tCSa+1VwPpSjFYHOhQl4Kv4CqWjSaA==</Signature></KeyOSAuthenticationXML>');
    expect(xml.getBase64()).toEqual('PEtleU9TQXV0aGVudGljYXRpb25YTUw+PERhdGE+PFVuaXF1ZUlkPm1vY2tlZC1pZDwvVW5pcXVlSWQ+PEZhaXJQbGF5UG9saWN5PjwvRmFpclBsYXlQb2xpY3k+PExpY2Vuc2UgdHlwZT0ic2ltcGxlIj48L0xpY2Vuc2U+PFdpZGV2aW5lUG9saWN5IGZsX0NhblBsYXk9InRydWUiLz48V2lkZXZpbmVDb250ZW50S2V5U3BlYyBUcmFja1R5cGU9IkhEIj48U2VjdXJpdHlMZXZlbD4xPC9TZWN1cml0eUxldmVsPjwvV2lkZXZpbmVDb250ZW50S2V5U3BlYz48UlNBUHViS2V5SWQ+cHVia2V5aWQ8L1JTQVB1YktleUlkPjxFeHBpcmF0aW9uVGltZT4yMDIzLTAyLTExIDA5OjAwOjAwLjAwMDwvRXhwaXJhdGlvblRpbWU+PEdlbmVyYXRpb25UaW1lPjIwMjMtMDEtMTEgMDk6MDA6MDAuMDAwPC9HZW5lcmF0aW9uVGltZT48L0RhdGE+PFNpZ25hdHVyZT5DZ0xoQWp2SEFCeDBGSzNWamhlSndac1JrK0lJRW1aR0xFNE9qbmwwTVhidk0wMEtIbDRlanNtRjdtKzZUbm5JS0NpblArRk5wTEpWZkJkSStMUDhFZjgyU1JLNHAySXdiUCtJMEVVd2p4YWkxTmZxZjdyRHE0TVQvV3Jsd3dsUnJYVjNZU1hYUlpxdnZabjJ4SFZFSm9Wem4zOExMY0p2UXlkbUIzUDAwdkZWamxoaTk0WHJ4QmNiUWF5alVQbWgvZTdqV3JnbHJxbzFsQlZMcXcrTSs3QTQraDFTT2xydFR3ajJlenk3ZU82WjEzMmgxUm5zaHZKYUVreEQ5QjNyTUQ0NVUya0VRNXV1OFkwKzlRa2ZyVnN2cjJHRWFBTk83L1d6eGE4cjBYVmVYRjhXS1AzRFFuWTd0Q1NhKzFWd1BwU2pGWUhPaFFsNEt2NENxV2pTYUE9PTwvU2lnbmF0dXJlPjwvS2V5T1NBdXRoZW50aWNhdGlvblhNTD4=');
  });
});
