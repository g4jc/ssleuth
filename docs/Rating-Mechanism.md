## Default ratings
The way the overall ratings are arrived at is like this : For each of the six parameters (Cipher suite, Perfect forward secrecy, connection status from browser, certificate status, signature algorithm and presence of an extended validation in certificate), 'weights' are applied to calculate the ratings. The default weights are - 

* Cipher suite  - 4.0/10
* Perfect forward secrecy - 2.0/10
* Browser status - 1.0/10
* Certificate status - 1.0/10
* EV certificate - 1.0/10
* Signature algorithm - 1.0/10

### Cipher suite ratings
Cipher suite ratings are based on the encryption algorithm used and
the HMAC. Stronger block ciphers (like AES-256, CAMELLIA-256) are rated
the highest (10/10) while weak ciphers (RC4, DES) are demoted.

SHA-1 and MD5 digests are reportedly weak, hence there are warning
texts on the addon panel to notify of the weakness.

The  cipher suite ratings can be found here : [modules/cipher-suites.js](https://pagure.io/conversioncompanion/blob/master/f/modules/cipher-suites.js)
While calculating the overall connection rating, SSLRank gives a weight
of 4.0/10 for cipher suite alone.

### Perfect forward secrecy
If the cipher suite supports perfect forward secrecy (Ephemeral Diffie-Hellmann
key exchange) a point of 2/10 is awarded. Since the points are given separately 
for PFS, the key exchange algorithm is not considered while rating the
cipher suites.

### Browser connection status
Another point is awarded for a 'Secure' connection status from the Browser's
own flags. The browser flag reports 3 states : 'Secure', 'Broken' or
'Insecure'. For the latter 2 states, the API does not really inform
of the reason as to why. Many a times, the 'Broken' state is due to unencrypted http content
loaded over a secure connection. The same state can also be reported for potentially
insecure content (flash plugins). The browser notifies the user
on these explicity via the UI. If the states are 'Broken' or
'Insecure' there are no points awarded.

### Valid certificate
A valid certificate earns another point. As of now, the validity is checked
for a matching domain name and valid dates on the certificate.
An extended validation (EV) certificate also gains another point out of 10.

No claims are made that the above approach is the right way to
estimate connection strength. For an advanced user it is possible to change the way the ratings are arrived at. (See below)

### Signature algorithm
Starting with version 0.3.1, SSLRank considers quality of the signature algorithm for rating. This includes both the encryption algorithm (RSA/ECDSA) and the hash (SHA1/SHA256 etc.). As of this version, the encryption algorithm and hash function are weighted equally. (0.5 each for a total of 1.0 out of 10). 
The certificate public key size are also displayed alongside, so if the key size is less than a secure minimum size the ratings for signature algorithm will not be awarded. (This could be separated in a future release). 

### References

The cipher strength ratings and those reported by [SSL labs](https://www.ssllabs.com/ssltest/index.html)
were compared during the development.
Firefox developer Brian Smith [makes a proposal here](https://briansmith.org/browser-ciphersuites-01.html)
on the cipher suites to be enabled/disabled for all major browsers, along with a catalog of common
cipher suites.

There is also an [IETF working group](https://datatracker.ietf.org/wg/uta/charter/) that aims to propose a set of best practices for TLS clients and servers, including recommending versions of TLS, cipher suites etc.

The current SSL/TLS parameters registry available from IANA : https://www.iana.org/assignments/tls-parameters/tls-parameters.xhtml#tls-parameters-4

## Configuring the ratings
Starting from version 0.2.3 SSLRank supports configuring how the rating is calculated. So why configure it ? why not just use it as is ? If you are an advanced user who knows how and what to look for, then perhaps you can make use of this. Or else, it better be left as is. An advanced user, say, can 'monitor' only the cipher suites used and ignore the remaining stuff with configurable ratings.
Secondly, the ratings are subject to change in future. It is more of research interest and not by any means final. I welcome community feedback on how others would tweak the ratings. 

### Quick hands-on
As a quick example, if you like to make SSLRank behave like the default identity box : Set cipher suite rating to 0.0, PFS to 0.0, Extended validation to 2.0, browser status to 8.0, signature algorithm to 0.0 and certificate state to 0.0). This would make SSLRank bring up a 'blue' status for all sites with a valid certificate, and a 'green' status for those with extended validation.

### Ratings for cipher suites 
Cipher suites ratings itself are normalized to a maximum of 10.0. Which is then given a weight according to the overall rating explained above. Currently key exchange gets 3.0/10 (note that PFS is awarded separately), bulk cipher 3.0/10 and HMAC 4.0/10. This can as well be configured in the preferences interface. 

The individual algorithm ratings for cipher suites aren't exposed for tweaking. That is a lot of work, but could be done if there is user interest.
